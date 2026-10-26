import { useSales } from '../context/SalesContext';
import { Trophy } from 'lucide-react';

export default function TopSellingList() {
    const { topSellingCategories } = useSales();

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col font-kanit">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-[#2D241E]">
                    เมนูขายดี
                </h3>
                {topSellingCategories.length > 0 && (
                    <span className="text-[11px] font-medium text-stone-400">
                        {topSellingCategories.length.toLocaleString('th-TH')} หมวดหมู่
                    </span>
                )}
            </div>

            <p className="text-[11px] text-stone-500 mb-4 pb-2 border-b border-stone-100">
                แยกตามหมวดหมู่ · แสดง 3 อันดับแรกของแต่ละหมวด
            </p>

            {topSellingCategories.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                    <Trophy className="w-6 h-6 mx-auto mb-1.5 text-stone-300" />
                    ยังไม่มีข้อมูลเมนูขายดี
                </div>
            ) : (
                <div className="flex flex-col gap-5 max-h-[520px] overflow-y-auto pr-1">
                    {topSellingCategories.map((category, catIdx) => (
                        <section key={category.categoryId || category.categoryName} aria-label={`หมวด ${category.categoryName}`}>
                            {/* Category header */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#FAF7F2] text-[11px] font-semibold text-[#8C6D58]">
                                        {catIdx + 1}
                                    </span>
                                    <h4 className="truncate text-xs font-semibold text-[#2D241E]">
                                        {category.categoryName}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] tabular-nums text-stone-500">
                                        ฿{category.categoryTotal.toLocaleString('th-TH')}
                                    </span>
                                    <span className="rounded-full bg-[#FAF7F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8C6D58]">
                                        TOP {category.items.length}
                                    </span>
                                </div>
                            </div>

                            {/* Top items of this category */}
                            <div className="flex flex-col gap-3">
                                {category.items.map((item, idx) => (
                                    <div key={`${item.name}-${idx}`} className="flex flex-col gap-1.5 group">
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="min-w-0 truncate font-medium text-stone-700 transition-colors group-hover:text-stone-900">
                                                {idx + 1}. {item.name}
                                            </span>
                                            <span className="shrink-0 text-right">
                                                <span className="font-semibold tabular-nums text-stone-800">
                                                    ฿{item.totalAmount.toLocaleString('th-TH')}
                                                </span>
                                                <span className="ml-1 text-[11px] text-stone-400">
                                                    × {item.quantity.toLocaleString('th-TH')}
                                                </span>
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.max(item.percentage, 4)}%`,
                                                    backgroundColor: '#AA8971',
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
