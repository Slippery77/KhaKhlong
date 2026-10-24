-- ############################################################
-- PATCH 03 : ตาราง floors (หน้า "ตั้งค่าโต๊ะ" → จัดการชั้น)
--
-- ทำไมต้องมี
--   เดิมเก็บแค่ dining_tables.floor (ตัวเลข) ไม่มีที่เก็บข้อมูล "ชั้น" เอง
--   ทำให้ชั้นที่ยังไม่มีโต๊ะสักตัวไม่มีตัวตนในระบบ
--   เพิ่มชั้นก่อนแล้วค่อยใส่โต๊ะตามที่หน้า UI ทำได้ไม่ได้
--   PATCH นี้แยกชั้นออกมาเป็นตารางของตัวเอง
--
-- วิธีใช้
--   เปิด pgAdmin → Query Tool บนฐาน pwa_pos **login ด้วย user postgres**
--   (pos_app ไม่มีสิทธิ์ CREATE TABLE รันด้วย pos_app จะไม่ผ่าน)
--   วางไฟล์ทั้งไฟล์ กด Execute — รันซ้ำได้ (ทุกขั้นตอนมี IF NOT EXISTS / DROP IF EXISTS)
--
-- หลังรัน ต้อง restart backend หนึ่งครั้ง (PermissionCache ไม่เกี่ยว แต่ให้แน่ใจว่าโหลดโค้ดใหม่)
-- ############################################################

BEGIN;

-- -------------------------------------------------------------
-- 1) ตารางชั้น
--    table_count = จำนวนโต๊ะที่ "ตั้งไว้" ตอนสร้างชั้น (เป็นเป้าหมาย ไม่ใช่จำนวนจริง)
--    จำนวนจริงนับจาก dining_tables เอง
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS floors (
    floor_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    floor_no     SMALLINT NOT NULL CHECK (floor_no >= 1),
    name         VARCHAR(50),
    table_count  SMALLINT NOT NULL DEFAULT 0 CHECK (table_count >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_floors_tenant_floor_no UNIQUE (tenant_id, floor_no)
);
CREATE INDEX IF NOT EXISTS idx_floors_tenant_no ON floors (tenant_id, floor_no);

-- -------------------------------------------------------------
-- 2) สิทธิ์
--    FULL_INSTALL ใช้ GRANT ... ON ALL TABLES ซึ่งมองไม่เห็นตารางที่สร้างทีหลัง
--    จึงต้อง GRANT ให้ pos_app เอง
-- -------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON floors TO pos_app;

-- -------------------------------------------------------------
-- 3) RLS — ตามมาตรฐานตารางที่มี tenant_id ทุกตารางในโปรเจกต์นี้
--    ใช้ ENABLE ไม่ใช่ FORCE เหมือนเดิม เพื่อให้ owner (migration) ข้ามได้
-- -------------------------------------------------------------
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON floors;
CREATE POLICY tenant_isolation ON floors
  USING (tenant_id = (SELECT app_tenant_id()))
  WITH CHECK (tenant_id = (SELECT app_tenant_id()));

-- -------------------------------------------------------------
-- 4) updated_at อัตโนมัติ (function trg_set_updated_at() มีจาก FULL_INSTALL แล้ว)
-- -------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON floors;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON floors
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- -------------------------------------------------------------
-- 5) ขยาย CHECK ของ audit_logs.action_type
--    เดิมเป็น enum ที่ล็อกไว้ใน CHECK — ใส่ floor_created โดยไม่แก้จะโดน 23514 ทันที
--    หา constraint ด้วย pg_get_constraintdef กันชื่อ constraint ต่างกันระหว่างเวอร์ชัน
-- -------------------------------------------------------------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT conname FROM pg_constraint
           WHERE conrelid = 'audit_logs'::regclass
             AND pg_get_constraintdef(oid) LIKE '%action_type%'
  LOOP
    EXECUTE format('ALTER TABLE audit_logs DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'audit_logs'::regclass
      AND conname = 'audit_logs_action_type_check'
  ) THEN
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_check CHECK (action_type IN (
        'login_success','login_failed','logout',
        'menu_price_updated','role_changed','table_status_changed','config_updated',
        'user_created','user_deactivated','user_reactivated',
        'pin_changed','password_changed','pin_locked',
        'order_closed_unpaid','shift_reopened','inventory_adjusted','tenant_updated',
        'floor_created','floor_updated','floor_deleted'));
  END IF;
END $$;

-- -------------------------------------------------------------
-- 6) audit log ของชั้น — เขียนโดย trigger เหมือนตารางอื่น (ไม่เขียนจาก NestJS)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_audit_floors() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM audit_write(NEW.tenant_id, 'floor_created', jsonb_build_object(
      'floor_id', NEW.floor_id, 'floor_no', NEW.floor_no,
      'name', NEW.name, 'table_count', NEW.table_count));
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM audit_write(OLD.tenant_id, 'floor_deleted', jsonb_build_object(
      'floor_id', OLD.floor_id, 'floor_no', OLD.floor_no,
      'name', OLD.name, 'table_count', OLD.table_count));
    RETURN OLD;
  END IF;
  IF OLD.floor_no IS DISTINCT FROM NEW.floor_no
     OR OLD.name   IS DISTINCT FROM NEW.name
     OR OLD.table_count IS DISTINCT FROM NEW.table_count THEN
    PERFORM audit_write(NEW.tenant_id, 'floor_updated', jsonb_build_object(
      'floor_id', NEW.floor_id,
      'old_floor_no', OLD.floor_no, 'new_floor_no', NEW.floor_no,
      'old_name', OLD.name,        'new_name', NEW.name,
      'old_table_count', OLD.table_count, 'new_table_count', NEW.table_count));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS audit ON floors;
CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON floors
  FOR EACH ROW EXECUTE FUNCTION trg_audit_floors();

-- -------------------------------------------------------------
-- 7) backfill: ชั้นที่มีโต๊ะอยู่แล้ว (ทุกร้าน) ให้มีแถว floors ด้วย
--    table_count เติมด้วยจำนวนโต๊ะที่มีจริง จะได้ไม่ตรงกับความเป็นศูนย์
--    ปิด trigger audit ชั่วคราว — งาน migrate ไม่ใช่การกระทำของผู้ใช้ ไม่ควรเขียน log
-- -------------------------------------------------------------
ALTER TABLE floors DISABLE TRIGGER audit;
INSERT INTO floors (tenant_id, floor_no, table_count)
SELECT d.tenant_id, d.floor, COUNT(*)::SMALLINT
FROM dining_tables d
GROUP BY d.tenant_id, d.floor
ON CONFLICT DO NOTHING;
ALTER TABLE floors ENABLE TRIGGER audit;

COMMIT;

-- -------------------------------------------------------------
-- ตรวจผล: ต้องเจอตาราง floors + policy + 3 trigger
-- -------------------------------------------------------------
SELECT c.column_name
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'floors'
ORDER BY c.ordinal_position;

SELECT tgname FROM pg_trigger
WHERE tgrelid = 'floors'::regclass AND NOT tgisinternal;
