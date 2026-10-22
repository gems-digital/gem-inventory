# Deploy production — Contabo VPS (Docker Compose + Caddy auto-HTTPS)

Stack: API (Node) + Postgres + MinIO + Caddy. Caddy tự xin chứng chỉ Let's Encrypt.

## 0. Chuẩn bị (1 lần)
- **Domain:** trỏ 2 bản ghi A về IP VPS: `api.<domain>` và `s3.<domain>`.
  *(Chưa có domain? Dùng tạm hostname free như `<ip>.sslip.io` → `api.<ip>.sslip.io` / `s3.<ip>.sslip.io`.)*
- **Mở cổng** 80 và 443 trên VPS (firewall/Contabo panel).
- Cài **Docker + Docker Compose** trên VPS.

## 1. Lấy code + cấu hình secret
```bash
git clone git@github.com:gems-digital/gem-inventory.git
cd gem-inventory/deploy
cp .env.prod.example .env.prod
# Sinh secret mạnh và điền vào .env.prod:
openssl rand -base64 32     # JWT_SECRET
openssl rand -base64 24     # POSTGRES_PASSWORD, MINIO_SECRET_KEY...
# Điền API_DOMAIN, S3_DOMAIN, ACME_EMAIL, DATABASE_URL (khớp POSTGRES_*),
# MINIO_ENDPOINT/MINIO_PUBLIC_URL = https://s3.<domain>, và mật khẩu owner/chị Trang THẬT.
```

## 2. Khởi chạy
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
# Caddy cần vài giây xin cert (phải mở 80/443). Xem log:
docker compose -f docker-compose.prod.yml logs -f caddy
```

## 3. Migrate + seed (1 lần)
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api node dist/db/migrate.js
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm api node dist/db/seed.js
```
Seed đọc `SEED_*_PASSWORD` từ `.env.prod` → tạo owner + chị Trang với mật khẩu thật.

## 4. Kiểm tra
```bash
curl https://api.<domain>/health            # {"success":true,...}
curl -X POST https://api.<domain>/auth/login -H 'content-type: application/json' \
  -d '{"username":"owner","password":"<mật khẩu thật>"}'    # trả token
```
Thử ảnh: đăng nhập → `POST https://api.<domain>/inventory/photos/sign` → uploadUrl trỏ `https://s3.<domain>/...`.

## 5. Đưa app cho chị Trang (PWA — iOS + Android, KHÔNG cần cài app store)
PWA được build & phục vụ tự động bởi compose ở **`https://app.<domain>`** (build dùng `VITE_API_BASE_URL`).
1. Gửi chị Trang link `https://app.<domain>`, mở bằng **Safari (iOS)** hoặc Chrome (Android).
2. **Thêm vào màn hình chính**: iOS Safari → nút Share → "Add to Home Screen"; Android Chrome → menu → "Cài đặt ứng dụng". → có icon như app, mở full-screen.
3. Đăng nhập bằng user đã seed (owner / chị Trang).

*(Tùy chọn — app Android native cũ: `cd ../android && ./gradlew assembleDebug -PapiBaseUrl=https://api.<domain>/` → APK trong `app/build/outputs/apk/debug/`. Không bắt buộc vì PWA đã phủ iOS + Android.)*

## Bảo mật — bắt buộc
- [ ] Đổi hết secret trong `.env.prod` (KHÔNG dùng giá trị dev/minioadmin).
- [ ] Mật khẩu owner/chị Trang thật (không owner123/trang123).
- [ ] `.env.prod` KHÔNG commit (đã gitignore).
- [ ] Chỉ mở 80/443 ra ngoài; Postgres/MinIO không publish cổng trực tiếp (chỉ Caddy proxy).
- [ ] Sao lưu định kỳ volume `pg-data` (và `minio-data` nếu ảnh ở MinIO).

## Vận hành
- Cập nhật phiên bản mới: `git pull` → `docker compose ... up -d --build` → chạy lại migrate nếu có migration mới.
- Log API: `docker compose -f docker-compose.prod.yml logs -f api`.
