// e2e-printer-config.mjs
// ทดสอบการอ่านและอัปเดตการตั้งค่าใบเสร็จและเครื่องพิมพ์ (system-config)
// และตรวจว่า GET /payments/:id/receipt คืนค่า footer และ toggles ตามที่ตั้งไว้
import crypto from 'crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const stamp = Math.floor(Math.random() * 900000 + 100000);
let slug = `prn-${stamp}`;
let username = `owner_${stamp}`;
const password = 'Password1234!';
const pin = '123456';

async function req(path, token, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function assert(cond, msg, extra = '') {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`, extra);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

console.log(`\n=== 1. สมัครร้านใหม่ ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบเครื่องพิมพ์ ${stamp}`,
  tenant_slug: slug,
  phone: '0899999999',
  house_number: '123/4',
  subdistrict: 'วัดเกต',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `prn_${stamp}@example.com`,
  username,
  password,
  display_name: 'เจ้าของร้านเครื่องพิมพ์',
  pin,
});

if (reg.status === 429) {
  console.log('Register throttled (429), reusing existing tenant prn-403494');
  slug = 'prn-403494';
  username = 'owner_403494';
} else if (reg.status !== 201) {
  console.error('Register failed:', reg.status, reg.json);
  process.exit(1);
} else {
  console.log('Register OK');
}

console.log(`\n=== 2. ล็อกอิน owner ===`);
const login = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username,
  password,
});
assert(login.status === 200, 'Login สำเร็จ');
const token = login.json?.data?.accessToken || login.json?.accessToken;
assert(Boolean(token), 'ได้รับ access token');

console.log(`\n=== 3. ตรวจสอบ config เริ่มต้นของร้าน ===`);
const listCfg = await req('/system-config', token);
assert(listCfg.status === 200, 'GET /system-config สำเร็จ');
const items = listCfg.json.data;

const footerItem = items.find((i) => i.key === 'receipt_footer');
const taxIdItem = items.find((i) => i.key === 'receipt_show_tax_id');
const cashierItem = items.find((i) => i.key === 'receipt_show_cashier');
const addressItem = items.find((i) => i.key === 'receipt_show_address');
const reprintsItem = items.find((i) => i.key === 'max_reprints');

assert(Boolean(footerItem), 'มี key receipt_footer');
assert(footerItem.ownerOnly === false, 'receipt_footer ownerOnly = false');
assert(Boolean(taxIdItem), 'มี key receipt_show_tax_id');
assert(Boolean(cashierItem), 'มี key receipt_show_cashier');
assert(Boolean(addressItem), 'มี key receipt_show_address');
assert(Boolean(reprintsItem), 'มี key max_reprints');

console.log(`\n=== 4. ตรวจสอบ Boundary & Input Validation ===`);
// Footer เกิน 500 ตัวอักษรต้องถูกปฏิเสธด้วย 400
const tooLongFooter = 'A'.repeat(501);
const rejectLongFooter = await req('/system-config/receipt_footer', token, 'PATCH', {
  value: tooLongFooter,
});
assert(rejectLongFooter.status === 400, 'ปฏิเสธ footer ความยาวเกิน 500 ตัวอักษร (400)');

// max_reprints เป็นค่าติดลบต้องถูกปฏิเสธด้วย 400
const rejectNegativeReprints = await req('/system-config/max_reprints', token, 'PATCH', {
  value: -5,
});
assert(rejectNegativeReprints.status === 400, 'ปฏิเสธ max_reprints ติดลบ (400)');

console.log(`\n=== 5. อัปเดตค่าข้อความท้ายใบเสร็จและตัวเลือกแสดงผล ===`);
const newFooter = 'ขอบคุณทุกท่านที่มาอุดหนุน\nWi-Fi: KhaKhlong_5G Pass: 88888888';
const patchFooter = await req('/system-config/receipt_footer', token, 'PATCH', {
  value: newFooter,
});
assert(patchFooter.status === 200, 'PATCH receipt_footer สำเร็จ');
assert(patchFooter.json.data.value === newFooter, 'ค่า receipt_footer อัปเดตตรง');

const patchAddress = await req('/system-config/receipt_show_address', token, 'PATCH', {
  value: 'false',
});
assert(patchAddress.status === 200, 'PATCH receipt_show_address สำเร็จ');
assert(patchAddress.json.data.value === false, 'ค่า receipt_show_address เป็น false');

console.log(`\n=== 6. สร้างออเดอร์ ชำระเงิน และอ่านใบเสร็จ ===`);
// เปิดกะ (ถ้ายังไม่ได้เปิด)
const shiftRes = await req('/shifts/open', token, 'POST', { openingCash: 500 });
assert([201, 409].includes(shiftRes.status), 'เปิดกะสำเร็จหรือมีกะเปิดอยู่');

// เตรียมชั้น
let floorList = await req('/floors', token);
let floorId = floorList.json?.data?.[0]?.floor_id;
if (!floorId) {
  const floor = await req('/floors', token, 'POST', { floor_no: 1, name: 'ชั้น 1', table_count: 5 });
  floorId = floor.json?.data?.floor_id;
}

// สร้างโต๊ะใหม่เสมอเพื่อกันชนกับบิลค้าง
const table = await req('/tables', token, 'POST', {
  tableNumber: `P_${Date.now() % 100000}`,
  capacity: 4,
  floorId,
});
const tableId = table.json?.data?.table_id;
assert(Boolean(tableId), 'สร้างโต๊ะสำหรับเปิดบิลสำเร็จ', table.json);

// เตรียมหมวดหมู่และเมนู
let catList = await req('/menu/category', token);
let catId = catList.json?.data?.[0]?.category_id;
if (!catId) {
  const cat = await req('/menu/category', token, 'POST', { name: `อาหาร_${stamp}` });
  catId = cat.json?.data?.category_id;
}

const item = await req('/menu/items', token, 'POST', {
  name: `กาแฟดริป_${Date.now() % 100000}`,
  price: 75,
  category_id: catId,
});
const menuItemId = item.json?.data?.menu_item_id;
assert(Boolean(menuItemId), 'สร้างเมนูสำเร็จ', item.json);

// เปิดบิล
const orderId = crypto.randomUUID();
const orderRes = await req('/orders', token, 'POST', {
  orderId,
  tableId,
});
assert(orderRes.status === 201, 'เปิดบิลสำเร็จ', orderRes.json);

// สั่งอาหาร
const ticketId = crypto.randomUUID();
const orderItemId = crypto.randomUUID();
const addRes = await req(`/orders/${orderId}/items`, token, 'POST', {
  kitchenTicketId: ticketId,
  items: [{ orderItemId, menuItemId }],
});
assert(addRes.status === 201, 'สั่งอาหารสำเร็จ', addRes.json);

// เสิร์ฟให้ครบ (preparing -> ready -> served)
for (const status of ['preparing', 'ready', 'served']) {
  await req(`/kds/items/${orderItemId}/status`, token, 'PATCH', { status });
}

// ชำระเงิน
const attemptRes = await req('/payments/attempts', token, 'POST', {
  orderIds: [orderId],
  paymentMethod: 'cash',
});
assert(attemptRes.status === 201, 'สร้าง payment attempt สำเร็จ', attemptRes.json);
const attemptId = attemptRes.json.data.paymentAttemptId;

const payRes = await req(`/payments/attempts/${attemptId}/pay`, token, 'POST', {
  cashReceived: 100,
});
assert([200, 201].includes(payRes.status), 'ชำระเงินสำเร็จ', payRes.json);
const paymentId = payRes.json.data.paymentId;

// อ่านใบเสร็จ
const receiptRes = await req(`/payments/${paymentId}/receipt`, token);
assert(receiptRes.status === 200, 'GET receipt สำเร็จ', receiptRes.json);
const receipt = receiptRes.json.data;

assert(receipt.footer === newFooter, 'receipt.footer ตรงกับที่ตั้งค่า');
assert(receipt.showAddress === false, 'receipt.showAddress = false ตรงกับที่ตั้งค่า');
assert(receipt.showTaxId === true, 'receipt.showTaxId = true');
assert(receipt.showCashier === true, 'receipt.showCashier = true');

console.log('\n🎉 ALL PRINTER CONFIG TESTS PASSED');
