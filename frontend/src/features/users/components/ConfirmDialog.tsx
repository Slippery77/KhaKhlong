import { AlertTriangle } from 'lucide-react';

interface Props {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    isSubmitting: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export default function ConfirmDialog({
    title,
    message,
    confirmLabel = 'ยืนยัน',
    danger = false,
    isSubmitting,
    onConfirm,
    onClose,
}: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
                <div className="mb-3 flex items-center gap-2">
                    {danger && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                            <AlertTriangle size={17} />
                        </span>
                    )}
                    <h2 className="text-base font-semibold text-[#2D241E]">{title}</h2>
                </div>

                <p className="mb-5 text-sm text-stone-600">{message}</p>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 cursor-pointer rounded-xl border border-[#d9c6b0] py-2 text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className={`flex-1 cursor-pointer rounded-xl py-2 font-semibold text-white transition enabled:active:scale-95 disabled:opacity-50 ${
                            danger ? 'bg-rose-600 enabled:hover:bg-rose-700' : 'bg-[#8C6D58] enabled:hover:bg-[#7a5c45]'
                        }`}
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
