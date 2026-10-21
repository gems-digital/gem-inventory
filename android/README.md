# gem-inventory — Android app (Kotlin)

App cho chị Trang (nhập hàng + chụp ảnh tại cửa hàng) và owner (xem danh sách + margin).

> ✅ **Project đã được khởi tạo in-place** (slice 1 — Đăng nhập). Có sẵn Gradle wrapper
> (`gradlew`, `gradle/wrapper/gradle-wrapper.jar`), `settings.gradle.kts`, version catalog
> (`gradle/libs.versions.toml`) và module `:app`.

## Cấu hình đã chọn

| Mục | Giá trị |
|---|---|
| Language | Kotlin 2.0.21 |
| UI | Jetpack Compose (BOM 2024.12.01) + Material3 |
| Package / applicationId | `com.omnigem.inventory` |
| Minimum SDK | 26 (Android 8.0) |
| Target SDK | 34 · compileSdk 35 |
| Build config | Kotlin DSL (`build.gradle.kts`) + version catalog |
| AGP / Gradle | 8.7.3 / 8.11.1 (wrapper) |
| JVM target | 17 (build chạy bằng JDK 21) |
| DI | thủ công — `di/AppContainer.kt` (ServiceLocator), không dùng Hilt |

## Build & chạy

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
# Dùng JDK 21 (AGP 8.7.x chưa hỗ trợ JDK 27). Ví dụ:
export JAVA_HOME=/Users/<bạn>/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home
./gradlew assembleDebug        # APK: app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties` (gitignored) cần `sdk.dir=<đường dẫn Android SDK>`.
Mở bằng Android Studio: `File → Open` thư mục `android/`. Nav bắt đầu ở `login` → `list` (placeholder).

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
