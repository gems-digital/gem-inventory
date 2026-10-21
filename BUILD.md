# BUILD.md — hợp đồng chung cho backend + mobile (đọc trước khi code)

Nguồn sự thật cho cả 2 agent. PRD/use-case/UI: `gem-digital-center-hub/inventory-app/` và artifact UI.
Phương pháp: **cuốn chiếu từng màn hình** (vertical slice) — mỗi slice làm trọn backend + mobile rồi mới sang màn kế.

## Thứ tự slice
1. **Đăng nhập** (auth) — nền backend (DB, migration, JWT, RBAC) + nền Android (Gradle, Compose, nav, Retrofit, theme) + màn Login.
2. **Danh sách hàng** — `GET /inventory/items` + màn list (lọc loại SP, search, hiển thị giá bán/sàn/margin, badge sát-sàn + số ảnh).
3. **Chi tiết món** — `GET /inventory/items/:id` + màn detail (gallery nhiều ảnh, margin, "dư địa giảm giá").
4. **Thêm/Sửa món** — `POST`/`PATCH /inventory/items`, `POST /inventory/photos/sign` + form (segmented độc bản/hàng loạt, chip mệnh, lưới nhiều ảnh) + camera.

Mỗi slice kết thúc bằng: test pass + 1 commit (`feat: slice N <màn>`).

## Môi trường
- Backend: Node 22. Postgres qua Docker — **cách chính thức**: `docker compose up -d` (file `docker-compose.yml` ở gốc repo, service `gem-pg`, DB `gem_inventory`, user `postgres`/`dev`, cổng 5432). Test: vitest (integration chạy trên Postgres này). *Lưu ý môi trường: nếu Docker daemon không khởi động được trong shell sandbox, bật Docker Desktop bằng tay rồi `docker compose up -d`; chỉ khi không có Docker mới dùng Postgres native làm fallback cục bộ.*
- Android: set `export ANDROID_HOME=$HOME/Library/Android/sdk`. Dựng Gradle wrapper (cài gradle qua brew nếu cần: `brew install gradle` rồi `gradle wrapper --gradle-version 8.11`). Thiếu package SDK thì dùng `sdkmanager`.
- Ảnh: **MinIO** (S3-compatible) qua Docker compose — API `http://localhost:9000`, console 9001, creds dev `minioadmin/minioadmin`, bucket `gem-inventory-photos` (đọc công khai; ảnh không nhạy cảm). Backend env: `MINIO_ENDPOINT=http://localhost:9000`, `MINIO_ACCESS_KEY=minioadmin`, `MINIO_SECRET_KEY=minioadmin`, `MINIO_BUCKET=gem-inventory-photos`, `MINIO_PUBLIC_URL=http://localhost:9000` (emulator Android dùng `http://10.0.2.2:9000`). Thay hẳn Cloudinary. *Lưu ý sandbox: proxy Docker ở đây chỉ kéo official image → image MinIO có thể không pull được; khi đó chạy MinIO native/đợi allowlist, code vẫn dựng & unit-test được.*
- KHÔNG commit secret. `.env` từ `.env.example` (đổi CLOUDINARY_* → MINIO_* ở env schema).

## API contract (REST, envelope `{ success, data?, error?, meta? }`)
- `POST /auth/login` body `{ username, password }` → `{ success, data: { token, user: { id, username, role } } }`. Sai → 401. Rate-limit.
- `GET /inventory/items?product_type=&menh=&q=` → `{ success, data: Item[], meta }`. Item gồm margin tính sẵn.
- `GET /inventory/items/:id` → `{ success, data: Item }`.
- `POST /inventory/items` (auth) body ItemInput → `201 { success, data: Item }`. Validate Zod; mã trùng → 409.
- `PATCH /inventory/items/:id` (auth) → `{ success, data: Item }`.
- `DELETE /inventory/items/:id` (admin) → `{ success }`.
- `POST /inventory/photos/sign` (auth) — **MinIO (S3-compatible)**: body `{ files: [{ contentType }] }` (≤8) → `{ success, data: [{ uploadUrl, publicUrl, key }] }`. `uploadUrl` = presigned S3 PUT (dùng `@aws-sdk/client-s3` + `s3-request-presigner`, path-style), client PUT ảnh thẳng lên đó; `publicUrl` = URL đọc công khai để lưu vào `photoUrls[]`.
- Header mọi route dữ liệu: `Cache-Control: no-store`. JWT Bearer.

### Kiểu Item (response, margin tính lúc đọc — KHÔNG lưu)
```
Item {
  id, code, name, itemKind: 'unique'|'batch',
  productType: 'ring'|'bracelet'|'beads'|'pendant',
  jadeType, color, size, menh: string[], note,
  photoUrls: string[],          // ảnh[0] = đại diện, tối đa 8
  quantity: number,
  costPriceVnd, salePriceVnd, floorPriceVnd,   // NHẠY CẢM
  marginVnd, marginPct,         // tính sẵn = sale - cost
  belowFloorWarn: boolean,      // true khi (sale - floor)/sale < 0.10 (sát sàn)
  createdAt, updatedAt
}
```

## Data model (Postgres) — cập nhật multi-ảnh
Bảng `app_user(id, username unique, password_hash, role staff|admin, created_at)`.
Bảng `inventory_item`: như `backend/migrations/001_init.sql`, nhưng **đổi `photo_url text` → `photo_urls text[] NOT NULL`** (ảnh[0] = đại diện, ≤ 8; có thể thêm CHECK `array_length ≤ 8`). Giá VND `bigint`. `cost_price_vnd`/`floor_price_vnd` nhạy cảm — không bao giờ ra bề mặt public.

## Design tokens (khớp artifact UI)
- Nền ivory `#F4F2EC`; surface `#FFFFFF`; mực `#1A241E`; muted `#6C756C`; line `#E5E3DA`.
- Jade accent `#2E7D5B` (đậm `#246349`, soft `#E7F1EC`).
- Cảnh báo sát-sàn cam `#C2410C` (nền `#FBEAE1`) — luôn kèm icon + chữ, không chỉ màu.
- Lời dương màu `#1F7A57`. Nhãn giá nội bộ: chip `NỘI BỘ` nền `#FBF1E0` chữ `#B0742A`.
- Font: Inter. Số tiền: tabular-nums. Màn phone 390-ish dp.
- Loại SP VN: Nhẫn/Vòng/Chuỗi hạt/Mặt dây. Mệnh: Kim/Mộc/Thủy/Hỏa/Thổ.

## Chất lượng (rule chung)
- File nhỏ, immutable, validate biên, không hardcode secret, lỗi xử lý rõ.
- Test ≥ 80% phần logic (margin, validate, RBAC, auth). Commit theo conventional commits.
