import type { DevicePrinterSettings } from '../types/printer.types';
import type { PaperSize } from '../../receipt/types/receipt.types';

const STORAGE_KEY_PAPER_SIZE = 'khakhlong_printer_paper_size';
const STORAGE_KEY_AUTO_PRINT = 'khakhlong_printer_auto_print';

export const DEFAULT_DEVICE_PRINTER_SETTINGS: DevicePrinterSettings = {
  paperSize: '80mm',
  autoPrint: false,
};

export function getDevicePrinterSettings(): DevicePrinterSettings {
  try {
    const rawSize = localStorage.getItem(STORAGE_KEY_PAPER_SIZE);
    const paperSize: PaperSize = rawSize === '58mm' ? '58mm' : '80mm';
    const autoPrint = localStorage.getItem(STORAGE_KEY_AUTO_PRINT) === 'true';

    return { paperSize, autoPrint };
  } catch {
    return DEFAULT_DEVICE_PRINTER_SETTINGS;
  }
}

export function saveDevicePrinterSettings(settings: Partial<DevicePrinterSettings>): void {
  try {
    if (settings.paperSize) {
      localStorage.setItem(STORAGE_KEY_PAPER_SIZE, settings.paperSize);
    }
    if (typeof settings.autoPrint === 'boolean') {
      localStorage.setItem(STORAGE_KEY_AUTO_PRINT, settings.autoPrint ? 'true' : 'false');
    }
  } catch {
    // Ignore storage quota or access errors in restricted environments
  }
}
