-- ############################################################
-- PATCH 04 : ผูก dining_tables กับ floors ระดับ DB ด้วย floor_id
--
-- ปัญหา
--   เดิม dining_tables เก็บแค่ "เลขชั้น" (floor SMALLINT) ไม่มี FK ไปหา floors
--   ทำให้ DB ไม่บังคันว่าโต๊ะชี้ชั้นที่มีอยู่จริง และแก้ schema ทีหลังยาก
--   PATCH นี้เปลี่ยนเป็นอ้างอิงด้วย floor_id (UUID) + FOREIGN KEY ตรง ๆ
--
-- ผลที่ตามมา
--   * โต๊ะจะสร้าง/ย้ายเข้าชั้นที่ไม่มีอยู่ไม่ได้อีกเลย (DB บล็อกด้วย FK)
--   * ลบชั้นที่ยังมีโต๊ะไม่ได้ (ON DELETE RESTRICT)
--   * เปลี่ยน "เลขชั้น" ไม่กระทบโต๊ะอีกต่อไป (floor_id คงเดิม) — โค้ดไม่ต้องย้ายโต๊ะตาม
--
-- วิธีใช้
--   เปิด pgAdmin → Query Tool บนฐาน pwa_pos **login ด้วย user postgres**
--   (ALTER/DROP ต้องเป็นเจ้าของตาราง pos_app ไม่มีสิทธิ์)
--   วางไฟล์ทั้งไฟล์ กด Execute — รันได้ครั้งเดียวต่อฐาน
--
-- หมายเหตุ
--   FULL_INSTALL.sql ยังคงนิยามแบบเดิม (floor SMALLINT) ไว้ให้ chain
--   FULL_INSTALL → PATCH_03 → PATCH_04 ทำงานได้บนเครื่องใหม่
-- ############################################################

BEGIN;

-- -------------------------------------------------------------
-- 1) เติมแถวชั้นสำหรับเลขชั้นที่ยังไม่มีใน floors (กันข้อมูลโต๊ะเดิมกำพร้า)
-- -------------------------------------------------------------
INSERT INTO floors (tenant_id, floor_no, table_count)
SELECT d.tenant_id, d.floor, COUNT(*)::SMALLINT
FROM dining_tables d
WHERE NOT EXISTS (
  SELECT 1 FROM floors f WHERE f.tenant_id = d.tenant_id AND f.floor_no = d.floor
)
GROUP BY d.tenant_id, d.floor
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- 2) เพิ่มคอลัมน์ floor_id + FK ไปหา floors
--    ON DELETE RESTRICT = ลบชั้นที่ยังมีโต๊ะไม่ได้ (กันชั้นกำพร้า)
-- -------------------------------------------------------------
ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS floor_id UUID
  REFERENCES floors(floor_id) ON DELETE RESTRICT;

-- -------------------------------------------------------------
-- 3) เติมค่าจากเลขชั้นเดิม
-- -------------------------------------------------------------
UPDATE dining_tables t
SET floor_id = f.floor_id
FROM floors f
WHERE f.tenant_id = t.tenant_id
  AND f.floor_no = t.floor
  AND t.floor_id IS NULL;

-- -------------------------------------------------------------
-- 4) ต้องไม่มี NULL เหลือ — ถ้าเจอแสดงว่ามีข้อมูลที่ยัง map ไม่ได้ ต้องตรวจก่อน
-- -------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM dining_tables WHERE floor_id IS NULL) THEN
    RAISE EXCEPTION 'ยังมีโต๊ะที่ floor_id เป็น NULL — ตรวจข้อมูล dining_tables/floors ก่อนทำ NOT NULL';
  END IF;
END $$;

ALTER TABLE dining_tables ALTER COLUMN floor_id SET NOT NULL;

-- -------------------------------------------------------------
-- 5) index ให้ FK lookup + หน้าจอ (index เก่า idx_dining_tables_tenant_floor
--    ถูกลบอัตโนมัติพร้อมคอลัมน์ floor ในขั้นถัดไป)
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dining_tables_floor_id ON dining_tables (floor_id);

-- -------------------------------------------------------------
-- 6) ทิ้งคอลัมน์เลขชั้นเดิม — floor_id เป็นแหล่งข้อมูลเดียวจากนี้
--    (trigger status_guard / audit ไม่ได้อ้างอิงคอลัมน์นี้ จึงไม่กระทบ)
-- -------------------------------------------------------------
ALTER TABLE dining_tables DROP COLUMN floor;

COMMIT;

-- -------------------------------------------------------------
-- ตรวจผล: dining_tables ต้องมี floor_id NOT NULL + FK + index
-- -------------------------------------------------------------
SELECT c.column_name, c.is_nullable, c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'dining_tables'
ORDER BY c.ordinal_position;

SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'dining_tables'::regclass AND contype = 'f';
