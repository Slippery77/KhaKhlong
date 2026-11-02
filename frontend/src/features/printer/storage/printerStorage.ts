import type { DevicePrinterSettings } from '../types/printer.types';
import type { PaperSize } from '../../receipt/types/receipt.types';

export const DEFAULT_DEVICE_PRINTER_SETTINGS: DevicePrinterSettings = {
  paperSize: '80mm',
};

function getStorageKeys(tenantSlug?: string) {
  const prefix = tenantSlug ? `khakhlong_${tenantSlug}_printer` : 'khakhlong_printer';
  return {
    paperSize: `${prefix}_paper_size`,
  };
}

/**
 * อ่านการตั้งค่าฮาร์ดแวร์เครื่องพิมพ์ประจำเครื่อง (Pure Query — ไม่มี side effect ใดๆ)
 */
export function getDevicePrinterSettings(tenantSlug?: string): DevicePrinterSettings {
  try {
    const keys = getStorageKeys(tenantSlug);
    const rawSize = localStorage.getItem(keys.paperSize);
    const paperSize: PaperSize = rawSize === '58mm' ? '58mm' : '80mm';

    return { paperSize };
  } catch {
    return DEFAULT_DEVICE_PRINTER_SETTINGS;
  }
}

/**
 * บันทึกการตั้งค่าฮาร์ดแวร์เครื่องพิมพ์ลง LocalStorage
 */
export function saveDevicePrinterSettings(
  settings: Partial<DevicePrinterSettings>,
  tenantSlug?: string,
): void {
  try {
    const keys = getStorageKeys(tenantSlug);
    if (settings.paperSize) {
      localStorage.setItem(keys.paperSize, settings.paperSize);
    }
  } catch {
    // ป้องกันข้อผิดพลาดกรณี storage quota เต็มหรือติดข้อจำกัดด้านความปลอดภัย
  }
}

/**
 * ทำความสะอาดคีย์ auto_print เก่าทุก tenant ที่อาจค้างอยู่ใน LocalStorage
 * แยกการทำงานออกจาก getter ตามหลัก Command-Query Separation (CQS)
 */
export function cleanupDeprecatedPrinterSettings(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key === 'khakhlong_printer_auto_print' || key.endsWith('_printer_auto_print'))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ปลอดภัยต่อ restricted environment (private browsing, sandboxed iframe)
  }
}

// ล้างคีย์เก่าอัตโนมัติครั้งเดียวตอนโหลดโมดูล
cleanupDeprecatedPrinterSettings();
