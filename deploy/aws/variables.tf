variable "region" {
  description = "AWS region (gần VN: ap-southeast-1 Singapore)"
  type        = string
  default     = "ap-southeast-1"
}

variable "name" {
  description = "Tên tài nguyên"
  type        = string
  default     = "gem-inventory"
}

variable "instance_type" {
  description = "t3.small (2GB) đủ cho Postgres+MinIO+API+Caddy; chỉ chạy giờ hành chính nên rẻ"
  type        = string
  default     = "t3.small"
}

variable "root_volume_gb" {
  description = "Dung lượng EBS (≤30GB nằm trong free-tier). Giữ dữ liệu khi tắt/bật."
  type        = number
  default     = 30
}

variable "ssh_key_name" {
  description = "Tên EC2 key pair để SSH (để trống nếu chỉ dùng SSM Session Manager)"
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "CIDR được phép SSH, vd 1.2.3.4/32 (để trống = không mở cổng 22, dùng SSM)"
  type        = string
  default     = ""
}

variable "use_elastic_ip" {
  description = "Cấp Elastic IP (IP cố định qua tắt/bật). ~\\$3.6/th cho 1 IPv4."
  type        = bool
  default     = true
}

variable "ssm_prefix" {
  description = "Tiền tố SSM Parameter Store chứa secret app"
  type        = string
  default     = "/gem-inventory"
}

variable "repo_url" {
  description = "URL clone repo. Private repo: dùng HTTPS + GitHub token lưu ở SSM (key github_token)"
  type        = string
  default     = "https://github.com/gems-digital/gem-inventory.git"
}

variable "custom_domain" {
  description = "Domain riêng (vd omnigem.vn) → app./api./s3. Để trống = tự dùng <eip>.sslip.io"
  type        = string
  default     = ""
}

variable "enable_schedule" {
  description = "Bật hẹn giờ tự tắt/bật"
  type        = bool
  default     = true
}

variable "timezone" {
  description = "Múi giờ cho lịch"
  type        = string
  default     = "Asia/Ho_Chi_Minh"
}

variable "schedule_start" {
  description = "Giờ BẬT (cron EventBridge). Mặc định 8:45 T2-T6."
  type        = string
  default     = "cron(45 8 ? * MON-FRI *)"
}

variable "schedule_stop" {
  description = "Giờ TẮT. Mặc định 17:00 T2-T6."
  type        = string
  default     = "cron(0 17 ? * MON-FRI *)"
}
