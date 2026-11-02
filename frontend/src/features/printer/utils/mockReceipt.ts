import type { ReceiptData } from '../../receipt/types/receipt.types';

export function createMockReceipt(storeName = 'ค้าคล่อง คาเฟ่ & บิสโทร'): ReceiptData {
  const now = new Date().toISOString();
  return {
    paymentId: 'mock-test-payment-id',
    paymentAttemptId: 'mock-test-attempt-id',
    receiptNumber: 'RCP-20261101-0001',
    businessDate: '2026-11-01',
    paidAt: now,
    subtotal: 155.0,
    vatAmount: 10.85,
    serviceChargeAmount: 0.0,
    totalAmount: 155.0,
    vatMode: 'inclusive',
    vatRate: 7,
    serviceChargeRate: 0,
    roundingAdjustment: 0.0,
    paymentMethod: 'cash',
    cashReceived: 200.0,
    changeAmount: 45.0,
    cashier: 'พนักงานทดสอบ',
    store: {
      name: storeName,
      phone: '081-234-5678',
      taxId: '0105559123456',
      address: '99/1 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    },
    tables: [
      {
        orderNumber: 1,
        tableNumber: '02',
      },
    ],
    lines: [
      {
        name: 'ข้าวกะเพราหมูกรอบ',
        modifiers: 'ไข่ดาวไม่สุก, เผ็ดมาก',
        unitPrice: 85.0,
        qty: 1,
        lineTotal: 85.0,
        isComped: false,
      },
      {
        name: 'ชาไทยเย็น',
        modifiers: 'หวานน้อย 50%',
        unitPrice: 70.0,
        qty: 1,
        lineTotal: 70.0,
        isComped: false,
      },
    ],
    footer: 'ขอบคุณที่ใช้บริการ\nโปรดตรวจสอบรายการก่อนออกจากร้าน',
    showTaxId: true,
    showCashier: true,
    showAddress: true,
  };
}

