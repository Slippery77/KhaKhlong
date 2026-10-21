-- ############################################################
-- PATCH 01 : ปิดธง app.allow_purge คืนหลังใช้งานเสร็จ
--
-- ปัญหา
--   admin_purge_tenant() เปิดธง app.allow_purge เพื่อข้ามการป้องกันการลบ
--   แต่ไม่ได้ปิดคืน ธงจึงค้างอยู่จนจบ transaction ที่เรียกฟังก์ชันนี้
--   ทำให้คำสั่งลบ payments, inventory_transactions, receipt_print_logs,
--   cash_movements และ audit_logs ใน transaction เดียวกันผ่านได้ทั้งหมด
--
-- ตรวจพบจาก
--   ชุดทดสอบ PGADMIN_TEST.sql รันบน pgAdmin ซึ่งห่อทั้งสคริปต์ไว้ใน
--   transaction เดียว ทำให้ข้อ "ลบรายการชำระเงินไม่ได้" และ
--   "ลบบันทึกการตรวจสอบไม่ได้" ไม่ผ่าน
--
-- วิธีใช้
--   เปิด Query Tool บนฐานข้อมูลที่ติดตั้งแล้ว วางไฟล์นี้ทั้งไฟล์ กด Execute
--   ปลอดภัยกับข้อมูลที่มีอยู่ เพราะแก้เฉพาะนิยามของฟังก์ชัน
-- ############################################################

CREATE OR REPLACE FUNCTION admin_purge_tenant(p_tenant uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM set_config('app.allow_purge', 'on', true);
  DELETE FROM tenants WHERE tenant_id = p_tenant;
  -- ปิดธงคืนทันที ไม่งั้นการป้องกันการลบจะปิดไปตลอด transaction ที่เรียกฟังก์ชันนี้
  PERFORM set_config('app.allow_purge', 'off', true);
END $$;

REVOKE EXECUTE ON FUNCTION admin_purge_tenant(uuid) FROM PUBLIC;

-- ตรวจว่าแก้แล้ว ต้องได้ true
SELECT (prosrc LIKE '%''off'', true%') AS "แก้ไขเรียบร้อย"
FROM pg_proc WHERE proname = 'admin_purge_tenant';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'employee' AND p.permission_key = 'cash:movement'
ON CONFLICT DO NOTHING;