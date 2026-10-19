import { useSales } from '../context/SalesContext';

export default function SalesMetricsCards() {
    const { metrics } = useSales();

    return (
        <div className="grid grid-cols-3 gap-4 font-kanit">
            {/* เงินสดคงเหลือ */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-stone-500">
                    เงินสดคงเหลือ
                </span>
                <div className="mt-2 text-2xl lg:text-3xl font-bold text-[#2D241E] tracking-tight">
                    ฿{metrics.cashOnHand.toLocaleString()}
                </div>
            </div>

            {/* รายรับ */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-stone-500">
                    รายรับ
                </span>
                <div className="mt-2 text-2xl lg:text-3xl font-bold text-[#2D8A4E] tracking-tight">
                    ฿{metrics.totalIncome.toLocaleString()}
                </div>
            </div>

            {/* รายจ่าย */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-stone-500">
                    รายจ่าย
                </span>
                <div className="mt-2 text-2xl lg:text-3xl font-bold text-[#C53030] tracking-tight">
                    ฿{metrics.totalExpense.toLocaleString()}
                </div>
            </div>
        </div>
    );
}
