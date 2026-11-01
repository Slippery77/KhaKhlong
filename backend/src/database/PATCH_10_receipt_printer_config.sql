-- ============================================================
-- PATCH 10 — เพิ่มการตั้งค่าใบเสร็จและเครื่องพิมพ์ใน config_definitions
-- receipt_footer: ข้อความส่วนท้ายใบเสร็จ
-- receipt_show_tax_id: เปิด/ปิด แสดงเลขประจำตัวผู้เสียภาษี
-- receipt_show_cashier: เปิด/ปิด แสดงชื่อพนักงานแคชเชียร์
-- receipt_show_address: เปิด/ปิด แสดงที่อยู่และเบอร์โทรร้าน
-- รันด้วย user postgres (เพราะ pos_app ถูก REVOKE DML บน config_definitions)
-- ============================================================
BEGIN;

INSERT INTO config_definitions
    (config_key, value_type, default_value, min_value, max_value, allowed_values, owner_only, description) VALUES
 ('receipt_footer', 'text', E'ขอบคุณที่ใช้บริการ\nโปรดตรวจสอบรายการก่อนออกจากร้าน', NULL, NULL, NULL, false, 'ข้อความท้ายใบเสร็จ'),
 ('receipt_show_tax_id', 'bool', 'true', NULL, NULL, NULL, false, 'แสดงเลขประจำตัวผู้เสียภาษีบนใบเสร็จ'),
 ('receipt_show_cashier', 'bool', 'true', NULL, NULL, NULL, false, 'แสดงชื่อพนักงานแคชเชียร์บนใบเสร็จ'),
 ('receipt_show_address', 'bool', 'true', NULL, NULL, NULL, false, 'แสดงที่อยู่และเบอร์โทรร้านบนใบเสร็จ')
ON CONFLICT (config_key) DO UPDATE
SET default_value = EXCLUDED.default_value,
    description = EXCLUDED.description;

-- เติมค่าเริ่มต้นให้ทุกร้านที่มีอยู่ในระบบ
INSERT INTO system_config (tenant_id, config_key, config_value)
SELECT t.tenant_id, cd.config_key, cd.default_value
FROM tenants t
CROSS JOIN config_definitions cd
WHERE cd.config_key IN ('receipt_footer', 'receipt_show_tax_id', 'receipt_show_cashier', 'receipt_show_address')
ON CONFLICT (tenant_id, config_key) DO NOTHING;

COMMIT;
