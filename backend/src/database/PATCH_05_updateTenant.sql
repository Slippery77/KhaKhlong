ALTER TABLE tenants
  ADD COLUMN promptpay_id varchar(10) NULL,
  ADD CONSTRAINT chk_tenants_promptpay_phone
      CHECK (promptpay_id IS NULL OR promptpay_id ~ '^0[0-9]{9}$');

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;
UPDATE users SET token_version = 0 WHERE token_version IS NULL;
ALTER TABLE users ALTER COLUMN token_version SET NOT NULL;
ALTER TABLE users ALTER COLUMN token_version SET DEFAULT 0;