// e2e-audit-logs.mjs — ทดสอบ GET /api/audit-logs
//
// ตรวจสอบ:
//  1. เรียกโดยไม่มี token -> 401
//  2. สมัครร้านใหม่ (owner) -> เข้าถึง GET /audit-logs ได้ (200)
//  3. สร้างพนักงาน role employee -> เรียก GET /audit-logs -> 403 Forbidden
//  4. ตรวจสอบข้อมูล audit log ที่ถูกบันทึกอัตโนมัติ (เช่น user_created)
//  5. ทดสอบ pagination และ filters (action_type, user_id)

const BASE = process.env.BASE || 'http://localhost:3000/api';

let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (ok) pass += 1;
  else fail += 1;
}

async function req(path, token, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const stamp = Date.now().toString().slice(-6);
const slug = `audit-${stamp}`;
const restaurantName = `ร้านทดสอบ Audit ${stamp}`;
const ownerUsername = `owner_${stamp}`;
const empUsername = `emp_${stamp}`;
const password = 'Password123!';

console.log(`\n=== 1. ไม่มี Token เรียก GET /audit-logs ===`);
const noToken = await req('/audit-logs', null, 'GET');
check('ไม่มี token ได้ 401', noToken.status === 401, `status ${noToken.status}`);

console.log(`\n=== 2. สมัครร้านใหม่ ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: restaurantName,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '123/45',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `audit_${stamp}@example.com`,
  username: ownerUsername,
  password: password,
  pin: '123456',
  display_name: 'เจ้าของร้าน Audit',
});
if (reg.status === 429) {
  console.error('Register ถูก rate limit (429) — รอ 5 นาทีแล้วรันใหม่');
  process.exit(1);
}
check('สมัครร้านสำเร็จ 201', reg.status === 201, `status ${reg.status}`);
if (reg.status !== 201) {
  console.error(reg.json);
  process.exit(1);
}

console.log(`\n=== 3. ล็อกอิน Owner ===`);
const ownerLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: ownerUsername,
  password: password,
});
check('Owner ล็อกอินได้ 200', ownerLogin.status === 200, `status ${ownerLogin.status}`);
const ownerToken = ownerLogin.json?.accessToken;

const ownerMe = await req('/users/me', ownerToken, 'GET');
const ownerId = ownerMe.json?.data?.user_id;
check('ได้ ownerId จาก /users/me', Boolean(ownerId));

console.log(`\n=== 4. Owner ดึง GET /audit-logs ===`);
const ownerAudit = await req('/audit-logs', ownerToken, 'GET');
check('Owner เข้าถึง audit-logs ได้ 200', ownerAudit.status === 200, `status ${ownerAudit.status}`);
check('Response มี status success', ownerAudit.json?.status === 'success');
check('มี items เป็น Array', Array.isArray(ownerAudit.json?.data?.items));
check('มี pagination ข้อมูลครบ', Boolean(ownerAudit.json?.data?.pagination?.total >= 0));

console.log(`\n=== 5. สร้าง Employee และทดสอบสิทธิ์ 403 ===`);
const createEmp = await req('/users', ownerToken, 'POST', {
  username: empUsername,
  password: password,
  display_name: 'พนักงาน เสิร์ฟ',
  role_name: 'employee',
});
check('สร้าง employee สำเร็จ', createEmp.status === 201, `status ${createEmp.status}`);

const empLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: empUsername,
  password: password,
});
check('Employee ล็อกอินได้', empLogin.status === 200);
const empToken = empLogin.json?.accessToken;

const empAudit = await req('/audit-logs', empToken, 'GET');
check('Employee ไม่มีสิทธิ์ audit_log:view ได้ 403', empAudit.status === 403, `status ${empAudit.status}`);

console.log(`\n=== 6. ตรวจสอบ Filters และ Action ใน Audit Log ===`);
// ตรวจสอบว่ามี logs อย่างน้อย 1 รายการ (เช่น user_created หรือ login_success)
const filterAction = await req('/audit-logs?action_type=user_created', ownerToken, 'GET');
check('Filter action_type ได้ 200', filterAction.status === 200);
const items = filterAction.json?.data?.items || [];
check('พบ event user_created', items.some(i => i.action_type === 'user_created'));

const filterUser = await req(`/audit-logs?user_id=${ownerId}`, ownerToken, 'GET');
check('Filter user_id ได้ 200', filterUser.status === 200);

console.log(`\n========================================`);
console.log(`สรุปผลการทดสอบ: PASS ${pass} / FAIL ${fail}`);
console.log(`========================================\n`);

if (fail > 0) process.exit(1);
