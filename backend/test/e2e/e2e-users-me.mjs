// e2e-users-me.mjs — ทดสอบ GET /api/users/me
//
// ต้องมี backend + DB จริงรันอยู่:  node backend/test/e2e/e2e-users-me.mjs
//
// สิ่งที่ตรวจ:
//   1. เรียก GET /users/me โดยไม่มี token -> 401
//   2. เจ้าของร้าน (owner) เรียก GET /users/me -> 200 พร้อม user_id, role_name='owner', has_pin=true, permissions ครบ และข้อมูล store
//   3. สร้างพนักงาน (employee) แบบไม่ตั้ง PIN และล็อกอิน -> เรียก GET /users/me ได้ 200 (เพราะใช้ @AnyAuthenticated)
//   4. ตรวจว่าพนักงานได้ role_name='employee', has_pin=false, permissions เฉพาะของ employee (ไม่มี user:manage) และ store ตรงกับร้าน

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
const slug = `me-${stamp}`;
const restaurantName = `ร้านทดสอบโปรไฟล์ ${stamp}`;
const ownerUsername = `owner_${stamp}`;
const empUsername = `emp_${stamp}`;
const password = 'Password123!';

console.log(`\n=== 1. ทดสอบเรียก GET /users/me โดยไม่มี token ===`);
const unauth = await req('/users/me', null, 'GET');
check('ไม่มี token ได้ 401', unauth.status === 401, `status ${unauth.status}`);

console.log(`\n=== 2. สมัครร้านใหม่ ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: restaurantName,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `me_${stamp}@example.com`,
  username: ownerUsername,
  password,
  pin: '123456',
  display_name: 'เจ้าของร้าน ทดสอบ',
});
if (reg.status === 429) {
  console.error('Register ถูก rate limit (429) — รอ 5 นาทีแล้วรันใหม่');
  process.exit(1);
}
check('สมัครร้านสำเร็จ (201)', reg.status === 201, `status ${reg.status}`);
if (reg.status !== 201) process.exit(1);

console.log(`\n=== 3. ล็อกอินเจ้าของร้านและเรียก GET /users/me ===`);
const ownerLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: ownerUsername,
  password,
});
check('owner login สำเร็จ (200)', ownerLogin.status === 200);
const ownerToken = ownerLogin.json?.accessToken;

const ownerMe = await req('/users/me', ownerToken, 'GET');
check('owner เรียก GET /users/me ได้ 200', ownerMe.status === 200, `status ${ownerMe.status}`);
const ownerData = ownerMe.json?.data;
check('response มี status="success"', ownerMe.json?.status === 'success');
check('username ตรงกับ owner', ownerData?.username === ownerUsername);
check('display_name ตรงกับที่สมัคร', ownerData?.display_name === 'เจ้าของร้าน ทดสอบ');
check('role_name เป็น owner', ownerData?.role_name === 'owner');
check('has_pin เป็น true', ownerData?.has_pin === true);
check(
  'permissions เป็น array และมี user:manage',
  Array.isArray(ownerData?.permissions) && ownerData.permissions.includes('user:manage'),
  `count=${ownerData?.permissions?.length}`,
);
check(
  'store มี tenant_id, restaurant_name, tenant_slug ตรงกับร้าน',
  Boolean(ownerData?.store?.tenant_id) &&
    ownerData?.store?.restaurant_name === restaurantName &&
    ownerData?.store?.tenant_slug === slug,
);

console.log(`\n=== 4. สร้างพนักงาน (employee) และเรียก GET /users/me ===`);
const createEmp = await req('/users', ownerToken, 'POST', {
  username: empUsername,
  display_name: 'พนักงาน ทดสอบ',
  role_name: 'employee',
  password,
});
check('สร้างบัญชีพนักงานสำเร็จ (201)', createEmp.status === 201, `status ${createEmp.status}`);

const empLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: empUsername,
  password,
});
check('employee login สำเร็จ (200)', empLogin.status === 200);
const empToken = empLogin.json?.accessToken;

// พนักงานไม่มีสิทธิ์เรียก GET /users (403) แต่ต้องเรียก GET /users/me ได้ (200)
const empListUsers = await req('/users', empToken, 'GET');
check('employee เรียก GET /users (รายชื่อทั้งหมด) ได้ 403', empListUsers.status === 403);

const empMe = await req('/users/me', empToken, 'GET');
check('employee เรียก GET /users/me ได้ 200', empMe.status === 200, `status ${empMe.status}`);
const empData = empMe.json?.data;
check('employee username ตรงกัน', empData?.username === empUsername);
check('employee role_name เป็น employee', empData?.role_name === 'employee');
check('employee has_pin เป็น false (ไม่ได้ตั้ง PIN)', empData?.has_pin === false);
check(
  'employee permissions มี order:create แต่ไม่มี user:manage',
  Array.isArray(empData?.permissions) &&
    empData.permissions.includes('order:create') &&
    !empData.permissions.includes('user:manage'),
  `permissions=${JSON.stringify(empData?.permissions)}`,
);
check(
  'employee store ตรงกับร้านเดียวกัน',
  empData?.store?.tenant_id === ownerData?.store?.tenant_id &&
    empData?.store?.tenant_slug === slug,
);

console.log(`\n=== สรุปผล E2E GET /users/me: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);

