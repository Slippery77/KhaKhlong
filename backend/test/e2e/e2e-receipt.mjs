// e2e-receipt.mjs — ทดสอบใบเสร็จ: GET /payments/:id/receipt + POST /payments/:id/print + max_reprints
// รัน: node backend/test/e2e/e2e-receipt.mjs  (ต้องมี backend + PostgreSQL รันอยู่)
const BASE = 'http://localhost:3000/api';

const stamp = Date.now().toString().slice(-6);
const slug = `rc-${stamp}`;
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
let currentSlug = slug;
let currentUsername = username;
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบใบเสร็จ ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `rc_${stamp}@example.com`,
  username,
  password,
  display_name: 'เจ้าของร้านทดสอบ',
});

if (reg.status === 429) {
  console.log('Register rate-limited (429), reusing tenant rc-328346');
  currentSlug = 'rc-328346';
  currentUsername = 'owner_328346';
} else if (reg.status !== 201) {
  console.error('Register failed:', reg.status, reg.json);
  process.exit(1);
} else {
  console.log('Register OK');
}

console.log(`\n=== 2. ล็อกอิน ${currentUsername} ===`);
const login = await req('/auth/login', null, 'POST', {
  tenantSlug: currentSlug,
  username: currentUsername,
  password,
});
const token = login.json?.data?.accessToken || login.json?.accessToken;
if (login.status !== 200 || !token) {
  console.error('Login failed:', login.status, login.json);
  process.exit(1);
}
console.log('Login OK');

console.log('\n=== 3. เปิดกะ ===');
const shift = await req('/shifts/open', token, 'POST', { openingCash: 1000 });
ok('เปิดกะสำเร็จ (หรือเปิดอยู่แล้ว)', [201, 409].includes(shift.status), shift.json);

console.log('\n=== 4. เตรียมโต๊ะ + เมนู ===');
let floorList = await req('/floors', token);
let floorId = floorList.json?.data?.[0]?.floor_id;
if (!floorId) {
  const floor = await req('/floors', token, 'POST', { floor_no: 1, name: 'ชั้น 1', table_count: 5 });
  floorId = floor.json?.data?.floor_id;
}

let tableList = await req('/tables', token);
let tableId = tableList.json?.data?.[0]?.table_id;
if (!tableId) {
  const table = await req('/tables', token, 'POST', {
    tableNumber: `RC_${stamp}`,
    capacity: 4,
    floorId,
  });
  tableId = table.json?.data?.table_id;
}
ok('มีโต๊ะสำหรับเปิดบิล', Boolean(tableId));

let catList = await req('/menu/category', token);
let catId = catList.json?.data?.[0]?.category_id;
if (!catId) {
  const cat = await req('/menu/category', token, 'POST', { name: `อาหาร_${stamp}` });
  catId = cat.json?.data?.category_id;
}

const item1 = await req('/menu/items', token, 'POST', {
  name: `กะเพราหมูกรอบ_${stamp}`,
  price: 90,
  category_id: catId,
});
const item1Id = item1.json?.data?.menu_item_id;
const item2 = await req('/menu/items', token, 'POST', {
  name: `ชาไทยเย็น_${stamp}`,
  price: 35,
  category_id: catId,
});
const item2Id = item2.json?.data?.menu_item_id;

console.log('\n=== 5. เปิดบิล + ส่งครัว + เสิร์ฟ ===');
const orderId = crypto.randomUUID();
const createOrder = await req('/orders', token, 'POST', { orderId, tableId });
ok('เปิดบิลสำเร็จ', createOrder.status === 201, createOrder.json);

const ticketId = crypto.randomUUID();
const orderItem1Id = crypto.randomUUID();
const orderItem2Id = crypto.randomUUID();
const addItems = await req(`/orders/${orderId}/items`, token, 'POST', {
  kitchenTicketId: ticketId,
  items: [
    { orderItemId: orderItem1Id, menuItemId: item1Id },
    { orderItemId: orderItem2Id, menuItemId: item2Id },
  ],
});
ok('เพิ่มรายการอาหารสำเร็จ', addItems.status === 201, addItems.json);

for (const id of [orderItem1Id, orderItem2Id]) {
  for (const status of ['preparing', 'ready', 'served']) {
    await req(`/kds/items/${id}/status`, token, 'PATCH', { status });
  }
}
console.log('เสิร์ฟครบทุกรายการ');

console.log('\n=== 6. ชำระเงินสด 200 บาท (ยอดบิล 125) ===');
const attempt = await req('/payments/attempts', token, 'POST', {
  orderIds: [orderId],
  paymentMethod: 'cash',
});
const attemptId = attempt.json?.data?.paymentAttemptId;
ok('สร้าง attempt สำเร็จ', attempt.status === 201, attempt.json);
ok('attempt.amount = 125', Number(attempt.json?.data?.amount) === 125, attempt.json?.data?.amount);

const pay = await req(`/payments/attempts/${attemptId}/pay`, token, 'POST', { cashReceived: 200 });
const paymentId = pay.json?.data?.paymentId;
ok('ชำระเงินสำเร็จ', pay.status === 201, pay.json);
ok('เงินทอน 75', Number(pay.json?.data?.changeAmount) === 75, pay.json?.data?.changeAmount);

console.log('\n=== 7. GET /payments/:id/receipt ===');
const receipt = await req(`/payments/${paymentId}/receipt`, token);
const r = receipt.json?.data ?? {};
ok('อ่านใบเสร็จได้ (200)', receipt.status === 200, receipt.json);
ok('มีเลขที่ใบเสร็จ', typeof r.receiptNumber === 'string' && r.receiptNumber.length > 0, r.receiptNumber);
ok('เลขที่ตรงกับตอนจ่าย', r.receiptNumber === pay.json?.data?.receiptNumber);
ok('มีชื่อร้าน', typeof r.store?.name === 'string' && r.store.name.includes('ร้านทดสอบใบเสร็จ'), r.store);
ok('ที่อยู่ประกอบครบ (มีจังหวัด)', typeof r.store?.address === 'string' && r.store.address.includes('เชียงใหม่'), r.store?.address);
ok('ร้านไม่เปิด VAT → taxId = null', r.store?.taxId === null, r.store?.taxId);
ok('vatMode = none', r.vatMode === 'none', r.vatMode);
ok('มีข้อมูลโต๊ะ', Array.isArray(r.tables) && r.tables.length > 0, r.tables);
const tableNumber = (await req('/tables', token)).json?.data?.find((t) => t.table_id === tableId)
  ?.table_number;
ok('เลขโต๊ะตรงกับโต๊ะที่เปิดบิล', r.tables?.[0]?.tableNumber === tableNumber, {
  receipt: r.tables?.[0]?.tableNumber,
  tableNumber,
});
ok('มีเลขบิลบนใบเสร็จ', r.tables?.[0]?.orderNumber != null, r.tables);
ok('มีรายการอาหาร 2 บรรทัด', Array.isArray(r.lines) && r.lines.length === 2, r.lines?.length);
ok(
  'รายการมีชื่อเมนูที่สั่ง',
  (r.lines ?? []).some((l) => l.name.includes('กะเพราหมูกรอบ')) &&
    (r.lines ?? []).some((l) => l.name.includes('ชาไทยเย็น')),
  r.lines,
);
ok('lines มี unitPrice/qty/lineTotal เป็นตัวเลข',
  (r.lines ?? []).every(
    (l) => typeof l.unitPrice === 'number' && typeof l.qty === 'number' && typeof l.lineTotal === 'number',
  ),
  r.lines,
);
ok('subtotal = 125', Number(r.subtotal) === 125, r.subtotal);
ok('vatAmount = 0', Number(r.vatAmount) === 0, r.vatAmount);
ok('totalAmount = 125', Number(r.totalAmount) === 125, r.totalAmount);
ok('มี vatRate เป็นตัวเลข', typeof r.vatRate === 'number', r.vatRate);
ok('มี serviceChargeRate เป็นตัวเลข', typeof r.serviceChargeRate === 'number', r.serviceChargeRate);
ok('มี roundingAdjustment เป็นตัวเลข', typeof r.roundingAdjustment === 'number', r.roundingAdjustment);
ok('vatRate = 0 เมื่อร้านไม่เปิด VAT', r.vatRate === 0, r.vatRate);
ok('serviceChargeRate = 0', r.serviceChargeRate === 0, r.serviceChargeRate);
ok('ยอดรวมบรรทัด = subtotal (ร้านไม่คิด service charge/VAT)',
  Math.abs((r.lines ?? []).reduce((sum, l) => sum + l.lineTotal, 0) - Number(r.subtotal)) < 0.005,
  { lines: r.lines?.reduce((sum, l) => sum + l.lineTotal, 0), subtotal: r.subtotal },
);
ok('paymentMethod = cash', r.paymentMethod === 'cash', r.paymentMethod);
ok('cashReceived = 200', Number(r.cashReceived) === 200, r.cashReceived);
ok('changeAmount = 75', Number(r.changeAmount) === 75, r.changeAmount);
ok('มีชื่อพนักงานเก็บเงิน', typeof r.cashier === 'string' && r.cashier.length > 0, r.cashier);
ok('มี paidAt', typeof r.paidAt === 'string' && !Number.isNaN(Date.parse(r.paidAt)), r.paidAt);

console.log('\n=== 8. GET receipt ซ้ำต้องไม่นับเป็นการพิมพ์ ===');
const receiptAgain = await req(`/payments/${paymentId}/receipt`, token);
ok('อ่านซ้ำได้', receiptAgain.status === 200);
const printLogProbe = await req(`/payments/${paymentId}/print`, token, 'POST');
ok('พิมพ์ครั้งแรก → printCount = 1', printLogProbe.json?.data?.printCount === 1, printLogProbe.json);
ok('พิมพ์ครั้งแรก → isCopy = false', printLogProbe.json?.data?.isCopy === false, printLogProbe.json);

console.log('\n=== 9. จำกัดจำนวนพิมพ์ซ้ำ (max_reprints = 2 → พิมพ์ได้ทั้งหมด 3 ครั้ง) ===');
const setMax = await req('/system-config/max_reprints', token, 'PATCH', { value: 2 });
ok('ตั้งค่า max_reprints = 2 สำเร็จ', setMax.status === 200, setMax.json);

const print2 = await req(`/payments/${paymentId}/print`, token, 'POST');
ok('พิมพ์ครั้งที่ 2 → printCount = 2', print2.json?.data?.printCount === 2, print2.json);
ok('พิมพ์ครั้งที่ 2 → isCopy = true', print2.json?.data?.isCopy === true, print2.json);

const print3 = await req(`/payments/${paymentId}/print`, token, 'POST');
ok('พิมพ์ครั้งที่ 3 → printCount = 3', print3.json?.data?.printCount === 3, print3.json);

const print4 = await req(`/payments/${paymentId}/print`, token, 'POST');
ok('พิมพ์ครั้งที่ 4 → 409', print4.status === 409, print4.json);
ok(
  'ข้อความแจ้งว่าพิมพ์ครบแล้ว',
  String(print4.json?.message ?? '').includes('พิมพ์ซ้ำครบ'),
  print4.json?.message,
);

console.log('\n=== 10. ใบเสร็จของ paymentId ที่ไม่มีอยู่จริง ===');
const notFound = await req(`/payments/${crypto.randomUUID()}/receipt`, token);
ok('ได้ 404', notFound.status === 404, notFound.json);

console.log('\n=== 11. ต้องมี token ===');
const noAuth = await req(`/payments/${paymentId}/receipt`, null);
ok('ไม่มี token → 401', noAuth.status === 401, noAuth.json);

console.log('\n=== 12. จ่ายซ้ำ attempt เดิม ต้องได้ใบเสร็จเดิม ===');
const repay = await req(`/payments/attempts/${attemptId}/pay`, token, 'POST', { cashReceived: 200 });
ok('เรียกซ้ำไม่สร้างใบใหม่', repay.json?.data?.paymentId === paymentId, repay.json?.data?.paymentId);
ok('เลขใบเสร็จเดิม', repay.json?.data?.receiptNumber === r.receiptNumber);

console.log('');
if (failures > 0) {
  console.error(`❌ FAILED ${failures} checks\n`);
  process.exit(1);
}
console.log('🎉 ALL RECEIPT TESTS PASSED\n');
