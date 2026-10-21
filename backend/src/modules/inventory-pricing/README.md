# Module `inventory-pricing`

Module nghiệp vụ lõi, thiết kế **độc lập** để sau ghép thẳng vào `omnigem-api` (ADR-001).
Không import chéo với bề mặt public; mọi quyền truy cập dữ liệu giá đi qua đây.

## Bố cục dự kiến (dựng ở phase triển khai)

```
inventory-pricing/
├── routes.ts         # đăng ký endpoint vào Fastify instance
├── schema.ts         # Zod schema (input validation + infer types)
├── service.ts        # logic nghiệp vụ (margin tính lúc đọc, RBAC)
├── repository.ts     # truy cập Postgres (findAll/findById/create/update/delete)
├── auth/             # JWT, hash (argon2), rate-limit login, RBAC guard
└── photos.ts         # ký upload Cloudinary cho client
```

## Endpoint (xem PRD §7)

- `POST /auth/login`
- `GET /inventory/items` · `GET /inventory/items/:id`
- `POST /inventory/items` · `PATCH /inventory/items/:id` · `DELETE /inventory/items/:id`
- `POST /inventory/photos/sign`
- `/users` (admin)

Response theo envelope `{ success, data?, error?, meta? }`.
