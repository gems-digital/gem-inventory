# OmniGem Kho & Giá (gem-inventory)

App **nội bộ** để quản lý giá vốn / giá bán / giá sàn của hàng ngọc tại cửa hàng OmniGem.
Chị Trang nhập hàng tại shop (điện thoại, có chụp ảnh); owner xem toàn bộ danh sách + margin từ xa
để quyết định giảm giá campaign an toàn.

> ⚠️ **Dữ liệu nội bộ nhạy cảm:** giá nhập (giá vốn) và giá sàn KHÔNG bao giờ được lộ ra bề mặt
> công khai. Mọi truy cập đều yêu cầu đăng nhập.

## Cấu trúc monorepo

```
gem-inventory/
├── backend/     # Node.js + TypeScript API (module inventory-pricing) + PostgreSQL
└── android/     # App Kotlin (Jetpack Compose) cho chị Trang + owner
```

## Tài liệu

- **PRD:** `gem-digital-center-hub/inventory-app/prd/PRD.md` (trong docs hub).
- Backend thiết kế thành module `inventory-pricing` để sau ghép vào `omnigem-api`
  (xem ADR-001 của omni-web). Không có đường nào để role DB public đọc bảng giá nội bộ.

## Bắt đầu

- Backend: xem `backend/README.md`.
- Android: xem `android/README.md`.
