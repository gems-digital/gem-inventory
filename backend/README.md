# gem-inventory — Backend

Node.js + TypeScript + Fastify + PostgreSQL. Dữ liệu giá nội bộ (auth bắt buộc, `Cache-Control: no-store`).

## Chạy local

```bash
cd backend
cp .env.example .env         # điền DATABASE_URL, JWT_SECRET, Cloudinary
npm install
# tạo DB rồi áp migration (công cụ migration chốt ở phase triển khai):
#   psql "$DATABASE_URL" -f migrations/001_init.sql
npm run dev                  # http://localhost:3000/health
```

## Scripts

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy watch (tsx) |
| `npm run build` | biên dịch sang `dist/` |
| `npm start` | chạy bản build |
| `npm run typecheck` | kiểm tra type |
| `npm test` | chạy test (vitest) |

## Cấu trúc

- `src/config/env.ts` — validate biến môi trường lúc khởi động (fail fast).
- `src/index.ts` — bootstrap Fastify + `/health`.
- `src/modules/inventory-pricing/` — module nghiệp vụ (xem README trong đó).
- `migrations/` — schema SQL nguồn.

> Thiết kế để sau "dời nhà" vào `omnigem-api`: giữ module `inventory-pricing` không phụ thuộc
> bề mặt public; role DB public không bao giờ đọc bảng giá nội bộ.
