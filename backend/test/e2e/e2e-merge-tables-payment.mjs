// e2e-merge-tables-payment.mjs — ทดสอบฟีเจอร์รวมโต๊ะคิดเงิน (Combined Table Payment)
//
// รัน: node backend/test/e2e/e2e-merge-tables-payment.mjs (ต้องมี backend + PostgreSQL รันอยู่)

const BASE = process.env.BASE || 'http://localhost:3000/api';

const stamp = Date.now().toString().slice(-6);
const slug = `mt-${stamp}`;
const username = `owner_${stamp}`;
const password = 'Password123!';

let pass = 0;
let fail = 0;

function check(label, condition, extra) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    pass += 1;
  } else {
    console.error(`  FAIL: ${label}`, extra !== undefined ? extra : '');
    fail += 1;
  }
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

console.log(`\n=== 1. สมัครร้านใหม่ ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบรวมโต๊ะ ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '123/45',
  subdistrict: 'สุเทพ',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50200',
  email: `mt_${stamp}@example.com`,
  username,
  password,
  pin: '123456',
  display_name: 'เจ้าของร้าน ทดสอบ',
});

if (reg.status === 429) {
  console.error('Register ถูก rate limit (429) — กรุณารอ 5 นาทีแล้วรันใหม่');
  process.exit(1);
}
check('สมัครร้านสำเร็จ (201)', reg.status === 201, reg.json);
if (reg.status !== 201) process.exit(1);

console.log('\n=== 2. ล็อกอินเจ้าของร้าน ===');
const login = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username,
  password,
});
const token = login.json?.data?.accessToken || login.json?.accessToken;
check('ล็อกอินสำเร็จ (200)', login.status === 200 && Boolean(token));
if (!token) process.exit(1);

console.log('\n=== 3. เปิดกะ ===');
const shift = await req('/shifts/open', token, 'POST', { openingCash: 1000 });
check('เปิดกะสำเร็จ (201)', [201, 409].includes(shift.status), shift.json);

console.log('\n=== 4. สร้าง 2 โต๊ะ + เมนูอาหาร ===');
let floorList = await req('/floors', token);
let floorId = floorList.json?.data?.[0]?.floor_id;
if (!floorId) {
  const floor = await req('/floors', token, 'POST', { floor_no: 1, name: 'ชั้น 1', table_count: 5 });
  floorId = floor.json?.data?.floor_id;
}

const tableA = await req('/tables', token, 'POST', {
  tableNumber: `T1_${stamp}`,
  capacity: 4,
  floorId,
});
const tableAId = tableA.json?.data?.table_id;
check('สร้างโต๊ะ A สำเร็จ', Boolean(tableAId));

const tableB = await req('/tables', token, 'POST', {
  tableNumber: `T2_${stamp}`,
  capacity: 4,
  floorId,
});
const tableBId = tableB.json?.data?.table_id;
check('สร้างโต๊ะ B สำเร็จ', Boolean(tableBId));

const cat = await req('/menu/category', token, 'POST', { name: `อาหารจานเดียว_${stamp}` });
const catId = cat.json?.data?.category_id;

const item1 = await req('/menu/items', token, 'POST', {
  name: `ข้าวผัดปู_${stamp}`,
  price: 120,
  category_id: catId,
});
const item1Id = item1.json?.data?.menu_item_id;

const item2 = await req('/menu/items', token, 'POST', {
  name: `ต้มยำกุ้ง_${stamp}`,
  price: 180,
  category_id: catId,
});
const item2Id = item2.json?.data?.menu_item_id;

console.log('\n=== 5. เปิดบิลสั่งอาหารแยกโต๊ะ A และ B + เสิร์ฟครบ ===');
const orderAId = crypto.randomUUID();
const createOrderA = await req('/orders', token, 'POST', { orderId: orderAId, tableId: tableAId });
check('เปิดบิลโต๊ะ A สำเร็จ (201)', createOrderA.status === 201, createOrderA.json);

const orderBId = crypto.randomUUID();
const createOrderB = await req('/orders', token, 'POST', { orderId: orderBId, tableId: tableBId });
check('เปิดบิลโต๊ะ B สำเร็จ (201)', createOrderB.status === 201, createOrderB.json);

const itemA_id = crypto.randomUUID();
await req(`/orders/${orderAId}/items`, token, 'POST', {
  kitchenTicketId: crypto.randomUUID(),
  items: [{ orderItemId: itemA_id, menuItemId: item1Id }],
});
for (const status of ['preparing', 'ready', 'served']) {
  await req(`/kds/items/${itemA_id}/status`, token, 'PATCH', { status });
}

const itemB_id = crypto.randomUUID();
await req(`/orders/${orderBId}/items`, token, 'POST', {
  kitchenTicketId: crypto.randomUUID(),
  items: [{ orderItemId: itemB_id, menuItemId: item2Id }],
});
for (const status of ['preparing', 'ready', 'served']) {
  await req(`/kds/items/${itemB_id}/status`, token, 'PATCH', { status });
}
console.log('เสิร์ฟอาหารทั้งสองโต๊ะเรียบร้อย');

console.log('\n=== 6. ทดสอบ POST /payments/orders/summary (ยอดรวมก่อนชำระของหลายบิล) ===');
const invalidSummary = await req('/payments/orders/summary', token, 'POST', { orderIds: [] });
check('ส่ง orderIds ว่างได้ 400', invalidSummary.status === 400);

const validSummary = await req('/payments/orders/summary', token, 'POST', {
  orderIds: [orderAId, orderBId],
});
check('ขอยอดรวม 2 บิลได้ 201', validSummary.status === 201, validSummary.json);
const sumData = validSummary.json?.data;
check('ยอดรวมตรงกัน 120 + 180 = 300', Number(sumData?.amount) === 300, sumData?.amount);
check('จำนวนรายการรวม = 2', Number(sumData?.itemCount) === 2, sumData?.itemCount);

console.log('\n=== 7. สร้าง attempt รวมบิลโต๊ะ A + B ===');
const attempt = await req('/payments/attempts', token, 'POST', {
  orderIds: [orderAId, orderBId],
  paymentMethod: 'cash',
});
check('สร้าง attempt รวมบิลได้ 201', attempt.status === 201, attempt.json);
const attemptId = attempt.json?.data?.paymentAttemptId;
check('attempt.amount = 300', Number(attempt.json?.data?.amount) === 300);

console.log('\n=== 8. ชำระเงินสด 500 บาท (เงินทอน 200 บาท) ===');
const pay = await req(`/payments/attempts/${attemptId}/pay`, token, 'POST', { cashReceived: 500 });
check('ชำระเงินรวมสำเร็จ 201', pay.status === 201, pay.json);
const paymentId = pay.json?.data?.paymentId;
check('เงินทอน 200 บาท', Number(pay.json?.data?.changeAmount) === 200, pay.json?.data?.changeAmount);

console.log('\n=== 9. ตรวจสอบสถานะใบเสร็จ (GET /payments/:id/receipt) ===');
const receipt = await req(`/payments/${paymentId}/receipt`, token);
check('อ่านใบเสร็จได้ 200', receipt.status === 200);
const rData = receipt.json?.data;
check('ใบเสร็จมียอดรวม 300', Number(rData?.totalAmount) === 300);
check(
  'ใบเสร็จมีข้อมูลโต๊ะทั้งสองโต๊ะ (T1 และ T2)',
  Array.isArray(rData?.tables) &&
    rData.tables.some((t) => t.tableNumber === `T1_${stamp}`) &&
    rData.tables.some((t) => t.tableNumber === `T2_${stamp}`),
  rData?.tables,
);

console.log('\n=== 10. ตรวจสอบสถานะโต๊ะ A และ B ว่ากลับมาว่าง (available) ทั้งคู่ ===');
const tablesAfter = await req('/tables', token);
const tableAAfter = tablesAfter.json?.data?.find((t) => t.table_id === tableAId);
const tableBAfter = tablesAfter.json?.data?.find((t) => t.table_id === tableBId);
check('โต๊ะ A กลับมาว่าง (available)', tableAAfter?.status === 'available', tableAAfter?.status);
check('โต๊ะ B กลับมาว่าง (available)', tableBAfter?.status === 'available', tableBAfter?.status);
check('โต๊ะ A open_order_id เป็น null', tableAAfter?.open_order_id === null);
check('โต๊ะ B open_order_id เป็น null', tableBAfter?.open_order_id === null);

console.log(`\n=== สรุปผล E2E รวมโต๊ะคิดเงิน: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);

