// e2e-cancel-order.mjs — ยกเลิกทั้งบิล / ปิดบิลลูกค้าหนี ต้องคืนโต๊ะได้จริง และต้องไม่เปิดช่องจองซ้อน
const BASE = 'http://localhost:3000/api';
const stamp = Date.now().toString().slice(-6);
const slug = `cx-${stamp}`;
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

const okStatus = (status) => status === 200 || status === 201;

console.log(`\n=== 0. เตรียมร้าน ${slug} ===`);
const reg = await req('/register', null, 'POST', {
  restaurant_name: `ร้านทดสอบยกเลิกบิล ${stamp}`,
  tenant_slug: slug,
  phone: '0812345678',
  house_number: '99/9',
  subdistrict: 'ในเมือง',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postal_code: '50000',
  email: `cx_${stamp}@example.com`,
  username,
  password,
  display_name: 'เจ้าของร้านทดสอบ',
  pin: PIN,
});
if (reg.status !== 201) {
  console.error('Register failed:', reg.status, JSON.stringify(reg.json));
  process.exit(1);
}

const login = await req('/auth/login', null, 'POST', { tenantSlug: slug, username, password });
const token = login.json?.data?.accessToken || login.json?.accessToken;
const ownerId = login.json?.data?.user?.sub ?? login.json?.user?.sub;
if (!token) {
  console.error('Login failed:', login.status, login.json);
  process.exit(1);
}

await req('/shifts/open', token, 'POST', { openingCash: 1000 });
const floor = await req('/floors', token, 'POST', {
  floor_no: 1,
  name: `ชั้น 1 ${stamp}`,
  table_count: 5,
});
const floorId = floor.json?.data?.floor_id;

const makeTable = async (label) => {
  const res = await req('/tables', token, 'POST', {
    tableNumber: `${label}${stamp}`,
    capacity: 4,
    floorId,
  });
  return res.json?.data?.table_id;
};
const tableA = await makeTable('A');
const tableB = await makeTable('B');
const tableC = await makeTable('C');
const tableD = await makeTable('D');

const cat = await req('/menu/category', token, 'POST', { name: `อาหาร_${stamp}` });
const catId = cat.json?.data?.category_id;
const menuItem = await req('/menu/items', token, 'POST', {
  name: `ข้าวผัด_${stamp}`,
  price: 80,
  category_id: catId,
});
const menuItemId = menuItem.json?.data?.menu_item_id;
if (!tableA || !tableB || !tableC || !tableD || !menuItemId) {
  console.error('Setup failed:', { tableA, tableB, tableC, tableD, menuItemId });
  process.exit(1);
}

const findTable = async (tableId) => {
  const res = await req('/tables', token);
  return (res.json?.data ?? []).find((t) => t.table_id === tableId);
};

const openOrder = async (tableId, tokenOverride = token) => {
  const orderId = crypto.randomUUID();
  const res = await req('/orders', tokenOverride, 'POST', { orderId, tableId });
  return { orderId, res };
};

const addItems = async (orderId, count, tokenOverride = token) => {
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  const res = await req(`/orders/${orderId}/items`, tokenOverride, 'POST', {
    kitchenTicketId: crypto.randomUUID(),
    items: ids.map((orderItemId) => ({ orderItemId, menuItemId })),
  });
  return { ids, res };
};

const advanceToServed = async (orderItemId) => {
  for (const status of ['preparing', 'ready', 'served']) {
    await req(`/kds/items/${orderItemId}/status`, token, 'PATCH', { status });
  }
};

// พนักงาน (ไม่มี PIN) ใช้กดยกเลิกบิล แล้วขอ PIN เจ้าของร้านอนุมัติ
const staffUsername = `staff_${stamp}`;
const staffCreate = await req('/users', token, 'POST', {
  username: staffUsername,
  password,
  display_name: 'พนักงานเสิร์ฟทดสอบ',
  role_name: 'employee',
});
check(
  'สร้างผู้ใช้พนักงานได้',
  okStatus(staffCreate.status),
  `status=${staffCreate.status}`,
);
const staffLogin = await req('/auth/login', null, 'POST', {
  tenantSlug: slug,
  username: staffUsername,
  password,
});
const staffToken = staffLogin.json?.data?.accessToken || staffLogin.json?.accessToken;
check('พนักงานล็อกอินได้', Boolean(staffToken), `status=${staffLogin.status}`);

console.log('\n=== 1. พนักงานกดยกเลิกทั้งบิล + PIN เจ้าของร้าน ===');
const a = await openOrder(tableA, staffToken);
check('พนักงานเปิดบิลโต๊ะ A ได้', okStatus(a.res.status), `status=${a.res.status}`);
const aItems = await addItems(a.orderId, 2, staffToken);
check('เพิ่ม 2 รายการในบิล A', okStatus(aItems.res.status), `status=${aItems.res.status}`);

const wrongPin = await req(`/orders/${a.orderId}/cancel`, staffToken, 'POST', {
  reason: 'ทดสอบ PIN ผิด',
  approverPin: '000000',
});
check('cancel ด้วย PIN ผิด → 403', wrongPin.status === 403, `status=${wrongPin.status}`);

const cancelled = await req(`/orders/${a.orderId}/cancel`, staffToken, 'POST', {
  reason: 'ลูกค้าเปลี่ยนใจ',
  approverPin: PIN,
});
check('พนักงานยกเลิกทั้งบิลสำเร็จ', okStatus(cancelled.status), `status=${cancelled.status} msg=${cancelled.json?.message}`);
check(
  'void ครบทุกรายการ (2) และปิดเป็น voided_all',
  cancelled.json?.data?.voidedCount === 2 && cancelled.json?.data?.closeReason === 'voided_all',
  `voidedCount=${cancelled.json?.data?.voidedCount} closeReason=${cancelled.json?.data?.closeReason}`,
);
check(
  'approvedBy = เจ้าของร้าน (ผู้ให้ PIN)',
  cancelled.json?.data?.approvedBy?.usersId === ownerId,
  `approvedBy=${cancelled.json?.data?.approvedBy?.usersId} owner=${ownerId}`,
);

const aDetail = await req(`/orders/${a.orderId}`, token);
check(
  'closed_by = ผู้อนุมัติ ไม่ใช่พนักงานที่กด',
  aDetail.json?.data?.closed_by === ownerId && aDetail.json?.data?.close_reason === 'voided_all',
  `closed_by=${aDetail.json?.data?.closed_by} reason=${aDetail.json?.data?.close_reason}`,
);

const aTable = await findTable(tableA);
check(
  'โต๊ะ A กลับเป็นว่างหลังยกเลิกบิล',
  aTable?.status === 'available' && !aTable?.open_order_id,
  `status=${aTable?.status} open_order_id=${aTable?.open_order_id}`,
);

console.log('\n=== 2. กันจองโต๊ะซ้อน (double booking) ===');
const aReopen = await openOrder(tableA);
check('เปิดบิลใหม่บนโต๊ะที่เพิ่งคืนได้', okStatus(aReopen.res.status), `status=${aReopen.res.status}`);
const doubleBook = await req('/orders', token, 'POST', {
  orderId: crypto.randomUUID(),
  tableId: tableA,
});
check('เปิดบิลซ้อนโต๊ะเดิม → 409', doubleBook.status === 409, `status=${doubleBook.status} msg=${doubleBook.json?.message}`);
const aEmptyCancel = await req(`/orders/${aReopen.orderId}/cancel`, token, 'POST', {
  reason: 'เปิดผิดโต๊ะ',
  approverPin: PIN,
});
check(
  'ยกเลิกบิลว่าง → close_reason = empty',
  okStatus(aEmptyCancel.status) &&
    aEmptyCancel.json?.data?.closeReason === 'empty' &&
    aEmptyCancel.json?.data?.voidedCount === 0,
  `status=${aEmptyCancel.status} reason=${aEmptyCancel.json?.data?.closeReason}`,
);

console.log('\n=== 3. บิลที่มีรายการเสิร์ฟแล้ว ยกเลิกทั้งบิลไม่ได้ ===');
const b = await openOrder(tableB);
const bItems = await addItems(b.orderId, 1);
await advanceToServed(bItems.ids[0]);
const bCancel = await req(`/orders/${b.orderId}/cancel`, token, 'POST', {
  reason: 'พยายามยกเลิกทั้งที่เสิร์ฟแล้ว',
  approverPin: PIN,
});
check(
  'cancel บิลที่มีรายการ served → 409 ORDER_HAS_SERVED_ITEMS',
  bCancel.status === 409 && bCancel.json?.code === 'ORDER_HAS_SERVED_ITEMS',
  `status=${bCancel.status} code=${bCancel.json?.code}`,
);

console.log('\n=== 4. ทางออกบิลค้าง: walkout ต้องมีหมายเหตุ ===');
const walkoutNoNote = await req(`/orders/${b.orderId}/close-unpaid`, token, 'POST', {
  closeReason: 'walkout',
  approverPin: PIN,
});
check('walkout ที่มีรายการแต่ไม่ส่ง note → 400', walkoutNoNote.status === 400, `status=${walkoutNoNote.status}`);

const walkout = await req(`/orders/${b.orderId}/close-unpaid`, token, 'POST', {
  closeReason: 'walkout',
  note: 'ลูกค้าออกไปโดยไม่จ่ายเงิน',
  approverPin: PIN,
});
check('walkout พร้อม note สำเร็จ', okStatus(walkout.status), `status=${walkout.status} msg=${walkout.json?.message}`);
const bDetail = await req(`/orders/${b.orderId}`, token);
check(
  'walkout เก็บ close_note + closed_by = ผู้อนุมัติ',
  bDetail.json?.data?.close_reason === 'walkout' &&
    bDetail.json?.data?.close_note === 'ลูกค้าออกไปโดยไม่จ่ายเงิน' &&
    bDetail.json?.data?.closed_by === ownerId,
  `reason=${bDetail.json?.data?.close_reason} note=${bDetail.json?.data?.close_note}`,
);
const bTable = await findTable(tableB);
check('โต๊ะ B กลับเป็นว่างหลัง walkout', bTable?.status === 'available', `status=${bTable?.status}`);

const voidAfterClose = await req('/orders/items/void', token, 'POST', {
  orderItemIds: [bItems.ids[0]],
  reason: 'พยายาม void หลังปิดบิล',
  approverPin: PIN,
});
check('void รายการของบิลปิดแล้ว → 409', voidAfterClose.status === 409, `status=${voidAfterClose.status} msg=${voidAfterClose.json?.message}`);

console.log('\n=== 5. ปิดบิลขณะมี payment attempt ค้าง → 409 ===');
const c = await openOrder(tableC);
const cItems = await addItems(c.orderId, 1);
await advanceToServed(cItems.ids[0]);
const attempt = await req('/payments/attempts', token, 'POST', {
  orderIds: [c.orderId],
  paymentMethod: 'cash',
});
const attemptId = attempt.json?.data?.payment_attempt_id ?? attempt.json?.data?.paymentAttemptId ?? attempt.json?.data?.attemptId;
check('สร้าง payment attempt ได้', okStatus(attempt.status) && Boolean(attemptId), `status=${attempt.status} id=${attemptId}`);

const cancelWithAttempt = await req(`/orders/${c.orderId}/cancel`, token, 'POST', {
  reason: 'พยายามยกเลิกขณะจ่ายเงินค้าง',
  approverPin: PIN,
});
check(
  'cancel ขณะมี attempt เปิด → 409 PAYMENT_ATTEMPT_OPEN',
  cancelWithAttempt.status === 409 && cancelWithAttempt.json?.code === 'PAYMENT_ATTEMPT_OPEN',
  `status=${cancelWithAttempt.status} code=${cancelWithAttempt.json?.code}`,
);

if (attemptId) {
  await req(`/payments/attempts/${attemptId}/cancel`, token, 'POST', { reason: 'ทดสอบยกเลิกบิล' });
}
const closeAfterAttempt = await req(`/orders/${c.orderId}/close-unpaid`, token, 'POST', {
  closeReason: 'walkout',
  note: 'ลูกค้าหนีหลังยกเลิกการชำระ',
  approverPin: PIN,
});
check('ยกเลิก attempt แล้วปิดบิลได้', okStatus(closeAfterAttempt.status), `status=${closeAfterAttempt.status} msg=${closeAfterAttempt.json?.message}`);

console.log('\n=== 6. ซิงค์สถานะโต๊ะ (sync-status) ===');
const syncFree = await req(`/tables/${tableB}/sync-status`, token, 'POST');
check(
  'sync-status โต๊ะว่าง → available',
  okStatus(syncFree.status) && syncFree.json?.data?.status === 'available',
  `status=${syncFree.status} tableStatus=${syncFree.json?.data?.status}`,
);

const d = await openOrder(tableD);
await addItems(d.orderId, 1);
const syncOccupied = await req(`/tables/${tableD}/sync-status`, token, 'POST');
check(
  'sync-status โต๊ะมีบิลเปิด → occupied',
  okStatus(syncOccupied.status) && syncOccupied.json?.data?.status === 'occupied',
  `status=${syncOccupied.status} tableStatus=${syncOccupied.json?.data?.status}`,
);
const dCancel = await req(`/orders/${d.orderId}/cancel`, token, 'POST', {
  reason: 'เก็บโต๊ะทดสอบ',
  approverPin: PIN,
});
check('ยกเลิกบิลทดสอบโต๊ะ D สำเร็จ', okStatus(dCancel.status), `status=${dCancel.status}`);

console.log('\n=== 7. PIN ผิด 5 ครั้ง → ล็อก 5 นาที (ทำท้ายสุด) ===');
for (let i = 1; i <= 5; i++) {
  const attemptWrong = await req(`/orders/${d.orderId}/cancel`, token, 'POST', {
    reason: `เดา PIN ครั้งที่ ${i}`,
    approverPin: '999999',
  });
  const expected = i < 5 ? 403 : 429;
  check(`PIN ผิดครั้งที่ ${i} → ${expected}`, attemptWrong.status === expected, `status=${attemptWrong.status}`);
}
const lockedEvenCorrect = await req(`/orders/${d.orderId}/cancel`, token, 'POST', {
  reason: 'PIN ถูกแต่ถูกล็อก',
  approverPin: PIN,
});
check('ถูกล็อกแล้ว PIN ถูกก็ยังถูกปฏิเสธ → 429', lockedEvenCorrect.status === 429, `status=${lockedEvenCorrect.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n=== สรุป: ${results.length - failed.length}/${results.length} ผ่าน ===`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(' | '));
  process.exit(1);
}
console.log('ALL PASS');
