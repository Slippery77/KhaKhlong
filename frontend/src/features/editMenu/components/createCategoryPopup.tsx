import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
    onAdd: (name: string) => Promise<boolean>;
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

export default function CreateCategoryPopUp({ onAdd, onClose, isSubmitting, error }: Props) {
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        const ok = await onAdd(trimmed);
        if (ok) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px] font-kanit"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            {/* การ์ดขาวกลางจอ */}
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base sm:text-lg font-semibold text-[#2D241E]">เพิ่มหมวดหมู่</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="ปิด"
                        className="p-1 rounded-lg text-stone-400 hover:text-[#2D241E] hover:bg-[#FAF7F2] transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                    <div>
                        <label htmlFor="category-name-input" className="block text-xs font-medium text-stone-600 mb-1">
                            ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="category-name-input"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="เช่น อาหารจานเดียว, เครื่องดื่ม"
                            className="w-full rounded-xl border border-[#d9c6b0] px-3 py-2 text-sm text-[#2D241E] shadow-2xs outline-none transition-all focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/20"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 cursor-pointer rounded-xl border border-[#d9c6b0] py-2 text-sm font-medium text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-[0.98] disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || name.trim() === ''}
                            className="flex-1 cursor-pointer rounded-xl bg-[#8C6D58] py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-[#7a5c45] active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
