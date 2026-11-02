// e2e-category-reorder.mjs — ทดสอบ PATCH /api/menu/category/reorder
//
// ตรวจสอบ:
//  1. เรียกโดยไม่มี token -> 401
//  2. สมัครร้านใหม่ (owner)
//  3. สร้างพนักงาน role employee -> เรียก PATCH /menu/category/reorder -> 403 Forbidden
//  4. Owner สร้างหมวดหมู่ 3 รายการ
//  5. ทดสอบ validation: ข้อมูลซ้ำ, ID ไม่ถูกต้อง -> 400
//  6. สลับลำดับหมวดหมู่ใหม่ -> 200
//  7. GET /menu/category สะท้อนลำดับใหม่
//  8. GET /menu/full สะท้อนลำดับใหม่

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
const slug = `reord-${stamp}`;
const restaurantName = `ร้านทดสอบ Reorder ${stamp}`;
const ownerUsername = `owner_${stamp}`;
const empUsername = `emp_${stamp}`;
const password = 'Password123!';

console.log(`\n=== 1. ไม่มี Token เรียก PATCH /menu/category/reorder ===`);
const noToken = await req('/menu/category/reorder', null, 'PATCH', { categoryIds: [] });
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
  email: `reord_${stamp}@example.com`,
  username: ownerUsername,
  password: password,
  pin: '123456',
  display_name: 'เจ้าของร้าน Reorder',
});
check('สมัครร้านสำเร็จ 201', reg.status === 201, `status ${reg.status}`);

console.log(`\n=== 3. เข้าสู่ระบบด้วย Owner ===`);
const loginOwner = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: ownerUsername,
  password: password,
});
check('Owner เข้าสู่ระบบ 200', loginOwner.status === 200, `status ${loginOwner.status}`);
const ownerToken = loginOwner.json?.accessToken || loginOwner.json?.data?.accessToken;

console.log(`\n=== 4. สร้างพนักงาน Employee และ Login ===`);
const createEmp = await req('/users', ownerToken, 'POST', {
  username: empUsername,
  password: password,
  display_name: 'พนักงาน เสิร์ฟ',
  role_name: 'employee',
  pin: '654321',
});
check('สร้าง employee 201', createEmp.status === 201, `status ${createEmp.status}`);

const loginEmp = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: empUsername,
  password: password,
});
check('Employee เข้าสู่ระบบ 200', loginEmp.status === 200, `status ${loginEmp.status}`);
const empToken = loginEmp.json?.accessToken || loginEmp.json?.data?.accessToken;

console.log(`\n=== 5. Employee ไม่มีสิทธิ์ menu:edit เรียก reorder ===`);
const empReorder = await req('/menu/category/reorder', empToken, 'PATCH', { categoryIds: [] });
check('Employee ได้ 403 Forbidden', empReorder.status === 403, `status ${empReorder.status}`);

console.log(`\n=== 6. Owner สร้างหมวดหมู่ 3 หมวด (A, B, C) ===`);
const catA = await req('/menu/category', ownerToken, 'POST', { name: `หมวด ก-${stamp}` });
const catB = await req('/menu/category', ownerToken, 'POST', { name: `หมวด ข-${stamp}` });
const catC = await req('/menu/category', ownerToken, 'POST', { name: `หมวด ค-${stamp}` });

check('สร้างหมวด A สำเร็จ', catA.status === 201);
check('สร้างหมวด B สำเร็จ', catB.status === 201);
check('สร้างหมวด C สำเร็จ', catC.status === 201);

const idA = catA.json?.data?.category_id;
const idB = catB.json?.data?.category_id;
const idC = catC.json?.data?.category_id;

console.log(`\n=== 7. ตรวจสอบลำดับเริ่มต้น ===`);
const listInit = await req('/menu/category', ownerToken, 'GET');
check('GET /menu/category สำเร็จ 200', listInit.status === 200);
const initNames = listInit.json?.data?.map((c) => c.name) || [];
console.log('ลำดับเริ่มต้น:', initNames);

console.log(`\n=== 8. ทดสอบ Validation Error (ซ้ำ, ไม่ครบ, มั่ว UUID) ===`);
const dupTest = await req('/menu/category/reorder', ownerToken, 'PATCH', {
  categoryIds: [idA, idA, idB],
});
check('ส่ง ID ซ้ำได้ 400', dupTest.status === 400, `status ${dupTest.status}`);

const invalidUuid = await req('/menu/category/reorder', ownerToken, 'PATCH', {
  categoryIds: ['not-a-uuid', idB],
});
check('ส่ง UUID ไม่ถูกต้องได้ 400', invalidUuid.status === 400, `status ${invalidUuid.status}`);

const foreignId = await req('/menu/category/reorder', ownerToken, 'PATCH', {
  categoryIds: ['00000000-0000-0000-0000-000000000000', idA, idB],
});
check('ส่ง ID ที่ไม่มีในร้านได้ 400', foreignId.status === 400, `status ${foreignId.status}`);

const partialTest = await req('/menu/category/reorder', ownerToken, 'PATCH', {
  categoryIds: [idA, idB],
});
check('ส่ง partial subset (ไม่ครบทุกหมวด) ได้ 400', partialTest.status === 400, `status ${partialTest.status}`);

console.log(`\n=== 9. สลับลำดับใหม่: [C, A, B] ===`);
const reorderRes = await req('/menu/category/reorder', ownerToken, 'PATCH', {
  categoryIds: [idC, idA, idB],
});
check('Reorder [C, A, B] สำเร็จ 200', reorderRes.status === 200, `status ${reorderRes.status}`);
check('Updated count = 3', reorderRes.json?.data?.updated === 3);

console.log(`\n=== 10. ตรวจสอบผลลัพธ์ผ่าน GET /menu/category ===`);
const listAfter = await req('/menu/category', ownerToken, 'GET');
const orderAfter = listAfter.json?.data?.map((c) => c.category_id) || [];
check('ลำดับแรกต้องเป็น C', orderAfter[0] === idC);
check('ลำดับสองต้องเป็น A', orderAfter[1] === idA);
check('ลำดับสามต้องเป็น B', orderAfter[2] === idB);

console.log(`\n=== 11. ตรวจสอบผลลัพธ์ผ่าน GET /menu/full ===`);
const fullAfter = await req('/menu/full', ownerToken, 'GET');
const fullOrder = fullAfter.json?.data?.categories?.map((c) => c.category_id) || [];
check('GET /menu/full คืน 200', fullAfter.status === 200);
check('GET /menu/full ลำดับแรกเป็น C', fullOrder[0] === idC);
check('GET /menu/full ลำดับสองเป็น A', fullOrder[1] === idA);
check('GET /menu/full ลำดับสามเป็น B', fullOrder[2] === idB);

console.log(`\n=== 12. สลับลำดับอีกครั้ง: [B, C, A] ===`);
const reorderRes2 = await req('/menu/category/reorder', ownerToken, 'PATCH', {
  categoryIds: [idB, idC, idA],
});
check('Reorder [B, C, A] สำเร็จ 200', reorderRes2.status === 200);
const listAfter2 = await req('/menu/category', ownerToken, 'GET');
const orderAfter2 = listAfter2.json?.data?.map((c) => c.category_id) || [];
check('รอบสอง ลำดับแรกต้องเป็น B', orderAfter2[0] === idB);
check('รอบสอง ลำดับสองต้องเป็น C', orderAfter2[1] === idC);
check('รอบสอง ลำดับสามต้องเป็น A', orderAfter2[2] === idA);

console.log(`\n========================================`);
console.log(`ผลการทดสอบ: ผ่าน ${pass} | ล้มเหลว ${fail}`);
console.log(`========================================\n`);

process.exit(fail === 0 ? 0 : 1);
