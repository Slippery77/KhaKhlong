import { useRef } from "react";

type PinInputProps = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    length?: number;
    hasError?: boolean;
    disabled?: boolean;
};

export function PinInput({ id, value, onChange, length = 6, hasError = false, disabled = false }: PinInputProps) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = Array.from({ length }, (_, i) => value[i] ?? "");

    const focusAt = (i: number) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus();

    const handleInput = (i: number, raw: string) => {
        const d = raw.replace(/\D/g, "").slice(-1);
        if (!d) return;
        const next = digits.slice();
        next[i] = d;
        onChange(next.join("").slice(0, length));
        focusAt(i + 1);
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            const next = digits.slice();
            if (next[i]) {
                next[i] = "";
            } else if (i > 0) {
                next[i - 1] = "";
                focusAt(i - 1);
            }
            onChange(next.join(""));
        } else if (e.key === "ArrowLeft") {
            focusAt(i - 1);
        } else if (e.key === "ArrowRight") {
            focusAt(i + 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pasted) return;
        onChange(pasted);
        focusAt(pasted.length);
    };

    return (
        <div className="flex gap-2" role="group" aria-label="PIN 6 หลัก">
            {digits.map((d, i) => (
                <input
                    key={i}
                    id={i === 0 ? id : undefined}
                    ref={(el) => { refs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={d}
                    disabled={disabled}
                    aria-label={`PIN หลักที่ ${i + 1}`}
                    onChange={(e) => handleInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className={`h-12 w-12 rounded-xl border text-center text-lg font-medium text-[#2D241E] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] disabled:opacity-50 ${
                        hasError ? "border-red-400" : "border-[#d9c6b0]"
                    }`}
                />
            ))}
        </div>
    );
}
