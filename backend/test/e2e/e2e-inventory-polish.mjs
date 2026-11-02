/**
 * E2E Test: Inventory Polish — Business Date, Clean Note & Decimal Format, and Transactions
 */
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const stamp = Math.floor(Math.random() * 900000 + 100000);
let tenantSlug = `invpol-${stamp}`;
let ownerUsername = `owner_${stamp}`;
const password = 'Password123!';

const jsonReq = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
};

async function main() {
  console.log(`\n=== 1. สมัครร้านใหม่ หรือใช้ร้านที่มีอยู่ (${tenantSlug}) ===`);
  const reg = await jsonReq('/register', {
    method: 'POST',
    body: {
      restaurant_name: `ร้านทดสอบสต็อก ${stamp}`,
      tenant_slug: tenantSlug,
      phone: '0812345678',
      house_number: '123/45',
      subdistrict: 'ในเมือง',
      district: 'เมือง',
      province: 'เชียงใหม่',
      postal_code: '50000',
      email: `invpol_${stamp}@example.com`,
      username: ownerUsername,
      password: password,
      pin: '123456',
      display_name: 'เจ้าของร้านสต็อก',
    },
  });

  if (reg.status === 429) {
    console.log('Register ติด throttle (429) — ใช้งาน tenant ที่มีอยู่ (audit-608596)');
    tenantSlug = 'audit-608596';
    ownerUsername = 'owner_608596';
  } else {
    assert.equal(reg.status, 201, `Register failed: ${JSON.stringify(reg.data)}`);
    console.log('PASS  สมัครร้านสำเร็จ 201');
  }

  console.log('\n=== 2. ล็อกอิน Owner ===');
  const login = await jsonReq('/auth/login', {
    method: 'POST',
    body: {
      username: ownerUsername,
      password: password,
      tenantSlug: tenantSlug,
    },
  });
  assert.equal(login.status, 200, `Login failed: ${JSON.stringify(login.data)}`);
  const token = login.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('PASS  ล็อกอินสำเร็จ 200');

  console.log('\n=== 3. ตรวจกะปัจจุบันหรือเปิดกะเพื่อกำหนดวันทำการ (business_date) ===');
  let shiftBusinessDate;
  const curShift = await jsonReq('/shifts/current', { headers: authHeaders });
  if (curShift.status === 200 && curShift.data?.data?.businessDate) {
    shiftBusinessDate = curShift.data.data.businessDate;
    console.log(`PASS  มีกะเปิดอยู่แล้ว businessDate = ${shiftBusinessDate}`);
  } else {
    const openShift = await jsonReq('/shifts/open', {
      method: 'POST',
      headers: authHeaders,
      body: { openingCash: 1000 },
    });
    assert.equal(openShift.status, 201);
    shiftBusinessDate = openShift.data.data.businessDate;
    console.log(`PASS  เปิดกะสำเร็จ businessDate = ${shiftBusinessDate}`);
  }

  console.log('\n=== 4. สร้างวัตถุดิบ (นมสด) ===');
  const createIng = await jsonReq('/ingredients', {
    method: 'POST',
    headers: authHeaders,
    body: {
      name: `นมสดเมจิ ${stamp}`,
      stock_unit: 'มล.',
      low_stock_threshold: 200,
    },
  });
  assert.equal(createIng.status, 201, `Create ingredient failed: ${JSON.stringify(createIng.data)}`);
  const ingredientId = createIng.data.data.ingredient_id;
  console.log(`PASS  สร้างวัตถุดิบสำเร็จ ID = ${ingredientId}`);

  console.log('\n=== 5. รับของเข้าสต็อก (1000 มล.) ===');
  const restock = await jsonReq('/inventory/restock', {
    method: 'POST',
    headers: authHeaders,
    body: {
      ingredient_id: ingredientId,
      quantity: 1000,
      note: 'รับเข้าของสดตอนเช้า',
    },
  });
  assert.equal(restock.status, 201);
  assert.equal(restock.data.data.business_date, shiftBusinessDate, 'restock response ต้องมี business_date');
  console.log('PASS  รับของเข้าสต็อกสำเร็จ (มี business_date ใน response)');

  console.log('\n=== 6. ตรวจนับสต็อกแบบไม่มี note (counted = 850.5) ===');
  const count = await jsonReq('/inventory/count', {
    method: 'POST',
    headers: authHeaders,
    body: {
      ingredient_id: ingredientId,
      counted_quantity: 850.5,
    },
  });
  assert.equal(count.status, 201);
  assert.equal(Number(count.data.data.delta), -149.5);
  console.log(`PASS  ตรวจนับสต็อกสำเร็จ delta = ${count.data.data.delta}`);

  console.log('\n=== 7. ตรวจสอบ Transactions: business_date และรูปแบบ note ===');
  const txList = await jsonReq(
    `/inventory/transactions?ingredient_id=${ingredientId}&business_date=${shiftBusinessDate}&type=adjustment`,
    {
      headers: authHeaders,
    },
  );
  assert.equal(txList.status, 200);
  assert.ok(txList.data.data.length >= 1, 'ต้องมีอย่างน้อย 1 รายการ adjustment');
  const adjustTx = txList.data.data[0];

  assert.equal(adjustTx.business_date, shiftBusinessDate, 'business_date ต้องตรงกับกะ');
  assert.equal(adjustTx.counted_quantity, 850.5);
  assert.equal(adjustTx.quantity_change, -149.5);

  // ตรวจสอบ note ว่าไม่มี leading space
  assert.ok(!adjustTx.note.startsWith(' '), `Note ต้องไม่มี leading space: "${adjustTx.note}"`);
  assert.equal(adjustTx.note, '[counted 850.5, system 1000]', `Note format ถูกต้อง: "${adjustTx.note}"`);
  console.log(`PASS  Note ไม่มี leading space และ format ทศนิยมถูกต้อง: "${adjustTx.note}"`);
  console.log(`PASS  business_date ฟิลด์ส่งออกจาก API ถูกต้อง: "${adjustTx.business_date}"`);

  console.log('\n=== 8. ทดสอบนับสต็อกแบบมี note เพิ่มเติม ===');
  const countWithNote = await jsonReq('/inventory/count', {
    method: 'POST',
    headers: authHeaders,
    body: {
      ingredient_id: ingredientId,
      counted_quantity: 800,
      note: 'นับรอบเย็น',
    },
  });
  assert.equal(countWithNote.status, 201);

  const txList2 = await jsonReq(
    `/inventory/transactions?ingredient_id=${ingredientId}&business_date=${shiftBusinessDate}&type=adjustment`,
    {
      headers: authHeaders,
    },
  );
  const latestTx = txList2.data.data[0];
  assert.equal(latestTx.note, 'นับรอบเย็น [counted 800, system 850.5]');
  console.log(`PASS  Note มีข้อความนำหน้าถูกต้อง: "${latestTx.note}"`);

  console.log('\n=== 9. ทดสอบส่ง business_date ไม่ถูกต้อง ต้องได้ 400 Bad Request ===');
  const invalidDateReq = await jsonReq('/inventory/transactions?business_date=not-a-date', {
    headers: authHeaders,
  });
  assert.equal(invalidDateReq.status, 400, 'Invalid date query parameter ต้องได้ 400 Bad Request');
  console.log('PASS  ส่ง business_date ผิดฟอร์แมตได้รับ 400 Bad Request ไม่เกิด 500');

  console.log('\n========================================');
  console.log('สรุปผลการทดสอบ Inventory Polish: ผ่านครบทุกข้อ');
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
