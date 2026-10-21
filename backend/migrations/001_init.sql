-- 001_init.sql — bảng nền cho OmniGem Kho & Giá
-- Chạy trên PostgreSQL. (Công cụ migration sẽ chọn ở phase triển khai; file này là schema nguồn.)

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- cho gen_random_uuid()

-- Vai trò người dùng
CREATE TYPE user_role AS ENUM ('staff', 'admin');

CREATE TABLE app_user (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username      text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role          user_role NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Loại món & loại sản phẩm
CREATE TYPE item_kind AS ENUM ('unique', 'batch');
CREATE TYPE product_type AS ENUM ('ring', 'bracelet', 'beads', 'pendant');

CREATE TABLE inventory_item (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text NOT NULL UNIQUE,            -- mã tự đặt
    name            text,
    item_kind       item_kind NOT NULL,
    product_type    product_type NOT NULL,
    jade_type       text,                            -- loại ngọc / chất liệu
    color           text,
    size            text,
    menh            text[],                          -- Kim|Moc|Thuy|Hoa|Tho (tùy chọn)
    note            text,
    photo_urls      text[] NOT NULL CHECK (array_length(photo_urls, 1) <= 8), -- ảnh Cloudinary, ảnh[0] = đại diện, tối đa 8
    quantity        integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    cost_price_vnd  bigint NOT NULL CHECK (cost_price_vnd >= 0),   -- NHẠY CẢM: giá nhập
    sale_price_vnd  bigint NOT NULL CHECK (sale_price_vnd >= 0),   -- giá bán niêm yết
    floor_price_vnd bigint NOT NULL CHECK (floor_price_vnd >= 0),  -- NHẠY CẢM: giá sàn
    product_id      uuid,                            -- map tới PRODUCT public (để sau, nullable)
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid REFERENCES app_user(id),
    updated_by      uuid REFERENCES app_user(id)
);

CREATE INDEX idx_inventory_item_product_type ON inventory_item (product_type);
CREATE INDEX idx_inventory_item_menh ON inventory_item USING gin (menh);

-- GHI CHÚ BẢO MẬT (ADR-001): cost_price_vnd và floor_price_vnd là dữ liệu nội bộ.
-- Khi ghép vào omnigem-api, role DB "public" TUYỆT ĐỐI không được SELECT bảng này.
-- margin KHÔNG lưu — tính lúc đọc: sale_price_vnd - cost_price_vnd.
