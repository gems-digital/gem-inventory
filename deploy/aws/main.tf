terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = var.region
}

# ---- Mạng: dùng default VPC + subnet ----
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ---- AMI Amazon Linux 2023 (x86_64) ----
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# ---- Security Group: mở 80/443 ra ngoài; SSH chỉ từ IP bạn (nếu khai báo) ----
resource "aws_security_group" "gem" {
  name        = "${var.name}-sg"
  description = "gem-inventory: HTTP/HTTPS public, SSH optional"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP (Caddy ACME + redirect)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  dynamic "ingress" {
    for_each = var.allowed_ssh_cidr == "" ? [] : [var.allowed_ssh_cidr]
    content {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.name}-sg" }
}

# ---- IAM role cho EC2: SSM Session Manager + đọc secret từ Parameter Store ----
data "aws_caller_identity" "me" {}

resource "aws_iam_role" "ec2" {
  name = "${var.name}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "read_params" {
  name = "read-gem-params"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParametersByPath", "ssm:GetParameter", "ssm:GetParameters"]
      Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.me.account_id}:parameter${var.ssm_prefix}/*"
      }, {
      Effect   = "Allow"
      Action   = ["kms:Decrypt"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ---- EC2 instance (chạy docker-compose production) ----
resource "aws_instance" "gem" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.gem.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_key_name == "" ? null : var.ssh_key_name

  root_block_device {
    volume_size = var.root_volume_gb
    volume_type = "gp3"
    encrypted   = true
  }

  # Chèn 4 biến (Terraform interpolate) + nội dung bootstrap.sh nguyên văn (file()
  # KHÔNG interpolate → bash ${...} trong script không cần escape).
  user_data = <<-EOT
    #!/bin/bash
    export REGION="${var.region}"
    export SSM_PREFIX="${var.ssm_prefix}"
    export REPO_URL="${var.repo_url}"
    export CUSTOM_DOMAIN="${var.custom_domain}"
    ${file("${path.module}/bootstrap.sh")}
  EOT
  # Đổi user_data không tự tái tạo máy (giữ dữ liệu EBS); chạy lại bằng cách SSM vào máy.
  # user_data_replace_on_change = true

  tags = { Name = var.name }
}

# ---- Elastic IP (IP cố định qua các lần tắt/bật) ----
resource "aws_eip" "gem" {
  count    = var.use_elastic_ip ? 1 : 0
  instance = aws_instance.gem.id
  domain   = "vpc"
  tags     = { Name = "${var.name}-eip" }
}

# ---- Hẹn giờ bật/tắt (EventBridge Scheduler) ----
resource "aws_iam_role" "scheduler" {
  count = var.enable_schedule ? 1 : 0
  name  = "${var.name}-scheduler-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "scheduler" {
  count = var.enable_schedule ? 1 : 0
  name  = "startstop-ec2"
  role  = aws_iam_role.scheduler[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ec2:StartInstances", "ec2:StopInstances"]
      Resource = "*"
    }]
  })
}

resource "aws_scheduler_schedule" "start" {
  count = var.enable_schedule ? 1 : 0
  name  = "${var.name}-start"
  flexible_time_window { mode = "OFF" }
  schedule_expression          = var.schedule_start
  schedule_expression_timezone = var.timezone
  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
    role_arn = aws_iam_role.scheduler[0].arn
    input    = jsonencode({ InstanceIds = [aws_instance.gem.id] })
  }
}

resource "aws_scheduler_schedule" "stop" {
  count = var.enable_schedule ? 1 : 0
  name  = "${var.name}-stop"
  flexible_time_window { mode = "OFF" }
  schedule_expression          = var.schedule_stop
  schedule_expression_timezone = var.timezone
  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
    role_arn = aws_iam_role.scheduler[0].arn
    input    = jsonencode({ InstanceIds = [aws_instance.gem.id] })
  }
}

# ---- Kết quả ----
output "public_ip" {
  value = var.use_elastic_ip ? aws_eip.gem[0].public_ip : aws_instance.gem.public_ip
}

output "hostnames" {
  description = "Domain của 3 dịch vụ (dùng sslip.io nếu không đặt custom_domain)"
  value = {
    for svc in ["app", "api", "s3"] :
    svc => var.custom_domain != "" ? "${svc}.${var.custom_domain}" :
    "${svc}.${replace(var.use_elastic_ip ? aws_eip.gem[0].public_ip : aws_instance.gem.public_ip, ".", "-")}.sslip.io"
  }
}

output "instance_id" {
  value = aws_instance.gem.id
}

output "ssm_connect" {
  description = "Kết nối không cần SSH"
  value       = "aws ssm start-session --target ${aws_instance.gem.id} --region ${var.region}"
}
