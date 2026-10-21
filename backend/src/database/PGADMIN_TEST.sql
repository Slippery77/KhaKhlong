-- ############################################################
-- PWA-POS : ชุดทดสอบสำหรับ pgAdmin
--
-- วิธีใช้
--   1. เปิด Query Tool บนฐานข้อมูลที่ติดตั้ง FULL_INSTALL.sql แล้ว
--   2. วางไฟล์นี้ทั้งไฟล์ กด Execute (F5)
--   3. ดูผลที่ตาราง Data Output ด้านล่าง
--
-- ไฟล์นี้สร้างร้านทดสอบ 2 ร้าน ทดลองทุกสถานการณ์ แล้วลบข้อมูลทดสอบทิ้งเอง
-- ไม่กระทบข้อมูลร้านอื่นที่มีอยู่แล้ว และรันซ้ำได้ไม่จำกัดครั้ง
--
-- ผลลัพธ์ที่ถูกต้องคือทุกแถวในคอลัมน์ outcome เป็น "ผ่าน"
-- ############################################################

-- ============================================================
-- เครื่องมือบันทึกผล
-- ============================================================
DROP TABLE IF EXISTS pos_test_log;
CREATE TABLE pos_test_log (
    seq      serial PRIMARY KEY,
    section  text,
    scenario text,
    expect   text,
    outcome  text,
    detail   text
);

-- คาดว่าคำสั่งต้องถูกปฏิเสธ และข้อความต้องมีคำที่ระบุ
CREATE OR REPLACE FUNCTION pos_t_err(p_section text, p_name text, p_sql text, p_frag text)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE msg text;
BEGIN
    EXECUTE p_sql;
    INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
    VALUES (p_section, p_name, 'ต้องถูกปฏิเสธ', 'ไม่ผ่าน', 'คำสั่งสำเร็จ ทั้งที่ระบบควรปฏิเสธ');
EXCEPTION WHEN others THEN
    msg := SQLERRM;
    IF position(lower(p_frag) in lower(msg)) > 0 THEN
        INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
        VALUES (p_section, p_name, 'ต้องถูกปฏิเสธ', 'ผ่าน', msg);
    ELSE
        INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
        VALUES (p_section, p_name, 'ต้องถูกปฏิเสธ', 'ไม่ผ่าน',
                'ถูกปฏิเสธด้วยสาเหตุอื่น (คาดว่าจะพบคำว่า "' || p_frag || '") : ' || msg);
    END IF;
END $fn$;

-- คาดว่าคำสั่งต้องสำเร็จ
CREATE OR REPLACE FUNCTION pos_t_ok(p_section text, p_name text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
    EXECUTE p_sql;
    INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
    VALUES (p_section, p_name, 'ต้องสำเร็จ', 'ผ่าน', NULL);
EXCEPTION WHEN others THEN
    INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
    VALUES (p_section, p_name, 'ต้องสำเร็จ', 'ไม่ผ่าน', SQLERRM);
END $fn$;

-- คาดว่าค่าที่ query ได้ต้องเท่ากับค่าที่ระบุ
CREATE OR REPLACE FUNCTION pos_t_eq(p_section text, p_name text, p_sql text, p_want text)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE got text;
BEGIN
    EXECUTE p_sql INTO got;
    IF got IS NOT DISTINCT FROM p_want THEN
        INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
        VALUES (p_section, p_name, 'ต้องได้ ' || p_want, 'ผ่าน', NULL);
    ELSE
        INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
        VALUES (p_section, p_name, 'ต้องได้ ' || p_want, 'ไม่ผ่าน', 'ได้ ' || COALESCE(got, 'NULL'));
    END IF;
EXCEPTION WHEN others THEN
    INSERT INTO pos_test_log(section, scenario, expect, outcome, detail)
    VALUES (p_section, p_name, 'ต้องได้ ' || p_want, 'ไม่ผ่าน', 'เกิดข้อผิดพลาด: ' || SQLERRM);
END $fn$;


-- ============================================================
-- ลบข้อมูลทดสอบของรอบก่อน (ถ้ามี)
-- ============================================================
DO $$
BEGIN
    PERFORM admin_purge_tenant('aaaaaaaa-0000-0000-0000-000000000001');
    PERFORM admin_purge_tenant('bbbbbbbb-0000-0000-0000-000000000002');
    -- admin_purge_tenant() เปิดธง app.allow_purge ไว้เพื่อข้ามการป้องกันการลบ
    -- ต้องปิดคืนทันที มิฉะนั้นการป้องกันการลบจะไม่ทำงานไปตลอด transaction นั้น
    PERFORM set_config('app.allow_purge', 'off', false);
END $$;


-- ============================================================
-- ส่วนที่ 1 : เตรียมข้อมูล และตรวจค่าเริ่มต้นของร้านใหม่
-- ============================================================
DO $$
DECLARE
    tA uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
    tB uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
    r_owner uuid; r_manager uuid; r_employee uuid;
BEGIN
    SELECT role_id INTO r_owner    FROM roles WHERE role_name = 'owner';
    SELECT role_id INTO r_manager  FROM roles WHERE role_name = 'manager';
    SELECT role_id INTO r_employee FROM roles WHERE role_name = 'employee';

    INSERT INTO tenants(tenant_id, restaurant_name, tenant_slug,
                        house_number, subdistrict, district, province, postal_code)
    VALUES (tA, 'ร้านทดสอบ A', 'pos-test-a', '1', 'x', 'y', 'z', '10000'),
           (tB, 'ร้านทดสอบ B', 'pos-test-b', '2', 'x', 'y', 'z', '10000');

    INSERT INTO users(users_id, tenant_id, role_id, username, email, password_hash, display_name) VALUES
      ('a0000000-0000-0000-0000-00000000000a', tA, r_owner,    'owner_a',  'owner_a@postest.local',  'h', 'เจ้าของ A'),
      ('a0000000-0000-0000-0000-00000000000b', tA, r_manager,  'mgr_a',    'mgr_a@postest.local',    'h', 'ผู้จัดการ A'),
      ('a0000000-0000-0000-0000-00000000000c', tA, r_employee, 'emp_a',    'emp_a@postest.local',    'h', 'พนักงาน A'),
      ('b0000000-0000-0000-0000-00000000000a', tB, r_owner,    'owner_b',  'owner_b@postest.local',  'h', 'เจ้าของ B');

    -- ชั้นต้องมาก่อน โต๊ะผูกกับ floors ด้วย floor_id (PATCH_03 + PATCH_04)
    INSERT INTO floors(floor_id, tenant_id, floor_no, name, table_count) VALUES
      ('a3000000-0000-0000-0000-000000000001', tA, 1, 'ชั้นล่าง', 3),
      ('b3000000-0000-0000-0000-000000000001', tB, 1, 'ชั้นล่าง', 1);

    INSERT INTO dining_tables(table_id, tenant_id, table_number, capacity, floor_id) VALUES
      ('a1000000-0000-0000-0000-000000000001', tA, 'A1', 4, 'a3000000-0000-0000-0000-000000000001'),
      ('a1000000-0000-0000-0000-000000000002', tA, 'A2', 2, 'a3000000-0000-0000-0000-000000000001'),
      ('a1000000-0000-0000-0000-000000000003', tA, 'A3', 2, 'a3000000-0000-0000-0000-000000000001'),
      ('b1000000-0000-0000-0000-000000000001', tB, 'B1', 4, 'b3000000-0000-0000-0000-000000000001');

    INSERT INTO categories(category_id, tenant_id, name) VALUES
      ('a2000000-0000-0000-0000-000000000001', tA, 'อาหารจานเดียว');

    INSERT INTO menu_items(menu_item_id, tenant_id, category_id, name, price, is_available) VALUES
      ('a3000000-0000-0000-0000-000000000001', tA, 'a2000000-0000-0000-0000-000000000001', 'กะเพราหมู', 60.00, true),
      ('a3000000-0000-0000-0000-000000000002', tA, 'a2000000-0000-0000-0000-000000000001', 'ต้มยำกุ้ง', 120.00, false);
END $$;

SELECT pos_t_eq('1 ร้านใหม่', 'ร้านใหม่ได้ค่าตั้งค่าครบอัตโนมัติ',
  $q$SELECT count(*)::text FROM system_config WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  '9');

SELECT pos_t_eq('1 ร้านใหม่', 'โต๊ะเปิดใหม่สถานะว่าง',
  $q$SELECT status FROM dining_tables WHERE table_id = 'a1000000-0000-0000-0000-000000000001'$q$,
  'available');

SELECT pos_t_err('1 ร้านใหม่', 'ชื่อร้าน (slug) ใช้คำสงวนไม่ได้',
  $q$INSERT INTO tenants(restaurant_name, tenant_slug, house_number, subdistrict, district, province, postal_code)
     VALUES ('x', 'admin', '1', 'x', 'y', 'z', '10000')$q$,
  'chk_tenant_slug_reserved');

SELECT pos_t_err('1 ร้านใหม่', 'ชื่อร้าน (slug) มีช่องว่างไม่ได้',
  $q$INSERT INTO tenants(restaurant_name, tenant_slug, house_number, subdistrict, district, province, postal_code)
     VALUES ('x', 'Shop Name', '1', 'x', 'y', 'z', '10000')$q$,
  'chk_tenant_slug_format');

SELECT pos_t_err('1 ร้านใหม่', 'อีเมลซ้ำแม้พิมพ์คนละตัวพิมพ์',
  $q$INSERT INTO users(tenant_id, role_id, username, email, password_hash, display_name)
     SELECT 'aaaaaaaa-0000-0000-0000-000000000001', role_id, 'emp_a2', 'EMP_A@PosTest.Local', 'h', 'x'
       FROM roles WHERE role_name = 'employee'$q$,
  'uq_users_email_lower');


-- ============================================================
-- ส่วนที่ 2 : กะการทำงาน
-- ============================================================
SELECT pos_t_err('2 กะ', 'เปิดบิลโดยยังไม่เปิดกะ',
  $q$INSERT INTO orders(tenant_id, table_id, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a1000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'no open shift');

SELECT pos_t_ok('2 กะ', 'พนักงานเปิดกะได้',
  $q$INSERT INTO shifts(shift_id, tenant_id, opening_cash, opened_by)
     VALUES ('a4000000-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001', 1000,
             'a0000000-0000-0000-0000-00000000000c')$q$);

SELECT pos_t_eq('2 กะ', 'วันทำการคำนวณให้เอง ไม่ใช่ค่าที่กรอก',
  $q$SELECT (business_date = compute_business_date('aaaaaaaa-0000-0000-0000-000000000001'))::text
       FROM shifts WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  'true');

SELECT pos_t_err('2 กะ', 'เปิดกะซ้ำในวันเดียวกัน',
  $q$INSERT INTO shifts(tenant_id, opening_cash, opened_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 500,
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'uq_shifts_tenant_business_date');

SELECT pos_t_err('2 กะ', 'พนักงานบันทึกเงินออกลิ้นชักไม่ได้',
  $q$INSERT INTO cash_movements(tenant_id, shift_id, direction, amount, reason, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a4000000-0000-0000-0000-000000000001', 'out', 100, 'ซื้อน้ำแข็ง',
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'cash:movement');

SELECT pos_t_ok('2 กะ', 'ผู้จัดการบันทึกเงินออกลิ้นชักได้',
  $q$INSERT INTO cash_movements(tenant_id, shift_id, direction, amount, reason, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a4000000-0000-0000-0000-000000000001', 'out', 100, 'ซื้อน้ำแข็ง',
             'a0000000-0000-0000-0000-00000000000b')$q$);

SELECT pos_t_err('2 กะ', 'รายการเงินลิ้นชักแก้ไขไม่ได้',
  $q$UPDATE cash_movements SET amount = 1
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  'immutable');


-- ============================================================
-- ส่วนที่ 3 : เปิดบิลและสั่งอาหาร
-- ============================================================
SELECT pos_t_ok('3 บิล', 'เปิดบิลที่โต๊ะ A1',
  $q$INSERT INTO orders(order_id, tenant_id, table_id, created_by)
     VALUES ('a5000000-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001',
             'a1000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-00000000000c')$q$);

SELECT pos_t_eq('3 บิล', 'ระบบออกเลขบิลให้เอง เริ่มที่ 1',
  $q$SELECT order_number::text FROM orders WHERE order_id = 'a5000000-0000-0000-0000-000000000001'$q$,
  '1');

SELECT pos_t_eq('3 บิล', 'เปิดบิลแล้วโต๊ะเปลี่ยนเป็นมีลูกค้าเอง',
  $q$SELECT status FROM dining_tables WHERE table_id = 'a1000000-0000-0000-0000-000000000001'$q$,
  'occupied');

SELECT pos_t_err('3 บิล', 'หนึ่งโต๊ะเปิดบิลซ้อนสองใบไม่ได้',
  $q$INSERT INTO orders(tenant_id, table_id, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a1000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'uq_orders_one_active_per_table');

SELECT pos_t_err('3 บิล', 'ปิดใช้งานโต๊ะที่มีบิลค้างอยู่ไม่ได้',
  $q$UPDATE dining_tables SET status = 'out_of_service'
      WHERE table_id = 'a1000000-0000-0000-0000-000000000001'$q$,
  'TBL-03');

SELECT pos_t_err('3 บิล', 'สั่งเมนูที่ปิดขายวันนี้ไม่ได้',
  $q$INSERT INTO order_items(tenant_id, order_id, menu_item_id, unit_price_snapshot, item_name_snapshot)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a5000000-0000-0000-0000-000000000001',
             'a3000000-0000-0000-0000-000000000002', 120, 'ต้มยำกุ้ง')$q$,
  'not available today');

SELECT pos_t_ok('3 บิล', 'สั่งกะเพราหมู 2 จาน',
  $q$INSERT INTO order_items(order_item_id, tenant_id, order_id, menu_item_id,
                             unit_price_snapshot, item_name_snapshot)
     VALUES ('a6000000-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001',
             'a5000000-0000-0000-0000-000000000001',
             'a3000000-0000-0000-0000-000000000001', 60, 'กะเพราหมู'),
            ('a6000000-0000-0000-0000-000000000002',
             'aaaaaaaa-0000-0000-0000-000000000001',
             'a5000000-0000-0000-0000-000000000001',
             'a3000000-0000-0000-0000-000000000001', 60, 'กะเพราหมู')$q$);

SELECT pos_t_err('3 บิล', 'แก้ราคาที่บันทึกไว้ในบิลแล้วไม่ได้',
  $q$UPDATE order_items SET unit_price_snapshot = 1
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000001'$q$,
  'snapshot columns are immutable');


-- ============================================================
-- ส่วนที่ 4 : จอครัว การยกเลิก และการยกเว้นค่าอาหาร
-- ============================================================
SELECT pos_t_err('4 ครัว', 'ข้ามสถานะจากยังไม่ส่งครัวไปกำลังทำไม่ได้',
  $q$UPDATE order_items SET status = 'preparing', kitchen_ticket_id = gen_random_uuid()
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000001'$q$,
  'invalid order_item transition');

SELECT pos_t_ok('4 ครัว', 'ส่งครัวทั้งสองจานพร้อมกัน',
  $q$UPDATE order_items SET status = 'queued',
         kitchen_ticket_id = 'a7000000-0000-0000-0000-000000000001'
      WHERE order_id = 'a5000000-0000-0000-0000-000000000001'$q$);

SELECT pos_t_ok('4 ครัว', 'ครัวเริ่มทำจานแรก',
  $q$UPDATE order_items SET status = 'preparing'
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000001'$q$);

SELECT pos_t_err('4 ครัว', 'พนักงานยกเลิกจานที่ครัวกำลังทำไม่ได้',
  $q$UPDATE order_items SET status = 'voided',
         voided_by = 'a0000000-0000-0000-0000-00000000000c',
         voided_at = now(), void_reason = 'ลูกค้าเปลี่ยนใจ'
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000001'$q$,
  'void:approve');

SELECT pos_t_ok('4 ครัว', 'ผู้จัดการยกเลิกจานที่ครัวกำลังทำได้',
  $q$UPDATE order_items SET status = 'voided',
         voided_by = 'a0000000-0000-0000-0000-00000000000b',
         voided_at = now(), void_reason = 'ลูกค้าเปลี่ยนใจ'
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000001'$q$);

SELECT pos_t_err('4 ครัว', 'จานที่ยกเลิกแล้วแก้กลับไม่ได้',
  $q$UPDATE order_items SET status = 'ready'
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000001'$q$,
  'invalid order_item transition');

SELECT pos_t_ok('4 ครัว', 'จานที่สองทำเสร็จและเสิร์ฟแล้ว',
  $q$UPDATE order_items SET status = 'preparing' WHERE order_item_id = 'a6000000-0000-0000-0000-000000000002';
    UPDATE order_items SET status = 'ready'     WHERE order_item_id = 'a6000000-0000-0000-0000-000000000002';
    UPDATE order_items SET status = 'served'    WHERE order_item_id = 'a6000000-0000-0000-0000-000000000002'$q$);

SELECT pos_t_err('4 ครัว', 'พนักงานยกเว้นค่าอาหารเองไม่ได้',
  $q$UPDATE order_items SET is_comped = true, comp_reason = 'ทำช้า',
         comped_by = 'a0000000-0000-0000-0000-00000000000c', comped_at = now()
      WHERE order_item_id = 'a6000000-0000-0000-0000-000000000002'$q$,
  'discount:approve');

SELECT pos_t_eq('4 ครัว', 'ดึงคิวจอครัวได้ (ไม่มีจานค้างแล้ว)',
  $q$SELECT count(*)::text FROM order_items
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND status IN ('queued','preparing','ready')$q$,
  '0');


-- ============================================================
-- ส่วนที่ 5 : การชำระเงิน (ยังไม่เปิดภาษี)
-- ============================================================
SELECT pos_t_ok('5 ชำระเงิน', 'สร้างรายการพยายามชำระ 60 บาท',
  $q$INSERT INTO payment_attempts(payment_attempt_id, tenant_id, payment_method, amount, initiated_by)
     VALUES ('a8000000-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001', 'cash', 60,
             'a0000000-0000-0000-0000-00000000000c')$q$);

SELECT pos_t_ok('5 ชำระเงิน', 'ผูกบิลเข้ากับรายการชำระ',
  $q$INSERT INTO payment_attempt_orders(tenant_id, payment_attempt_id, order_id)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000001',
             'a5000000-0000-0000-0000-000000000001')$q$);

SELECT pos_t_err('5 ชำระเงิน', 'หนึ่งบิลมีรายการชำระค้างได้ครั้งละอันเดียว',
  $q$INSERT INTO payment_attempts(payment_attempt_id, tenant_id, payment_method, amount, initiated_by)
     VALUES ('a8000000-0000-0000-0000-000000000009',
             'aaaaaaaa-0000-0000-0000-000000000001', 'cash', 60,
             'a0000000-0000-0000-0000-00000000000c');
    INSERT INTO payment_attempt_orders(tenant_id, payment_attempt_id, order_id)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000009',
             'a5000000-0000-0000-0000-000000000001')$q$,
  'uq_pao_one_open_per_order');

SELECT pos_t_err('5 ชำระเงิน', 'บันทึกเงินก่อนรายการชำระสำเร็จไม่ได้',
  $q$INSERT INTO payments(tenant_id, payment_attempt_id, subtotal, vat_amount, total_amount,
                          vat_mode, payment_method, cash_received, receipt_number,
                          business_date, processed_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000001', 60, 0, 60,
             'none', 'cash', 100, '', NULL,
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'attempt must be success');

SELECT pos_t_ok('5 ชำระเงิน', 'ยืนยันว่ารับเงินสำเร็จ',
  $q$UPDATE payment_attempts SET status = 'success'
      WHERE payment_attempt_id = 'a8000000-0000-0000-0000-000000000001'$q$);

SELECT pos_t_err('5 ชำระเงิน', 'ยอดเงินต้องตรงกับรายการอาหารจริง',
  $q$INSERT INTO payments(tenant_id, payment_attempt_id, subtotal, vat_amount, total_amount,
                          vat_mode, payment_method, cash_received, receipt_number,
                          business_date, processed_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000001', 60, 0, 999,
             'none', 'cash', 1000, '', NULL,
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'must equal attempt');

SELECT pos_t_ok('5 ชำระเงิน', 'บันทึกการชำระเงินสำเร็จ',
  $q$INSERT INTO payments(payment_id, tenant_id, payment_attempt_id, subtotal, vat_amount, total_amount,
                          vat_mode, payment_method, cash_received, receipt_number,
                          business_date, processed_by)
     VALUES ('a9000000-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000001', 60, 0, 60,
             'none', 'cash', 100, '', NULL,
             'a0000000-0000-0000-0000-00000000000c')$q$);

SELECT pos_t_eq('5 ชำระเงิน', 'เลขที่ใบเสร็จออกให้เองรูปแบบ DDMMYY-0001',
  $q$SELECT (receipt_number = to_char(business_date, 'DDMMYY') || '-0001')::text
       FROM payments WHERE payment_id = 'a9000000-0000-0000-0000-000000000001'$q$,
  'true');

SELECT pos_t_eq('5 ชำระเงิน', 'เงินทอนคำนวณให้เอง (รับ 100 จ่าย 60)',
  $q$SELECT change_amount::text FROM payments
      WHERE payment_id = 'a9000000-0000-0000-0000-000000000001'$q$,
  '40.00');

SELECT pos_t_eq('5 ชำระเงิน', 'จ่ายเงินแล้วบิลปิดเอง',
  $q$SELECT close_reason FROM orders WHERE order_id = 'a5000000-0000-0000-0000-000000000001'$q$,
  'paid');

SELECT pos_t_eq('5 ชำระเงิน', 'จ่ายเงินแล้วโต๊ะกลับมาว่างเอง',
  $q$SELECT status FROM dining_tables WHERE table_id = 'a1000000-0000-0000-0000-000000000001'$q$,
  'available');

SELECT pos_t_err('5 ชำระเงิน', 'แก้ไขรายการชำระเงินที่บันทึกแล้วไม่ได้',
  $q$UPDATE payments SET total_amount = 1
      WHERE payment_id = 'a9000000-0000-0000-0000-000000000001'$q$,
  'immutable');

SELECT pos_t_err('5 ชำระเงิน', 'ลบรายการชำระเงินไม่ได้',
  $q$DELETE FROM payments WHERE payment_id = 'a9000000-0000-0000-0000-000000000001'$q$,
  'immutable');

SELECT pos_t_err('5 ชำระเงิน', 'แก้ไขบิลที่ปิดไปแล้วไม่ได้',
  $q$UPDATE orders SET table_id = 'a1000000-0000-0000-0000-000000000002'
      WHERE order_id = 'a5000000-0000-0000-0000-000000000001'$q$,
  'closed order is immutable');


-- ============================================================
-- ส่วนที่ 6 : เงื่อนไขเสิร์ฟครบก่อนจ่าย และการปิดบิลโดยไม่เก็บเงิน
-- ============================================================
DO $$
BEGIN
    INSERT INTO orders(order_id, tenant_id, table_id, created_by)
    VALUES ('a5000000-0000-0000-0000-000000000002',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'a1000000-0000-0000-0000-000000000002',
            'a0000000-0000-0000-0000-00000000000c');
    INSERT INTO order_items(order_item_id, tenant_id, order_id, menu_item_id,
                            unit_price_snapshot, item_name_snapshot, status, kitchen_ticket_id)
    VALUES ('a6000000-0000-0000-0000-000000000003',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'a5000000-0000-0000-0000-000000000002',
            'a3000000-0000-0000-0000-000000000001', 60, 'กะเพราหมู',
            'draft', NULL);
    UPDATE order_items SET status = 'queued', kitchen_ticket_id = gen_random_uuid()
     WHERE order_item_id = 'a6000000-0000-0000-0000-000000000003';
    INSERT INTO payment_attempts(payment_attempt_id, tenant_id, payment_method, amount, initiated_by)
    VALUES ('a8000000-0000-0000-0000-000000000002',
            'aaaaaaaa-0000-0000-0000-000000000001', 'cash', 60,
            'a0000000-0000-0000-0000-00000000000c');
END $$;

SELECT pos_t_err('6 เงื่อนไขจ่าย', 'ยังเสิร์ฟไม่ครบ จ่ายเงินไม่ได้',
  $q$INSERT INTO payment_attempt_orders(tenant_id, payment_attempt_id, order_id)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000002',
             'a5000000-0000-0000-0000-000000000002')$q$,
  'PAY-03');

SELECT pos_t_ok('6 เงื่อนไขจ่าย', 'ร้านที่ให้จ่ายก่อนรับอาหาร ปิดเงื่อนไขนี้ได้',
  $q$UPDATE system_config SET config_value = 'false'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND config_key = 'require_all_served_before_payment'$q$);

SELECT pos_t_ok('6 เงื่อนไขจ่าย', 'ปิดเงื่อนไขแล้วผูกบิลเข้ารายการชำระได้',
  $q$INSERT INTO payment_attempt_orders(tenant_id, payment_attempt_id, order_id)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a8000000-0000-0000-0000-000000000002',
             'a5000000-0000-0000-0000-000000000002')$q$);

SELECT pos_t_ok('6 เงื่อนไขจ่าย', 'คืนค่าเงื่อนไขกลับเป็นค่าเริ่มต้น',
  $q$UPDATE payment_attempts SET status = 'failed', failure_reason = 'ยกเลิกการทดสอบ'
      WHERE payment_attempt_id = 'a8000000-0000-0000-0000-000000000002';
    UPDATE system_config SET config_value = 'true'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND config_key = 'require_all_served_before_payment'$q$);

SELECT pos_t_err('6 เงื่อนไขจ่าย', 'พนักงานปิดบิลโดยไม่เก็บเงินไม่ได้',
  $q$UPDATE orders SET close_reason = 'walkout',
         closed_by = 'a0000000-0000-0000-0000-00000000000c', closed_at = now()
      WHERE order_id = 'a5000000-0000-0000-0000-000000000002'$q$,
  'order:close_unpaid');

SELECT pos_t_ok('6 เงื่อนไขจ่าย', 'ผู้จัดการปิดบิลโดยไม่เก็บเงินได้',
  $q$UPDATE orders SET close_reason = 'walkout',
         closed_by = 'a0000000-0000-0000-0000-00000000000b', closed_at = now()
      WHERE order_id = 'a5000000-0000-0000-0000-000000000002'$q$);

SELECT pos_t_eq('6 เงื่อนไขจ่าย', 'ปิดบิลโดยไม่เก็บเงินแล้วมีบันทึกใน Audit Log',
  $q$SELECT count(*)::text FROM audit_logs
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND action_type = 'order_closed_unpaid'$q$,
  '1');


-- ============================================================
-- ส่วนที่ 7 : ภาษีมูลค่าเพิ่ม
-- ============================================================
-- การตั้งค่าที่กระทบเงินสงวนไว้ให้เจ้าของร้านเท่านั้น (CFG-04)
-- ระบบอ่านบทบาทจาก app.current_user_role ซึ่ง NestJS ต้องกำหนดทุก request
SELECT set_config('app.current_user_role', 'manager', false);

SELECT pos_t_err('7 ภาษี', 'ผู้จัดการเปลี่ยนโหมดภาษีไม่ได้ (สงวนให้เจ้าของร้าน)',
  $q$UPDATE system_config SET config_value = 'inclusive'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND config_key = 'vat_mode'$q$,
  'owner-only');

SELECT set_config('app.current_user_role', 'owner', false);

SELECT pos_t_err('7 ภาษี', 'เปิดใช้ภาษีโดยไม่มีเลขผู้เสียภาษีไม่ได้',
  $q$UPDATE system_config SET config_value = 'inclusive'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND config_key = 'vat_mode'$q$,
  'tax_id');

SELECT pos_t_err('7 ภาษี', 'อัตราภาษีนอกช่วงที่ยอมรับไม่ได้',
  $q$UPDATE system_config SET config_value = '200'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND config_key = 'vat_rate'$q$,
  'vat_rate');

SELECT pos_t_err('7 ภาษี', 'ตั้งค่าที่ไม่มีอยู่ในระบบไม่ได้',
  $q$INSERT INTO system_config(tenant_id, config_key, config_value)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'ไม่มีค่านี้', 'x')$q$,
  'config_key_fkey');

SELECT pos_t_ok('7 ภาษี', 'กรอกเลขผู้เสียภาษีแล้วเปิดโหมดราคารวมภาษีได้',
  $q$UPDATE tenants SET tax_id = '1234567890123'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    UPDATE system_config SET config_value = 'inclusive'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND config_key = 'vat_mode'$q$);

DO $$
BEGIN
    INSERT INTO orders(order_id, tenant_id, table_id, created_by)
    VALUES ('a5000000-0000-0000-0000-000000000003',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'a1000000-0000-0000-0000-000000000003',
            'a0000000-0000-0000-0000-00000000000c');
    INSERT INTO order_items(order_item_id, tenant_id, order_id, menu_item_id,
                            unit_price_snapshot, item_name_snapshot)
    VALUES ('a6000000-0000-0000-0000-000000000004',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'a5000000-0000-0000-0000-000000000003',
            'a3000000-0000-0000-0000-000000000001', 70, 'กะเพราหมูพิเศษ');
    UPDATE order_items SET status = 'queued', kitchen_ticket_id = gen_random_uuid()
     WHERE order_item_id = 'a6000000-0000-0000-0000-000000000004';
    UPDATE order_items SET status = 'preparing' WHERE order_item_id = 'a6000000-0000-0000-0000-000000000004';
    UPDATE order_items SET status = 'ready'     WHERE order_item_id = 'a6000000-0000-0000-0000-000000000004';
    UPDATE order_items SET status = 'served'    WHERE order_item_id = 'a6000000-0000-0000-0000-000000000004';
    INSERT INTO payment_attempts(payment_attempt_id, tenant_id, payment_method, amount, initiated_by)
    VALUES ('a8000000-0000-0000-0000-000000000003',
            'aaaaaaaa-0000-0000-0000-000000000001', 'qr_code', 70,
            'a0000000-0000-0000-0000-00000000000c');
    INSERT INTO payment_attempt_orders(tenant_id, payment_attempt_id, order_id)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
            'a8000000-0000-0000-0000-000000000003',
            'a5000000-0000-0000-0000-000000000003');
    UPDATE payment_attempts SET status = 'success'
     WHERE payment_attempt_id = 'a8000000-0000-0000-0000-000000000003';
    INSERT INTO payments(payment_id, tenant_id, payment_attempt_id, subtotal, vat_amount, total_amount,
                         vat_mode, payment_method, receipt_number, business_date, processed_by)
    VALUES ('a9000000-0000-0000-0000-000000000002',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'a8000000-0000-0000-0000-000000000003', 0, 0, 70,
            'inclusive', 'qr_code', '', NULL,
            'a0000000-0000-0000-0000-00000000000c');
END $$;

SELECT pos_t_eq('7 ภาษี', 'ราคา 70 บาท อัตรา 7% แกะภาษีได้ 4.58',
  $q$SELECT vat_amount::text FROM payments WHERE payment_id = 'a9000000-0000-0000-0000-000000000002'$q$,
  '4.58');

SELECT pos_t_eq('7 ภาษี', 'มูลค่าสินค้าก่อนภาษี 65.42',
  $q$SELECT subtotal::text FROM payments WHERE payment_id = 'a9000000-0000-0000-0000-000000000002'$q$,
  '65.42');

SELECT pos_t_eq('7 ภาษี', 'ตัวเลขบนใบเสร็จบวกกันได้เท่ายอดรวมพอดี',
  $q$SELECT (subtotal + vat_amount + service_charge_amount + rounding_adjustment = total_amount)::text
       FROM payments WHERE payment_id = 'a9000000-0000-0000-0000-000000000002'$q$,
  'true');

SELECT pos_t_eq('7 ภาษี', 'เลขใบเสร็จใบที่สองรันต่อเป็น 0002',
  $q$SELECT right(receipt_number, 4) FROM payments
      WHERE payment_id = 'a9000000-0000-0000-0000-000000000002'$q$,
  '0002');

-- การปัดเศษยังไม่เปิดใช้ใน V1 ฐานข้อมูลจึงบังคับช่องนี้เป็น 0 ไว้
SELECT pos_t_eq('7 ภาษี', 'ช่องปัดเศษถูกบังคับเป็น 0 ด้วยกติกาในฐานข้อมูล',
  $q$SELECT (pg_get_constraintdef(oid) LIKE '%rounding_adjustment = (0)%')::text
       FROM pg_constraint WHERE conname = 'payments_rounding_adjustment_check'$q$,
  'true');

SELECT pos_t_eq('7 ภาษี', 'ไม่มีค่าตั้งค่า rounding_mode หลงเหลืออยู่ (CFG-09)',
  $q$SELECT count(*)::text FROM config_definitions WHERE config_key = 'rounding_mode'$q$,
  '0');


-- ============================================================
-- ส่วนที่ 8 : การแยกข้อมูลระหว่างร้าน
-- ============================================================
SELECT pos_t_err('8 แยกร้าน', 'เปิดบิลของร้าน A ที่โต๊ะของร้าน B ไม่ได้',
  $q$INSERT INTO orders(tenant_id, table_id, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'b1000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'foreign key');

SELECT pos_t_err('8 แยกร้าน', 'ให้พนักงานร้าน B ปิดบิลของร้าน A ไม่ได้',
  $q$INSERT INTO orders(tenant_id, table_id, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a1000000-0000-0000-0000-000000000001',
             'b0000000-0000-0000-0000-00000000000a')$q$,
  'foreign key');

SELECT pos_t_eq('8 แยกร้าน', 'ค้นหาร้านตอนเข้าสู่ระบบได้โดยยังไม่มี context',
  $q$SELECT (tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001')::text
       FROM resolve_tenant('POS-TEST-A')$q$,
  'true');

SELECT pos_t_eq('8 แยกร้าน', 'ค้นหาผู้ใช้ด้วยอีเมลแบบไม่สนตัวพิมพ์ได้',
  $q$SELECT (users_id = 'a0000000-0000-0000-0000-00000000000a')::text
       FROM resolve_user_by_email('OWNER_A@POSTEST.LOCAL')$q$,
  'true');


-- ============================================================
-- ส่วนที่ 9 : สต็อกวัตถุดิบ
-- ============================================================
DO $$
BEGIN
    INSERT INTO ingredients(ingredient_id, tenant_id, name, stock_unit, low_stock_threshold)
    VALUES ('aa000000-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000001', 'หมูสับ', 'kg', 2);
    INSERT INTO inventory_transactions(tenant_id, ingredient_id, type, quantity_change, created_by)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
            'aa000000-0000-0000-0000-000000000001', 'restock', 10,
            'a0000000-0000-0000-0000-00000000000c');
END $$;

SELECT pos_t_eq('9 สต็อก', 'รับของเข้า 10 กิโล ยอดคงเหลือเป็น 10',
  $q$SELECT (current_stock = 10)::text FROM v_ingredient_stock
      WHERE ingredient_id = 'aa000000-0000-0000-0000-000000000001'$q$,
  'true');

SELECT pos_t_ok('9 สต็อก', 'พนักงานกรอกยอดนับจริงได้ 7 กิโล',
  $q$SELECT record_stock_count('aaaaaaaa-0000-0000-0000-000000000001',
                              'aa000000-0000-0000-0000-000000000001', 7,
                              'a0000000-0000-0000-0000-00000000000c', 'นับจบวัน')$q$);

SELECT pos_t_eq('9 สต็อก', 'ยอดคงเหลือปรับเป็น 7 ตามที่นับได้',
  $q$SELECT (current_stock = 7)::text FROM v_ingredient_stock
      WHERE ingredient_id = 'aa000000-0000-0000-0000-000000000001'$q$,
  'true');

SELECT pos_t_eq('9 สต็อก', 'ส่วนต่าง 30% เกินเกณฑ์ ระบบบันทึก Audit Log ให้',
  $q$SELECT count(*)::text FROM audit_logs
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND action_type = 'inventory_adjusted'$q$,
  '1');

SELECT pos_t_err('9 สต็อก', 'รายการสต็อกที่บันทึกแล้วแก้ไม่ได้',
  $q$UPDATE inventory_transactions SET quantity_change = 1
      WHERE ingredient_id = 'aa000000-0000-0000-0000-000000000001'$q$,
  'immutable');


-- ============================================================
-- ส่วนที่ 10 : ปิดกะ กระทบยอด และเปิดกะใหม่
-- ============================================================
SELECT pos_t_err('10 ปิดกะ', 'พนักงานร้านอื่นปิดกะไม่ได้',
  $q$UPDATE shifts SET actual_closing_cash = 1, closed_by = 'b0000000-0000-0000-0000-00000000000a',
         closed_at = now()
      WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  'foreign key');

SELECT pos_t_ok('10 ปิดกะ', 'พนักงานปิดกะและกรอกยอดเงินที่นับได้',
  $q$UPDATE shifts SET actual_closing_cash = 900,
         closed_by = 'a0000000-0000-0000-0000-00000000000c', closed_at = now()
      WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$);

SELECT pos_t_eq('10 ปิดกะ', 'ยอดที่ควรมี = เปิดกะ 1000 + เงินสด 60 − เงินออก 100 = 960',
  $q$SELECT expected_closing_cash::text FROM shifts
      WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  '960.00');

SELECT pos_t_eq('10 ปิดกะ', 'ยอดไม่ตรง จึงรอการตรวจสอบ',
  $q$SELECT status FROM shifts WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  'pending_verification');

SELECT pos_t_err('10 ปิดกะ', 'พนักงานเปิดกะที่ปิดแล้วใหม่ไม่ได้',
  $q$SELECT reopen_shift('a4000000-0000-0000-0000-000000000001',
                        'a0000000-0000-0000-0000-00000000000c', 'กดผิด')$q$,
  'shift:reopen');

SELECT pos_t_err('10 ปิดกะ', 'เปิดกะใหม่ต้องระบุเหตุผล',
  $q$SELECT reopen_shift('a4000000-0000-0000-0000-000000000001',
                        'a0000000-0000-0000-0000-00000000000b', '   ')$q$,
  'reason is required');

SELECT pos_t_ok('10 ปิดกะ', 'ผู้จัดการเปิดกะที่ปิดแล้วใหม่ได้',
  $q$SELECT reopen_shift('a4000000-0000-0000-0000-000000000001',
                        'a0000000-0000-0000-0000-00000000000b', 'พนักงานกดปิดผิด')$q$);

SELECT pos_t_eq('10 ปิดกะ', 'เปิดใหม่แล้วกะกลับมาสถานะเปิด',
  $q$SELECT status FROM shifts WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  'open');

SELECT pos_t_eq('10 ปิดกะ', 'ระบบนับจำนวนครั้งที่เปิดใหม่',
  $q$SELECT reopen_count::text FROM shifts WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  '1');

SELECT pos_t_eq('10 ปิดกะ', 'ยอดเงินเปิดกะเดิมไม่ถูกล้าง',
  $q$SELECT opening_cash::text FROM shifts WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$,
  '1000.00');

SELECT pos_t_eq('10 ปิดกะ', 'การเปิดกะใหม่ถูกบันทึกใน Audit Log',
  $q$SELECT count(*)::text FROM audit_logs
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
        AND action_type = 'shift_reopened'$q$,
  '1');

SELECT pos_t_ok('10 ปิดกะ', 'ปิดกะอีกครั้งแล้วเจ้าของรับรองยอด',
  $q$UPDATE shifts SET actual_closing_cash = 900,
         closed_by = 'a0000000-0000-0000-0000-00000000000c', closed_at = now()
      WHERE shift_id = 'a4000000-0000-0000-0000-000000000001';
    UPDATE shifts SET status = 'verified', verified_by = 'a0000000-0000-0000-0000-00000000000a'
      WHERE shift_id = 'a4000000-0000-0000-0000-000000000001'$q$);

SELECT pos_t_err('10 ปิดกะ', 'กะที่รับรองยอดแล้วเปิดใหม่ไม่ได้',
  $q$SELECT reopen_shift('a4000000-0000-0000-0000-000000000001',
                        'a0000000-0000-0000-0000-00000000000a', 'อยากแก้ยอด')$q$,
  'cannot reopen');

SELECT pos_t_err('10 ปิดกะ', 'กะปิดแล้ว รับเงินเพิ่มไม่ได้',
  $q$INSERT INTO orders(tenant_id, table_id, created_by)
     VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
             'a1000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-00000000000c')$q$,
  'no open shift');


-- ============================================================
-- ส่วนที่ 11 : บันทึกการตรวจสอบ
-- ============================================================
SELECT pos_t_err('11 Audit Log', 'แก้ไขบันทึกการตรวจสอบไม่ได้',
  $q$UPDATE audit_logs SET action_type = 'hacked'
      WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  'append-only');

SELECT pos_t_err('11 Audit Log', 'ลบบันทึกการตรวจสอบที่ยังไม่ครบ 1 ปีไม่ได้',
  $q$DELETE FROM audit_logs WHERE tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  'append-only');

SELECT pos_t_err('11 Audit Log', 'แก้ไขข้อมูลบทบาทและสิทธิ์ไม่ได้ (สงวนไว้ให้ migration)',
  $q$INSERT INTO permissions(permission_key, module_name, description)
     VALUES ('user:manage', 'x', 'ซ้ำ')$q$,
  'permissions_permission_key_key');


-- ============================================================
-- ลบข้อมูลทดสอบ
-- ============================================================
DO $$
BEGIN
    PERFORM admin_purge_tenant('aaaaaaaa-0000-0000-0000-000000000001');
    PERFORM admin_purge_tenant('bbbbbbbb-0000-0000-0000-000000000002');
    -- admin_purge_tenant() เปิดธง app.allow_purge ไว้เพื่อข้ามการป้องกันการลบ
    -- ต้องปิดคืนทันที มิฉะนั้นการป้องกันการลบจะไม่ทำงานไปตลอด transaction นั้น
    PERFORM set_config('app.allow_purge', 'off', false);
END $$;

SELECT pos_t_eq('12 ล้างข้อมูล', 'ลบร้านทดสอบออกหมดแล้ว',
  $q$SELECT count(*)::text FROM tenants WHERE tenant_slug LIKE 'pos-test-%'$q$,
  '0');

DROP FUNCTION IF EXISTS pos_t_err(text, text, text, text);
DROP FUNCTION IF EXISTS pos_t_ok(text, text, text);
DROP FUNCTION IF EXISTS pos_t_eq(text, text, text, text);


-- ############################################################
-- ผลการทดสอบ
-- ############################################################
SELECT
    (SELECT count(*) FROM pos_test_log)                             AS "ทดสอบทั้งหมด",
    (SELECT count(*) FROM pos_test_log WHERE outcome = 'ผ่าน')      AS "ผ่าน",
    (SELECT count(*) FROM pos_test_log WHERE outcome = 'ไม่ผ่าน')   AS "ไม่ผ่าน",
    CASE WHEN (SELECT count(*) FROM pos_test_log WHERE outcome = 'ไม่ผ่าน') = 0
         THEN 'ฐานข้อมูลทำงานถูกต้องทุกข้อ'
         ELSE 'มีข้อที่ไม่ผ่าน ดูรายละเอียดจาก query ถัดไป' END    AS "สรุป";

-- รายละเอียดรายข้อ (เลือกบรรทัดนี้แล้วกด Execute เพื่อดูผลเต็ม)
SELECT seq AS "ลำดับ", section AS "หมวด", scenario AS "สถานการณ์",
       expect AS "สิ่งที่คาดหวัง", outcome AS "ผล", detail AS "รายละเอียด"
FROM pos_test_log ORDER BY seq;
