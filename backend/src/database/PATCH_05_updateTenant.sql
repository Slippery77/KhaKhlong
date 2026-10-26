ALTER TABLE tenants
  ADD COLUMN promptpay_id varchar(10) NULL,
  ADD CONSTRAINT chk_tenants_promptpay_phone
      CHECK (promptpay_id IS NULL OR promptpay_id ~ '^0[0-9]{9}$');