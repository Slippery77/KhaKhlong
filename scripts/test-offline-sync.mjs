import fs from 'fs';

const BASE_URL = 'http://localhost:3000/api';
const TENANT_SLUG = 'test-b';
const USERNAME = 'Aoddy';
const PASSWORD = '123456';
const OWNER_PIN = '422163';

async function req(path, token, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runSyncSimulation(totalCycles = 30) {
  console.log(`\n======================================================`);
  console.log(`📡 เริ่มต้นทดสอบ "อัตราความสำเร็จของการซิงค์ข้อมูลหลังออฟไลน์" (PWA Outbox Sync)`);
  console.log(`   จำลองคำสั่งสั่งอาหารสะสมตอนออฟไลน์: ${totalCycles} บิล (${totalCycles * 3} transactions)`);
  console.log(`======================================================\n`);

  // 1. เข้าสู่ระบบ
  console.log('1. เข้าสู่ระบบรับ Access Token...');
  const loginRes = await req('/auth/login', null, 'POST', {
    tenantSlug: TENANT_SLUG,
    username: USERNAME,
    password: PASSWORD,
  });

  if (!loginRes.ok) {
    console.error('❌ Login ไม่สำเร็จ:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.accessToken;
  console.log('   ✓ Login สำเร็จ');

  // 2. ดึงข้อมูลโต๊ะและเมนู
  console.log('2. ดึงข้อมูลโต๊ะและเมนูอาหาร...');
  const tablesRes = await req('/tables', token);
  const menuRes = await req('/menu/full', token);

  const tables = tablesRes.data?.data || [];
  const categories = menuRes.data?.data?.categories || [];
  const sampleMenu = categories[0]?.items?.[0];

  if (tables.length === 0 || !sampleMenu) {
    console.error('❌ ไม่พบโต๊ะหรือเมนู');
    process.exit(1);
  }

  const table = tables[0];
  console.log(`   ✓ ใช้โต๊ะ: โต๊ะ ${table.table_number}`);
  console.log(`   ✓ เมนูทดสอบ: ${sampleMenu.name} (ID: ${sampleMenu.menu_item_id})`);

  // เคลียร์โต๊ะถ้ามีบิลค้างอยู่
  if (table.open_order_id) {
    await req(`/orders/${table.open_order_id}/cancel`, token, 'POST', {
      approverPin: OWNER_PIN,
      reason: 'เคลียร์ก่อนเริ่มเทส',
    });
  }

  // 3. จำลองการสร้าง Offline Outbox Queue ในเครื่อง
  console.log(`\n3. [โหมดออฟไลน์] จำลองการสะสมคำสั่ง Outbox ใน IndexedDB (${totalCycles} รอบ)...`);
  const queue = [];

  for (let i = 1; i <= totalCycles; i++) {
    const orderId = crypto.randomUUID();
    const kitchenTicketId = crypto.randomUUID();
    const orderItemId = crypto.randomUUID();

    // Outbox #1: เปิดบิล (createOrder)
    queue.push({
      cycle: i,
      seq: queue.length + 1,
      step: 'createOrder',
      name: `เปิดบิล #${i}`,
      endpoint: '/orders',
      payload: {
        orderId,
        tableId: table.table_id,
      },
    });

    // Outbox #2: ส่งรายการอาหารเข้าครัว (addItems)
    queue.push({
      cycle: i,
      seq: queue.length + 1,
      step: 'addItems',
      name: `สั่งอาหารเข้าครัว #${i}`,
      endpoint: `/orders/${orderId}/items`,
      payload: {
        kitchenTicketId,
        items: [
          {
            orderItemId,
            menuItemId: sampleMenu.menu_item_id,
            specialRequest: `Offline Sync Item #${i}`,
          },
        ],
      },
    });

    // Outbox #3: เคลียร์บิลเพื่อคืนสถานะโต๊ะสำหรับรอบถัดไป
    queue.push({
      cycle: i,
      seq: queue.length + 1,
      step: 'cancelOrder',
      name: `เคลียร์โต๊ะ #${i}`,
      endpoint: `/orders/${orderId}/cancel`,
      payload: {
        approverPin: OWNER_PIN,
        reason: 'Sync cycle complete',
      },
    });
  }

  console.log(`   ✓ สร้างคิว Outbox ทั้งหมด: ${queue.length} รายการ`);

  // 4. จำลองต่อสัญญาณอินเทอร์เน็ต (Go Online) และ Flush ทันที
  console.log(`\n4. [ต่ออินเทอร์เน็ตกลับ] เริ่มต้น Flush Outbox ซิงค์ข้อมูลขึ้นเซิร์ฟเวอร์...`);
  const syncStart = Date.now();
  let successCount = 0;
  let failedCount = 0;
  const syncLogs = [];

  for (const item of queue) {
    const t0 = Date.now();
    try {
      const res = await req(item.endpoint, token, 'POST', item.payload);
      const latency = Date.now() - t0;

      if (res.status === 200 || res.status === 201) {
        successCount++;
        syncLogs.push({ seq: item.seq, step: item.step, name: item.name, status: 'synced', latency });
      } else {
        failedCount++;
        syncLogs.push({ seq: item.seq, step: item.step, name: item.name, status: 'failed', code: res.status, error: res.data });
        console.warn(`   ⚠️ ล้มเหลวที่ [${item.name}]: status=${res.status}`, JSON.stringify(res.data));
      }
    } catch (e) {
      failedCount++;
      syncLogs.push({ seq: item.seq, step: item.step, name: item.name, status: 'error', error: e.message });
    }
  }

  const durationMs = Date.now() - syncStart;
  const successRate = ((successCount / queue.length) * 100).toFixed(2);
  const avgLatency = (durationMs / queue.length).toFixed(1);

  console.log(`\n======================================================`);
  console.log(`📊 ผลการทดสอบอัตราการซิงค์ข้อมูลจริง (Offline Data Sync):`);
  console.log(`   - จำนวนคำสั่ง Outbox ทั้งหมด: ${queue.length} รายการ`);
  console.log(`   - ซิงค์สำเร็จขึ้นฐานข้อมูลจริง: ${successCount} รายการ`);
  console.log(`   - ซิงค์ล้มเหลว: ${failedCount} รายการ`);
  console.log(`   - อัตราความสำเร็จ (Sync Success Rate): ${successRate}%`);
  console.log(`   - เวลารวมในการซิงค์: ${durationMs} ms (เฉลี่ย ${avgLatency} ms/รายการ)`);
  console.log('======================================================\n');

  fs.writeFileSync('./scripts/sync-test-results.json', JSON.stringify({
    summary: {
      totalCycles,
      totalMutations: queue.length,
      synced: successCount,
      failed: failedCount,
      successRate: `${successRate}%`,
      durationMs,
      avgLatencyMs: avgLatency,
    },
    logs: syncLogs,
  }, null, 2), 'utf-8');
}

runSyncSimulation(30).catch(console.error);
