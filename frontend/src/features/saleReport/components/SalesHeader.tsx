import { useSales } from '../context/SalesContext';
import { TrendingUp } from 'lucide-react';
import type { TimeFilter } from '../types/sales.types';

export default function SalesHeader() {
    const { filter, setFilter } = useSales();

    const filterOptions: { label: string; value: TimeFilter }[] = [
        { label: 'วันนี้', value: 'TODAY' },
        { label: 'สัปดาห์', value: 'WEEK' },
        { label: 'เดือน', value: 'MONTH' },
    ];

    return (
        <div className="flex items-center justify-between font-kanit">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200/80 shadow-xs flex items-center justify-center text-[#8C6D58]">
                    <TrendingUp className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-[#2D241E]">
                        รายการขาย
                    </h1>
                    <p className="text-xs text-stone-400 mt-0.5">
                        บิลจะถูกเพิ่มอัตโนมัติหลังชำระเงินสำเร็จ
                    </p>
                </div>
            </div>

            {/* Filter Selector */}
            <div className="flex items-center bg-stone-200/60 p-1 rounded-full gap-1">
                {filterOptions.map((opt) => {
                    const isActive = filter === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFilter(opt.value)}
                            className={`px-4 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-[#A68874] text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
