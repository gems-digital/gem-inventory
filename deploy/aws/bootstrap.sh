# === gem-inventory bootstrap (chạy mỗi lần EC2 khởi động) ===
# Biến REGION / SSM_PREFIX / REPO_URL / CUSTOM_DOMAIN được Terraform export ở header.
set -xo pipefail
exec > >(tee -a /var/log/gem-bootstrap.log) 2>&1
echo "=== gem bootstrap $(date) ==="

APP_DIR=/opt/gem-inventory

# --- IP công khai: ưu tiên PUBLIC_IP (Elastic IP Terraform truyền vào, tránh race),
#     fallback metadata nếu không có ---
if [ -n "$PUBLIC_IP" ]; then
  PUBIP="$PUBLIC_IP"
else
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
  PUBIP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
fi
if [ -n "$CUSTOM_DOMAIN" ]; then
  APP_DOMAIN="app.$CUSTOM_DOMAIN"; API_DOMAIN="api.$CUSTOM_DOMAIN"; S3_DOMAIN="s3.$CUSTOM_DOMAIN"
else
  DASH=$(echo "$PUBIP" | tr '.' '-')
  APP_DOMAIN="app.$DASH.sslip.io"; API_DOMAIN="api.$DASH.sslip.io"; S3_DOMAIN="s3.$DASH.sslip.io"
fi
echo "IP=$PUBIP APP=$APP_DOMAIN API=$API_DOMAIN S3=$S3_DOMAIN"

# --- Cài Docker + compose plugin + tiện ích ---
dnf install -y docker git jq
systemctl enable --now docker
usermod -aG docker ec2-user || true
mkdir -p /usr/libexec/docker/cli-plugins
if [ ! -x /usr/libexec/docker/cli-plugins/docker-compose ]; then
  curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
    -o /usr/libexec/docker/cli-plugins/docker-compose
  chmod +x /usr/libexec/docker/cli-plugins/docker-compose
fi
# buildx — BẮT BUỘC: compose build cần buildx >= 0.17, AL2023 không có sẵn
if [ ! -x /usr/libexec/docker/cli-plugins/docker-buildx ]; then
  BV=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep -o '"tag_name": "[^"]*"' | head -1 | cut -d'"' -f4)
  curl -sSL "https://github.com/docker/buildx/releases/download/$BV/buildx-$BV.linux-amd64" \
    -o /usr/libexec/docker/cli-plugins/docker-buildx
  chmod +x /usr/libexec/docker/cli-plugins/docker-buildx
fi

# --- Đọc secret từ SSM Parameter Store ---
getp() { aws ssm get-parameter --region "$REGION" --name "$SSM_PREFIX/$1" --with-decryption --query Parameter.Value --output text 2>/dev/null; }
JWT_SECRET=$(getp JWT_SECRET)
POSTGRES_PASSWORD=$(getp POSTGRES_PASSWORD)
MINIO_PASSWORD=$(getp MINIO_ROOT_PASSWORD)
SEED_ADMIN_PASSWORD=$(getp SEED_ADMIN_PASSWORD)
SEED_STAFF_PASSWORD=$(getp SEED_STAFF_PASSWORD)
GITHUB_TOKEN=$(getp github_token)
ACME_EMAIL=$(getp acme_email); [ -z "$ACME_EMAIL" ] || [ "$ACME_EMAIL" = "None" ] && ACME_EMAIL="admin@$APP_DOMAIN"

# --- Clone / cập nhật code ---
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only || true
else
  if [ -n "$GITHUB_TOKEN" ] && [ "$GITHUB_TOKEN" != "None" ]; then
    CLONE_URL="https://x-access-token:$GITHUB_TOKEN@$(echo "$REPO_URL" | sed 's#https://##')"
  else
    CLONE_URL="$REPO_URL"
  fi
  git clone "$CLONE_URL" "$APP_DIR"
fi

# --- Ghi .env.prod ---
cat > "$APP_DIR/deploy/.env.prod" <<ENVEOF
API_DOMAIN=$API_DOMAIN
S3_DOMAIN=$S3_DOMAIN
APP_DOMAIN=$APP_DOMAIN
ACME_EMAIL=$ACME_EMAIL
POSTGRES_USER=omnigem
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=gem_inventory
DATABASE_URL=postgres://omnigem:$POSTGRES_PASSWORD@postgres:5432/gem_inventory
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://$APP_DOMAIN
MINIO_ROOT_USER=omnigem-minio
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
MINIO_ACCESS_KEY=omnigem-minio
MINIO_SECRET_KEY=$MINIO_PASSWORD
MINIO_BUCKET=gem-inventory-photos
MINIO_ENDPOINT=https://$S3_DOMAIN
MINIO_PUBLIC_URL=https://$S3_DOMAIN
VITE_API_BASE_URL=https://$API_DOMAIN/
SEED_ADMIN_USERNAME=owner
SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD
SEED_STAFF_USERNAME=chi.trang
SEED_STAFF_PASSWORD=$SEED_STAFF_PASSWORD
SEED_DEMO_ITEMS=false
ENVEOF
chmod 600 "$APP_DIR/deploy/.env.prod"

# --- Dựng stack ---
cd "$APP_DIR/deploy"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# --- Migrate (mỗi lần) + seed (chỉ 1 lần, marker trên EBS) ---
sleep 10
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api node dist/db/migrate.js || true
if [ ! -f "$APP_DIR/.seeded" ]; then
  docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api node dist/db/seed.js && touch "$APP_DIR/.seeded"
fi
echo "=== gem bootstrap done $(date) ==="
