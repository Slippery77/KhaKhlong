// e2e-slip-verify.mjs — ตรวจสลิปผ่าน SlipOK: POST /payments/attempts/:id/verify-slip
//
// สคริปต์นี้เปิด mock SlipOK ที่พอร์ต 4010 เอง (ไม่ใช้โควต้าจริง) ต้องรัน backend ให้ชี้มาที่ mock:
//   backend/.env  → SLIPOK_BRANCH_ID=mock  SLIPOK_API_KEY=mock  SLIPOK_BASE_URL=http://localhost:4010
//   แล้ว restart backend จากนั้น: node backend/test/e2e/e2e-slip-verify.mjs
// ต้องรัน PATCH_12_slip_checks.sql แล้ว (หรือติดตั้ง FULL_INSTALL.sql รุ่นล่าสุด)
import http from 'node:http';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000/api';
const MOCK_PORT = 4010;
const PROMPTPAY = '0812345678';

const stamp = Date.now().toString().slice(-6);
const slug = `sv-${stamp}`;
const username = `owner_${stamp}`;
const password = 'Password123!';

let failures = 0;
function ok(label, condition, extra) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`, extra === undefined ? '' : JSON.stringify(extra));
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

// ---------- mock SlipOK ----------
// body.data = "MOCK:<scenario>:<transRef>" → ตอบตาม scenario
const mockCalls = [];
function slipData({ amount, transRef, proxy = '081xxx5678', account = '', ts = new Date() }) {
  return {
    success: true,
    message: '✅',
    language: 'TH',
    transRef,
    sendingBank: '004',
    receivingBank: '014',
    transDate: '',
    transTime: '',
    transTimestamp: ts.toISOString(),
    sender: { displayName: 'นาย ทดสอบ ก', name: 'MR TEST K', proxy: { type: null, value: null }, account: { type: 'BANKAC', value: 'xxx-x-x0209-x' } },
    receiver: { displayName: 'ร้าน ทดสอบ', name: 'SHOP TEST', proxy: { type: proxy ? 'MSISDN' : '', value: proxy }, account: { type: account ? 'BANKAC' : '', value: account } },
    amount,
    paidLocalAmount: amount,
    paidLocalCurrency: '764',
    countryCode: 'TH',
    transFeeAmount: 0,
    ref1: '', ref2: '', ref3: '', toMerchantId: '',
  };
}

const mock = http.createServer((request, response) => {
  let raw = '';
  request.on('data', (c) => (raw += c));
  request.on('end', () => {
    const send = (status, payload) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(payload === undefined ? '' : JSON.stringify(payload));
    };
    if (!request.headers['x-authorization']) return send(401, { code: 1002, message: 'Authorization Header ไม่ถูกต้อง' });
    if (request.method === 'GET' && request.url.endsWith('/quota')) {
      return send(200, { success: true, data: { quota: 87, overQuota: 0, specialQuota: 0, endDate: '2026-12-31', specialEndDate: null } });
    }
    const body = JSON.parse(raw || '{}');
    mockCalls.push(body);
    const amount = Number(body.amount);
    if (body.files) return send(200, { success: true, data: slipData({ amount, transRef: `IMG${stamp}` }) });

    const [, scenario, transRef] = String(body.data ?? '').split(':');
    switch (scenario) {
      case 'ok':
        return send(200, { success: true, data: slipData({ amount, transRef }) });
      case 'amount':
        return send(400, { code: 1013, message: 'ยอดที่ส่งมาไม่ตรงกับยอดสลิป', data: slipData({ amount: amount + 1, transRef }) });
      case 'receiver':
        return send(200, { success: true, data: slipData({ amount, transRef, proxy: '089xxx0000' }) });
      case 'old':
        return send(200, { success: true, data: slipData({ amount, transRef, ts: new Date(Date.now() - 86_400_000) }) });
      case 'unverifiable':
        return send(200, { success: true, data: slipData({ amount, transRef, proxy: '', account: 'xxx-x-x3109-x' }) });
      case 'fake':
        return send(400, { code: 1011, message: 'QR Code หมดอายุ หรือ ไม่มีรายการอยู่จริง' });
      case 'delay':
        return send(400, { code: 1010, message: 'เนื่องจากเป็นสลิปจากธนาคารกรุงเทพ กรุณารอการตรวจสอบสลิปหลังการโอนประมาณ 8 นาที', data: { bankCode: '002', delay: 8 } });
      case 'down':
        response.writeHead(502);
        return response.end('Bad Gateway');
      default:
        return send(400, { code: 1008, message: 'QR ดังกล่าวไม่ใช่ QR สำหรับการตรวจสอบการชำระเงิน' });
    }
  });
});
await new Promise((resolve) => mock.listen(MOCK_PORT, resolve));
console.log(`mock SlipOK ฟังที่พอร์ต ${MOCK_PORT}`);

try {
  console.log(`\n=== 1. สมัครร้าน ${slug} + ล็อกอิน ===`);
  const reg = await req('/register', null, 'POST', {
    restaurant_name: `ร้านทดสอบสลิป ${stamp}`,
    tenant_slug: slug,
    phone: '0812345678',
    house_number: '1',
    subdistrict: 'ในเมือง',
    district: 'เมือง',
    province: 'เชียงใหม่',
    postal_code: '50000',
    email: `sv_${stamp}@example.com`,
    username,
    password,
    display_name: 'เจ้าของร้านทดสอบ',
    pin: '123456',
  });
  if (reg.status !== 201) {
    console.error('สมัครร้านไม่สำเร็จ (ถ้า 429 ให้รอแล้วรันใหม่):', reg.status, reg.json);
    process.exit(1);
  }
  const login = await req('/auth/login', null, 'POST', { tenantSlug: slug, username, password });
  const token = login.json?.data?.accessToken || login.json?.accessToken;
  if (!token) {
    console.error('ล็อกอินไม่สำเร็จ:', login.status, login.json);
    process.exit(1);
  }

  console.log('\n=== 2. สถานะฟีเจอร์ตรวจสลิป ===');
  const status = await req('/payments/slip-verification/status', token);
  if (!status.json?.data?.enabled) {
    console.error('backend ยังไม่เปิดตรวจสลิป — ตั้ง SLIPOK_BRANCH_ID / SLIPOK_API_KEY / SLIPOK_BASE_URL=http://localhost:4010 แล้ว restart');
    process.exit(1);
  }
  ok('enabled = true', status.json.data.enabled === true);
  ok('อ่านโควต้าจาก SlipOK ได้ (87)', status.json.data.quota?.quota === 87, status.json.data);

  console.log('\n=== 3. ตั้งพร้อมเพย์ + เปิดกะ + เมนู ===');
  const store = await req('/store', token, 'PATCH', { promptpay_id: PROMPTPAY });
  ok('ตั้งพร้อมเพย์ร้าน', store.status === 200, store.json);
  const shift = await req('/shifts/open', token, 'POST', { openingCash: 1000 });
  ok('เปิดกะ', [201, 409].includes(shift.status), shift.json);

  let floorId = (await req('/floors', token)).json?.data?.[0]?.floor_id;
  if (!floorId) floorId = (await req('/floors', token, 'POST', { floor_no: 1, name: 'ชั้น 1', table_count: 5 })).json?.data?.floor_id;
  let tables = (await req('/tables', token)).json?.data ?? [];
  while (tables.length < 4) {
    await req('/tables', token, 'POST', { tableNumber: `SV${tables.length}_${stamp}`, capacity: 4, floorId });
    tables = (await req('/tables', token)).json?.data ?? [];
  }
  let catId = (await req('/menu/category', token)).json?.data?.[0]?.category_id;
  if (!catId) catId = (await req('/menu/category', token, 'POST', { name: `อาหาร_${stamp}` })).json?.data?.category_id;
  const menuId = (await req('/menu/items', token, 'POST', { name: `ข้าวผัด_${stamp}`, price: 120, category_id: catId })).json?.data?.menu_item_id;
  ok('มีโต๊ะและเมนู', Boolean(tables[0]?.table_id && menuId));

  let tableIdx = 0;
  async function servedOrder() {
    const orderId = crypto.randomUUID();
    await req('/orders', token, 'POST', { orderId, tableId: tables[tableIdx++].table_id });
    const orderItemId = crypto.randomUUID();
    await req(`/orders/${orderId}/items`, token, 'POST', {
      kitchenTicketId: crypto.randomUUID(),
      items: [{ orderItemId, menuItemId: menuId }],
    });
    for (const s of ['preparing', 'ready', 'served']) {
      await req(`/kds/items/${orderItemId}/status`, token, 'PATCH', { status: s });
    }
    return orderId;
  }
  async function qrAttempt(method = 'qr_code') {
    const orderId = await servedOrder();
    const a = await req('/payments/attempts', token, 'POST', { orderIds: [orderId], paymentMethod: method });
    return a.json?.data;
  }
  const verify = (attemptId, body) => req(`/payments/attempts/${attemptId}/verify-slip`, token, 'POST', body);
  const mockData = (scenario, ref) => `MOCK:${scenario}:${ref}`;

  console.log('\n=== 4. ตรวจ input ===');
  const cash = await qrAttempt('cash');
  const notQr = await verify(cash.paymentAttemptId, { qrData: mockData('ok', `CASH${stamp}`) });
  ok('attempt เงินสด → 400 NOT_QR_PAYMENT', notQr.status === 400 && notQr.json?.code === 'NOT_QR_PAYMENT', notQr);
  await req(`/payments/attempts/${cash.paymentAttemptId}/cancel`, token, 'POST', { reason: 'e2e' });

  const a1 = await qrAttempt();
  ok('สร้าง attempt QR ยอด 120', Number(a1?.amount) === 120, a1);
  const both = await verify(a1.paymentAttemptId, { qrData: mockData('ok', 'X1234567890'), imageBase64: 'AAAA' });
  ok('ส่งทั้ง qrData และรูป → 400', both.status === 400 && both.json?.code === 'SLIP_INPUT_MISSING', both);
  const none = await verify(a1.paymentAttemptId, {});
  ok('ไม่ส่งอะไรเลย → 400', none.status === 400, none);

  console.log('\n=== 5. สลิปไม่ผ่าน (attempt ยัง pending) ===');
  const cases = [
    ['amount', 422, 'SLIP_AMOUNT_MISMATCH'],
    ['receiver', 422, 'SLIP_RECEIVER_MISMATCH'],
    ['old', 422, 'SLIP_TOO_OLD'],
    ['fake', 422, 'SLIP_NOT_FOUND'],
    ['delay', 409, 'SLIP_BANK_DELAY'],
    ['nonsense', 422, 'SLIP_NOT_PAYMENT_QR'],
    ['down', 503, 'SLIPOK_UNAVAILABLE'],
  ];
  for (const [scenario, httpStatus, code] of cases) {
    const r = await verify(a1.paymentAttemptId, { qrData: mockData(scenario, `${scenario.toUpperCase()}${stamp}`) });
    ok(`${scenario} → ${httpStatus} ${code}`, r.status === httpStatus && r.json?.code === code, r);
  }
  ok('ส่งยอดจาก server (120) ให้ SlipOK ทุกครั้ง', mockCalls.every((c) => Number(c.amount) === 120), mockCalls.map((c) => c.amount));
  ok('ส่ง log: false (ตรวจซ้ำ/ผู้รับเองฝั่งเรา)', mockCalls.every((c) => c.log === false));
  const still = await req(`/payments/attempts/${a1.paymentAttemptId}`, token);
  ok('attempt ยัง pending หลังตรวจไม่ผ่าน', still.json?.data?.status === 'pending', still.json);

  console.log('\n=== 6. สลิปถูกต้อง → ปิดบิล ===');
  const goodRef = `OK${stamp}`;
  const good = await verify(a1.paymentAttemptId, { qrData: mockData('ok', goodRef) });
  ok('ตรวจผ่าน 201', good.status === 201, good.json);
  ok('ได้ใบเสร็จ', typeof good.json?.data?.payment?.receiptNumber === 'string', good.json);
  ok('ยอดชำระ 120', Number(good.json?.data?.payment?.totalAmount) === 120, good.json?.data?.payment);
  ok('slip.transRef ตรง', good.json?.data?.slip?.transRef === goodRef, good.json?.data?.slip);
  ok('receiverMatch = matched', good.json?.data?.slip?.receiverMatch === 'matched', good.json?.data?.slip);

  const callsBefore = mockCalls.length;
  const again = await verify(a1.paymentAttemptId, { qrData: mockData('ok', goodRef) });
  ok('กดซ้ำ attempt ที่จ่ายแล้ว → ใบเสร็จเดิม', again.status === 201 && again.json?.data?.payment?.paymentId === good.json?.data?.payment?.paymentId, again.json);
  ok('กดซ้ำไม่เรียก SlipOK (ไม่เสียโควต้า)', mockCalls.length === callsBefore);
  const pay = await req(`/payments/attempts/${a1.paymentAttemptId}/pay`, token, 'POST', {});
  ok('/pay หลังตรวจสลิปคืนใบเสร็จเดิม', pay.json?.data?.paymentId === good.json?.data?.payment?.paymentId, pay.json);

  console.log('\n=== 7. สลิปซ้ำกับบิลอื่น ===');
  const a2 = await qrAttempt();
  const dup = await verify(a2.paymentAttemptId, { qrData: mockData('ok', goodRef) });
  ok('ใช้สลิปเดิม → 409 SLIP_DUPLICATE', dup.status === 409 && dup.json?.code === 'SLIP_DUPLICATE', dup);
  const a2State = await req(`/payments/attempts/${a2.paymentAttemptId}`, token);
  ok('บิลที่ 2 ยัง pending', a2State.json?.data?.status === 'pending', a2State.json);

  console.log('\n=== 8. รูปสลิป + ผู้รับตรวจไม่ได้ ===');
  const img = await verify(a2.paymentAttemptId, { imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQg=' });
  ok('ส่งรูป → ผ่าน', img.status === 201 && img.json?.data?.slip?.transRef === `IMG${stamp}`, img.json);
  ok('ส่งรูปเป็น base64 ไม่มี prefix ให้ SlipOK', typeof mockCalls.at(-1)?.files === 'string' && !mockCalls.at(-1).files.startsWith('data:'));

  const a3 = await qrAttempt();
  const unv = await verify(a3.paymentAttemptId, { qrData: mockData('unverifiable', `UNV${stamp}`) });
  ok('สลิปมีแต่เลขบัญชี → ผ่าน แต่ receiverMatch = unverifiable', unv.status === 201 && unv.json?.data?.slip?.receiverMatch === 'unverifiable', unv.json);
} finally {
  mock.close();
}

console.log(failures === 0 ? '\nผ่านทั้งหมด' : `\nไม่ผ่าน ${failures} ข้อ`);
process.exit(failures === 0 ? 0 : 1);
