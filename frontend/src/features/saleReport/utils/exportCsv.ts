import type { SaleTransaction } from '../types/sales.types';

/**
 * ส่งออกตารางรายการธุรกรรมเป็นไฟล์ CSV (UTF-8 with BOM สำหรับเปิดใน Excel ได้ภาษาไทยไม่เพี้ยน)
 */
export function exportTransactionsToCsv(
  transactions: SaleTransaction[],
  filenamePrefix: string = 'kha-khlong-transactions'
): void {
  if (!transactions || transactions.length === 0) {
    alert('ไม่มีข้อมูลรายการสำหรับส่งออก');
    return;
  }

  // Header ภาษาไทย
  const headers = [
    'วันที่',
    'เวลา',
    'ประเภท',
    'เลขที่บิล/รายละเอียด',
    'โต๊ะ',
    'ยอดเงินสด (บาท)',
    'ยอดเงินโอน (บาท)',
    'ยอดสุทธิ (บาท)',
    'ผู้ทำรายการ',
    'วิธีการชำระ',
  ];

  const escapeCsv = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map((tx) => [
    escapeCsv(tx.date || '-'),
    escapeCsv(tx.time || '-'),
    escapeCsv(
      tx.type === 'SALE'
        ? 'การขาย'
        : tx.type === 'CASH_IN'
        ? 'นำเงินเข้า'
        : tx.type === 'CASH_OUT'
        ? 'นำเงินออก'
        : tx.type
    ),
    escapeCsv(tx.description || (tx.billNumber ? `บิล #${tx.billNumber}` : '-')),
    escapeCsv(tx.table || '-'),
    escapeCsv(Number(tx.cashAmount || 0).toFixed(2)),
    escapeCsv(Number(tx.transferAmount || 0).toFixed(2)),
    escapeCsv(tx.total !== undefined ? Number(tx.total).toFixed(2) : (Number(tx.cashAmount || 0) + Number(tx.transferAmount || 0)).toFixed(2)),
    escapeCsv(tx.performedBy || '-'),
    escapeCsv(
      tx.paymentMethod === 'CASH'
        ? 'เงินสด'
        : tx.paymentMethod === 'TRANSFER'
        ? 'เงินโอน/QR'
        : '-'
    ),
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\r\n');

  // UTF-8 BOM \uFEFF
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const today = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}-${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

