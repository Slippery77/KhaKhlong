import { CheckCircle2 } from 'lucide-react';
import type { Shift } from '../types/shift.types';
import {
  describeVariance,
  formatBusinessDate,
  formatMoney,
  formatTime,
} from '../utils/shiftFormat';

interface ShiftClosedCardProps {
  shift: Shift;
}

export default function ShiftClosedCard({ shift }: ShiftClosedCardProps) {
  const isVerified = shift.status === 'verified';
  const variance = describeVariance(shift.variance);

  return (
    <section className="rounded-2xl border border-[#A9C9A0] bg-white p-6 shadow-[0_4px_24px_rgba(45,36,30,0.06)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6EC] text-[#3F6B35]">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-[#2D241E]">
            {isVerified ? 'ปิดกะและรับรองยอดเรียบร้อยแล้ว' : 'ปิดกะเรียบร้อยแล้ว · ยอดตรงกัน'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#7A6A5C]">
            {formatBusinessDate(shift.businessDate)}
            {isVerified
              ? ` — รับรองโดยผู้จัดการ/เจ้าของร้านเมื่อ ${formatTime(shift.verifiedAt) ?? '-'}`
              : ' — ระบบปิดกะอัตโนมัติเพราะยอดที่นับได้ตรงกับยอดในระบบ'}
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-[#E8DFD5] rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4">
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm text-[#7A6A5C]">เงินเปิดกะ</dt>
          <dd className="text-sm font-semibold text-[#2D241E]">{formatMoney(shift.openingCash)}</dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm text-[#7A6A5C]">เงินสดที่ควรมีในลิ้นชัก</dt>
          <dd className="text-sm font-semibold text-[#2D241E]">
            {shift.expectedClosingCash === null ? '-' : formatMoney(shift.expectedClosingCash)}
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm text-[#7A6A5C]">นับได้จริง</dt>
          <dd className="text-sm font-semibold text-[#2D241E]">
            {shift.actualClosingCash === null ? '-' : formatMoney(shift.actualClosingCash)}
          </dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-sm text-[#7A6A5C]">ผลต่าง</dt>
          <dd className="text-sm font-bold text-[#3F6B35]">{variance?.label ?? '-'}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-[#9B8E82]">
        ถ้าปิดกะนี้ผิด ผู้จัดการหรือเจ้าของร้านสามารถเปิดกะกลับมาแก้ไขได้
        ระบบจะเก็บยอดเดิมไว้ในบันทึกการตรวจสอบ
      </p>
    </section>
  );
}
