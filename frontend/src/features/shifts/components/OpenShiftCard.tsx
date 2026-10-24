import { useState } from 'react';
import type { FormEvent } from 'react';
import { Banknote, Loader2, Wallet } from 'lucide-react';
import { fieldClass, primaryButtonClass } from '../constants';

interface OpenShiftCardProps {
  isSubmitting: boolean;
  onSubmit: (openingCash: number) => Promise<boolean>;
}

export default function OpenShiftCard({ isSubmitting, onSubmit }: OpenShiftCardProps) {
  const [amount, setAmount] = useState('');
  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== '' && !Number.isNaN(parsedAmount) && parsedAmount >= 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    const success = await onSubmit(parsedAmount);
    if (success) setAmount('');
  };

  return (
    <section className="rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-[0_4px_24px_rgba(45,36,30,0.06)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#8C6D58]/10 text-[#8C6D58]">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-[#2D241E]">ยังไม่เปิดกะวันนี้</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#7A6A5C]">
            กรอกเงินสดตั้งต้นในลิ้นชักเพื่อเริ่มขายของวันนี้
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5" noValidate>
        <label htmlFor="opening-cash" className="mb-1.5 block text-sm font-medium text-[#2D241E]">
          เงินสดตั้งต้นในลิ้นชัก (บาท)
        </label>
        <input
          id="opening-cash"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          aria-describedby="opening-cash-hint"
          className={fieldClass}
          disabled={isSubmitting}
        />
        <p id="opening-cash-hint" className="mt-1.5 text-xs text-[#9B8E82]">
          นับเงินสดที่มีอยู่ในลิ้นชักก่อนเริ่มขาย — 1 วันเปิดได้ 1 กะ
        </p>

        <button type="submit" disabled={!isValid || isSubmitting} className={`${primaryButtonClass} mt-4`}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Banknote className="h-4 w-4" aria-hidden="true" />
          )}
          เปิดกะ
        </button>
      </form>
    </section>
  );
}
