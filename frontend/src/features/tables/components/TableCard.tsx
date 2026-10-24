import { Users } from 'lucide-react'
import type { DiningTable } from '../types/table.types'

interface TableCardProps {
    table: DiningTable
    onClick: (table: DiningTable) => void
}

export default function TableCard({ table, onClick }: TableCardProps) {
    const isOccupied = table.status === 'occupied'
    const isDisabled = table.status === 'out_of_service'
    // มีรายการค้างจริง (เอาไว้แสดงจำนวนรายการ + ยอดบิล)
    const hasOrder = isOccupied && table.item_count > 0

    return (
        <button
            type="button"
            onClick={() => !isDisabled && onClick(table)}
            disabled={isDisabled}
            className={`
                relative flex h-[140px] flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all duration-150 font-kanit
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
            <span className={`text-3xl font-bold leading-none truncate ${isOccupied ? 'text-[#5C3D1E]' : 'text-[#2D241E]'}`}>
                {table.table_number}
            </span>

            {/* ส่วนล่างการ์ด — ตรึงไว้ก้นการ์ด (mt-auto) ทุกใบสูงเท่ากันเสมอ
                โต๊ะที่มีลูกค้าแค่แสดงข้อมูลเพิ่ม ไม่ทำให้การ์ดใหญ่ขึ้น */}
            <div className="mt-auto pt-2.5 space-y-1">
                <div className="flex items-center justify-between gap-1 text-stone-400">
                    <span className="flex items-center gap-1 min-w-0">
                        <Users className="w-3 h-3 shrink-0" />
                        <span className="text-xs truncate">{table.capacity} ที่นั่ง</span>
                    </span>
                    {hasOrder && (
                        <span className="text-xs shrink-0 text-[#8C6D58]">{table.item_count} รายการ</span>
                    )}
                </div>
                {hasOrder && (
                    <span className="block text-base font-semibold leading-snug text-[#5C3D1E] truncate">
                        ฿{table.total_amount.toLocaleString('th-TH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                )}
            </div>
        </button>
    )
}
