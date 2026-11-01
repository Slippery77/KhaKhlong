-- ============================================================
-- PATCH 11: Inventory Polish — Business Date & Clean Note Format
-- ============================================================

-- 1. เพิ่มคอลัมน์ business_date ใน inventory_transactions
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS business_date DATE;

-- ปลดล็อก trigger immutable ชั่วคราวเพื่อ backfill ข้อมูลเก่า
ALTER TABLE inventory_transactions DISABLE TRIGGER immutable;

UPDATE inventory_transactions
SET business_date = compute_business_date(tenant_id, created_at)
WHERE business_date IS NULL;

ALTER TABLE inventory_transactions ENABLE TRIGGER immutable;

ALTER TABLE inventory_transactions ALTER COLUMN business_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_tx_business_date
  ON inventory_transactions (tenant_id, business_date);

-- 2. Trigger ให้ใส่ business_date อัตโนมัติเมื่อ INSERT
CREATE OR REPLACE FUNCTION trg_inventory_tx_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.business_date IS NULL THEN
    NEW.business_date := compute_business_date(NEW.tenant_id, COALESCE(NEW.created_at, now()));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS before_insert_inventory_transactions ON inventory_transactions;
CREATE TRIGGER before_insert_inventory_transactions
  BEFORE INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_inventory_tx_before_insert();

-- 3. ปรับปรุง record_stock_count(): ตัดช่องว่างนำหน้า และฟอร์แมตทศนิยมไม่เกิน 4 ตำแหน่ง
CREATE OR REPLACE FUNCTION record_stock_count(p_tenant uuid, p_ingredient uuid, p_counted numeric,
                                              p_user uuid, p_note text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE cur numeric; d numeric; pct numeric; limit_pct numeric; v_note text;
BEGIN
  PERFORM 1 FROM ingredients WHERE ingredient_id = p_ingredient AND tenant_id = p_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ingredient not found'; END IF;
  IF NOT has_permission(p_user, 'inventory:adjust') THEN
    RAISE EXCEPTION 'user lacks permission inventory:adjust'; END IF;

  SELECT COALESCE(SUM(quantity_change), 0) INTO cur
    FROM inventory_transactions WHERE ingredient_id = p_ingredient;
  d := p_counted - cur;
  IF d = 0 THEN RETURN 0; END IF;

  v_note := '[counted ' || rtrim(to_char(round(p_counted, 4), 'FM999999990.9999'), '.') ||
            ', system ' || rtrim(to_char(round(cur, 4), 'FM999999990.9999'), '.') || ']';
  IF p_note IS NOT NULL AND trim(p_note) <> '' THEN
    v_note := trim(p_note) || ' ' || v_note;
  END IF;

  INSERT INTO inventory_transactions
    (tenant_id, ingredient_id, type, quantity_change, counted_quantity, note, created_by)
  VALUES (p_tenant, p_ingredient, 'adjustment', d, p_counted, v_note, p_user);

  -- ยิง audit เฉพาะที่เพี้ยนทั้งเป็น % และเป็นจำนวน
  limit_pct := cfg(p_tenant, 'inventory_variance_alert_percent')::numeric;
  pct := CASE WHEN cur = 0 THEN 100 ELSE abs(d) * 100 / abs(cur) END;
  IF pct > limit_pct AND abs(d) > 1 THEN
    PERFORM audit_write(p_tenant, 'inventory_adjusted', jsonb_build_object(
      'ingredient_id', p_ingredient,
      'ingredient_name', (SELECT name FROM ingredients WHERE ingredient_id = p_ingredient),
      'system_qty', cur, 'counted_qty', p_counted, 'delta', d, 'percent', round(pct, 2)));
  END IF;
  RETURN d;
END $$;
