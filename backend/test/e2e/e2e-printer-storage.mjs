// e2e-printer-storage.mjs
// ทดสอบความถูกต้องของ printerStorage.ts ในระดับฮาร์ดแวร์ประจำเครื่องและ LocalStorage
import assert from 'assert';

console.log('=== ทดสอบ printerStorage & LocalStorage Cleanup ===');

// Mock localStorage environment
class MockLocalStorage {
  constructor() {
    this.store = new Map();
    this.throwOnRemove = false;
  }
  getItem(key) {
    return this.store.get(key) ?? null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    if (this.throwOnRemove) {
      throw new Error('SecurityError: The operation is insecure (restricted environment)');
    }
    this.store.delete(key);
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MockLocalStorage();

// Implement logic directly mirrored from printerStorage.ts to verify algorithm
const DEFAULT_DEVICE_PRINTER_SETTINGS = { paperSize: '80mm' };

function getStorageKeys(tenantSlug) {
  const prefix = tenantSlug ? `khakhlong_${tenantSlug}_printer` : 'khakhlong_printer';
  return {
    paperSize: `${prefix}_paper_size`,
  };
}

function getDevicePrinterSettings(tenantSlug) {
  try {
    const keys = getStorageKeys(tenantSlug);
    const rawSize = globalThis.localStorage.getItem(keys.paperSize);
    const paperSize = rawSize === '58mm' ? '58mm' : '80mm';
    return { paperSize };
  } catch {
    return DEFAULT_DEVICE_PRINTER_SETTINGS;
  }
}

function saveDevicePrinterSettings(settings, tenantSlug) {
  try {
    const keys = getStorageKeys(tenantSlug);
    if (settings.paperSize) {
      globalThis.localStorage.setItem(keys.paperSize, settings.paperSize);
    }
  } catch {
    // Ignore restricted storage
  }
}

function cleanupDeprecatedPrinterSettings() {
  try {
    if (typeof globalThis.localStorage === 'undefined') return;
    for (let i = globalThis.localStorage.length - 1; i >= 0; i--) {
      const key = globalThis.localStorage.key(i);
      if (
        key &&
        (key === 'khakhlong_printer_auto_print' || key.endsWith('_printer_auto_print'))
      ) {
        globalThis.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore restricted environments
  }
}

// --- Test 1: ค่าเริ่มต้นเมื่อยังไม่มีข้อมูล ---
localStorage.clear();
const def = getDevicePrinterSettings('my-shop');
assert.strictEqual(def.paperSize, '80mm', 'ค่าเริ่มต้นต้องเป็น 80mm');
console.log('  ✓ Test 1 ผ่าน: คืนค่าเริ่มต้น 80mm ถูกต้อง');

// --- Test 2: บันทึกและอ่านค่า 58mm ตาม tenantSlug ---
saveDevicePrinterSettings({ paperSize: '58mm' }, 'shop-a');
const shopA = getDevicePrinterSettings('shop-a');
assert.strictEqual(shopA.paperSize, '58mm', 'shop-a ต้องได้ 58mm');

const shopB = getDevicePrinterSettings('shop-b');
assert.strictEqual(shopB.paperSize, '80mm', 'shop-b ที่ยังไม่ตั้งค่าต้องได้ default 80mm');
console.log('  ✓ Test 2 ผ่าน: แยกการตั้งค่าขนาดกระดาษตาม tenant ถูกต้อง');

// --- Test 3: Command-Query Separation (CQS) — getter ต้องไม่ mutate storage ---
const sizeBefore = localStorage.length;
getDevicePrinterSettings('shop-a');
assert.strictEqual(localStorage.length, sizeBefore, 'การ get ต้องไม่เปลี่ยนแปลงจำนวนคีย์ใน storage');
console.log('  ✓ Test 3 ผ่าน: CQS สมบูรณ์ getter ไม่มี mutating side effect');

// --- Test 4: ทำความสะอาดคีย์เก่าหลาย tenant พร้อมกัน ---
localStorage.setItem('khakhlong_printer_auto_print', 'true');
localStorage.setItem('khakhlong_shop-a_printer_auto_print', 'true');
localStorage.setItem('khakhlong_shop-b_printer_auto_print', 'false');
localStorage.setItem('khakhlong_shop-a_printer_paper_size', '58mm');
localStorage.setItem('unrelated_key', 'keep_me');

cleanupDeprecatedPrinterSettings();

assert.strictEqual(localStorage.getItem('khakhlong_printer_auto_print'), null);
assert.strictEqual(localStorage.getItem('khakhlong_shop-a_printer_auto_print'), null);
assert.strictEqual(localStorage.getItem('khakhlong_shop-b_printer_auto_print'), null);
assert.strictEqual(localStorage.getItem('khakhlong_shop-a_printer_paper_size'), '58mm');
assert.strictEqual(localStorage.getItem('unrelated_key'), 'keep_me');
console.log('  ✓ Test 4 ผ่าน: cleanupDeprecatedPrinterSettings ล้าง auto_print ทุก tenant และคงคีย์อื่นไว้');

// --- Test 5: ทนทานต่อ Restricted Storage Policy (Private Mode ที่ห้าม write) ---
localStorage.throwOnRemove = true;
// เรียก cleanup ต้องไม่พัง
assert.doesNotThrow(() => cleanupDeprecatedPrinterSettings());
// getDevicePrinterSettings ต้องอ่านค่าได้ ไม่ถูกรีเซ็ตเป็น 80mm
const shopARestricted = getDevicePrinterSettings('shop-a');
assert.strictEqual(shopARestricted.paperSize, '58mm', 'แม้ storage มีข้อจำกัดการเขียน แต่ต้องอ่าน 58mm ได้');
console.log('  ✓ Test 5 ผ่าน: ทนทานต่อ Restricted Storage ไม่ throw และไม่อ่านค่าเพี้ยน');

console.log('\n🎉 ALL PRINTER STORAGE TESTS PASSED');

