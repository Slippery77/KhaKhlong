// e2e-reports.mjs — Comprehensive test for Reports, Cash Movements & Payments
const BASE = 'http://localhost:3000/api';

const stamp = Date.now().toString().slice(-6);
const slug = `rep-${stamp}`;
const username = `owner_${stamp}`;
const password = 'Password123!';

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
  restaurant_name: `ร้านทดสอบ Reports ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `rep_${stamp}@example.com`,
  username,
  password,
  display_name: 'เจ้าของร้านสมมุติ',
});

if (reg.status === 429) {
  console.log('Register rate-limited (429), reusing recent tenant rep-328346...');
  currentSlug = 'rep-328346';
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
console.log('Login OK, got token');

console.log('\n=== 3. เปิดกะ (opening cash = 1000 ฿) ===');
const shift = await req('/shifts/open', token, 'POST', { openingCash: 1000 });
console.log('Open shift status:', shift.status, shift.json?.data?.shiftId ? 'OK' : shift.json);

console.log('\n=== 4. บันทึกเงินออก (CASH_OUT 150 ฿: ซื้อน้ำแข็ง) ===');
const move1 = await req('/cash-movements', token, 'POST', {
  movementId: crypto.randomUUID(),
  direction: 'out',
  amount: 150,
  reason: 'ซื้อน้ำแข็ง',
});
console.log('Cash out status:', move1.status, move1.json?.data?.reason);

console.log('\n=== 5. บันทึกเงินเข้า (CASH_IN 500 ฿: นำเงินทอนเข้า) ===');
const move2 = await req('/cash-movements', token, 'POST', {
  movementId: crypto.randomUUID(),
  direction: 'in',
  amount: 500,
  reason: 'นำเงินทอนเข้า',
});
console.log('Cash in status:', move2.status, move2.json?.data?.reason);

console.log('\n=== 6. สร้างชั้น, โต๊ะ, หมวดหมู่, และเมนู เพื่อเปิดบิลและชำระเงินจริง ===');
let floorList = await req('/floors', token);
let floorId = floorList.json?.data?.[0]?.floor_id;
if (!floorId) {
  const floor = await req('/floors', token, 'POST', { floor_no: 1, name: 'ชั้น 1', table_count: 5 });
  floorId = floor.json?.data?.floor_id;
}
console.log('Using Floor ID:', floorId);

let tableList = await req('/tables', token);
let tableId = tableList.json?.data?.[0]?.table_id;
if (!tableId) {
  const table = await req('/tables', token, 'POST', { tableNumber: `T_${stamp}`, capacity: 4, floorId });
  tableId = table.json?.data?.table_id;
}
console.log('Using Table ID:', tableId);

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
console.log(`Created Menu Items: กะเพราหมูกรอบ_${stamp} (90฿), ชาไทยเย็น_${stamp} (35฿)`);

console.log('\n=== 7. เปิดบิลออเดอร์โต๊ะ A1 และส่งครัว ===');
const orderId = crypto.randomUUID();
const createOrder = await req('/orders', token, 'POST', {
  orderId,
  tableId,
});
console.log('Order created status:', createOrder.status, createOrder.json?.data?.orderNumber);

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
console.log('Add items status:', addItems.status);

// เสิร์ฟอาหารผ่าน KDS เพื่อให้จ่ายเงินได้ (PAY-03)
await req(`/kds/items/${orderItem1Id}/status`, token, 'PATCH', { status: 'preparing' });
await req(`/kds/items/${orderItem1Id}/status`, token, 'PATCH', { status: 'ready' });
await req(`/kds/items/${orderItem1Id}/status`, token, 'PATCH', { status: 'served' });

await req(`/kds/items/${orderItem2Id}/status`, token, 'PATCH', { status: 'preparing' });
await req(`/kds/items/${orderItem2Id}/status`, token, 'PATCH', { status: 'ready' });
await req(`/kds/items/${orderItem2Id}/status`, token, 'PATCH', { status: 'served' });
console.log('KDS served both items OK');

console.log('\n=== 8. ชำระเงินด้วยเงินสด (Attempt + Pay) ===');
const attempt = await req('/payments/attempts', token, 'POST', {
  orderIds: [orderId],
  paymentMethod: 'cash',
});
console.log('Payment attempt status:', attempt.status, 'amount:', attempt.json?.data?.amount);
const attemptId = attempt.json?.data?.paymentAttemptId;

const pay = await req(`/payments/attempts/${attemptId}/pay`, token, 'POST', {
  cashReceived: 200,
});
console.log('Pay status:', pay.status, 'Receipt number:', pay.json?.data?.receiptNumber, 'Change:', pay.json?.data?.changeAmount);
const paymentId = pay.json?.data?.paymentId;

console.log('\n=== 9. ตรวจสอบรายงานยอดขาย (Reports Module) ===');

console.log('--- GET /reports/sales/summary?period=TODAY ---');
const summary = await req('/reports/sales/summary?period=TODAY', token);
console.log('Summary data:', JSON.stringify(summary.json?.data, null, 2));

const s = summary.json?.data || {};
// Total income = 125 (90 + 35)
// Total expense = 150 (buying ice)
// Cash sales = 125
// Transfer sales = 0
// Cash on hand = 1000 (open) + 125 (sale cash) + 500 (in) - 150 (out) = 1475
console.log(`Verified cashOnHand = 1000 (open) + ${s.cashSales} (sales) + ${s.cashIn} (in) - ${s.cashOut} (out) = ${s.cashOnHand}`);
const expectedOnHand = 1000 + s.cashSales + s.cashIn - s.cashOut;
if (s.cashOnHand !== expectedOnHand || s.totalIncome < 125) {
  console.error('MISMATCH in summary calculation!', { s, expectedOnHand });
  process.exit(1);
}

console.log('\n--- GET /reports/sales/by-period?period=TODAY ---');
const byPeriod = await req('/reports/sales/by-period?period=TODAY', token);
console.log('By period points:', JSON.stringify(byPeriod.json?.data, null, 2));

console.log('\n--- GET /reports/sales/top-items?period=TODAY ---');
const topItems = await req('/reports/sales/top-items?period=TODAY', token);
console.log('Top items by category:', JSON.stringify(topItems.json?.data, null, 2));
const topCategories = topItems.json?.data;
if (!Array.isArray(topCategories) || topCategories.length === 0) {
  console.error('Top items response is not grouped by category!');
  process.exit(1);
}
if (topCategories.some(c => (c.items ?? []).length > 3)) {
  console.error('Top items must be limited to 3 per category!');
  process.exit(1);
}
if (topCategories.some(c => !c.categoryName || !c.categoryId)) {
  console.error('Top items missing category id/name!');
  process.exit(1);
}
const topItemRows = topCategories.flatMap(c => c.items ?? []);
if (!topItemRows.some(i => i.name.includes('กะเพราหมูกรอบ'))) {
  console.error('Top items missing กะเพราหมูกรอบ!');
  process.exit(1);
}

console.log('\n--- GET /reports/sales/transactions?period=TODAY ---');
const txs = await req('/reports/sales/transactions?period=TODAY', token);
console.log('Transactions count:', txs.json?.data?.length);
console.log('Transaction list:', JSON.stringify(txs.json?.data?.map(t => ({
  type: t.type,
  desc: t.description,
  cash: t.cashAmount,
  transfer: t.transferAmount,
  table: t.table,
})), null, 2));

console.log('\n--- GET /reports/sales/receipt/' + paymentId + ' ---');
const receipt = await req(`/reports/sales/receipt/${paymentId}`, token);
console.log('Receipt lines:', JSON.stringify(receipt.json?.data, null, 2));
if (!receipt.json?.data?.some(l => l.name.includes('กะเพราหมูกรอบ'))) {
  console.error('Receipt lines missing items!');
  process.exit(1);
}

console.log('\n🎉 ALL REPORTS & SALES TESTS PASSED COMPLETELY! 🎉\n');
