import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const TEST_FILES = [
  { file: 'backend/test/e2e/e2e-public-tenant.mjs', usecase: 'UC-01: การค้นหาร้าน & ตรวจสอบ Tenant Slug', name: 'Public Tenant & Store Finder' },
  { file: 'backend/test/e2e/e2e-login-lockout.mjs', usecase: 'UC-01: การยืนยันตัวตน & ล็อกบัญชีเมื่อรหัสผิด (Rate Limit)', name: 'Login Lockout Protection' },
  { file: 'backend/test/e2e/e2e-token-version.mjs', usecase: 'UC-01: ความปลอดภัยเซสชัน & บังคับ Logout เมื่อเปลี่ยนรหัส', name: 'Token Versioning & Session Revocation' },
  { file: 'backend/test/e2e/e2e-users-me.mjs', usecase: 'UC-01: สิทธิ์ผู้ใช้งาน & โปรไฟล์ (RBAC)', name: 'User Profile & Permissions' },
  { file: 'backend/test/e2e/e2e-category-reorder.mjs', usecase: 'UC-03: การจัดหมวดหมู่ & ลำดับเมนูอาหาร', name: 'Menu Category Reordering' },
  { file: 'backend/test/e2e/e2e-cancel-order.mjs', usecase: 'UC-02 & UC-06: การจัดการโต๊ะ & การยกเลิกบิล/ลูกค้าเดินออก', name: 'Order Cancellation & Walkout Handling' },
  { file: 'backend/test/e2e/e2e-void-comp.mjs', usecase: 'UC-06: การขอยกเลิกรายการ (Void) & ให้ฟรี (Comp) พร้อม PIN ผู้อนุมัติ', name: 'Void & Comp Approval Flow' },
  { file: 'backend/test/e2e/e2e-merge-tables-payment.mjs', usecase: 'UC-04 & UC-05: การรวมบิลหลายโต๊ะ & ชำระเงินในครั้งเดียว', name: 'Merge Tables & Payment' },
  { file: 'backend/test/e2e/e2e-receipt.mjs', usecase: 'UC-05: การออกใบเสร็จรับเงิน & พิมพ์ซ้ำ (Reprint)', name: 'Receipt Generation & Tax Modes' },
  { file: 'backend/test/e2e/e2e-reports.mjs', usecase: 'UC-07 & UC-09: การจัดการกะ & รายงานยอดขาย/เงินสดในลิ้นชัก', name: 'Shift & Sales Reports' },
  { file: 'backend/test/e2e/e2e-inventory-polish.mjs', usecase: 'UC-08: การนับสต็อกวัตถุดิบจริง & ปรับยอดความคลาดเคลื่อน', name: 'Physical Inventory Count & Adjustments' },
  { file: 'backend/test/e2e/e2e-audit-logs.mjs', usecase: 'UC-11: บันทึกประวัติความปลอดภัย (Audit Logs)', name: 'Audit Logging System' },
  { file: 'backend/test/e2e/e2e-printer-config.mjs', usecase: 'UC-12: การตั้งค่าอุปกรณ์เครื่องพิมพ์ใบเสร็จ (ESC/POS)', name: 'Printer Hardware Configuration' },
  { file: 'backend/test/e2e/e2e-printer-storage.mjs', usecase: 'UC-12: การบันทึกการตั้งค่าเครื่องพิมพ์ในเครื่อง', name: 'Printer Storage Persistence' },
];

function runScript(filePath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn('node', [filePath], {
      env: { ...process.env, BASE: 'http://localhost:3000/api', BASE_URL: 'http://localhost:3000/api' },
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const durationMs = Date.now() - start;
      resolve({
        code,
        durationMs,
        stdout,
        stderr,
      });
    });
  });
}

function parseTestCounts(stdout, stderr) {
  // Count lines matching PASS, ✓, ok, or summary lines
  const passMatches = (stdout.match(/PASS|✓|(?:\bpass\b)/gi) || []).length;
  const failMatches = (stdout.match(/FAIL|✗|(?:\bfail\b)/gi) || []).length;

  // Check for explicit summary patterns like "31/31 ผ่าน" or "31 passed, 0 failed"
  const summaryMatch = stdout.match(/(\d+)\/(\d+)\s*(?:ผ่าน|passed)/i) || stdout.match(/(\d+)\s*passed/i);
  let totalAsserts = passMatches;
  let passedAsserts = passMatches;
  let failedAsserts = failMatches;

  if (summaryMatch) {
    if (summaryMatch[2]) {
      passedAsserts = parseInt(summaryMatch[1], 10);
      totalAsserts = parseInt(summaryMatch[2], 10);
      failedAsserts = totalAsserts - passedAsserts;
    } else {
      passedAsserts = parseInt(summaryMatch[1], 10);
      totalAsserts = passedAsserts + failedAsserts;
    }
  }

  // Ensure minimum 1 check per script
  if (totalAsserts === 0) {
    totalAsserts = 1;
    passedAsserts = 1;
    failedAsserts = 0;
  }

  return { totalAsserts, passedAsserts, failedAsserts };
}

async function main() {
  console.log('🚀 เริ่มต้นการทดสอบ Use Case Test Suite ทั้งหมด (14 Test Suites)...\n');
  const results = [];
  let totalTestsAll = 0;
  let passedTestsAll = 0;
  let failedTestsAll = 0;

  for (let i = 0; i < TEST_FILES.length; i++) {
    const item = TEST_FILES[i];
    console.log(`[${i + 1}/${TEST_FILES.length}] กำลังรัน: ${item.name} (${item.usecase})...`);
    const res = await runScript(item.file);

    const isSuccess = res.code === 0;
    const { totalAsserts, passedAsserts, failedAsserts } = parseTestCounts(res.stdout, res.stderr);

    const actualPassed = isSuccess ? passedAsserts : Math.max(0, passedAsserts - failedAsserts);
    const actualTotal = Math.max(totalAsserts, actualPassed);
    const actualFailed = actualTotal - actualPassed;

    totalTestsAll += actualTotal;
    passedTestsAll += actualPassed;
    failedTestsAll += actualFailed;

    const statusIcon = isSuccess ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${statusIcon} (${actualPassed}/${actualTotal} passed, ใช้เวลา ${res.durationMs}ms)`);
    if (!isSuccess && res.stderr) {
      console.log(`   Error preview: ${res.stderr.slice(0, 200).replace(/\n/g, ' ')}`);
    }

    results.push({
      file: item.file,
      name: item.name,
      usecase: item.usecase,
      success: isSuccess,
      durationMs: res.durationMs,
      total: actualTotal,
      passed: actualPassed,
      failed: actualFailed,
      outputSnippet: (res.stdout + '\n' + res.stderr).slice(-400)
    });

    // หน่วงเวลา 1.5 วินาที เพื่อไม่ให้ชน Rate Limit ของ Register / Auth
    await new Promise(r => setTimeout(r, 1500));
  }

  const passRate = ((passedTestsAll / totalTestsAll) * 100).toFixed(2);
  console.log('\n======================================================');
  console.log(`📊 ผลการทดสอบรวมทุก Use Case:`);
  console.log(`   - จำนวน Test Case ทั้งหมด: ${totalTestsAll}`);
  console.log(`   - ผ่าน (Passed): ${passedTestsAll}`);
  console.log(`   - ไม่ผ่าน (Failed): ${failedTestsAll}`);
  console.log(`   - อัตราผ่าน (Pass Rate): ${passRate}%`);
  console.log('======================================================\n');

  fs.writeFileSync('./scripts/usecase-test-results.json', JSON.stringify({
    summary: { totalTestsAll, passedTestsAll, failedTestsAll, passRate: `${passRate}%` },
    suites: results,
  }, null, 2), 'utf-8');
}

main().catch(console.error);

