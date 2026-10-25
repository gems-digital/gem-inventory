-- 003_soft_delete.sql — UC-06: ẩn món (xóa mềm) cho inventory_item
-- Cả hai cột đều NULLABLE — không phá item cũ (NULL = đang hiện).
-- Giữ `code UNIQUE` toàn cục (MVP): mã đã ẩn vẫn chặn tạo trùng (spec §3).

ALTER TABLE inventory_item
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,                        -- NULL = đang hiện; có giá trị = đã ẩn
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES app_user(id);       -- ai đã ẩn (audit)

-- Partial index để list món đang hiện nhanh (bỏ qua các dòng đã ẩn).
CREATE INDEX IF NOT EXISTS idx_inventory_item_active
  ON inventory_item (created_at DESC)
  WHERE deleted_at IS NULL;
