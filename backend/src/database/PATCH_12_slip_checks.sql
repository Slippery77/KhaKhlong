-- ============================================================
-- PATCH 12: ตรวจสลิปโอนเงินผ่าน SlipOK
-- รันด้วย superuser/owner หนึ่งครั้ง: psql -U postgres -d pwa_pos -f PATCH_12_slip_checks.sql
-- ============================================================

-- ผลตรวจสลิปโอนเงินผ่าน SlipOK (1 แถวต่อการตรวจ 1 ครั้ง ทั้งผ่านและไม่ผ่าน)
-- ตรวจผ่าน: เขียนใน transaction เดียวกับการชำระ
-- ไม่ผ่าน: เขียนแบบคงทน (durableQuery) เพื่อเก็บสถิติใช้โควต้าแม้คำขอถูก rollback
CREATE TABLE IF NOT EXISTS payment_slip_checks (
    slip_check_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    payment_attempt_id UUID NOT NULL,
    result             VARCHAR(20) NOT NULL CHECK (result IN ('verified','rejected','error')),
    error_code         VARCHAR(40),
    source             VARCHAR(10) NOT NULL CHECK (source IN ('image','qr_data')),
    trans_ref          VARCHAR(40),
    amount             DECIMAL(10,2),
    sending_bank       VARCHAR(3),
    receiving_bank     VARCHAR(3),
    receiver_name      TEXT,
    receiver_proxy     VARCHAR(128),
    receiver_account   VARCHAR(40),
    -- matched = เลขพร้อมเพย์ในสลิปตรงกับร้าน, unverifiable = สลิปไม่แสดงพร้อมเพย์ผู้รับ
    receiver_match     VARCHAR(20) CHECK (receiver_match IN ('matched','unverifiable')),
    trans_at           TIMESTAMPTZ,
    raw_response       JSONB,
    checked_by         UUID NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, payment_attempt_id)
        REFERENCES payment_attempts (tenant_id, payment_attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, checked_by) REFERENCES users (tenant_id, users_id),
    CONSTRAINT chk_slip_verified_has_ref CHECK (result <> 'verified' OR trans_ref IS NOT NULL)
);
-- สลิป 1 ใบใช้ปิดบิลได้ครั้งเดียว ทุกร้าน (เลขอ้างอิงธนาคารไม่ซ้ำข้ามร้านอยู่แล้ว)
CREATE UNIQUE INDEX IF NOT EXISTS uq_slip_checks_verified_ref ON payment_slip_checks (trans_ref) WHERE result = 'verified';
CREATE INDEX IF NOT EXISTS idx_slip_checks_tenant_created ON payment_slip_checks (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_slip_checks_attempt ON payment_slip_checks (payment_attempt_id);

ALTER TABLE payment_slip_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON payment_slip_checks;
CREATE POLICY tenant_isolation ON payment_slip_checks
    USING (tenant_id = (SELECT app_tenant_id()))
    WITH CHECK (tenant_id = (SELECT app_tenant_id()));

GRANT SELECT, INSERT ON payment_slip_checks TO pos_app;
GRANT SELECT ON payment_slip_checks TO pos_readonly;

SELECT 'PATCH_12 payment_slip_checks' AS "การแก้ไข",
       to_regclass('public.payment_slip_checks') IS NOT NULL AS "สำเร็จ";
