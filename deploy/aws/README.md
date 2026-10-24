# Deploy lên AWS — 1 EC2 + Docker Compose + Caddy, hẹn giờ tắt/bật (Terraform)

Kiến trúc rẻ nhất cho app nội bộ 2 người: **1 EC2** chạy cả stack (API + Postgres + MinIO + PWA + Caddy auto-HTTPS), **tự bật 8:45 / tắt 17:00** (chỉ trả tiền giờ chạy). IP cố định bằng **Elastic IP** + hostname **`<eip>.sslip.io`** (không cần mua domain). **Không ALB** (ALB ~$16/th always-on, phá mục tiêu tiết kiệm).

## 0. Cần có trên MÁY BẠN
- **Terraform** ≥ 1.6, **AWS CLI**.
- **Credential AWS cấu hình cục bộ**: `aws configure` (hoặc biến môi trường `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`). ⚠️ **KHÔNG dán key này cho ai / vào chat.** Terraform tự dùng credential trên máy bạn.
- IAM user/role có quyền tạo EC2, EIP, IAM role, SSM, EventBridge Scheduler.

## 1. Nạp secret vào SSM Parameter Store (1 lần, KHÔNG vào git)
```bash
R=ap-southeast-1
aws ssm put-parameter --region $R --type SecureString --name /gem-inventory/JWT_SECRET          --value "$(openssl rand -base64 32)"
aws ssm put-parameter --region $R --type SecureString --name /gem-inventory/POSTGRES_PASSWORD    --value "$(openssl rand -base64 24)"
aws ssm put-parameter --region $R --type SecureString --name /gem-inventory/MINIO_ROOT_PASSWORD  --value "$(openssl rand -base64 24)"
aws ssm put-parameter --region $R --type SecureString --name /gem-inventory/SEED_ADMIN_PASSWORD  --value "MẬT_KHẨU_OWNER_THẬT"
aws ssm put-parameter --region $R --type SecureString --name /gem-inventory/SEED_STAFF_PASSWORD  --value "MẬT_KHẨU_CHỊ_TRANG_THẬT"
# Repo là PRIVATE → cần GitHub token (fine-grained, chỉ-đọc repo gem-inventory):
aws ssm put-parameter --region $R --type SecureString --name /gem-inventory/github_token         --value "github_pat_xxx"
# (tùy chọn) email cho Let's Encrypt:
aws ssm put-parameter --region $R --type String       --name /gem-inventory/acme_email            --value "ban@email.com"
```

## 2. Dựng hạ tầng
```bash
cd deploy/aws
cp terraform.tfvars.example terraform.tfvars   # chỉnh region/domain nếu cần
terraform init
terraform apply        # xem plan, gõ yes
```
Output: `public_ip`, `hostnames` (app/api/s3), `instance_id`, `ssm_connect`.

## 3. Chờ boot lần đầu (~3–6 phút)
EC2 cài Docker → clone repo → build image → `compose up` → migrate + seed. Theo dõi:
```bash
aws ssm start-session --target <instance_id> --region ap-southeast-1
sudo tail -f /var/log/gem-bootstrap.log
```
Kiểm tra: mở `https://<app-hostname>` (từ output). Lần đầu Caddy xin cert mất vài chục giây.

## 4. Đưa cho chị Trang
- Gửi link **`https://<app-hostname>`** (vd `https://app.1-2-3-4.sslip.io`).
- iPhone Safari → Share → **Add to Home Screen** → đăng nhập `chi.trang` / (mật khẩu đã nạp).

## 5. Hẹn giờ
- Tự **bật 8:45**, **tắt 17:00**, T2–T6 (chỉnh `schedule_*` + `timezone`). Ngoài giờ: tắt → 0 tiền compute.
- Bật lại giữ nguyên dữ liệu (EBS). IP không đổi (Elastic IP) nên cert + hostname ổn định.
- Bật/tắt tay: `aws ec2 start-instances --instance-ids <id>` / `stop-instances`.

## 6. Cập nhật app sau này
Push code mới lên GitHub → lần boot kế tiếp tự `git pull` + rebuild. Hoặc cập nhật ngay:
```bash
aws ssm start-session --target <id> --region ap-southeast-1
cd /opt/gem-inventory && sudo git pull && cd deploy && \
  sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Chi phí (ước tính)
- Compute: chỉ ~176 giờ/tháng (8h×22) → **free-tier $0**, hoặc ~$3–4/th nếu hết free-tier.
- Elastic IP (IPv4): ~**$3.6/th**. EBS ≤30GB: free-tier.
- → Tổng ~**$0–8/tháng**; $100 credit dư nhiều tháng.
- Muốn free luôn IPv4: đặt `use_elastic_ip=false` + dùng `custom_domain` ở Cloudflare + script cập nhật DNS lúc boot (hỏi mình nếu cần).

## Gỡ bỏ
```bash
terraform destroy    # xóa EC2/EIP/schedule. (SSM params + EBS snapshot nếu có: xóa tay)
```
