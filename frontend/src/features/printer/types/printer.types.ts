import type { PaperSize } from '../../receipt/types/receipt.types';

export interface DevicePrinterSettings {
  paperSize: PaperSize;
  autoPrint: boolean;
}

export interface StoreReceiptSettings {
  maxReprints: number;
  receiptFooter: string;
  showTaxId: boolean;
  showCashier: boolean;
  showAddress: boolean;
}

export interface PrinterSettingsForm extends DevicePrinterSettings, StoreReceiptSettings {}

