import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Banknote, Calculator, CloudUpload, Loader2 } from 'lucide-react';
import {
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../constants';
import type { Shift } from '../types/shift.types';
import {
  SHIFT_STATUS_LABEL,
  formatBusinessDate,
  formatMoney,
  formatTime,
} from '../utils/shiftFormat';

interface CloseShiftCardProps {
  shift: Shift;
  isSubmitting: boolean;
  onSubmit: (actualClosingCash: number) => Promise<Shift | null>;
  /** [ใหม่] จำนวนบิลที่ค้างใน outbox ของเครื่องนี้ — มากกว่า 0 ห้ามปิดกะ */
  unsentBills?: number;
  /** [ใหม่] เปิดหน้าต่างรายการค้างส่ง */
  onShowUnsent?: () => void;
}

/** นับเงินแล้วปิดกะ — ยังไม่โชว์ยอดที่ควรมี (นับแบบไม่เห็นยอดตามขั้นตอนหน้าปิดกะ) */
export default function CloseShiftCard({ shift, isSubmitting, onSubmit, unsentBills = 0, onShowUnsent }: CloseShiftCardProps) {
  const [isCounting, setIsCounting] = useState(false);
  const [amount, setAmount] = useState('');

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== '' && !Number.isNaN(parsedAmount) && parsedAmount >= 0;
  // [ใหม่] ปิดกะตอนมีของค้าง → ส่งทีหลังออเดอร์จะไปเข้ากะใหม่ (หรือได้ 409 ไม่มีกะเปิด) ยอดกะนี้จะขาด
  const isBlockedByOutbox = unsentBills > 0;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || isSubmitting || isBlockedByOutbox) return;
    const result = await onSubmit(parsedAmount);
    if (result) {
      setAmount('');
      setIsCounting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-[0_4px_24px_rgba(45,36,30,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#2D241E]">กะวันนี้เปิดอยู่</h2>
            <span className="rounded-full bg-[#EFE8DC] px-2.5 py-0.5 text-xs font-medium text-[#6B5140]">
              {SHIFT_STATUS_LABEL[shift.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#7A6A5C]">{formatBusinessDate(shift.businessDate)}</p>
        </div>
        {shift.reopenCount > 0 && (
          <span className="rounded-full border border-[#F0D9A8] bg-[#FFF7E6] px-2.5 py-0.5 text-xs text-[#8A5A00]">
            เปิดซ้ำ {shift.reopenCount} ครั้ง
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3">
          <p className="text-xs text-[#7A6A5C]">เงินเปิดกะ</p>
          <p className="mt-0.5 text-lg font-semibold text-[#2D241E]">{formatMoney(shift.openingCash)}</p>
        </div>
        <div className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3">
          <p className="text-xs text-[#7A6A5C]">เวลาเปิดกะ</p>
          <p className="mt-0.5 text-lg font-semibold text-[#2D241E]">
            {formatTime(shift.openedAt) ?? '-'}
          </p>
        </div>
      </div>

       {/* [ใหม่] มีออเดอร์ค้างส่งในเครื่องนี้ */}
      {isBlockedByOutbox && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] px-3 py-2.5">
          <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-[#B42318]" aria-hidden="true" />
          <div className="flex-1 text-xs leading-relaxed text-[#B42318]">
            <p>
              เครื่องนี้ยังมีออเดอร์ที่ไม่ถึงเซิร์ฟเวอร์ {unsentBills} บิล — ส่งให้ครบหรือลบทิ้งก่อนจึงปิดกะได้
              ไม่อย่างนั้นยอดขายของกะนี้จะไม่ครบ
            </p>
            {onShowUnsent && (
              <button
                type="button"
                onClick={onShowUnsent}
                className="mt-1 cursor-pointer font-semibold underline underline-offset-2"
              >
                ดูรายการ
              </button>
            )}
          </div>
        </div>
      )}

      {!isCounting ? (
        <button
          type="button"
          onClick={() => setIsCounting(true)}
          disabled={isBlockedByOutbox}
          className={`${primaryButtonClass} mt-4`}
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          นับเงินและปิดกะ
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 border-t border-[#E8DFD5] pt-4" noValidate>
          <label htmlFor="closing-cash" className="mb-1.5 block text-sm font-medium text-[#2D241E]">
            เงินสดที่นับได้ทั้งหมด (บาท)
          </label>
          <input
            id="closing-cash"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            aria-describedby="closing-cash-hint"
            className={fieldClass}
            disabled={isSubmitting}
            autoFocus
          />
          <p id="closing-cash-hint" className="mt-1.5 text-xs text-[#9B8E82]">
            นับธนบัตรและเหรียญทั้งหมดในลิ้นชัก แล้วกรอกยอดรวม — ระบบจะเทียบกับยอดในระบบให้หลังกดยืนยัน
          </p>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#F0D9A8] bg-[#FFF7E6] px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C27803]" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[#8A5A00]">
              ปิดกะแล้วจะเปิดบิลและรับเงินไม่ได้ จนกว่าจะเปิดกะใหม่ —
              ถ้าปิดผิดต้องให้ผู้จัดการหรือเจ้าของร้านเปิดกะให้
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!isValid || isSubmitting || isBlockedByOutbox}
              className={`${primaryButtonClass} flex-1`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Banknote className="h-4 w-4" aria-hidden="true" />
              )}
              ยืนยันปิดกะ
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCounting(false);
                setAmount('');
              }}
              disabled={isSubmitting}
              className={secondaryButtonClass}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
