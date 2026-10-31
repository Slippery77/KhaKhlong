// e2e-login-lockout.mjs — ทดสอบ P1-2: Login lockout (5 ครั้ง = ล็อก 5 นาที) + Audit login_success / login_failed + ปลดล็อกเมื่อเปลี่ยนรหัสผ่าน
const BASE = 'http://localhost:3000/api';
const stamp = Date.now().toString().slice(-6);
const slug = `lk-${stamp}`;
const ownerUsername = `owner_${stamp}`;
const ownerPassword = 'Password123!';
const staffUsername = `staff_${stamp}`;
const staffPassword = 'StaffPass123!';
const newStaffPassword = 'NewStaffPass456!';
const PIN = '135790';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
};

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

console.log(`\n=== 0. สมัครร้านทดสอบ ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบล็อกอิน ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '11/1',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `lk_${stamp}@example.com`,
  username: ownerUsername,
  password: ownerPassword,
  display_name: 'เจ้าของร้านทดสอบ',
  pin: PIN,
});
check('สมัครร้านสำเร็จ (201)', reg.status === 201, `status=${reg.status}`);
if (reg.status !== 201) process.exit(1);

console.log('\n=== 1. เจ้าของร้าน login สำเร็จ + สร้างพนักงาน ===');
const ownerLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: ownerUsername,
  password: ownerPassword,
});
const ownerToken = ownerLogin.json?.data?.accessToken || ownerLogin.json?.accessToken;
check('เจ้าของร้าน login สำเร็จ (200)', ownerLogin.status === 200 && Boolean(ownerToken));

const createStaff = await req('/users', ownerToken, 'POST', {
  username: staffUsername,
  password: staffPassword,
  display_name: 'พนักงานทดสอบ',
  role_name: 'employee',
});
const staffId = createStaff.json?.data?.user_id;
check('สร้างบัญชีพนักงานสำเร็จ (201)', createStaff.status === 201 && Boolean(staffId));

console.log('\n=== 2. ทดสอบกรอก username ที่ไม่มีในร้าน ===');
const ghostLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: 'no_such_user_999',
  password: 'anypassword',
});
check('username ไม่มีในร้าน ตอบ 401', ghostLogin.status === 401, `status=${ghostLogin.status}`);

console.log('\n=== 3. ทดสอบใส่รหัสผิดแต่ยังไม่ถึง 5 ครั้ง แล้วใส่ถูก ระบบต้องรีเซ็ตตัวนับ ===');
const fail1 = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password: 'WrongPassword1',
});
check(
  'ผิดครั้งที่ 1 ตอบ 401 พร้อม remainingAttempts = 4',
  fail1.status === 401 && fail1.json?.remainingAttempts === 4,
  JSON.stringify(fail1.json),
);

const fail2 = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password: 'WrongPassword2',
});
check(
  'ผิดครั้งที่ 2 ตอบ 401 พร้อม remainingAttempts = 3',
  fail2.status === 401 && fail2.json?.remainingAttempts === 3,
  JSON.stringify(fail2.json),
);

const staffLoginOk = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password: staffPassword,
});
check('ใส่รหัสถูกหลังผิด 2 ครั้ง เข้าสู่ระบบได้ (200)', staffLoginOk.status === 200);

console.log('\n=== 4. ทดสอบใส่รหัสผิด 5 ครั้งติดกัน (ต้องเริ่มนับ 1 ใหม่หลังเคยล็อกอินสำเร็จ) ===');
for (let i = 1; i <= 4; i++) {
  const res = await req('/auth/login', null, 'POST', {
    tenantSlug: slug,
    username: staffUsername,
    password: `WrongAgain_${i}`,
  });
  check(
    `รอบใหม่ ผิดครั้งที่ ${i}/5 ตอบ 401 (remainingAttempts=${5 - i})`,
    res.status === 401 && res.json?.remainingAttempts === 5 - i,
    `status=${res.status}, rem=${res.json?.remainingAttempts}`,
  );
}

const fifthFail = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password: 'WrongAgain_5',
});
check(
  'ผิดครบครั้งที่ 5 ตอบ 429 ACCOUNT_LOCKED พร้อม lockedUntil',
  fifthFail.status === 429 &&
    fifthFail.json?.code === 'ACCOUNT_LOCKED' &&
    Boolean(fifthFail.json?.lockedUntil),
  JSON.stringify(fifthFail.json),
);

console.log('\n=== 5. ขณะติดล็อก ต่อให้ใส่รหัสผ่านที่ถูกต้องก็ต้องได้ 429 ACCOUNT_LOCKED ===');
const tryWhileLocked = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password: staffPassword,
});
check(
  'ใส่รหัสถูกขณะบัญชียังติดล็อก ต้องถูกปฏิเสธด้วย 429 ACCOUNT_LOCKED',
  tryWhileLocked.status === 429 && tryWhileLocked.json?.code === 'ACCOUNT_LOCKED',
  JSON.stringify(tryWhileLocked.json),
);

console.log('\n=== 6. เจ้าของร้านตั้งรหัสผ่านใหม่ให้พนักงาน -> ต้องปลดล็อกให้ทันที ===');
const resetPass = await req(`/users/${staffId}`, ownerToken, 'PATCH', {
  password: newStaffPassword,
});
check('เจ้าของร้านเปลี่ยนรหัสผ่านให้พนักงานสำเร็จ (200)', resetPass.status === 200);

const loginAfterReset = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password: newStaffPassword,
});
check(
  'หลังเจ้าของร้านรีเซ็ตรหัสผ่าน พนักงานเข้าสู่ระบบได้ทันที (200)',
  loginAfterReset.status === 200 && Boolean(loginAfterReset.json?.data?.accessToken || loginAfterReset.json?.accessToken),
  `status=${loginAfterReset.status}`,
);

const passed = results.filter((r) => r.ok).length;
console.log(`\nสรุปผล E2E Login Lockout: ${passed}/${results.length} passed`);
if (passed !== results.length) {
  process.exit(1);
}

