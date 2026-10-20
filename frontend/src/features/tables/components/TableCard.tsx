import { Users } from 'lucide-react'
import type { DiningTable } from '../types/table.types'

interface TableCardProps {
    table: DiningTable
    onClick: (table: DiningTable) => void
}

export default function TableCard({ table, onClick }: TableCardProps) {
    const isOccupied = table.status === 'occupied'
    const isDisabled = table.status === 'out_of_service'

    return (
        <button
            type="button"
            onClick={() => !isDisabled && onClick(table)}
            disabled={isDisabled}
            className={`
                relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-150 font-kanit
                ${isDisabled
                    ? 'border-stone-200 bg-stone-100 cursor-not-allowed opacity-50'
                    : isOccupied
                        ? 'border-[#C49A72] bg-[#FDF6EE] hover:bg-[#FAF0E4] cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]'
                        : 'border-stone-200 bg-white hover:bg-[#FAF7F2] cursor-pointer hover:border-[#D4B896] active:scale-[0.98]'
                }
            `}
        >
            {/* สถานะจุดมุมขวาบน */}
            <span
                className={`
                    absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full
                    ${isDisabled ? 'bg-stone-300'
                        : isOccupied ? 'bg-[#C27803]'
                        : 'bg-emerald-400'}
                `}
            />

            {/* ป้ายสถานะ */}
            <span className={`text-[11px] font-medium mb-1 ${isOccupied ? 'text-[#A0732E]' : 'text-stone-400'}`}>
                {isDisabled ? 'ปิดใช้งาน' : isOccupied ? 'มีลูกค้า' : 'ว่าง'}
            </span>

            {/* เลขโต๊ะ */}
            <span className={`text-3xl font-bold leading-none ${isOccupied ? 'text-[#5C3D1E]' : 'text-[#2D241E]'}`}>
                {table.table_number}
            </span>

            {/* ความจุ */}
            <div className="flex items-center gap-1 mt-2 text-stone-400">
                <Users className="w-3 h-3" />
                <span className="text-xs">{table.capacity} ที่นั่ง</span>
            </div>

            {/* รายการออเดอร์ + ยอดค้างชำระ — แสดงเฉพาะโต๊ะที่มีออเดอร์ */}
            {isOccupied && table.item_count > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E8D5BE] flex flex-col gap-0.5">
                    <span className="text-xs text-[#8C6D58]">
                        {table.item_count} รายการ
                    </span>
                    <span className="text-sm font-semibold text-[#5C3D1E]">
                        ฿{table.total_amount.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>
            )}
        </button>
    )
}
