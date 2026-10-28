-- PATCH 06: ผูก refresh token กับ token_version ของผู้ใช้
--
-- ปัญหาเดิม: access token ถูกเพิกถอนเมื่อเปลี่ยนรหัสผ่าน (bump users.token_version)
-- แต่ refresh token ยังออก access token ใบใหม่ที่ใช้ได้จนกว่าจะหมดอายุ
--
-- วิธีแก้: บันทึก token_version ณ ตอนออก refresh token แล้วเทียบค่าตอน /auth/refresh
-- ถ้าไม่ตรง = รหัสผ่านถูกเปลี่ยนหรือ session ถูกเพิกถอน → ปฏิเสธ
--
-- ต้องรันด้วย postgres (เจ้าของตาราง) เท่านั้น

ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN refresh_tokens.token_version IS
    'ค่าของ users.token_version ตอนออก token นี้ — ใช้ตรวจว่า session ยังไม่ถูกเพิกถอน';
