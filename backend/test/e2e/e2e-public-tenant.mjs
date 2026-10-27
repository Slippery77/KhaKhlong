// e2e-public-tenant.mjs — ทดสอบ GET /public/tenants/:slug (หน้า store finder, ไม่ต้องมี token)
// รัน: node backend/test/e2e/e2e-public-tenant.mjs  (ต้องมี backend + PostgreSQL รันอยู่)
const BASE = 'http://localhost:3000/api';

const stamp = Date.now().toString().slice(-6);
const slug = `pf-${stamp}`;
const username = `owner_${stamp}`;
const password = 'Password123!';

let failures = 0;

function ok(label, condition, extra) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`, extra === undefined ? '' : extra);
  }
}

async function req(path, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

console.log(`\n=== 1. เตรียมร้านสำหรับทดสอบ (${slug}) ===`);
let existingSlug = slug;
const reg = await req('/register', 'POST', {
  restaurant_name: `ร้านทดสอบ Store Finder ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `pf_${stamp}@example.com`,
  username,
  password,
  display_name: 'เจ้าของร้านทดสอบ',
});

if (reg.status === 429) {
  console.log('Register rate-limited (429), reusing rc-868329');
  existingSlug = 'rc-868329';
} else if (reg.status !== 201) {
  console.error('Register failed:', reg.status, reg.json);
  process.exit(1);
} else {
  console.log('Register OK');
}

console.log(`\n=== 2. ร้านที่มีจริง (${existingSlug}) ===`);
const found = await req(`/public/tenants/${existingSlug}`);
ok('ได้ 200', found.status === 200, found.json);
ok('exists = true', found.json?.data?.exists === true, found.json?.data);
ok('active = true', found.json?.data?.active === true, found.json?.data);
ok('slug ที่คืนเป็นตัวเล็ก', found.json?.data?.slug === existingSlug, found.json?.data?.slug);
ok('ไม่เผยชื่อร้าน', found.json?.data?.restaurant_name === undefined, found.json?.data);

console.log('\n=== 3. ร้านที่ไม่มีอยู่ ===');
const missing = await req('/public/tenants/no-such-store-xyz');
ok('ได้ 200 (ไม่ใช่ 404)', missing.status === 200, missing.status);
ok('exists = false', missing.json?.data?.exists === false, missing.json?.data);
ok('active = false', missing.json?.data?.active === false, missing.json?.data);

console.log('\n=== 4. รูปแบบ slug ไม่ถูกต้อง ===');
for (const bad of ['ab', 'UPPER', 'has space', '-start', 'end-']) {
  const result = await req(`/public/tenants/${encodeURIComponent(bad)}`);
  ok(`"${bad}" → exists = false`, result.status === 200 && result.json?.data?.exists === false, {
    status: result.status,
    data: result.json?.data,
  });
}

console.log('\n=== 5. ตัวพิมพ์ใหญ่ต้องถูก normalize ===');
const upper = await req(`/public/tenants/${existingSlug.toUpperCase()}`);
ok('ตัวพิมพ์ใหญ่ยังพบร้าน', upper.json?.data?.exists === true, upper.json?.data);

console.log('\n=== 6. ไม่ต้องมี token ===');
ok('ไม่ส่ง Authorization ก็เรียกได้ (200)', found.status === 200, found.status);

console.log('');
if (failures > 0) {
  console.error(`❌ FAILED ${failures} checks\n`);
  process.exit(1);
}
console.log('🎉 ALL PUBLIC TENANT TESTS PASSED\n');
