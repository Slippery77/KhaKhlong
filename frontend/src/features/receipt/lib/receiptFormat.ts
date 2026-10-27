/** ตัวช่วยจัดรูปแบบบนใบเสร็จ — แสดงผลเท่านั้น ไม่คำนวณยอดเงินใหม่ */

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** 1,250.5 → "1,250.50" */
export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * เวลาบนใบเสร็จใช้เวลาไทย (Asia/Bangkok) และปีพุทธศักราช
 * 26/10/2569 14:32
 */
export function formatThaiDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = Number(pick('year')) + 543;
  return `${pick('day')}/${pick('month')}/${year} ${pick('hour')}:${pick('minute')}`;
}

/** 26/10/2569 */
export function formatThaiDate(iso: string | null | undefined): string {
  return formatThaiDateTime(iso).split(' ')[0] ?? '—';
}

/** 26 ต.ค. 2569 */
export function formatThaiDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const month = THAI_MONTHS[Number(pick('month')) - 1] ?? '';
  return `${Number(pick('day'))} ${month} ${Number(pick('year')) + 543}`;
}

/** 'cash' → 'เงินสด', 'qr_code' → 'พร้อมเพย์ (QR)' */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (method === 'cash') return 'เงินสด';
  if (method === 'qr_code') return 'พร้อมเพย์ (QR)';
  return method || '—';
}

/** ป้ายกำกับ VAT ตามโหมดที่ร้านตั้งไว้ (ไม่คำนวณใหม่) */
export function vatLabel(vatMode: string, vatRate: number): string {
  if (vatMode === 'inclusive') return `VAT ${vatRate}% (รวมในราคา)`;
  if (vatMode === 'exclusive') return `VAT ${vatRate}%`;
  return 'VAT';
}

/** ชื่อเอกสาร: ร้านที่จด VAT ต้องออกใบกำกับภาษีอย่างย่อ */
export function receiptDocTitle(vatMode: string): string {
  return vatMode === 'none' ? 'ใบเสร็จรับเงิน' : 'ใบกำกับภาษีอย่างย่อ';
}

/** แยกสตริง modifier "เผ็ดน้อย, เพิ่มไข่ดาว" เป็นรายบรรทัด */
export function splitModifiers(modifiers: string | null | undefined): string[] {
  if (!modifiers) return [];
  return modifiers
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
