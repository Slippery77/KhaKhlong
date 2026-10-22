import { useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { fieldClass, primaryButtonClass } from '../constants';
import type { Shift } from '../types/shift.types';
import {
  describeVariance,
  formatBusinessDate,
  formatMoney,
} from '../utils/shiftFormat';

interface MismatchPanelProps {
  shift: Shift;
  role?: string;
  isSubmitting: boolean;
  pinError: string | null;
  onVerify: (pin: string) => Promise<boolean>;
}

const toneClass = {
  success: 'text-[#3F6B35]',
  danger: 'text-[#B42318]',
  warning: 'text-[#C27803]',
} as const;

export default function MismatchPanel({
  shift,
  role,
  isSubmitting,
  pinError,
  onVerify,
}: MismatchPanelProps) {
  const [pin, setPin] = useState('');
  const variance = describeVariance(shift.variance);
  const isPinComplete = /^\d{6}$/.test(pin);
  const isManager = role === 'manager' || role === 'owner';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isPinComplete || isSubmitting) return;
    const success = await onVerify(pin);
    if (!success) setPin('');
  };

  return (
    <section className="rounded-2xl border border-[#F0D9A8] bg-white p-6 shadow-[0_4px_24px_rgba(45,36,30,0.06)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7E6] text-[#C27803]">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-[#2D241E]">ยอดเงินสดไม่ตรงกับระบบ</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#7A6A5C]">
            {formatBusinessDate(shift.businessDate)} — ต้องให้ผู้จัดการหรือเจ้าของร้านตรวจสอบและยืนยันก่อนปิดกะ
          </p>
        </div>
      </div>

      {/* รายละเอียดยอด: ควรมี / นับได้ / ขาดหรือเกิน */}
      <dl className="mt-4 divide-y divide-[#E8DFD5] rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4">
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
          <dd className={`text-sm font-bold ${variance ? toneClass[variance.tone] : 'text-[#2D241E]'}`}>
            {variance?.label ?? '-'}
          </dd>
        </div>
      </dl>

      {shift.status === 'escalated' && (
        <p className="mt-3 rounded-xl border border-[#E8DFD5] bg-[#F5F0E8] px-3 py-2.5 text-xs leading-relaxed text-[#6B5140]">
          กะนี้ถูกส่งต่อให้เจ้าของร้านแล้ว — เฉพาะเจ้าของร้านเท่านั้นที่ยืนยันได้
        </p>
      )}

      <form onSubmit={submit} className="mt-5 border-t border-[#E8DFD5] pt-5" noValidate>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[#2D241E]">ยืนยันการปิดกะด้วย PIN</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#7A6A5C]">
          {isManager
            ? 'กรอก PIN 6 หลักของคุณเพื่อรับรองยอดปิดกะ'
            : 'แจ้งผู้จัดการหรือเจ้าของร้านมาตรวจสอบที่เครื่องนี้ แล้วกรอก PIN 6 หลักเพื่อยืนยัน'}
        </p>

        <label htmlFor="manager-pin" className="mt-3 mb-1.5 block text-sm font-medium text-[#2D241E]">
          PIN ผู้จัดการ / เจ้าของร้าน
        </label>
        <input
          id="manager-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          aria-describedby={pinError ? 'manager-pin-error' : undefined}
          aria-invalid={pinError ? true : undefined}
          className={`${fieldClass} tracking-[0.6em] text-center text-lg`}
          disabled={isSubmitting}
        />

        {pinError && (
          <p id="manager-pin-error" role="alert" className="mt-1.5 text-xs text-[#B42318]">
            {pinError}
          </p>
        )}

        <button type="submit" disabled={!isPinComplete || isSubmitting} className={`${primaryButtonClass} mt-4`}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )}
          ยืนยันปิดกะด้วย PIN
        </button>
      </form>
    </section>
  );
}
