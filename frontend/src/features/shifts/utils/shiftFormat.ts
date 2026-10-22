import type { ShiftStatus } from '../types/shift.types';

const moneyFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1,500.5 → "฿1,500.50" */
export const formatMoney = (value: number) => `฿${moneyFormatter.format(value)}`;

/** "2026-10-22" → "22 ตุลาคม 2569" (ไม่ผ่าน Date ของ UTC เพื่อกันวันเพี้ยน) */
export const formatBusinessDate = (businessDate: string) => {
  const [year, month, day] = businessDate.split('-').map(Number);
  if (!year || !month || !day) return businessDate;
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/** ISO timestamp → "09:05" */
export const formatTime = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
  open: 'เปิดกะอยู่',
  closed_auto: 'ปิดกะแล้ว · ยอดตรง',
  pending_verification: 'รอผู้จัดการตรวจสอบ',
  verified: 'ปิดกะและรับรองแล้ว',
  escalated: 'ส่งต่อให้เจ้าของร้าน',
};

export type VarianceTone = 'success' | 'danger' | 'warning';

/** ผลต่าง: ลบ = ขาด, บวก = เกิน, 0 = ตรงกัน */
export const describeVariance = (variance: number | null) => {
  if (variance === null) return null;
  if (variance === 0) return { label: 'ตรงกัน', tone: 'success' as VarianceTone };
  const amount = formatMoney(Math.abs(variance));
  return variance < 0
    ? { label: `ขาด ${amount}`, tone: 'danger' as VarianceTone }
    : { label: `เกิน ${amount}`, tone: 'warning' as VarianceTone };
};
