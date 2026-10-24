import { useState } from 'react';

interface RateCardProps {
    title: string;
    subtitle: string;
    enabled: boolean;
    rate: number;
    min: number;
    max: number;
    disabled: boolean;                          // manager หรือกำลังบันทึก
    onToggle: (next: boolean) => void;
    onRateSave: (rate: number) => Promise<boolean>; // true = บันทึกสำเร็จ
}

// ตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 7, 7.5, 10.25
const RATE_PATTERN = /^\d+(\.\d{1,2})?$/;

export default function RateCard(props: RateCardProps) {
    const { title, subtitle, enabled, rate, min, max, disabled, onToggle, onRateSave } = props;
    const [draft, setDraft] = useState<string | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);

    const shown = draft ?? String(rate);
    const inputDisabled = disabled || !enabled;

    const commit = async () => {
        if (draft === null) return;                 // ไม่ได้แก้อะไร
        if (!RATE_PATTERN.test(draft)) {
            setInputError('กรอกเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง');
            return;
        }
        const value = Number(draft);
        if (value < min || value > max) {
            setInputError(`กรอกได้ระหว่าง ${min}–${max}`);
            return;
        }
        if (value === rate) {                       // ค่าเท่าเดิม ไม่ต้องยิง
            setDraft(null);
            return;
        }
        const ok = await onRateSave(value);
        if (ok) setDraft(null);                     // ไม่สำเร็จ: เก็บ draft ไว้ให้แก้ต่อ
    };

    return (
        <div className="w-72 rounded-xl border border-[#B79479] bg-[#F3EADF] p-4">
            <p className="font-semibold text-[#2D241E]">{title}</p>
            <p className="text-xs text-stone-500">{subtitle}</p>

            <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-1 rounded-full border border-[#B79479] bg-white px-3 py-1">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={shown}
                        disabled={inputDisabled}
                        onChange={e => { setDraft(e.target.value); setInputError(null); }}
                        onBlur={commit}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        className="w-12 bg-transparent text-right outline-none disabled:text-stone-400"
                        aria-label={`${title} (%)`}
                    />
                    <span className="text-sm text-[#B79479]">%</span>
                </label>

                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={title}
                    disabled={disabled}
                    onClick={() => onToggle(!enabled)}
                    className={`relative h-6 w-11 rounded-full transition disabled:opacity-50 ${enabled ? 'bg-[#B79479]' : 'bg-stone-300'}`}
                >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`} />
                </button>
            </div>

            {inputError && <p className="mt-2 text-xs text-red-600">{inputError}</p>}
        </div>
    );
}