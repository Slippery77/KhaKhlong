import { useState } from 'react';
import { useSales } from '../context/SalesContext';
import { CheckCircle2 } from 'lucide-react';

export default function CashMovementForm() {
    const { addCashMovement } = useSales();
    const [actionType, setActionType] = useState<'CASH_OUT' | 'CASH_IN'>('CASH_OUT');
    const [amountText, setAmountText] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [showSuccess, setShowSuccess] = useState<boolean>(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amountText);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
            return;
        }

        addCashMovement(
            actionType,
            numericAmount,
            description.trim() || (actionType === 'CASH_OUT' ? 'นำเงินออก' : 'นำเงินเข้า')
        );

        setAmountText('');
        setDescription('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-stone-200/80 p-3 lg:p-3.5 shadow-xs flex flex-wrap items-center gap-3 font-kanit relative"
        >
            {/* Toggle Buttons: นำเงินออก / นำเงินเข้า */}
            <div className="flex items-center bg-stone-100/80 p-1 rounded-xl">
                <button
                    type="button"
                    onClick={() => setActionType('CASH_OUT')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        actionType === 'CASH_OUT'
                            ? 'bg-[#FCE8E6] text-[#C53030] shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    นำเงินออก
                </button>
                <button
                    type="button"
                    onClick={() => setActionType('CASH_IN')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        actionType === 'CASH_IN'
                            ? 'bg-[#E6F4EA] text-[#1E7E34] shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    นำเงินเข้า
                </button>
            </div>

            {/* Amount Input */}
            <div className="relative flex items-center">
                <span className="absolute left-3.5 text-stone-500 font-medium text-sm select-none">
                    ฿
                </span>
                <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={amountText}
                    onChange={(e) => setAmountText(e.target.value)}
                    className="w-28 lg:w-32 pl-8 pr-3 py-2 bg-stone-50/60 border border-stone-200/90 rounded-xl text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#A68874]/30 focus:border-[#A68874] transition"
                />
            </div>

            {/* Description Input */}
            <div className="flex-1 min-w-[200px]">
                <input
                    type="text"
                    placeholder="รายละเอียด เช่น ซื้อวัตถุดิบ"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-50/60 border border-stone-200/90 rounded-xl text-sm font-normal text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#A68874]/30 focus:border-[#A68874] transition"
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!amountText || parseFloat(amountText) <= 0}
                className="px-6 py-2 bg-[#C4B29E] hover:bg-[#AA947E] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs lg:text-sm rounded-xl transition cursor-pointer shadow-2xs shrink-0"
            >
                บันทึก
            </button>

            {/* Mini Toast */}
            {showSuccess && (
                <div className="absolute right-4 -top-10 bg-[#2D241E] text-white px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>บันทึกรายการสำเร็จ</span>
                </div>
            )}
        </form>
    );
}
