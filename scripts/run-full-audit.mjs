import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'https://khakhlong.vercel.app';
const TENANT_SLUG = 'test-b';
const USERNAME = 'Aoddy';
const PASSWORD = '123456';

const PAGES_TO_AUDIT = [
  { name: 'Store Finder (หน้าแรก)', url: `${BASE_URL}/`, requireAuth: false },
  { name: 'Login Page (หน้าเข้าสู่ระบบ)', url: `${BASE_URL}/${TENANT_SLUG}/login`, requireAuth: false },
  { name: 'Table Layout (ผังโต๊ะอาหาร)', url: `${BASE_URL}/${TENANT_SLUG}/tables`, requireAuth: true },
  { name: 'Main POS (ระบบสั่งอาหาร/หน้าร้าน)', url: `${BASE_URL}/${TENANT_SLUG}/mainpos`, requireAuth: true },
  { name: 'KDS (จอคิวครัว)', url: `${BASE_URL}/${TENANT_SLUG}/kds`, requireAuth: true },
  { name: 'Sales Report (รายงานยอดขาย)', url: `${BASE_URL}/${TENANT_SLUG}/sale-report`, requireAuth: true },
  { name: 'Menu Edit (จัดการเมนูอาหาร)', url: `${BASE_URL}/${TENANT_SLUG}/setting/menu`, requireAuth: true },
  { name: 'Shift Work (ระบบกะการทำงาน)', url: `${BASE_URL}/${TENANT_SLUG}/siftwork`, requireAuth: true },
];

async function runAudits() {
  console.log('🚀 เริ่มต้นการทดสอบ Lighthouse อัตโนมัติบน Production...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  const results = [];

  // เริ่มต้น Lighthouse Flow
  const flow = await startFlow(page, {
    name: 'KhaKhlong POS Audit Flow',
  });

  // Step 1: หน้าที่ยังไม่ต้องล็อกอิน
  for (const item of PAGES_TO_AUDIT.filter(p => !p.requireAuth)) {
    console.log(`\n⏳ กำลังวัดผล: ${item.name} (${item.url})...`);
    await flow.navigate(item.url, { stepName: item.name });
  }

  // Step 2: ล็อกอินเข้าระบบ
  console.log('\n🔑 กำลังเข้าสู่ระบบด้วยบัญชี:', USERNAME, 'ที่ร้าน:', TENANT_SLUG);
  await page.goto(`${BASE_URL}/${TENANT_SLUG}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="username"]', { timeout: 10000 });
  await page.type('input[name="username"]', USERNAME);
  await page.type('input[name="password"]', PASSWORD);
  
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();

  await page.waitForFunction(
    slug => window.location.pathname.includes(`/${slug}/tables`),
    { timeout: 15000 },
    TENANT_SLUG
  );
  console.log('✅ เข้าสู่ระบบสำเร็จ!');

  // รอให้ session และ store โหลดสมบูรณ์ 2 วินาที
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: วัดผลหน้าที่ต้องล็อกอิน
  for (const item of PAGES_TO_AUDIT.filter(p => p.requireAuth)) {
    console.log(`\n⏳ กำลังวัดผล: ${item.name} (${item.url})...`);
    await flow.navigate(item.url, { stepName: item.name });
    // รอให้ component และ api ภายในเสร็จ
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n📊 กำลังประมวลผลข้อมูลรายงานสรุป...');
  const flowResult = await flow.createFlowResult();

  for (const step of flowResult.steps) {
    const lhr = step.lhr;
    const cats = lhr.categories;
    const audits = lhr.audits;

    const perf = Math.round((cats.performance?.score || 0) * 100);
    const a11y = Math.round((cats.accessibility?.score || 0) * 100);
    const bp = Math.round((cats['best-practices']?.score || 0) * 100);
    const seo = Math.round((cats.seo?.score || 0) * 100);

    const fcp = audits['first-contentful-paint']?.displayValue || '-';
    const lcp = audits['largest-contentful-paint']?.displayValue || '-';
    const tbt = audits['total-blocking-time']?.displayValue || '-';
    const cls = audits['cumulative-layout-shift']?.displayValue || '-';
    const speedIndex = audits['speed-index']?.displayValue || '-';

    // ดึงจุดที่ปรับปรุงได้ (Opportunities / Diagnostic issues)
    const topOpportunities = [];
    for (const key of ['render-blocking-resources', 'unused-javascript', 'unused-css-rules', 'modern-image-formats', 'total-byte-weight']) {
      const audit = audits[key];
      if (audit && audit.score !== null && audit.score < 0.9 && audit.displayValue) {
        topOpportunities.push({ title: audit.title, value: audit.displayValue });
      }
    }

    // Accessibility warnings
    const a11yIssues = [];
    for (const [id, a] of Object.entries(audits)) {
      if (cats.accessibility?.auditRefs?.some(ref => ref.id === id) && a.score === 0) {
        a11yIssues.push(a.title);
      }
    }

    results.push({
      name: step.name,
      url: lhr.finalDisplayedUrl || lhr.requestedUrl,
      scores: { perf, a11y, bp, seo },
      vitals: { fcp, lcp, tbt, cls, speedIndex },
      opportunities: topOpportunities,
      a11yIssues: a11yIssues.slice(0, 3)
    });
  }

  await browser.close();

  fs.writeFileSync('./scripts/audit-results.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('🎉 บันทึกผลลัพธ์เรียบร้อยที่ ./scripts/audit-results.json');
}

runAudits().catch(err => {
  console.error('❌ เกิดข้อผิดพลาดระหว่างรันการตรวจสอบ:', err);
  process.exit(1);
});

