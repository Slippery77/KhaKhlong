import type { DevicePrinterSettings } from '../types/printer.types';
import type { PaperSize } from '../../receipt/types/receipt.types';

export const DEFAULT_DEVICE_PRINTER_SETTINGS: DevicePrinterSettings = {
  paperSize: '80mm',
  autoPrint: false,
};

function getStorageKeys(tenantSlug?: string) {
  const prefix = tenantSlug ? `khakhlong_${tenantSlug}_printer` : 'khakhlong_printer';
  return {
    paperSize: `${prefix}_paper_size`,
    autoPrint: `${prefix}_auto_print`,
  };
}

export function getDevicePrinterSettings(tenantSlug?: string): DevicePrinterSettings {
  try {
    const keys = getStorageKeys(tenantSlug);
    const rawSize = localStorage.getItem(keys.paperSize);
    const paperSize: PaperSize = rawSize === '58mm' ? '58mm' : '80mm';
    const autoPrint = localStorage.getItem(keys.autoPrint) === 'true';

    return { paperSize, autoPrint };
  } catch {
    return DEFAULT_DEVICE_PRINTER_SETTINGS;
  }
}

export function saveDevicePrinterSettings(
  settings: Partial<DevicePrinterSettings>,
  tenantSlug?: string,
): void {
  try {
    const keys = getStorageKeys(tenantSlug);
    if (settings.paperSize) {
      localStorage.setItem(keys.paperSize, settings.paperSize);
    }
    if (typeof settings.autoPrint === 'boolean') {
      localStorage.setItem(keys.autoPrint, settings.autoPrint ? 'true' : 'false');
    }
  } catch {
    // Ignore storage quota or access errors in restricted environments
  }
}
