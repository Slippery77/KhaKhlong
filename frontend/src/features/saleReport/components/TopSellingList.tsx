import { useSales } from '../context/SalesContext';
import { Trophy } from 'lucide-react';

export default function TopSellingList() {
    const { topSellingItems } = useSales();
    const selectedCategory = 'ทั้งหมด';

    // Default dummy items if no items sold yet
    const displayItems = topSellingItems.length > 0
        ? topSellingItems
        : [
            { name: 'ข้าวมันไก่', quantity: 1, totalAmount: 90, percentage: 100 },
            { name: 'ผัดซีอิ๊วหมู', quantity: 1, totalAmount: 85, percentage: 94 },
          ];

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col font-kanit">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#2D241E]">
                    เมนูขายดี
                </h3>
            </div>

            {/* Sub-header Filter & TOP Badge */}
            <div className="flex items-center justify-between text-xs text-stone-500 mb-4 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span className="text-xs">{selectedCategory === 'ทั้งหมด' ? 'อื่น ๆ' : selectedCategory}</span>
                </div>
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    TOP {Math.min(displayItems.length, 3)}
                </span>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4">
                {displayItems.slice(0, 5).map((item, idx) => (
                    <div key={item.name} className="flex flex-col gap-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                {idx + 1}. {item.name}
                            </span>
                            <span className="font-semibold text-stone-800">
                                ฿{item.totalAmount.toLocaleString()}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${item.percentage || 20}%`,
                                    backgroundColor: '#AA8971',
                                }}
                            />
                        </div>
                    </div>
                ))}

                {displayItems.length === 0 && (
                    <div className="py-6 text-center text-stone-400 text-xs">
                        <Trophy className="w-6 h-6 mx-auto mb-1.5 text-stone-300" />
                        ยังไม่มีข้อมูลเมนูขายดี
                    </div>
                )}
            </div>
        </div>
    );
}
