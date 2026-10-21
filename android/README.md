# gem-inventory — Android app (Kotlin)

App cho chị Trang (nhập hàng + chụp ảnh tại cửa hàng) và owner (xem danh sách + margin).

> ⚠️ **Khởi tạo project bằng Android Studio** để có Gradle wrapper (`gradlew`, `gradle-wrapper.jar`)
> và cấu trúc chuẩn — không nên tạo tay vì dễ sai wrapper. Thư mục này sẽ chứa project sau khi init.

## Cấu hình khi tạo project (New Project → Empty Activity)

| Mục | Giá trị |
|---|---|
| Language | Kotlin |
| UI | Jetpack Compose |
| Package name | `com.omnigem.inventory` |
| Minimum SDK | API 26 (Android 8.0) |
| Build config | Kotlin DSL (`build.gradle.kts`) |

## Thư viện dự kiến

- **Retrofit + OkHttp + Moshi (hoặc kotlinx.serialization)** — gọi REST API backend.
- **Coil** — hiển thị ảnh Cloudinary.
- **CameraX** (hoặc intent camera hệ thống) — chụp ảnh món hàng.
- **DataStore** — lưu JWT đăng nhập.

## Màn hình (xem PRD §5)

1. Đăng nhập.
2. Danh sách hàng (lọc theo loại SP / mệnh, search theo mã) — hiển thị giá bán / giá sàn / margin.
3. Chi tiết món.
4. Thêm / sửa món + chụp/chọn ảnh.

## Kết nối backend

- Base URL trỏ tới API Node (`backend/`). Để cấu hình qua `local.properties` hoặc build config,
  KHÔNG hardcode secret trong source.
