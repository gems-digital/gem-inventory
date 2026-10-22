-- 002_dimensions_attributes.sql — Slice 5: kích thước có cấu trúc + đặc điểm chung
-- Mọi cột mới đều NULLABLE — không phá item cũ, không chặn lưu (BUILD.md §Slice 5).
-- Cột `size` text cũ GIỮ NGUYÊN (legacy, list/detail sẽ suy chuỗi hiển thị từ `dimensions`).

ALTER TABLE inventory_item
  ADD COLUMN IF NOT EXISTS dimensions       jsonb,     -- object theo product_type (shape ở BUILD.md)
  ADD COLUMN IF NOT EXISTS treatment        text,      -- A|B|C|BC
  ADD COLUMN IF NOT EXISTS transparency     text,      -- opaque|semi|translucent|ice|glassy
  ADD COLUMN IF NOT EXISTS origin           text,      -- myanmar|china|vietnam|other
  ADD COLUMN IF NOT EXISTS weight_gram      numeric,
  ADD COLUMN IF NOT EXISTS certificate_code text;
