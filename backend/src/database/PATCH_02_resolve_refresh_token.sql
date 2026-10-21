-- PATCH 02: ให้ POST /auth/refresh หาเจ้าของ refresh token ได้
-- route นี้เป็น @Public() ยังไม่มี tenant context แต่ refresh_tokens มี RLS
-- จึงต้องข้าม RLS ผ่าน SECURITY DEFINER แบบเดียวกับ resolve_tenant
-- ต้องรันด้วย postgres (เจ้าของตาราง) เท่านั้น

CREATE OR REPLACE FUNCTION resolve_refresh_token(p_hash text)
RETURNS TABLE(tenant_id uuid, user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT r.tenant_id, r.user_id FROM refresh_tokens r WHERE r.token_hash = p_hash $$;

REVOKE EXECUTE ON FUNCTION resolve_refresh_token(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION resolve_refresh_token(text) TO pos_app;