// e2e-token-version.mjs — ทดสอบการเพิกถอน access token ด้วย users.token_version
//
// ต้องมี backend + DB จริงรันอยู่:  node backend/test/e2e/e2e-token-version.mjs
// เปลี่ยนพอร์ตได้ด้วย env: BASE=http://localhost:3100/api
//
// สิ่งที่ตรวจ
//   1. login ออก token ที่มี claim token_version ตรงกับ DB
//   2. token ปกติเรียก API ได้ 200
//   3. เปลี่ยนรหัสผ่าน (bump token_version) → token ใบเก่าได้ 401
//   4. refresh ออก token ใหม่ที่ token_version ตรงกับ DB → เรียก API ได้ 200
//   5. ปิดใช้งานผู้ใช้ → token ที่ถืออยู่ได้ 401 ทันที

const BASE = process.env.BASE || 'http://localhost:3000/api';

let pass = 0;
let fail = 0;

function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (ok) pass += 1;
  else fail += 1;
}

function decode(jwt) {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
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
const slug = `tv-${stamp}`;
const ownerName = `owner_${stamp}`;
const password = 'Password123!';
const newPassword = 'Password456!';

console.log(`\n=== 1. สมัครร้านใหม่ ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบ token_version ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `tv_${stamp}@example.com`,
  username: ownerName,
  password,
  pin: '123456',
  display_name: 'เจ้าของร้านทดสอบ',
});
if (reg.status === 429) {
  console.error('Register ถูก rate limit (429) — รอ 5 นาทีแล้วรันใหม่');
  process.exit(1);
}
check('สมัครร้านสำเร็จ', reg.status === 201, `status ${reg.status} ${JSON.stringify(reg.json).slice(0, 120)}`);
if (reg.status !== 201) process.exit(1);

console.log('\n=== 2. login เจ้าของร้าน ===');
const login = await req('/auth/login', null, 'POST', { tenantSlug: slug, username: ownerName, password });
const ownerToken = login.json?.accessToken;
const ownerRefresh = login.json?.refreshToken;
check('login สำเร็จ', login.status === 200 && Boolean(ownerToken), `status ${login.status}`);
if (!ownerToken) process.exit(1);

const ownerPayload = decode(ownerToken);
check('access token มี claim token_version', ownerPayload.token_version !== undefined, `token_version=${ownerPayload.token_version}`);

const tables = await req('/tables', ownerToken);
check('token ปกติเรียก /tables ได้ 200', tables.status === 200, `status ${tables.status}`);

console.log('\n=== 3. สร้างพนักงาน + login ===');
const empName = `emp_${stamp}`;
const emp = await req('/users', ownerToken, 'POST', {
  username: empName,
  password,
  pin: '654321',
  display_name: 'พนักงานทดสอบ',
  role_name: 'employee',
});
const empId = emp.json?.data?.user_id;
check('สร้างพนักงานสำเร็จ', emp.status === 201 && Boolean(empId), `status ${emp.status}`);
if (!empId) process.exit(1);

const empLogin = await req('/auth/login', null, 'POST', { tenantSlug: slug, username: empName, password });
const empTokenBefore = empLogin.json?.accessToken;
check('พนักงาน login สำเร็จ', empLogin.status === 200 && Boolean(empTokenBefore), `status ${empLogin.status}`);

const empTablesBefore = await req('/tables', empTokenBefore);
check('พนักงานเรียก /tables ก่อนถูกเพิกถอน = 200', empTablesBefore.status === 200, `status ${empTablesBefore.status}`);

console.log('\n=== 4. เปลี่ยนรหัสผ่านพนักงาน (bump token_version) ===');
const empPayloadBefore = decode(empTokenBefore);
const changePw = await req(`/users/${empId}`, ownerToken, 'PATCH', { password: newPassword });
check('เปลี่ยนรหัสผ่านสำเร็จ', changePw.status === 200, `status ${changePw.status}`);

const empTablesAfter = await req('/tables', empTokenBefore);
check('token ใบเก่าของพนักงานถูกปฏิเสธ = 401', empTablesAfter.status === 401, `status ${empTablesAfter.status}`);

console.log('\n=== 5. พนักงาน login ใหม่ด้วยรหัสผ่านใหม่ ===');
const empLogin2 = await req('/auth/login', null, 'POST', { tenantSlug: slug, username: empName, password: newPassword });
const empTokenAfter = empLogin2.json?.accessToken;
check('login ด้วยรหัสใหม่สำเร็จ', empLogin2.status === 200 && Boolean(empTokenAfter), `status ${empLogin2.status}`);

const empPayloadAfter = decode(empTokenAfter);
check(
  'token ใหม่มี token_version มากกว่าใบเก่า',
  empPayloadAfter.token_version === empPayloadBefore.token_version + 1,
  `${empPayloadBefore.token_version} → ${empPayloadAfter.token_version}`,
);
const empTablesNew = await req('/tables', empTokenAfter);
check('token ใหม่เรียก /tables ได้ 200', empTablesNew.status === 200, `status ${empTablesNew.status}`);

console.log('\n=== 6. เจ้าของร้าน refresh token ===');
const refreshed = await req('/auth/refresh', null, 'POST', { refreshToken: ownerRefresh });
check('refresh สำเร็จ', refreshed.status === 200 && Boolean(refreshed.json?.accessToken), `status ${refreshed.status}`);
const refreshedPayload = decode(refreshed.json.accessToken);
check(
  'token ที่ refresh มี token_version ตรงกับของเดิม',
  refreshedPayload.token_version === ownerPayload.token_version,
  `token_version=${refreshedPayload.token_version}`,
);
const ownerTables = await req('/tables', refreshed.json.accessToken);
check('token ที่ refresh เรียก /tables ได้ 200', ownerTables.status === 200, `status ${ownerTables.status}`);

console.log('\n=== 7. ปิดใช้งานพนักงาน → token ที่ถืออยู่ต้องใช้ไม่ได้ทันที ===');
const deactivate = await req(`/users/${empId}/deactivate`, ownerToken, 'PATCH');
check('ปิดใช้งานพนักงานสำเร็จ', deactivate.status === 200, `status ${deactivate.status}`);

const empTablesDeactivated = await req('/tables', empTokenAfter);
check('token ของพนักงานที่ถูกปิดใช้งาน = 401', empTablesDeactivated.status === 401, `status ${empTablesDeactivated.status}`);

const empLoginBlocked = await req('/auth/login', null, 'POST', { tenantSlug: slug, username: empName, password: newPassword });
if (empLoginBlocked.status === 429) {
  console.log('SKIP  พนักงานที่ถูกปิดใช้งาน login ไม่ได้ — ถูก rate limit (429) จากรอบก่อนหน้า');
} else {
  check('พนักงานที่ถูกปิดใช้งาน login ไม่ได้ = 401', empLoginBlocked.status === 401, `status ${empLoginBlocked.status}`);
}

console.log(`\n=== สรุป: ${pass} ผ่าน / ${fail} ไม่ผ่าน ===\n`);
process.exit(fail === 0 ? 0 : 1);
