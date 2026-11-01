/**
 * ข้อมูลใบเสร็จจาก GET /api/payments/:paymentId/receipt
 * ทุกยอดเงินเป็นค่าที่เซิร์ฟเวอร์คำนวณแล้ว (DB trigger) — client ห้ามคำนวณซ้ำ
 */
export type PaperSize = '80mm' | '58mm';

export interface ReceiptStore {
  name: string;
  phone: string | null;
  /** null เมื่อร้านไม่เปิด VAT (ไม่ต้องแสดงเลขผู้เสียภาษี) */
  taxId: string | null;
  address: string;
}

export interface ReceiptTable {
  /** เลขบิลในร้าน (int ใน DB) */
  orderNumber: number | string;
  tableNumber: string;
}

export interface ReceiptLine {
  name: string;
  /** ชื่อ modifier คั่นด้วย ", " (สตริงว่างเมื่อไม่มี) */
  modifiers: string | null;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  isComped: boolean;
}

export interface ReceiptData {
  paymentId: string;
  paymentAttemptId: string;
  receiptNumber: string;
  businessDate: string;
  paidAt: string;
  subtotal: number;
  vatAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  /** 'none' | 'inclusive' | 'exclusive' */
  vatMode: string;
  /** อัตรา snapshot ตอนปิดบิล — ใช้แสดงป้ายกำกับเท่านั้น */
  vatRate: number;
  serviceChargeRate: number;
  roundingAdjustment: number;
  paymentMethod: string;
  cashReceived: number | null;
  changeAmount: number | null;
  cashier: string;
  store: ReceiptStore;
  tables: ReceiptTable[];
  lines: ReceiptLine[];
  footer?: string | null;
  showTaxId?: boolean;
  showCashier?: boolean;
  showAddress?: boolean;
}

export interface ReceiptPrintResult {
  printCount: number;
  isCopy: boolean;
}
