-- PATCH 08: ยกเลิกออเดอร์ / ปิดบิลโดยไม่เก็บเงิน แล้วคืนโต๊ะได้จริง
--
-- ปัญหาเดิม: "ยกเลิกออเดอร์" ฝั่งหน้าจอแค่ void รายการอาหาร แต่ไม่เคยปิดบิล
-- (orders.closed_at ยังเป็น NULL) ทำให้ sync_table_status() ยังเห็นว่ามีบิลเปิด
-- อยู่ โต๊ะจึงค้างเป็น occupied ตลอดไป
--
-- patch นี้เตรียมสิ่งที่ต้องใช้ตอนปิดบิล:
--   1) orders.close_note — เก็บเหตุผล/หมายเหตุของ walkout ให้ audit อ่านรู้เรื่อง
--   2) ห้าม void รายการของบิลที่ปิดแล้ว — เดิมทำได้ ทำให้ประวัติ/รายงานเปลี่ยนย้อนหลัง
--   3) audit ของ order_closed_unpaid เก็บ note ด้วย
--
-- ต้องรันด้วย postgres (เจ้าของตาราง/ฟังก์ชัน) เท่านั้น

ALTER TABLE orders ADD COLUMN IF NOT EXISTS close_note TEXT;

COMMENT ON COLUMN orders.close_note IS
    'หมายเหตุการปิดบิลโดยไม่เก็บเงิน (walkout/voided_all/empty) — บังคับสำหรับ walkout ที่มีรายการ';


-- ============================================================
-- 2) state machine + กฎ void/comp (เดิม FULL_INSTALL: trg_order_item_state)
--    เพิ่ม: บิลปิดแล้ว = ประวัติ final ห้าม void ย้อนหลัง
-- ============================================================
CREATE OR REPLACE FUNCTION trg_order_item_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- บิลที่ปิดแล้วห้ามแก้รายการย้อนหลัง (ยกเว้นแถวที่ voided อยู่แล้ว)
  IF NEW.status = 'voided' AND OLD.status <> 'voided'
     AND EXISTS (SELECT 1 FROM orders
                  WHERE order_id = NEW.order_id AND closed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'order is closed';
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NOT ((OLD.status, NEW.status) IN (
        ('draft','queued'), ('draft','voided'),
        ('queued','preparing'), ('queued','voided'),
        ('preparing','ready'), ('preparing','voided'),
        ('ready','served'))) THEN
      RAISE EXCEPTION 'invalid order_item transition % -> %', OLD.status, NEW.status;
    END IF;
    -- void ระหว่างครัวทำอยู่ ต้องมีสิทธิ์อนุมัติ
    IF OLD.status = 'preparing' AND NEW.status = 'voided'
       AND NOT has_permission(NEW.voided_by, 'void:approve') THEN
      RAISE EXCEPTION 'voiding a preparing item requires void:approve';
    END IF;
    IF NEW.status = 'queued'    THEN NEW.queued_at    := COALESCE(NEW.queued_at, now());    END IF;
    IF NEW.status = 'preparing' THEN NEW.preparing_at := COALESCE(NEW.preparing_at, now()); END IF;
    IF NEW.status = 'ready'     THEN NEW.ready_at     := COALESCE(NEW.ready_at, now());     END IF;
    IF NEW.status = 'served'    THEN NEW.served_at    := COALESCE(NEW.served_at, now());    END IF;
    IF NEW.status = 'voided'    THEN NEW.voided_at    := COALESCE(NEW.voided_at, now());    END IF;
  END IF;
  IF OLD.status = 'voided' AND (NEW.is_comped OR NEW.status <> 'voided') THEN
    RAISE EXCEPTION 'voided item is final'; END IF;
  IF OLD.is_comped AND NOT NEW.is_comped THEN
    RAISE EXCEPTION 'comp cannot be reverted'; END IF;
  IF NEW.is_comped AND NOT OLD.is_comped THEN
    IF NEW.status <> 'served' THEN RAISE EXCEPTION 'comp allowed only when status=served'; END IF;
    IF NOT has_permission(NEW.comped_by, 'discount:approve') THEN
      RAISE EXCEPTION 'comp requires discount:approve'; END IF;
    NEW.comped_at := COALESCE(NEW.comped_at, now());
  END IF;
  RETURN NEW;
END $$;


-- ============================================================
-- 3) audit ของการปิดบิลโดยไม่เก็บเงิน — เก็บ note ด้วย
--    (เดิม FULL_INSTALL: trg_orders_after)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_orders_after() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM sync_table_status(NEW.table_id);
  IF TG_OP = 'UPDATE' AND OLD.table_id <> NEW.table_id THEN
    PERFORM sync_table_status(OLD.table_id); END IF;
  IF TG_OP = 'UPDATE' AND NEW.close_reason IN ('voided_all','empty','walkout')
     AND OLD.close_reason IS NULL THEN
    PERFORM audit_write(NEW.tenant_id, 'order_closed_unpaid',
      jsonb_build_object('order_id', NEW.order_id, 'order_number', NEW.order_number,
                         'reason', NEW.close_reason, 'note', NEW.close_note,
                         'table_id', NEW.table_id));
  END IF;
  RETURN NEW;
END $$;
