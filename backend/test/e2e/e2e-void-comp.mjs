// e2e-void-comp.mjs — void/comp ต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน
const BASE = 'http://localhost:3000/api';
const stamp = Date.now().toString().slice(-6);
const slug = `vc-${stamp}`;
const username = `owner_${stamp}`;
const password = 'Password123!';
const PIN = '246810';

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

console.log(`\n=== 1. สมัครร้านใหม่ ${slug} (owner PIN = ${PIN}) ===`);
let currentSlug = slug;
let currentUsername = username;
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบ Void/Comp ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `vc_${stamp}@example.com`,
  username,
  password,
  display_name: 'เจ้าของร้านทดสอบ',
  pin: PIN,
});
if (reg.status !== 201) {
  console.error('Register failed:', reg.status, JSON.stringify(reg.json));
  process.exit(1);
}
console.log('Register OK');

const login = await req('/auth/login', null, 'POST', { tenantSlug: currentSlug, username: currentUsername, password });
const token = login.json?.data?.accessToken || login.json?.accessToken;
if (login.status !== 200 || !token) {
  console.error('Login failed:', login.status, login.json);
  process.exit(1);
}
const ownerId = login.json?.data?.user?.sub ?? login.json?.user?.sub;
console.log('Login OK');

await req('/shifts/open', token, 'POST', { openingCash: 1000 });
const floor = await req('/floors', token, 'POST', { floor_no: 1, name: `ชั้น 1 ${stamp}`, table_count: 2 });
const floorId = floor.json?.data?.floor_id;
const table = await req('/tables', token, 'POST', { tableNumber: `T${stamp}`, capacity: 4, floorId });
const tableId = table.json?.data?.table_id;

const cat = await req('/menu/category', token, 'POST', { name: `อาหาร_${stamp}` });
const catId = cat.json?.data?.category_id;
const menuItem = await req('/menu/items', token, 'POST', { name: `ข้าวผัด_${stamp}`, price: 80, category_id: catId });
const menuItemId = menuItem.json?.data?.menu_item_id;

const orderId = crypto.randomUUID();
const created = await req('/orders', token, 'POST', { orderId, tableId });
if (created.status !== 201 && created.status !== 200) {
  console.error('Create order failed:', created.status, created.json);
  process.exit(1);
}

// 4 รายการ: 2 สำหรับ void, 2 สำหรับ comp
const ids = [1, 2, 3, 4].map(() => crypto.randomUUID());
const added = await req(`/orders/${orderId}/items`, token, 'POST', {
  kitchenTicketId: crypto.randomUUID(),
  items: ids.map((orderItemId) => ({ orderItemId, menuItemId })),
});
check('เพิ่มรายการในบิล', added.status === 201 || added.status === 200, `status=${added.status}`);

console.log('\n=== 2. Void ด้วย PIN ผิด ===');
const wrongPin = await req('/orders/items/void', token, 'POST', {
  orderItemIds: [ids[0]],
  reason: 'ทดสอบ PIN ผิด',
  approverPin: '000000',
});
check('void PIN ผิด → 403', wrongPin.status === 403, `status=${wrongPin.status} msg=${wrongPin.json?.message}`);

console.log('\n=== 3. Void ด้วย PIN รูปแบบผิด (3 หลัก) ===');
const badFormat = await req('/orders/items/void', token, 'POST', {
  orderItemIds: [ids[0]],
  reason: 'รูปแบบ PIN ผิด',
  approverPin: '123',
});
check('void PIN 3 หลัก → 400', badFormat.status === 400, `status=${badFormat.status}`);

console.log('\n=== 4. Void 2 รายการพร้อมกันด้วย PIN ถูกต้อง ===');
const voided = await req('/orders/items/void', token, 'POST', {
  orderItemIds: [ids[0], ids[1]],
  reason: 'ลูกค้ายกเลิก',
  approverPin: PIN,
});
check('void สำเร็จ', voided.status === 201 || voided.status === 200, `status=${voided.status}`);
check('void ตอบ approvedBy.displayName', Boolean(voided.json?.data?.approvedBy?.displayName), JSON.stringify(voided.json?.data?.approvedBy));
check('void ตอบจำนวนรายการครบ 2', voided.json?.data?.items?.length === 2, `items=${voided.json?.data?.items?.length}`);
check('voided_by = ผู้อนุมัติ', voided.json?.data?.items?.every((i) => i.voided_by === ownerId), voided.json?.data?.items?.[0]?.voided_by);

console.log('\n=== 5. Void ซ้ำรายการเดิม → 409 ===');
const voidAgain = await req('/orders/items/void', token, 'POST', {
  orderItemIds: [ids[0]],
  reason: 'ยกเลิกซ้ำ',
  approverPin: PIN,
});
check('void ซ้ำ → 409', voidAgain.status === 409, `status=${voidAgain.status} msg=${voidAgain.json?.message}`);

console.log('\n=== 6. Comp รายการที่ยังไม่เสิร์ฟ → 409 ===');
const compNotServed = await req('/orders/items/comp', token, 'POST', {
  orderItemIds: [ids[2]],
  reason: 'ยังไม่เสิร์ฟ',
  approverPin: PIN,
});
check('comp ก่อนเสิร์ฟ → 409', compNotServed.status === 409, `status=${compNotServed.status}`);

// เสิร์ฟ 2 รายการที่เหลือ
for (const id of [ids[2], ids[3]]) {
  await req(`/kds/items/${id}/status`, token, 'PATCH', { status: 'preparing' });
  await req(`/kds/items/${id}/status`, token, 'PATCH', { status: 'ready' });
  await req(`/kds/items/${id}/status`, token, 'PATCH', { status: 'served' });
}

console.log('\n=== 7. Comp ด้วย PIN ผิด และ PIN ถูก ===');
const compWrong = await req('/orders/items/comp', token, 'POST', {
  orderItemIds: [ids[2]],
  reason: 'PIN ผิด',
  approverPin: '111111',
});
check('comp PIN ผิด → 403', compWrong.status === 403, `status=${compWrong.status}`);

const compOk = await req('/orders/items/comp', token, 'POST', {
  orderItemIds: [ids[2], ids[3]],
  reason: 'ลูกค้าไม่พอใจ',
  approverPin: PIN,
});
check('comp สำเร็จ 2 รายการ', (compOk.status === 201 || compOk.status === 200) && compOk.json?.data?.items?.length === 2, `status=${compOk.status}`);
check('comped_by = ผู้อนุมัติ', compOk.json?.data?.items?.every((i) => i.comped_by === ownerId), compOk.json?.data?.items?.[0]?.comped_by);

console.log('\n=== 8. ตรวจสถานะจริงจาก GET /orders/:id ===');
const detail = await req(`/orders/${orderId}`, token);
const rows = detail.json?.data?.items ?? [];
const byId = Object.fromEntries(rows.map((r) => [r.order_item_id, r]));
check(
  'รายการที่ถูก void ถูกตัดออกจากบิล',
  !byId[ids[0]] && !byId[ids[1]],
  `found=${[ids[0], ids[1]].filter((id) => byId[id]).length}`,
);
check('รายการที่ 3-4 เป็น served + is_comped', byId[ids[2]]?.is_comped === true && byId[ids[3]]?.is_comped === true, `comp=${byId[ids[2]]?.is_comped}/${byId[ids[3]]?.is_comped}`);

console.log('\n=== 9. พนักงาน (ไม่มี PIN) ต้องขออนุมัติจากผู้จัดการ ===');
const staffUsername = `staff_${stamp}`;
const staffCreate = await req('/users', token, 'POST', {
  username: staffUsername,
  password,
  display_name: 'พนักงานเสิร์ฟทดสอบ',
  role_name: 'employee',
});
check('สร้างผู้ใช้พนักงาน (ไม่มี PIN)', staffCreate.status === 201 || staffCreate.status === 200, `status=${staffCreate.status}`);

const staffLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: currentSlug,
  username: staffUsername,
  password,
});
const staffToken = staffLogin.json?.data?.accessToken || staffLogin.json?.accessToken;
const staffId = staffLogin.json?.data?.user?.sub ?? staffLogin.json?.user?.sub;
check('พนักงานล็อกอินได้', Boolean(staffToken), `status=${staffLogin.status}`);

// โต๊ะที่ 2 + บิลใหม่ที่พนักงานเปิดเอง
const table2 = await req('/tables', token, 'POST', { tableNumber: `S${stamp}`, capacity: 2, floorId });
const table2Id = table2.json?.data?.table_id;
const staffOrderId = crypto.randomUUID();
const staffOrder = await req('/orders', staffToken, 'POST', { orderId: staffOrderId, tableId: table2Id });
check('พนักงานเปิดบิลเองได้', staffOrder.status === 201 || staffOrder.status === 200, `status=${staffOrder.status}`);

const staffItemIds = [crypto.randomUUID(), crypto.randomUUID()];
const staffAdd = await req(`/orders/${staffOrderId}/items`, staffToken, 'POST', {
  kitchenTicketId: crypto.randomUUID(),
  items: staffItemIds.map((orderItemId) => ({ orderItemId, menuItemId })),
});
check('พนักงานเพิ่มรายการได้', staffAdd.status === 201 || staffAdd.status === 200, `status=${staffAdd.status}`);

const staffSelfApprove = await req('/orders/items/void', staffToken, 'POST', {
  orderItemIds: [staffItemIds[0]],
  reason: 'พนักงานพยายามอนุมัติเอง',
  approverPin: '000000',
});
check('พนักงานอนุมัติเองไม่ได้ → 403', staffSelfApprove.status === 403, `status=${staffSelfApprove.status}`);

const staffVoid = await req('/orders/items/void', staffToken, 'POST', {
  orderItemIds: [staffItemIds[0]],
  reason: 'ลูกค้ายกเลิก (พนักงานขออนุมัติ)',
  approverPin: PIN,
});
check('พนักงาน void ด้วย PIN ผู้จัดการสำเร็จ', staffVoid.status === 201 || staffVoid.status === 200, `status=${staffVoid.status} msg=${staffVoid.json?.message}`);
check('voided_by = ผู้จัดการ ไม่ใช่พนักงาน', staffVoid.json?.data?.items?.[0]?.voided_by === ownerId && staffVoid.json?.data?.items?.[0]?.voided_by !== staffId, `voided_by=${staffVoid.json?.data?.items?.[0]?.voided_by} staff=${staffId}`);

for (const status of ['preparing', 'ready', 'served']) {
  await req(`/kds/items/${staffItemIds[1]}/status`, token, 'PATCH', { status });
}
const staffComp = await req('/orders/items/comp', staffToken, 'POST', {
  orderItemIds: [staffItemIds[1]],
  reason: 'ลูกค้าไม่พอใจ (พนักงานขออนุมัติ)',
  approverPin: PIN,
});
check('พนักงาน comp ด้วย PIN ผู้จัดการสำเร็จ', staffComp.status === 201 || staffComp.status === 200, `status=${staffComp.status} msg=${staffComp.json?.message}`);
check('comped_by = ผู้จัดการ ไม่ใช่พนักงาน', staffComp.json?.data?.items?.[0]?.comped_by === ownerId && staffComp.json?.data?.items?.[0]?.comped_by !== staffId, `comped_by=${staffComp.json?.data?.items?.[0]?.comped_by}`);

console.log('\n=== 10. ตรวจ PIN lock หลังผิด 5 ครั้ง (ทำท้ายสุดเพราะล็อกผู้จัดการ) ===');
for (let i = 1; i <= 5; i++) {
  const attempt = await req('/orders/items/void', token, 'POST', {
    orderItemIds: [ids[0]],
    reason: `เดา PIN ครั้งที่ ${i}`,
    approverPin: '999999',
  });
  const expected = i < 5 ? 403 : 429;
  check(`PIN ผิดครั้งที่ ${i} → ${expected}`, attempt.status === expected, `status=${attempt.status}`);
}
const locked = await req('/orders/items/void', token, 'POST', {
  orderItemIds: [ids[0]],
  reason: 'PIN ถูกหลังถูกล็อก',
  approverPin: PIN,
});
check('ถูกล็อกแล้ว PIN ถูกก็ยังโดนปฏิเสธ (429)', locked.status === 429, `status=${locked.status} msg=${locked.json?.message}`);
const lockedApproverUnavailable = await req('/orders/items/void', staffToken, 'POST', {
  orderItemIds: [staffItemIds[1]],
  reason: 'ผู้จัดการถูกล็อก',
  approverPin: PIN,
});
check(
  'ผู้จัดการที่ถูกล็อกถูกตัดออกจากรายชื่อผู้อนุมัติ',
  lockedApproverUnavailable.status === 409 &&
    String(lockedApproverUnavailable.json?.message ?? '').includes('ไม่พบผู้จัดการ'),
  `status=${lockedApproverUnavailable.status} msg=${lockedApproverUnavailable.json?.message}`,
);

console.log('\n=== 11. route เดี่ยวแบบเก่าต้องถูกถอดออก ===');
const legacy = await req(`/orders/items/${crypto.randomUUID()}/void`, token, 'POST', { reason: 'เก่า', approverPin: PIN });
check('POST /orders/items/:id/void → 404', legacy.status === 404, `status=${legacy.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n=== สรุป: ${results.length - failed.length}/${results.length} ผ่าน ===`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '));
  process.exit(1);
}
console.log('ALL PASS');
