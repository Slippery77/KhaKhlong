-- ############################################################
-- PWA-POS : FULL_INSTALL.sql
-- PostgreSQL 16 | รันบน database ว่างเท่านั้น | เปิดใน pgAdmin Query Tool แล้วกด F5
-- ทดสอบแล้วบน PostgreSQL 16.13
-- ############################################################

-- ############################################################
-- PWA-POS : FULL INSTALL  (PostgreSQL 16)
-- PART 1/4 : SCHEMA
-- รันบน database ว่างเท่านั้น
-- ############################################################

-- ============================================================
-- GROUP 1 : TENANT / USER / ROLE / PERMISSION / CONFIG
-- ============================================================

CREATE TABLE tenants (
    tenant_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_name VARCHAR(150) NOT NULL,
    tenant_slug     VARCHAR(100) NOT NULL UNIQUE,
    tax_id          VARCHAR(13),
    phone           VARCHAR(20),
    house_number    VARCHAR(10) NOT NULL,
    moo             VARCHAR(255),
    soi             VARCHAR(255),
    road            VARCHAR(255),
    subdistrict     VARCHAR(100) NOT NULL,
    district        VARCHAR(100) NOT NULL,
    province        VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(10) NOT NULL,
    timezone        VARCHAR(100) NOT NULL DEFAULT 'Asia/Bangkok',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_tax_id_format CHECK (tax_id IS NULL OR tax_id ~ '^[0-9]{13}$'),
    -- slug ใช้เป็น subdomain/path ได้ จึงบังคับรูปแบบและกันคำสงวน
    CONSTRAINT chk_tenant_slug_format CHECK (tenant_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
    CONSTRAINT chk_tenant_slug_reserved CHECK (tenant_slug NOT IN
        ('api','admin','app','login','register','static','assets','www','health','auth','public','system'))
);

CREATE TABLE roles (
    role_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name   VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE permissions (
    permission_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    module_name    VARCHAR(50) NOT NULL,
    description    TEXT
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE RESTRICT,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    users_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    role_id        UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    username       VARCHAR(100) NOT NULL,
    email          VARCHAR(255),
    password_hash  VARCHAR(255) NOT NULL,
    pin_hash       VARCHAR(255),
    display_name   VARCHAR(100) NOT NULL,
    -- กัน brute force: นับครั้งผิดและเวลา lock
    password_failed_attempts SMALLINT NOT NULL DEFAULT 0,
    password_locked_until    TIMESTAMPTZ,
    pin_failed_attempts      SMALLINT NOT NULL DEFAULT 0,
    pin_locked_until         TIMESTAMPTZ,
    -- ขยับเลขนี้เมื่อไหร่ JWT เก่าของ user คนนี้ใช้ไม่ได้ทันที (USR-02)
    token_version  INTEGER NOT NULL DEFAULT 0,
    last_login_at  TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    deactivated_by UUID REFERENCES users(users_id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_deactivation CHECK (is_active OR deactivated_at IS NOT NULL),
    CONSTRAINT uq_users_tenant_users UNIQUE (tenant_id, users_id)
);
-- unique แบบไม่สนตัวพิมพ์ กัน Admin กับ admin แยกกัน
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_users_tenant_username_lower ON users (tenant_id, lower(username));
CREATE INDEX idx_users_tenant_id ON users (tenant_id);
CREATE INDEX idx_users_role_id ON users (role_id);

CREATE TABLE refresh_tokens (
    token_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    token_hash  VARCHAR(128) NOT NULL UNIQUE,
    device_info TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    token_version INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, users_id) ON DELETE CASCADE
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (tenant_id, user_id) WHERE revoked_at IS NULL;

-- นิยามของ config แต่ละตัว: ชนิด ขอบเขต และใครแก้ได้ (กัน key พิมพ์ผิด / ค่ามั่ว)
CREATE TABLE config_definitions (
    config_key     VARCHAR(100) PRIMARY KEY,
    value_type     VARCHAR(10) NOT NULL CHECK (value_type IN ('int','decimal','bool','text')),
    default_value  TEXT NOT NULL,
    min_value      NUMERIC,
    max_value      NUMERIC,
    allowed_values TEXT[],
    owner_only     BOOLEAN NOT NULL DEFAULT false,
    description    TEXT
);

CREATE TABLE system_config (
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    config_key   VARCHAR(100) NOT NULL REFERENCES config_definitions(config_key),
    config_value TEXT NOT NULL,
    updated_by   UUID REFERENCES users(users_id) ON DELETE SET NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, config_key)
);

-- ============================================================
-- GROUP 2 : TABLE MANAGEMENT
-- ============================================================

CREATE TABLE dining_tables (
    table_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    floor        SMALLINT NOT NULL DEFAULT 1,
    capacity     SMALLINT NOT NULL CHECK (capacity > 0),
    status       VARCHAR(20) NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available','occupied','out_of_service')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_dining_tables_tenant_number UNIQUE (tenant_id, table_number),
    CONSTRAINT uq_dining_tables_tenant_table UNIQUE (tenant_id, table_id)
);
CREATE INDEX idx_dining_tables_tenant_status ON dining_tables (tenant_id, status);
CREATE INDEX idx_dining_tables_tenant_floor ON dining_tables (tenant_id, floor);

-- ============================================================
-- GROUP 3 : MENU + MODIFIER
-- ============================================================

CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_tenant_category UNIQUE (tenant_id, category_id)
);
CREATE UNIQUE INDEX uq_categories_name ON categories (tenant_id, lower(name)) WHERE is_active;

CREATE TABLE menu_items (
    menu_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    category_id  UUID NOT NULL,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    image_url    TEXT,
    -- ราคานี้คือ "ราคาที่ลูกค้าจ่าย" เสมอ (ดู vat_mode ใน config_definitions)
    price        DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,   -- หมดวันนี้ (บังคับด้วย trigger)
    is_active    BOOLEAN NOT NULL DEFAULT true,   -- เลิกขายถาวร (soft delete)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, category_id) REFERENCES categories (tenant_id, category_id),
    CONSTRAINT uq_menu_items_tenant_item UNIQUE (tenant_id, menu_item_id)
);
CREATE INDEX idx_menu_items_tenant_category ON menu_items (tenant_id, category_id);
CREATE UNIQUE INDEX uq_menu_items_name ON menu_items (tenant_id, lower(name)) WHERE is_active;

CREATE TABLE modifier_groups (
    modifier_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    selection_type    VARCHAR(10) NOT NULL CHECK (selection_type IN ('single','multi')),
    -- is_required บังคับที่ frontend เท่านั้น (modifier ถูก insert หลัง order_item จึงเช็คใน DB ไม่ได้)
    is_required       BOOLEAN NOT NULL DEFAULT false,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_modifier_groups_tenant_group UNIQUE (tenant_id, modifier_group_id)
);
CREATE UNIQUE INDEX uq_modifier_groups_name ON modifier_groups (tenant_id, lower(name)) WHERE is_active;

CREATE TABLE modifiers (
    modifier_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL,
    name              VARCHAR(100) NOT NULL,
    price_delta       DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, modifier_group_id)
        REFERENCES modifier_groups (tenant_id, modifier_group_id) ON DELETE CASCADE,
    CONSTRAINT uq_modifiers_tenant_modifier UNIQUE (tenant_id, modifier_id)
);
CREATE INDEX idx_modifiers_group ON modifiers (modifier_group_id);
CREATE UNIQUE INDEX uq_modifiers_name ON modifiers (modifier_group_id, lower(name)) WHERE is_active;

CREATE TABLE menu_item_modifier_groups (
    tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    menu_item_id      UUID NOT NULL,
    modifier_group_id UUID NOT NULL,
    sort_order        SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (menu_item_id, modifier_group_id),
    FOREIGN KEY (tenant_id, menu_item_id)
        REFERENCES menu_items (tenant_id, menu_item_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, modifier_group_id)
        REFERENCES modifier_groups (tenant_id, modifier_group_id)
);
CREATE INDEX idx_mimg_modifier_group ON menu_item_modifier_groups (modifier_group_id);
CREATE INDEX idx_mimg_tenant ON menu_item_modifier_groups (tenant_id);

-- ============================================================
-- GROUP 4 : ORDER
-- ============================================================

CREATE TABLE orders (
    order_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- client สร้างเองได้ รองรับ offline
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    -- เลขบิลที่คนเรียกกันปากเปล่า รันใหม่ทุก business_date
    order_number INTEGER NOT NULL,
    business_date DATE NOT NULL,
    table_id     UUID NOT NULL,
    payment_id   UUID,                     -- FK เติมท้าย Group 6
    created_by   UUID NOT NULL,
    closed_at    TIMESTAMPTZ,
    closed_by    UUID,
    close_reason VARCHAR(20) CHECK (close_reason IN ('paid','voided_all','empty','walkout')),
    close_note   TEXT,                     -- หมายเหตุการปิดบิลโดยไม่เก็บเงิน (walkout ต้องมี)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, table_id)   REFERENCES dining_tables (tenant_id, table_id),
    FOREIGN KEY (tenant_id, created_by) REFERENCES users (tenant_id, users_id),
    FOREIGN KEY (tenant_id, closed_by)  REFERENCES users (tenant_id, users_id),
    CONSTRAINT uq_orders_number UNIQUE (tenant_id, business_date, order_number),
    CONSTRAINT uq_orders_tenant_order UNIQUE (tenant_id, order_id),
    CONSTRAINT chk_order_close_pair CHECK ((closed_at IS NULL) = (close_reason IS NULL)),
    CONSTRAINT chk_order_paid_iff_payment CHECK ((payment_id IS NOT NULL) = (close_reason = 'paid')),
    -- ปิดบิลโดยไม่เก็บเงินต้องรู้ว่าใครสั่ง
    CONSTRAINT chk_order_unpaid_close_actor CHECK
        (close_reason IS NULL OR close_reason = 'paid' OR closed_by IS NOT NULL)
);
-- 1 โต๊ะมี order ที่ยังไม่ปิดได้ใบเดียว
CREATE UNIQUE INDEX uq_orders_one_active_per_table ON orders (table_id) WHERE closed_at IS NULL;
CREATE INDEX idx_orders_tenant_table ON orders (tenant_id, table_id);
CREATE INDEX idx_orders_tenant_date ON orders (tenant_id, business_date);
CREATE INDEX idx_orders_payment ON orders (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_orders_created_by ON orders (created_by);

CREATE TABLE order_items (
    order_item_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    order_id            UUID NOT NULL,
    menu_item_id        UUID NOT NULL,
    -- ไม่มี quantity โดยตั้งใจ: 1 จาน = 1 แถว เพื่อให้ KDS/void/comp ทำรายจานได้
    unit_price_snapshot DECIMAL(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
    item_name_snapshot  VARCHAR(150) NOT NULL,   -- ใบเสร็จย้อนหลังต้องไม่เปลี่ยนตามเมนูปัจจุบัน
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','queued','preparing','ready','served','voided')),
    kitchen_ticket_id   UUID,                    -- 1 ค่าต่อการกดส่งครัว 1 รอบ (KDS-04)
    special_request     TEXT,
    queued_at    TIMESTAMPTZ,
    preparing_at TIMESTAMPTZ,
    ready_at     TIMESTAMPTZ,
    served_at    TIMESTAMPTZ,
    is_comped    BOOLEAN NOT NULL DEFAULT false,
    comp_reason  TEXT,
    comped_by    UUID,
    comped_at    TIMESTAMPTZ,
    voided_by    UUID,
    voided_at    TIMESTAMPTZ,
    void_reason  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, order_id)     REFERENCES orders (tenant_id, order_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, menu_item_id) REFERENCES menu_items (tenant_id, menu_item_id),
    FOREIGN KEY (tenant_id, comped_by)    REFERENCES users (tenant_id, users_id),
    FOREIGN KEY (tenant_id, voided_by)    REFERENCES users (tenant_id, users_id),
    CONSTRAINT uq_order_items_tenant_item UNIQUE (tenant_id, order_item_id),
    CONSTRAINT chk_comp_fields_only_when_comped CHECK (
        (is_comped      AND comp_reason IS NOT NULL AND comped_by IS NOT NULL AND comped_at IS NOT NULL) OR
        (NOT is_comped  AND comp_reason IS NULL     AND comped_by IS NULL     AND comped_at IS NULL)),
    CONSTRAINT chk_void_fields_only_when_voided CHECK (
        (status =  'voided' AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL) OR
        (status <> 'voided' AND voided_by IS NULL     AND voided_at IS NULL     AND void_reason IS NULL)),
    -- ส่งครัวแล้วต้องมีเลข ticket
    CONSTRAINT chk_ticket_after_draft CHECK (status IN ('draft','voided') OR kitchen_ticket_id IS NOT NULL)
);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_menu_item ON order_items (menu_item_id);
CREATE INDEX idx_order_items_status ON order_items (order_id, status);
CREATE INDEX idx_order_items_kds ON order_items (tenant_id, status, queued_at)
    WHERE status IN ('queued','preparing','ready');
CREATE INDEX idx_order_items_ticket ON order_items (kitchen_ticket_id) WHERE kitchen_ticket_id IS NOT NULL;
CREATE INDEX idx_order_items_comped ON order_items (comped_at) WHERE is_comped;

CREATE TABLE order_item_modifiers (
    tenant_id              UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    order_item_id          UUID NOT NULL,
    modifier_id            UUID NOT NULL,
    price_delta_snapshot   DECIMAL(10,2) NOT NULL,
    modifier_name_snapshot VARCHAR(100) NOT NULL,
    PRIMARY KEY (order_item_id, modifier_id),
    FOREIGN KEY (tenant_id, order_item_id) REFERENCES order_items (tenant_id, order_item_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, modifier_id)   REFERENCES modifiers (tenant_id, modifier_id)
);
CREATE INDEX idx_oim_modifier ON order_item_modifiers (modifier_id);
CREATE INDEX idx_oim_tenant ON order_item_modifiers (tenant_id);

-- ============================================================
-- GROUP 5 : INVENTORY  (manual ล้วน ไม่มี recipe / ไม่ตัดสต็อกอัตโนมัติ)
-- ============================================================

CREATE TABLE ingredients (
    ingredient_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name                    VARCHAR(150) NOT NULL,
    stock_unit              VARCHAR(20) NOT NULL,
    purchase_unit           VARCHAR(20),
    purchase_to_stock_ratio DECIMAL(10,4) CHECK (purchase_to_stock_ratio IS NULL OR purchase_to_stock_ratio > 0),
    low_stock_threshold     DECIMAL(10,4) CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ingredients_tenant_ingredient UNIQUE (tenant_id, ingredient_id)
);
CREATE UNIQUE INDEX uq_ingredients_name ON ingredients (tenant_id, lower(name)) WHERE is_active;

CREATE TABLE inventory_transactions (
    transaction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    ingredient_id    UUID NOT NULL,
    -- V2: 'deduction' (ตัดสต็อกอัตโนมัติ) ตัดออก เพราะไม่มีตาราง recipe
    type             VARCHAR(20) NOT NULL CHECK (type IN ('restock','adjustment','waste')),
    quantity_change  DECIMAL(10,4) NOT NULL CHECK (quantity_change <> 0),
    counted_quantity DECIMAL(10,4),    -- ยอดที่พนักงานนับได้จริง (เฉพาะ adjustment)
    waste_reason     VARCHAR(20) CHECK (waste_reason IS NULL OR
                         waste_reason IN ('expired','spoiled','dropped','other')),
    note             TEXT,
    created_by       UUID NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, ingredient_id) REFERENCES ingredients (tenant_id, ingredient_id),
    FOREIGN KEY (tenant_id, created_by)    REFERENCES users (tenant_id, users_id),
    CONSTRAINT chk_waste_reason_only_for_waste CHECK (
        (type =  'waste' AND waste_reason IS NOT NULL) OR
        (type <> 'waste' AND waste_reason IS NULL)),
    CONSTRAINT chk_counted_only_adjustment CHECK (counted_quantity IS NULL OR type = 'adjustment')
);
CREATE INDEX idx_inv_tx_ingredient ON inventory_transactions (ingredient_id);
CREATE INDEX idx_inv_tx_tenant ON inventory_transactions (tenant_id);
CREATE INDEX idx_inv_tx_type ON inventory_transactions (tenant_id, type);
CREATE INDEX idx_inv_tx_created_by ON inventory_transactions (created_by);

-- ============================================================
-- GROUP 6 : PAYMENT
-- ============================================================

CREATE TABLE payment_attempts (
    payment_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    payment_method     VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','qr_code')),
    -- 0 ได้: บิลที่ Comp หมดทุกรายการ
    amount             DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','success','failed','timeout')),
    qr_reference       VARCHAR(100),
    failure_reason     TEXT,
    initiated_by       UUID NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, initiated_by) REFERENCES users (tenant_id, users_id),
    CONSTRAINT uq_attempts_tenant_attempt UNIQUE (tenant_id, payment_attempt_id),
    CONSTRAINT chk_qr_reference_only_for_qr CHECK (
        payment_method = 'qr_code' OR (payment_method = 'cash' AND qr_reference IS NULL)),
    CONSTRAINT chk_failure_reason_only_when_failed CHECK (
        (status IN ('failed','timeout')  AND failure_reason IS NOT NULL) OR
        (status IN ('pending','success') AND failure_reason IS NULL))
);
CREATE INDEX idx_attempts_tenant_status ON payment_attempts (tenant_id, status);
CREATE UNIQUE INDEX idx_attempts_qr_reference ON payment_attempts (qr_reference) WHERE qr_reference IS NOT NULL;
CREATE INDEX idx_attempts_initiated_by ON payment_attempts (initiated_by);

CREATE TABLE payment_attempt_orders (
    tenant_id          UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    payment_attempt_id UUID NOT NULL,
    order_id           UUID NOT NULL,
    -- is_open = attempt นี้ยังจองบิลนี้อยู่ ปิดเมื่อ failed/timeout เพื่อให้จ่ายใหม่ได้ (PAY-06)
    is_open            BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (payment_attempt_id, order_id),
    FOREIGN KEY (tenant_id, payment_attempt_id)
        REFERENCES payment_attempts (tenant_id, payment_attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, order_id)
);
-- 1 บิลมี attempt ค้างได้ครั้งละอันเดียว กันจ่ายซ้ำจาก 2 เครื่อง
CREATE UNIQUE INDEX uq_pao_one_open_per_order ON payment_attempt_orders (order_id) WHERE is_open;
CREATE INDEX idx_pao_order ON payment_attempt_orders (order_id);
CREATE INDEX idx_pao_tenant ON payment_attempt_orders (tenant_id);

CREATE TABLE payments (
    payment_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    payment_attempt_id    UUID NOT NULL UNIQUE,
    subtotal              DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    vat_amount            DECIMAL(10,2) NOT NULL CHECK (vat_amount >= 0),
    service_charge_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (service_charge_amount >= 0),
    -- สำรองไว้สำหรับการปัดเศษในอนาคต ปัจจุบันบังคับเป็น 0 เพราะยังไม่มี logic ปัดเศษ
    -- เมื่อใดมี requirement ให้เพิ่ม config rounding_mode และคำนวณใน trg_payments_before()
    rounding_adjustment   DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (rounding_adjustment = 0),
    total_amount          DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    -- snapshot ภาษี: บิลเก่าพิมพ์ซ้ำได้ถูกต้องแม้ config เปลี่ยนไปแล้ว
    vat_mode              VARCHAR(10) NOT NULL CHECK (vat_mode IN ('none','inclusive','exclusive')),
    vat_rate_snapshot            DECIMAL(5,2) NOT NULL DEFAULT 0,
    service_charge_rate_snapshot DECIMAL(5,2) NOT NULL DEFAULT 0,
    payment_method        VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','qr_code')),
    cash_received         DECIMAL(10,2),
    receipt_number        VARCHAR(20) NOT NULL,
    business_date         DATE NOT NULL,
    processed_by          UUID NOT NULL,
    paid_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_amount         DECIMAL(10,2) GENERATED ALWAYS AS (
                              CASE WHEN payment_method = 'cash' AND cash_received IS NOT NULL
                                   THEN cash_received - total_amount ELSE NULL END) STORED,
    FOREIGN KEY (tenant_id, payment_attempt_id)
        REFERENCES payment_attempts (tenant_id, payment_attempt_id),
    FOREIGN KEY (tenant_id, processed_by) REFERENCES users (tenant_id, users_id),
    CONSTRAINT uq_payments_tenant_payment UNIQUE (tenant_id, payment_id),
    CONSTRAINT uq_payments_tenant_receipt UNIQUE (tenant_id, receipt_number),
    -- subtotal = มูลค่าสินค้าก่อน VAT เสมอ (inclusive คือแกะ VAT ออกจากราคาป้ายแล้ว)
    -- สูตรจึงเหมือนกันทุกโหมด ต่างกันแค่วิธีได้มาซึ่ง vat_amount (ดู trg_payments_before)
    CONSTRAINT chk_total_matches_sum CHECK (
        total_amount = subtotal + vat_amount + service_charge_amount + rounding_adjustment),
    CONSTRAINT chk_vat_zero_when_none CHECK (vat_mode <> 'none' OR (vat_amount = 0 AND vat_rate_snapshot = 0)),
    CONSTRAINT chk_cash_received_only_for_cash CHECK (
        (payment_method = 'cash'    AND cash_received IS NOT NULL AND cash_received >= total_amount) OR
        (payment_method = 'qr_code' AND cash_received IS NULL))
);
CREATE INDEX idx_payments_tenant_business_date ON payments (tenant_id, business_date);
CREATE INDEX idx_payments_tenant_paid_at ON payments (tenant_id, paid_at);
CREATE INDEX idx_payments_processed_by ON payments (processed_by);
CREATE INDEX idx_payments_attempt ON payments (payment_attempt_id);

ALTER TABLE orders ADD CONSTRAINT fk_orders_payment
    FOREIGN KEY (tenant_id, payment_id) REFERENCES payments (tenant_id, payment_id);

-- counter เลขที่ใบเสร็จ และเลขบิล รันแยกกันต่อร้านต่อวัน (แทน MAX()+1 ที่ชนกันตอนจ่ายพร้อมกัน)
CREATE TABLE receipt_sequences (
    tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    last_no       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, business_date)
);
CREATE TABLE order_sequences (
    tenant_id     UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    business_date DATE NOT NULL,
    last_no       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, business_date)
);

-- ============================================================
-- GROUP 7 : SHIFT / RECEIPT / AUDIT
-- ============================================================

CREATE TABLE shifts (
    shift_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    -- ระบบคิดจาก business_day_start_hour ไม่ให้กรอกเอง (กันเงินตกกะ)
    business_date         DATE NOT NULL,
    opening_cash          DECIMAL(10,2) NOT NULL CHECK (opening_cash >= 0),
    expected_closing_cash DECIMAL(10,2),
    actual_closing_cash   DECIMAL(10,2),
    variance              DECIMAL(10,2) GENERATED ALWAYS AS
                              (actual_closing_cash - expected_closing_cash) STORED,
    status                VARCHAR(20) NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','closed_auto','pending_verification','escalated','verified')),
    opened_by    UUID NOT NULL,
    opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_by    UUID,
    closed_at    TIMESTAMPTZ,
    verified_by  UUID,
    verified_at  TIMESTAMPTZ,
    escalated_to UUID,
    escalated_at TIMESTAMPTZ,
    reopen_count SMALLINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, opened_by)    REFERENCES users (tenant_id, users_id),
    FOREIGN KEY (tenant_id, closed_by)    REFERENCES users (tenant_id, users_id),
    FOREIGN KEY (tenant_id, verified_by)  REFERENCES users (tenant_id, users_id),
    FOREIGN KEY (tenant_id, escalated_to) REFERENCES users (tenant_id, users_id),
    -- 1 กะต่อวัน: ปิดกะ = ปิดร้านวันนั้น เปิดใหม่ต้อง reopen โดย owner/manager
    CONSTRAINT uq_shifts_tenant_business_date UNIQUE (tenant_id, business_date),
    CONSTRAINT uq_shifts_tenant_shift UNIQUE (tenant_id, shift_id),
    CONSTRAINT chk_verified_fields_together CHECK ((verified_by IS NULL) = (verified_at IS NULL)),
    CONSTRAINT chk_escalated_fields_together CHECK ((escalated_to IS NULL) = (escalated_at IS NULL)),
    CONSTRAINT chk_closed_fields_together CHECK (
        (closed_by IS NULL     AND closed_at IS NULL     AND actual_closing_cash IS NULL) OR
        (closed_by IS NOT NULL AND closed_at IS NOT NULL AND actual_closing_cash IS NOT NULL)),
    CONSTRAINT chk_closed_auto_zero_variance CHECK (status <> 'closed_auto' OR variance = 0),
    CONSTRAINT chk_pending_nonzero_variance CHECK (status <> 'pending_verification' OR variance <> 0)
);
CREATE INDEX idx_shifts_tenant_status ON shifts (tenant_id, status);
CREATE INDEX idx_shifts_opened_by ON shifts (opened_by);
CREATE INDEX idx_shifts_closed_by ON shifts (closed_by);

-- เงินเข้า-ออกลิ้นชักที่ไม่ใช่การขาย (ซื้อน้ำแข็ง, แลกแบงก์ย่อย)
CREATE TABLE cash_movements (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    shift_id    UUID NOT NULL,
    direction   VARCHAR(3) NOT NULL CHECK (direction IN ('in','out')),
    amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason      TEXT NOT NULL,
    created_by  UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, shift_id)   REFERENCES shifts (tenant_id, shift_id),
    FOREIGN KEY (tenant_id, created_by) REFERENCES users (tenant_id, users_id)
);
CREATE INDEX idx_cash_movements_shift ON cash_movements (tenant_id, shift_id);
CREATE INDEX idx_cash_movements_created_by ON cash_movements (created_by);

CREATE TABLE receipt_print_logs (
    print_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    payment_id   UUID NOT NULL,
    printed_by   UUID NOT NULL,
    printed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, payment_id) REFERENCES payments (tenant_id, payment_id),
    FOREIGN KEY (tenant_id, printed_by) REFERENCES users (tenant_id, users_id)
);
CREATE INDEX idx_rpl_payment ON receipt_print_logs (payment_id);
CREATE INDEX idx_rpl_tenant ON receipt_print_logs (tenant_id);
CREATE INDEX idx_rpl_printed_by ON receipt_print_logs (printed_by);

CREATE TABLE audit_logs (
    log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id     UUID,
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN (
        'login_success','login_failed','logout',
        'menu_price_updated','role_changed','table_status_changed','config_updated',
        'user_created','user_deactivated','user_reactivated',
        'pin_changed','password_changed','pin_locked',
        'order_closed_unpaid','shift_reopened','inventory_adjusted','tenant_updated')),
    ip_address  VARCHAR(45) NOT NULL,
    device_info TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, users_id)
);
CREATE INDEX idx_audit_tenant_created ON audit_logs (tenant_id, created_at);
CREATE INDEX idx_audit_tenant_user ON audit_logs (tenant_id, user_id);
CREATE INDEX idx_audit_tenant_action ON audit_logs (tenant_id, action_type);

-- ============================================================
-- VIEWS
-- ============================================================

-- ยอดต่อรายการ: รวม modifier และ Comp = 0 ทั้งรายการ (MOD-07)
CREATE VIEW v_order_item_totals WITH (security_invoker = true) AS
SELECT oi.tenant_id, oi.order_id, oi.order_item_id, oi.status, oi.is_comped,
       oi.item_name_snapshot,
       oi.unit_price_snapshot + COALESCE(m.mod_sum, 0) AS gross_price,
       CASE WHEN oi.is_comped THEN 0
            ELSE oi.unit_price_snapshot + COALESCE(m.mod_sum, 0) END AS line_total
FROM order_items oi
LEFT JOIN (SELECT order_item_id, SUM(price_delta_snapshot) AS mod_sum
           FROM order_item_modifiers GROUP BY order_item_id) m
       ON m.order_item_id = oi.order_item_id;

CREATE VIEW v_ingredient_stock WITH (security_invoker = true) AS
SELECT i.tenant_id, i.ingredient_id, i.name, i.stock_unit, i.low_stock_threshold,
       COALESCE(SUM(t.quantity_change), 0) AS current_stock,
       (i.low_stock_threshold IS NOT NULL
        AND COALESCE(SUM(t.quantity_change), 0) < i.low_stock_threshold) AS is_low
FROM ingredients i
LEFT JOIN inventory_transactions t ON t.ingredient_id = i.ingredient_id
GROUP BY i.tenant_id, i.ingredient_id, i.name, i.stock_unit, i.low_stock_threshold;

-- ใบเสร็จ: รวมจานที่เหมือนกัน (ราคา + ชุด modifier เดียวกัน) เป็นบรรทัดเดียว
CREATE VIEW v_receipt_lines WITH (security_invoker = true) AS
SELECT t.tenant_id, t.order_id, t.item_name_snapshot, t.gross_price, t.is_comped,
       COALESCE((SELECT string_agg(x.modifier_name_snapshot, ', ' ORDER BY x.modifier_name_snapshot)
                 FROM order_item_modifiers x WHERE x.order_item_id = t.order_item_id), '') AS modifiers,
       count(*) AS qty,
       sum(t.line_total) AS line_total
FROM v_order_item_totals t
WHERE t.status <> 'voided'
GROUP BY t.tenant_id, t.order_id, t.item_name_snapshot, t.gross_price, t.is_comped,
         (SELECT string_agg(x.modifier_id::text, ',' ORDER BY x.modifier_id)
          FROM order_item_modifiers x WHERE x.order_item_id = t.order_item_id),
         (SELECT string_agg(x.modifier_name_snapshot, ', ' ORDER BY x.modifier_name_snapshot)
          FROM order_item_modifiers x WHERE x.order_item_id = t.order_item_id);

-- ############################################################
-- PART 2/4 : FUNCTIONS + TRIGGERS
-- NestJS ต้อง SET LOCAL ทุก transaction:
--   app.current_tenant_id, app.current_user_id, app.current_user_role,
--   app.client_ip, app.device_info
-- ############################################################

CREATE FUNCTION app_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid $$;

CREATE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid $$;

-- อ่านค่า config ของร้าน ถ้าไม่ได้ตั้งไว้ใช้ default จาก config_definitions
CREATE FUNCTION cfg(p_tenant uuid, p_key text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT config_value  FROM system_config       WHERE tenant_id = p_tenant AND config_key = p_key),
    (SELECT default_value FROM config_definitions  WHERE config_key = p_key)) $$;

-- user คนนี้มี permission นี้ไหม (ใช้ใน trigger ที่ต้องเช็คสิทธิ์จริง)
CREATE FUNCTION has_permission(p_user uuid, p_key text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM users u
                 JOIN role_permissions rp ON rp.role_id = u.role_id
                 JOIN permissions p ON p.permission_id = rp.permission_id
                 WHERE u.users_id = p_user AND p.permission_key = p_key) $$;

-- วันทำการ: ก่อน business_day_start_hour ยังนับเป็นวันก่อนหน้า
CREATE FUNCTION compute_business_date(p_tenant uuid, p_ts timestamptz DEFAULT now())
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT ((p_ts AT TIME ZONE t.timezone)
          - make_interval(hours => cfg(p_tenant, 'business_day_start_hour')::int))::date
  FROM tenants t WHERE t.tenant_id = p_tenant $$;

CREATE FUNCTION next_receipt_number(p_tenant uuid, p_bdate date) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  INSERT INTO receipt_sequences(tenant_id, business_date, last_no) VALUES (p_tenant, p_bdate, 1)
  ON CONFLICT (tenant_id, business_date) DO UPDATE SET last_no = receipt_sequences.last_no + 1
  RETURNING last_no INTO n;
  RETURN to_char(p_bdate, 'DDMMYY') || '-' || lpad(n::text, 4, '0');
END $$;

CREATE FUNCTION next_order_number(p_tenant uuid, p_bdate date) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  INSERT INTO order_sequences(tenant_id, business_date, last_no) VALUES (p_tenant, p_bdate, 1)
  ON CONFLICT (tenant_id, business_date) DO UPDATE SET last_no = order_sequences.last_no + 1
  RETURNING last_no INTO n;
  RETURN n;
END $$;

CREATE FUNCTION audit_write(p_tenant uuid, p_action text, p_meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO audit_logs(tenant_id, user_id, action_type, ip_address, device_info, metadata)
  VALUES (p_tenant, app_user_id(), p_action,
          COALESCE(NULLIF(current_setting('app.client_ip', true), ''), 'unknown'),
          COALESCE(NULLIF(current_setting('app.device_info', true), ''), 'unknown'), p_meta) $$;

-- ============================================================
-- updated_at อัตโนมัติ
-- ============================================================
CREATE FUNCTION trg_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT c.table_name FROM information_schema.columns c
           JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
           WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
  LOOP EXECUTE format(
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()',
    r.table_name); END LOOP;
END $$;

-- ============================================================
-- Immutable / append-only  (ชั้นที่ 1; ชั้นที่ 2 คือ REVOKE ใน PART 4)
-- ============================================================
CREATE FUNCTION trg_guard_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_purge', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION '% is immutable/append-only (% blocked)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END $$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_guard_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_guard_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON receipt_print_logs
  FOR EACH ROW EXECUTE FUNCTION trg_guard_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION trg_guard_immutable();

CREATE FUNCTION trg_guard_audit_logs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND (current_setting('app.allow_purge', true) = 'on'
                           OR OLD.created_at < now() - interval '1 year') THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit_logs is append-only (retention 1 year)'
    USING ERRCODE = 'integrity_constraint_violation';
END $$;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION trg_guard_audit_logs();

-- ============================================================
-- ORDER
-- ============================================================

-- เปิดบิล: ต้องมีกะเปิดอยู่, โต๊ะต้องใช้งานได้, ออกเลขบิลให้เอง
CREATE FUNCTION trg_orders_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_status text; v_bdate date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_bdate := compute_business_date(NEW.tenant_id);
    NEW.business_date := v_bdate;
    IF NOT EXISTS (SELECT 1 FROM shifts WHERE tenant_id = NEW.tenant_id
                     AND business_date = v_bdate AND status = 'open') THEN
      RAISE EXCEPTION 'no open shift for business_date % (เปิดกะก่อน)', v_bdate;
    END IF;
    SELECT status INTO v_status FROM dining_tables WHERE table_id = NEW.table_id;
    IF v_status = 'out_of_service' THEN RAISE EXCEPTION 'table is out_of_service'; END IF;
    IF NEW.order_number IS NULL OR NEW.order_number = 0 THEN
      NEW.order_number := next_order_number(NEW.tenant_id, v_bdate);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.closed_at IS NOT NULL THEN RAISE EXCEPTION 'closed order is immutable'; END IF;
  IF NEW.order_number <> OLD.order_number OR NEW.business_date <> OLD.business_date THEN
    RAISE EXCEPTION 'order_number/business_date are immutable'; END IF;
  -- ย้ายโต๊ะ: ปลายทางต้องว่าง (TBL-05/06)
  IF NEW.table_id <> OLD.table_id THEN
    SELECT status INTO v_status FROM dining_tables WHERE table_id = NEW.table_id;
    IF v_status <> 'available' THEN RAISE EXCEPTION 'target table must be available (is %)', v_status; END IF;
  END IF;
  IF NEW.close_reason IN ('voided_all','empty')
     AND EXISTS (SELECT 1 FROM order_items WHERE order_id = NEW.order_id AND status <> 'voided') THEN
    RAISE EXCEPTION 'cannot close as % while non-voided items exist', NEW.close_reason;
  END IF;
  -- ปิดบิลโดยไม่เก็บเงินต้องมีสิทธิ์
  IF NEW.close_reason IN ('voided_all','empty','walkout') AND OLD.close_reason IS NULL
     AND NOT has_permission(NEW.closed_by, 'order:close_unpaid') THEN
    RAISE EXCEPTION 'user lacks permission order:close_unpaid';
  END IF;
  IF NEW.close_reason IS NOT NULL AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER before_change BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_before();

-- สถานะโต๊ะคิดจาก order ที่ยังไม่ปิด ไม่ให้ตั้งมือ (TBL-03)
CREATE FUNCTION sync_table_status(p_table uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE dining_tables d
     SET status = CASE WHEN EXISTS (SELECT 1 FROM orders o
                                    WHERE o.table_id = d.table_id AND o.closed_at IS NULL)
                       THEN 'occupied' ELSE 'available' END
   WHERE d.table_id = p_table
     AND d.status <> 'out_of_service'
     AND d.status <> CASE WHEN EXISTS (SELECT 1 FROM orders o
                                       WHERE o.table_id = d.table_id AND o.closed_at IS NULL)
                          THEN 'occupied' ELSE 'available' END $$;

CREATE FUNCTION trg_orders_after() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER after_change AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_orders_after();

CREATE FUNCTION trg_tables_status_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE has_active boolean;
BEGIN
  IF NEW.status <> OLD.status THEN
    SELECT EXISTS (SELECT 1 FROM orders WHERE table_id = NEW.table_id AND closed_at IS NULL)
      INTO has_active;
    IF NEW.status = 'out_of_service' AND has_active THEN
      RAISE EXCEPTION 'table has active order (TBL-03)'; END IF;
    IF NEW.status = 'occupied'  AND NOT has_active THEN
      RAISE EXCEPTION 'occupied requires an active order'; END IF;
    IF NEW.status = 'available' AND has_active THEN
      RAISE EXCEPTION 'table has active order'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER status_guard BEFORE UPDATE ON dining_tables
  FOR EACH ROW EXECUTE FUNCTION trg_tables_status_guard();

-- ============================================================
-- ORDER ITEMS
-- ============================================================

CREATE FUNCTION trg_order_item_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mi menu_items%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE order_id = NEW.order_id AND closed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'order is closed'; END IF;
  SELECT * INTO mi FROM menu_items WHERE menu_item_id = NEW.menu_item_id;
  IF NOT mi.is_active    THEN RAISE EXCEPTION 'menu item "%" is discontinued', mi.name; END IF;
  IF NOT mi.is_available THEN RAISE EXCEPTION 'menu item "%" is not available today', mi.name; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER before_insert BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_order_item_before_insert();

-- snapshot ห้ามแก้: ใบเสร็จย้อนหลังต้องเหมือนเดิมตลอด
CREATE FUNCTION trg_guard_order_item_snapshots() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.unit_price_snapshot IS DISTINCT FROM OLD.unit_price_snapshot
     OR NEW.item_name_snapshot IS DISTINCT FROM OLD.item_name_snapshot
     OR NEW.menu_item_id <> OLD.menu_item_id
     OR NEW.order_id <> OLD.order_id
     OR NEW.tenant_id <> OLD.tenant_id THEN
    RAISE EXCEPTION 'order_items snapshot columns are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_snapshots BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_guard_order_item_snapshots();

CREATE FUNCTION trg_guard_oim() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'order_item_modifiers rows are immutable (void the item and re-add instead)'; END $$;
CREATE TRIGGER guard_snapshots BEFORE UPDATE ON order_item_modifiers
  FOR EACH ROW EXECUTE FUNCTION trg_guard_oim();

-- state machine + กฎ void/comp (ORD-04)
CREATE FUNCTION trg_order_item_state() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER state_machine BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION trg_order_item_state();

-- ============================================================
-- PAYMENT
-- ============================================================

CREATE FUNCTION trg_pao_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM orders WHERE order_id = NEW.order_id;
  IF o.closed_at IS NOT NULL THEN RAISE EXCEPTION 'order already closed'; END IF;
  IF cfg(NEW.tenant_id, 'require_all_served_before_payment') = 'true'
     AND EXISTS (SELECT 1 FROM order_items
                 WHERE order_id = NEW.order_id AND status NOT IN ('served','voided')) THEN
    RAISE EXCEPTION 'PAY-03: all items must be served before payment';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pao_guard BEFORE INSERT ON payment_attempt_orders
  FOR EACH ROW EXECUTE FUNCTION trg_pao_guard();

CREATE FUNCTION trg_attempt_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount <> OLD.amount OR NEW.payment_method <> OLD.payment_method THEN
    RAISE EXCEPTION 'attempt amount/method are immutable'; END IF;
  IF NEW.status <> OLD.status THEN
    IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'attempt already finalized'; END IF;
    IF NEW.status IN ('failed','timeout') THEN
      UPDATE payment_attempt_orders SET is_open = false
       WHERE payment_attempt_id = NEW.payment_attempt_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER status_guard BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION trg_attempt_status();

-- ตรวจทุกอย่างก่อนบันทึกการจ่าย แล้วออกเลขใบเสร็จ/วันทำการให้เอง
CREATE FUNCTION trg_payments_before() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a payment_attempts%ROWTYPE; v_gross numeric; v_mode text; v_rate numeric;
BEGIN
  SELECT * INTO a FROM payment_attempts
   WHERE payment_attempt_id = NEW.payment_attempt_id FOR UPDATE;
  IF a.status <> 'success' THEN
    RAISE EXCEPTION 'attempt must be success before creating payment'; END IF;
  IF a.amount <> NEW.total_amount OR a.payment_method <> NEW.payment_method THEN
    RAISE EXCEPTION 'payment total/method must equal attempt (% vs %)', NEW.total_amount, a.amount; END IF;

  -- ยอดต้องตรงกับรายการจริงในบิล
  SELECT COALESCE(SUM(t.line_total), 0) INTO v_gross
    FROM payment_attempt_orders p
    JOIN v_order_item_totals t ON t.order_id = p.order_id AND t.status <> 'voided'
   WHERE p.payment_attempt_id = NEW.payment_attempt_id;

  v_mode := cfg(NEW.tenant_id, 'vat_mode');
  v_rate := cfg(NEW.tenant_id, 'vat_rate')::numeric;
  NEW.vat_mode := v_mode;
  NEW.vat_rate_snapshot := CASE WHEN v_mode = 'none' THEN 0 ELSE v_rate END;
  NEW.service_charge_rate_snapshot := cfg(NEW.tenant_id, 'service_charge_rate')::numeric;

  IF v_mode = 'none' THEN
    IF NEW.subtotal <> v_gross THEN
      RAISE EXCEPTION 'subtotal % does not match order items %', NEW.subtotal, v_gross; END IF;
    NEW.vat_amount := 0;
  ELSIF v_mode = 'inclusive' THEN
    -- ราคาเมนูรวม VAT แล้ว แกะออกมาแสดง: subtotal = total - vat (ตัวเลขบนใบเสร็จบวกกันลงตัวเสมอ)
    IF NEW.total_amount <> v_gross + NEW.service_charge_amount + NEW.rounding_adjustment THEN
      RAISE EXCEPTION 'total % does not match order items % + service % + rounding %',
        NEW.total_amount, v_gross, NEW.service_charge_amount, NEW.rounding_adjustment; END IF;
    NEW.vat_amount := round(NEW.total_amount - (NEW.total_amount / (1 + v_rate / 100)), 2);
    NEW.subtotal   := NEW.total_amount - NEW.vat_amount - NEW.service_charge_amount - NEW.rounding_adjustment;
  ELSE -- exclusive
    IF NEW.subtotal <> v_gross THEN
      RAISE EXCEPTION 'subtotal % does not match order items %', NEW.subtotal, v_gross; END IF;
    NEW.vat_amount := round((NEW.subtotal + NEW.service_charge_amount) * v_rate / 100, 2);
  END IF;

  IF NEW.business_date IS NULL THEN
    NEW.business_date := compute_business_date(NEW.tenant_id, COALESCE(NEW.paid_at, now())); END IF;
  -- เงินต้องเข้ากะที่เปิดอยู่เสมอ
  IF NOT EXISTS (SELECT 1 FROM shifts WHERE tenant_id = NEW.tenant_id
                   AND business_date = NEW.business_date AND status = 'open') THEN
    RAISE EXCEPTION 'no open shift for business_date %', NEW.business_date; END IF;
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := next_receipt_number(NEW.tenant_id, NEW.business_date); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER before_insert BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payments_before();

-- ปิดทุกบิลใน attempt เดียวกันพร้อมกันใน transaction เดียว
CREATE FUNCTION trg_payments_after() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET payment_id = NEW.payment_id, close_reason = 'paid', closed_at = NEW.paid_at
   WHERE order_id IN (SELECT order_id FROM payment_attempt_orders
                      WHERE payment_attempt_id = NEW.payment_attempt_id);
  UPDATE payment_attempt_orders SET is_open = false
   WHERE payment_attempt_id = NEW.payment_attempt_id;
  RETURN NEW;
END $$;
CREATE TRIGGER after_insert AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payments_after();

CREATE FUNCTION trg_reprint_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mx int := cfg(NEW.tenant_id, 'max_reprints')::int; c int;
BEGIN
  IF mx > 0 THEN
    SELECT count(*) INTO c FROM receipt_print_logs WHERE payment_id = NEW.payment_id;
    IF c >= mx + 1 THEN RAISE EXCEPTION 'reprint limit reached (%)', mx; END IF;  -- +1 = พิมพ์ครั้งแรก
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reprint_limit BEFORE INSERT ON receipt_print_logs
  FOR EACH ROW EXECUTE FUNCTION trg_reprint_limit();

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE FUNCTION trg_inventory_lock() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM ingredients WHERE ingredient_id = NEW.ingredient_id FOR UPDATE;
  RETURN NEW;
END $$;
CREATE TRIGGER lock_ingredient BEFORE INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_inventory_lock();

-- พนักงานกรอกยอดคงเหลือตอนจบวัน ระบบคิดส่วนต่างให้ และ audit ถ้าเพี้ยนมาก
CREATE FUNCTION record_stock_count(p_tenant uuid, p_ingredient uuid, p_counted numeric,
                                   p_user uuid, p_note text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE cur numeric; d numeric; pct numeric; limit_pct numeric;
BEGIN
  PERFORM 1 FROM ingredients WHERE ingredient_id = p_ingredient AND tenant_id = p_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ingredient not found'; END IF;
  IF NOT has_permission(p_user, 'inventory:adjust') THEN
    RAISE EXCEPTION 'user lacks permission inventory:adjust'; END IF;

  SELECT COALESCE(SUM(quantity_change), 0) INTO cur
    FROM inventory_transactions WHERE ingredient_id = p_ingredient;
  d := p_counted - cur;
  IF d = 0 THEN RETURN 0; END IF;

  INSERT INTO inventory_transactions
    (tenant_id, ingredient_id, type, quantity_change, counted_quantity, note, created_by)
  VALUES (p_tenant, p_ingredient, 'adjustment', d, p_counted,
          COALESCE(p_note, '') || ' [counted ' || p_counted || ', system ' || cur || ']', p_user);

  -- ยิง audit เฉพาะที่เพี้ยนทั้งเป็น % และเป็นจำนวน (กันยอดน้อยๆ เตือนทุกวัน)
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

-- ============================================================
-- SHIFT
-- ============================================================

CREATE FUNCTION trg_shift_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.business_date := compute_business_date(NEW.tenant_id);   -- ไม่ให้กรอกเอง
  IF NOT has_permission(NEW.opened_by, 'shift:open') THEN
    RAISE EXCEPTION 'user lacks permission shift:open'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER before_insert BEFORE INSERT ON shifts
  FOR EACH ROW EXECUTE FUNCTION trg_shift_before_insert();

CREATE FUNCTION trg_shift_flow() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE exp numeric; cash_in numeric; cash_out numeric; cash_pay numeric; rname text;
BEGIN
  IF NEW.business_date <> OLD.business_date OR NEW.opened_by <> OLD.opened_by THEN
    RAISE EXCEPTION 'shift business_date/opened_by are immutable'; END IF;

  -- ปิดกะ: คำนวณยอดที่ควรมีจากเงินสดที่รับ + เงินเข้าออกลิ้นชัก
  IF NEW.actual_closing_cash IS NOT NULL AND OLD.actual_closing_cash IS NULL THEN
    IF OLD.status <> 'open' THEN RAISE EXCEPTION 'shift not open'; END IF;
    IF NOT has_permission(NEW.closed_by, 'shift:close_and_count') THEN
      RAISE EXCEPTION 'user lacks permission shift:close_and_count'; END IF;
    SELECT COALESCE(SUM(total_amount), 0) INTO cash_pay FROM payments
     WHERE tenant_id = NEW.tenant_id AND business_date = NEW.business_date AND payment_method = 'cash';
    SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0),
           COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0)
      INTO cash_in, cash_out FROM cash_movements WHERE shift_id = NEW.shift_id;
    exp := NEW.opening_cash + cash_pay + cash_in - cash_out;
    NEW.expected_closing_cash := exp;
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.status := CASE WHEN NEW.actual_closing_cash = exp THEN 'closed_auto'
                       ELSE 'pending_verification' END;

  ELSIF NEW.status <> OLD.status THEN
    -- reopen_shift() ตั้งธงนี้ไว้ เป็นทางเดียวที่กลับไป open ได้
    IF NEW.status = 'open' AND current_setting('app.shift_reopen', true) = 'on' THEN
      RETURN NEW;
    END IF;
    IF NOT ((OLD.status, NEW.status) IN (
        ('pending_verification','verified'), ('pending_verification','escalated'),
        ('escalated','verified'))) THEN
      RAISE EXCEPTION 'invalid shift transition % -> %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'verified' THEN
      SELECT r.role_name INTO rname FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.users_id = NEW.verified_by;
      IF OLD.status = 'escalated' AND rname <> 'owner' THEN
        RAISE EXCEPTION 'escalated shift must be verified by owner'; END IF;
      IF NOT has_permission(NEW.verified_by, 'shift:verify') THEN
        RAISE EXCEPTION 'user lacks permission shift:verify'; END IF;
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
    IF NEW.status = 'escalated' THEN
      SELECT r.role_name INTO rname FROM users u JOIN roles r ON r.role_id = u.role_id
       WHERE u.users_id = NEW.escalated_to;
      IF rname <> 'owner' THEN RAISE EXCEPTION 'escalated_to must be owner'; END IF;
      NEW.escalated_at := COALESCE(NEW.escalated_at, now());
    END IF;

  ELSIF OLD.status <> 'open' AND NEW.opening_cash <> OLD.opening_cash THEN
    RAISE EXCEPTION 'closed shift figures are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER flow BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION trg_shift_flow();

-- พนักงานกดปิดกะผิด: owner/manager เปิดใหม่ได้ ยอดเงินเปิดกะคงเดิม ล้างตัวเลขปิด
-- เปิดได้เฉพาะ closed_auto / pending_verification — verified กับ escalated ปิดตาย
CREATE FUNCTION reopen_shift(p_shift uuid, p_user uuid, p_reason text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE s shifts%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'reopen reason is required'; END IF;
  SELECT * INTO s FROM shifts WHERE shift_id = p_shift FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift not found'; END IF;
  IF NOT has_permission(p_user, 'shift:reopen') THEN
    RAISE EXCEPTION 'user lacks permission shift:reopen'; END IF;
  IF s.status NOT IN ('closed_auto','pending_verification') THEN
    RAISE EXCEPTION 'cannot reopen a % shift', s.status; END IF;

  PERFORM set_config('app.shift_reopen', 'on', true);
  UPDATE shifts SET status = 'open',
                    closed_by = NULL, closed_at = NULL,
                    actual_closing_cash = NULL, expected_closing_cash = NULL,
                    reopen_count = reopen_count + 1
   WHERE shift_id = p_shift;
  PERFORM set_config('app.shift_reopen', 'off', true);

  PERFORM audit_write(s.tenant_id, 'shift_reopened', jsonb_build_object(
    'shift_id', p_shift, 'business_date', s.business_date,
    'previous_status', s.status, 'reason', p_reason,
    'previous_actual_closing_cash', s.actual_closing_cash,
    'previous_expected_closing_cash', s.expected_closing_cash));
END $$;

CREATE FUNCTION trg_cash_movement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT status FROM shifts WHERE shift_id = NEW.shift_id) <> 'open' THEN
    RAISE EXCEPTION 'shift is not open'; END IF;
  IF NOT has_permission(NEW.created_by, 'cash:movement') THEN
    RAISE EXCEPTION 'user lacks permission cash:movement'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard BEFORE INSERT ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION trg_cash_movement_guard();

-- ============================================================
-- TENANT / CONFIG
-- ============================================================

CREATE FUNCTION trg_tenant_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO system_config(tenant_id, config_key, config_value)
  SELECT NEW.tenant_id, config_key, default_value FROM config_definitions;
  RETURN NEW;
END $$;
CREATE TRIGGER seed_config AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_tenant_defaults();

CREATE FUNCTION trg_config_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d config_definitions%ROWTYPE; num numeric; v_tax text;
BEGIN
  SELECT * INTO d FROM config_definitions WHERE config_key = NEW.config_key;
  IF d.value_type IN ('int','decimal') THEN
    BEGIN num := NEW.config_value::numeric;
    EXCEPTION WHEN others THEN RAISE EXCEPTION 'config % must be numeric', NEW.config_key; END;
    IF d.value_type = 'int' AND num <> trunc(num) THEN
      RAISE EXCEPTION 'config % must be an integer', NEW.config_key; END IF;
    IF d.min_value IS NOT NULL AND num < d.min_value THEN
      RAISE EXCEPTION 'config % below minimum %', NEW.config_key, d.min_value; END IF;
    IF d.max_value IS NOT NULL AND num > d.max_value THEN
      RAISE EXCEPTION 'config % above maximum %', NEW.config_key, d.max_value; END IF;
  ELSIF d.value_type = 'bool' AND NEW.config_value NOT IN ('true','false') THEN
    RAISE EXCEPTION 'config % must be true/false', NEW.config_key;
  END IF;
  IF d.allowed_values IS NOT NULL AND NOT (NEW.config_value = ANY(d.allowed_values)) THEN
    RAISE EXCEPTION 'config % has invalid value "%"', NEW.config_key, NEW.config_value; END IF;

  IF TG_OP = 'UPDATE' AND d.owner_only AND NEW.config_value <> OLD.config_value
     AND COALESCE(current_setting('app.current_user_role', true), '') <> 'owner' THEN
    RAISE EXCEPTION 'config % is owner-only (CFG-04)', NEW.config_key; END IF;

  -- ออกใบกำกับภาษีต้องมีเลขประจำตัวผู้เสียภาษี
  IF NEW.config_key = 'vat_mode' AND NEW.config_value <> 'none' THEN
    SELECT tax_id INTO v_tax FROM tenants WHERE tenant_id = NEW.tenant_id;
    IF v_tax IS NULL THEN
      RAISE EXCEPTION 'ต้องกรอกเลขประจำตัวผู้เสียภาษี (tenants.tax_id) ก่อนเปิดใช้ VAT'; END IF;
  END IF;

  NEW.updated_by := COALESCE(app_user_id(), NEW.updated_by);
  RETURN NEW;
END $$;
CREATE TRIGGER validate BEFORE INSERT OR UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION trg_config_validate();

-- ============================================================
-- AUDIT อัตโนมัติ (ไม่พึ่งว่า NestJS จะจำเขียน)
-- ============================================================

CREATE FUNCTION trg_audit_config() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.config_value <> OLD.config_value THEN
    PERFORM audit_write(NEW.tenant_id, 'config_updated', jsonb_build_object(
      'config_key', NEW.config_key, 'old_value', OLD.config_value, 'new_value', NEW.config_value));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit AFTER UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION trg_audit_config();

CREATE FUNCTION trg_audit_menu_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price <> OLD.price THEN
    PERFORM audit_write(NEW.tenant_id, 'menu_price_updated', jsonb_build_object(
      'menu_item_id', NEW.menu_item_id, 'name', NEW.name,
      'old_price', OLD.price, 'new_price', NEW.price));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit AFTER UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION trg_audit_menu_price();

CREATE FUNCTION trg_audit_table_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.status = 'out_of_service') <> (NEW.status = 'out_of_service') THEN
    PERFORM audit_write(NEW.tenant_id, 'table_status_changed', jsonb_build_object(
      'table_id', NEW.table_id, 'table_number', NEW.table_number,
      'old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit AFTER UPDATE ON dining_tables
  FOR EACH ROW EXECUTE FUNCTION trg_audit_table_status();

CREATE FUNCTION trg_audit_users() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM audit_write(NEW.tenant_id, 'user_created', jsonb_build_object(
      'target_user_id', NEW.users_id, 'username', NEW.username,
      'role', (SELECT role_name FROM roles WHERE role_id = NEW.role_id)));
    RETURN NEW;
  END IF;
  IF NEW.role_id <> OLD.role_id THEN
    PERFORM audit_write(NEW.tenant_id, 'role_changed', jsonb_build_object(
      'target_user_id', NEW.users_id,
      'old_role', (SELECT role_name FROM roles WHERE role_id = OLD.role_id),
      'new_role', (SELECT role_name FROM roles WHERE role_id = NEW.role_id)));
  END IF;
  IF OLD.is_active AND NOT NEW.is_active THEN
    PERFORM audit_write(NEW.tenant_id, 'user_deactivated',
      jsonb_build_object('target_user_id', NEW.users_id)); END IF;
  IF NOT OLD.is_active AND NEW.is_active THEN
    PERFORM audit_write(NEW.tenant_id, 'user_reactivated',
      jsonb_build_object('target_user_id', NEW.users_id)); END IF;
  IF NEW.pin_hash IS DISTINCT FROM OLD.pin_hash THEN
    PERFORM audit_write(NEW.tenant_id, 'pin_changed',
      jsonb_build_object('target_user_id', NEW.users_id)); END IF;
  IF NEW.password_hash <> OLD.password_hash THEN
    PERFORM audit_write(NEW.tenant_id, 'password_changed',
      jsonb_build_object('target_user_id', NEW.users_id)); END IF;
  IF NEW.pin_locked_until IS NOT NULL
     AND OLD.pin_locked_until IS DISTINCT FROM NEW.pin_locked_until THEN
    PERFORM audit_write(NEW.tenant_id, 'pin_locked',
      jsonb_build_object('target_user_id', NEW.users_id)); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_audit_users();

-- ============================================================
-- งานตั้งเวลา + ฟังก์ชันระบบ (SECURITY DEFINER เพราะต้องข้าม RLS)
-- ============================================================

CREATE FUNCTION escalate_overdue_shifts() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n int := 0; s record; ow uuid;
BEGIN
  FOR s IN SELECT shift_id, tenant_id FROM shifts
            WHERE status = 'pending_verification'
              AND closed_at < now() - make_interval(hours => cfg(tenant_id,'shift_escalation_hours')::int)
            FOR UPDATE
  LOOP
    SELECT u.users_id INTO ow FROM users u JOIN roles r ON r.role_id = u.role_id
     WHERE u.tenant_id = s.tenant_id AND r.role_name = 'owner' AND u.is_active
     ORDER BY u.created_at LIMIT 1;
    IF ow IS NOT NULL THEN
      UPDATE shifts SET status = 'escalated', escalated_to = ow WHERE shift_id = s.shift_id;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

CREATE FUNCTION purge_old_audit_logs() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n bigint;
BEGIN
  DELETE FROM audit_logs WHERE created_at < now() - interval '1 year';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE FUNCTION admin_purge_tenant(p_tenant uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM set_config('app.allow_purge', 'on', true);
  DELETE FROM tenants WHERE tenant_id = p_tenant;
  -- ปิดธงคืนทันที ไม่งั้นการป้องกันการลบจะปิดไปตลอด transaction ที่เรียกฟังก์ชันนี้
  PERFORM set_config('app.allow_purge', 'off', true);
END $$;

-- login ยังไม่มี tenant context จึงต้องข้าม RLS เฉพาะ 3 ฟังก์ชันนี้
CREATE FUNCTION resolve_tenant(p_slug text)
RETURNS TABLE(tenant_id uuid, is_active boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.tenant_id, t.is_active FROM tenants t WHERE t.tenant_slug = lower(p_slug) $$;

CREATE FUNCTION resolve_user_by_email(p_email text)
RETURNS TABLE(users_id uuid, tenant_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT u.users_id, u.tenant_id FROM users u
   WHERE lower(u.email) = lower(p_email) AND u.is_active $$;

-- refresh ยังไม่มี tenant context เหมือน login
CREATE FUNCTION resolve_refresh_token(p_hash text)
RETURNS TABLE(tenant_id uuid, user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.tenant_id, r.user_id FROM refresh_tokens r WHERE r.token_hash = p_hash $$;

-- ############################################################
-- PART 3/4 : SEED  (reference data — รันซ้ำได้)
-- ############################################################

-- ============================================================
-- config_definitions
-- ============================================================
INSERT INTO config_definitions
    (config_key, value_type, default_value, min_value, max_value, allowed_values, owner_only, description) VALUES
 ('vat_mode','text','none',NULL,NULL,ARRAY['none','inclusive','exclusive'],true,
  'none=ไม่จด VAT (default), inclusive=ราคาเมนูรวม VAT แล้ว, exclusive=บวก VAT เพิ่มจากราคา'),
 ('vat_rate','decimal','7',0,100,NULL,true,'อัตรา VAT (%)'),
 ('service_charge_rate','decimal','0',0,100,NULL,true,'Service charge (%)'),
 ('business_day_start_hour','int','5',0,23,NULL,false,
  'ชั่วโมงที่ถือเป็นวันทำการใหม่ ร้านเปิดดึกให้ตั้งสูงกว่านี้'),
 ('shift_escalation_hours','int','4',1,168,NULL,false,'ชั่วโมงก่อน escalate กะไปหา owner'),
 ('max_reprints','int','0',0,1000,NULL,false,'จำนวนครั้งที่พิมพ์ซ้ำได้ 0 = ไม่จำกัด'),
 ('kds_enabled','bool','true',NULL,NULL,NULL,false,'เปิดจอครัว'),
 ('require_all_served_before_payment','bool','true',NULL,NULL,NULL,false,
  'PAY-03 บังคับเสิร์ฟครบก่อนจ่าย ร้านที่จ่ายก่อนกินให้ตั้ง false'),
 ('inventory_variance_alert_percent','decimal','20',0,1000,NULL,false,
  'ส่วนต่างสต็อกเกินกี่ % ถึงยิง audit (และต้องเกิน 1 หน่วยด้วย)'),
 ('receipt_footer','text','ขอบคุณที่ใช้บริการ\nโปรดตรวจสอบรายการก่อนออกจากร้าน',NULL,NULL,NULL,false,
  'ข้อความท้ายใบเสร็จ'),
 ('receipt_show_tax_id','bool','true',NULL,NULL,NULL,false,
  'แสดงเลขประจำตัวผู้เสียภาษีบนใบเสร็จ'),
 ('receipt_show_cashier','bool','true',NULL,NULL,NULL,false,
  'แสดงชื่อพนักงานแคชเชียร์บนใบเสร็จ'),
 ('receipt_show_address','bool','true',NULL,NULL,NULL,false,
  'แสดงที่อยู่และเบอร์โทรร้านบนใบเสร็จ')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- roles
-- ============================================================
INSERT INTO roles (role_name, description) VALUES
 ('owner',    'เจ้าของร้าน มีสิทธิ์สูงสุด ยกเว้น payment:edit_closed'),
 ('manager',  'ผู้จัดการร้าน อนุมัติรายการเสี่ยงทางการเงินได้'),
 ('employee', 'พนักงานปฏิบัติการ ทำธุรกรรมพื้นฐาน ไม่มีสิทธิ์อนุมัติ')
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================
-- permissions
-- ============================================================
INSERT INTO permissions (permission_key, module_name, description) VALUES
 ('user:manage',            'User Management',       'จัดการบัญชีผู้ใช้งานในร้าน'),
 ('role:assign',            'User Management',       'มอบหมายบทบาทให้ผู้ใช้งาน'),
 ('store:configure',        'System Configuration',  'ตั้งค่าร้าน (ชื่อ ที่อยู่ เลขผู้เสียภาษี)'),
 ('tax:configure',          'System Configuration',  'ตั้งค่า VAT และ Service Charge'),
 ('config:edit_operational','System Configuration',  'ตั้งค่าเชิงปฏิบัติงาน (KDS, reprint, escalation) ไม่รวม VAT'),
 ('menu:edit',              'Menu Management',       'เพิ่ม/แก้ไข/ลบเมนู หมวดหมู่ และ Modifier'),
 ('table:manage',           'Table Management',      'จัดการผังโต๊ะ ไม่รวม Move Table ที่ใช้ order:create'),
 ('report:view_all',        'Reports',               'ดูรายงานยอดขายทั้งร้าน รวมย้อนหลัง'),
 ('report:view_own_shift',  'Reports',               'ดูยอดขายเฉพาะกะของตนเอง'),
 ('order:create',           'Order Management',      'เปิดโต๊ะ รับออเดอร์ ส่งครัว ย้ายโต๊ะ'),
 ('order:close_unpaid',     'Order Management',      'ปิดบิลโดยไม่เก็บเงิน (walkout / empty / voided_all)'),
 ('void:approve',           'Order Management',      'อนุมัติ Void รวมถึง void ตอนครัวกำลังทำ (preparing)'),
 ('discount:approve',       'Order Management',      'อนุมัติส่วนลด/Comp'),
 ('payment:receive',        'Payment',               'รับชำระเงินและพิมพ์ใบเสร็จ'),
 -- ไม่มอบให้ Role ใดเลย (INV-01) และมี trigger immutable บน payments ทับอีกชั้น
 -- เก็บไว้เป็น documentation ว่าระบบ "เคยพิจารณาแล้วตั้งใจไม่ให้"
 ('payment:edit_closed',    'Payment',               'แก้ไขการชำระเงินที่ปิดแล้ว (ไม่มอบให้ Role ใดเลย)'),
 ('inventory:check',        'Inventory Management',  'ดูระดับสต็อก'),
 ('inventory:adjust',       'Inventory Management',  'บันทึกรับของ/ของเสีย/กรอกยอดคงเหลือ'),
 ('shift:open',             'Shift Management',      'เปิดกะการทำงาน'),
 ('shift:close_and_count',  'Shift Management',      'ปิดกะและกรอกยอดเงินสดที่นับได้'),
 ('shift:verify',           'Shift Management',      'ตรวจสอบและรับรองยอดปิดกะ'),
 -- ซ้ำความหมายกับ shift:verify เพราะ trigger เช็ค role=owner ให้อยู่แล้วตอน escalated
 -- เก็บไว้ให้ตรงกับเอกสาร business rules เดิม
 ('shift:auto_escalated_verify','Shift Management',  'รับรองยอดปิดกะกรณี escalate เกินเวลา'),
 ('shift:reopen',           'Shift Management',      'เปิดกะที่ปิดไปแล้วใหม่ (กรณีกดปิดผิด)'),
 ('cash:movement',          'Shift Management',      'บันทึกเงินเข้า-ออกลิ้นชักนอกการขาย'),
 ('kds:mark_ready',         'Kitchen Display System','เปลี่ยนสถานะอาหารบนจอครัว'),
 ('audit_log:view',         'Audit Log',             'เข้าถึงหน้า Audit Log (AUD-05)')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================
-- role_permissions
-- ============================================================

-- Owner: ทุกอย่างยกเว้น payment:edit_closed
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'owner' AND p.permission_key <> 'payment:edit_closed'
ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'manager' AND p.permission_key IN (
  'menu:edit','table:manage','config:edit_operational',
  'report:view_all','report:view_own_shift',
  'order:create','order:close_unpaid','void:approve','discount:approve',
  'payment:receive',
  'inventory:check','inventory:adjust',
  'shift:open','shift:close_and_count','shift:verify','shift:reopen','cash:movement',
  'kds:mark_ready','audit_log:view')
ON CONFLICT DO NOTHING;

-- Employee: ทำธุรกรรมพื้นฐาน ไม่มีสิทธิ์อนุมัติและปิดบิลโดยไม่เก็บเงิน
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'employee' AND p.permission_key IN (
  'report:view_own_shift',
  'order:create',
  'payment:receive',
  'inventory:check','inventory:adjust',
  'shift:open','shift:close_and_count',
  'kds:mark_ready')
ON CONFLICT DO NOTHING;

-- ############################################################
-- PART 4/4 : DB ROLES + RLS
-- ต้องรันด้วย role เจ้าของ schema (postgres)
-- NestJS ต้องต่อด้วย pos_app เท่านั้น ถ้าต่อด้วย postgres RLS จะไม่ทำงาน
-- ############################################################

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pos_app') THEN
    CREATE ROLE pos_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
      PASSWORD 'CHANGE_ME_NOW';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pos_readonly') THEN
    CREATE ROLE pos_readonly LOGIN NOSUPERUSER NOBYPASSRLS
      PASSWORD 'CHANGE_ME_NOW';
  END IF;
END $$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO pos_app, pos_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pos_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pos_readonly;

-- reference data: อ่านอย่างเดียว แก้ได้เฉพาะตอน migrate
REVOKE INSERT, UPDATE, DELETE ON roles, permissions, role_permissions, config_definitions FROM pos_app;

-- append-only: ชั้นที่ 2 ต่อจาก trigger immutable
REVOKE UPDATE, DELETE ON payments, inventory_transactions, receipt_print_logs,
                          audit_logs, cash_movements FROM pos_app;

-- soft delete เท่านั้น (TEN-01, USR-01)
REVOKE DELETE ON tenants, users, orders, order_items FROM pos_app;

REVOKE EXECUTE ON FUNCTION admin_purge_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION escalate_overdue_shifts(), purge_old_audit_logs(),
                          resolve_tenant(text), resolve_user_by_email(text),
                          resolve_refresh_token(text),
                          reopen_shift(uuid, uuid, text),
                          record_stock_count(uuid, uuid, numeric, uuid, text) TO pos_app;

-- ============================================================
-- RLS: ทุกตารางที่มี tenant_id
-- ใช้ ENABLE ไม่ใช่ FORCE โดยตั้งใจ — owner (migration, SECURITY DEFINER) ต้องข้ามได้
-- pos_app ไม่ใช่ owner จึงโดน policy เสมอ
-- ============================================================
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT c.table_name FROM information_schema.columns c
           JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
           WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
             AND c.table_name <> 'tenants'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', r.table_name);
    EXECUTE format($f$CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = (SELECT app_tenant_id()))
        WITH CHECK (tenant_id = (SELECT app_tenant_id()))$f$, r.table_name);
  END LOOP;
END $$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (tenant_id = (SELECT app_tenant_id()))
  WITH CHECK (tenant_id = (SELECT app_tenant_id()));

