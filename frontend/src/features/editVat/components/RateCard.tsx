import { useState } from 'react';
import { Info } from 'lucide-react';

interface PresetItem {
    label: string;
    value: number;
}

interface RateCardProps {
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
    enabled: boolean;
    rate: number;
    min: number;
    max: number;
    disabled: boolean;                          // manager หรือกำลังบันทึก
    presets?: PresetItem[];
    infoNotice?: React.ReactNode;
    onToggle: (next: boolean) => void;
    onRateSave: (rate: number) => Promise<boolean>; // true = บันทึกสำเร็จ
}

// ตัวเลขไม่ติดลบ ทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 7, 7.5, 10.25
const RATE_PATTERN = /^\d+(\.\d{1,2})?$/;

export default function RateCard(props: RateCardProps) {
    const {
        title,
        subtitle,
        icon,
        enabled,
        rate,
        min,
        max,
        disabled,
        presets,
        infoNotice,
        onToggle,
        onRateSave,
    } = props;
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

    const handleSelectPreset = async (value: number) => {
        if (disabled) return;
        setInputError(null);
        setDraft(null);
        if (!enabled && value > 0) {
            onToggle(true);
        } else if (enabled && value === 0) {
            onToggle(false);
            return;
        }
        await onRateSave(value);
    };

    return (
        <section className="w-full bg-white border border-[#E8DFD5] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {icon && (
                        <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58] shrink-0">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-[#2D241E] truncate">{title}</h2>
                        <p className="text-xs text-stone-500 truncate">{subtitle}</p>
                    </div>
                </div>

                {/* Switch Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-stone-500 hidden sm:inline">
                        {enabled ? 'เปิดใช้งาน' : 'ปิด'}
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={title}
                        disabled={disabled}
                        onClick={() => onToggle(!enabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            enabled ? 'bg-[#8C6D58]' : 'bg-stone-300'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <span className="block text-xs font-medium text-stone-500 mb-1">
                            อัตราที่กำหนด
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`relative flex items-center rounded-xl border transition-colors ${
                                inputDisabled
                                    ? 'bg-stone-50 border-stone-200'
                                    : 'bg-white border-[#d9c6b0] focus-within:border-[#8C6D58] focus-within:ring-2 focus-within:ring-[#8C6D58]/20'
                            }`}>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={shown}
                                    disabled={inputDisabled}
                                    onChange={e => {
                                        setDraft(e.target.value);
                                        setInputError(null);
                                    }}
                                    onBlur={commit}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                    }}
                                    className="w-20 px-3 py-2 text-right text-base font-semibold text-[#2D241E] bg-transparent outline-none disabled:text-stone-400"
                                    aria-label={`${title} (%)`}
                                />
                                <span className="pr-3 text-sm font-medium text-[#8C6D58] pointer-events-none">%</span>
                            </div>
                            <span className="text-xs text-stone-400">
                                {enabled ? 'คิดต่อออเดอร์' : 'ไม่ได้เปิดใช้งาน'}
                            </span>
                        </div>
                        {inputError && <p className="mt-1.5 text-xs text-rose-600">{inputError}</p>}
                    </div>

                    {/* Presets */}
                    {presets && presets.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-xs font-medium text-stone-400 block">เลือกอัตราด่วน:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {presets.map((preset) => {
                                    const isSelected = enabled && rate === preset.value;
                                    return (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => handleSelectPreset(preset.value)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                                isSelected
                                                    ? 'bg-[#8C6D58] text-white border-[#8C6D58] shadow-2xs font-semibold'
                                                    : 'bg-[#FAF7F2] text-stone-700 border-[#E8DFD5] hover:border-[#8C6D58] hover:bg-white'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Callout */}
                {infoNotice && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-[#E8DFD5] bg-[#FBF9F6] p-3 text-xs text-stone-600 leading-relaxed">
                        <Info className="w-4 h-4 text-[#8C6D58] shrink-0 mt-0.5" />
                        <div>{infoNotice}</div>
                    </div>
                )}
            </div>
        </section>
    );
}
