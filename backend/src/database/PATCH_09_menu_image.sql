-- ============================================================
-- PATCH 09 — เพิ่มคอลัมน์ image_url สำหรับเก็บ URL หรือ Data URL รูปเมนูอาหาร
-- รันซ้ำได้ปลอดภัย (idempotent)
-- ============================================================
BEGIN;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;

