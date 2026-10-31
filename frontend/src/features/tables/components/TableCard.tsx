import { useEffect, useRef, useState } from "react"
import { Check, MoreVertical, RefreshCw, Trash2, UserX, Users, UtensilsCrossed } from 'lucide-react'
import type { DiningTable } from '../types/table.types'

interface TableCardProps {
    table: DiningTable
    onClick: (table: DiningTable) => void
    /** ยกเลิกทั้งบิล — ต้องมี PIN ผู้อนุมัติ (เฉพาะโต๊ะที่มีบิลเปิด) */
    onCancelBill?: (table: DiningTable) => void
    /** ปิดบิลลูกค้าหนี (walkout) — ต้องมี PIN ผู้อนุมัติ */
    onCloseUnpaid?: (table: DiningTable) => void
    /** คำนวณสถานะโต๊ะใหม่จากบิลที่ยังเปิดอยู่ (ซ่อมสถานะเพี้ยน) */
    onSyncStatus?: (table: DiningTable) => void
    /** โหมดรวมโต๊ะคิดเงิน: แตะการ์ด = เลือก/ยกเลิกเลือกแทนการเปิดหน้า POS */
    selectionMode?: boolean
    /** โต๊ะนี้ถูกเลือกไว้ในโหมดรวมโต๊ะ */
    selected?: boolean
    onToggleSelect?: (table: DiningTable) => void
}

export default function TableCard({
    table,
    onClick,
    onCancelBill,
    onCloseUnpaid,
    onSyncStatus,
    selectionMode = false,
    selected = false,
    onToggleSelect,
}: TableCardProps) {
    const isOccupied = table.status === 'occupied'
    const isDisabled = table.status === 'out_of_service'
    // มีรายการค้างจริง (เอาไว้แสดงจำนวนรายการ + ยอดบิล)
    const hasOrder = isOccupied && table.item_count > 0
    // รวมคิดเงินได้เฉพาะโต๊ะที่มีบิลเปิดอยู่
    const isSelectable = selectionMode && isOccupied && Boolean(table.open_order_id)
    // ในโหมดรวมโต๊ะ โต๊ะที่เลือกไม่ได้จะถูกหรี่และกดไม่ได้
    const isBlockedBySelection = selectionMode && !isSelectable
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    // ปิดเมนูเมื่อคลิกที่อื่น
    useEffect(() => {
        if (!isMenuOpen) return
        const onPointerDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMenuOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [isMenuOpen])

    const runAction = (action?: (table: DiningTable) => void) => {
        setIsMenuOpen(false)
        action?.(table)
    }

    const handleCardClick = () => {
        if (isDisabled || isBlockedBySelection) return
        if (isSelectable) {
            onToggleSelect?.(table)
            return
        }
        onClick(table)
    }

    const cardTone = isDisabled
        ? 'border-stone-200 bg-stone-100 cursor-not-allowed opacity-50'
        : isBlockedBySelection
            ? 'border-stone-200 bg-white cursor-not-allowed opacity-40'
            : selected
                ? 'border-[#8C6D58] bg-[#F6EBDD] ring-2 ring-[#8C6D58]/40 shadow-md cursor-pointer active:scale-[0.98]'
                : isOccupied
                    ? 'border-[#C49A72] bg-[#FDF6EE] hover:bg-[#FAF0E4] cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]'
                    : 'border-stone-200 bg-white hover:bg-[#FAF7F2] cursor-pointer hover:border-[#D4B896] active:scale-[0.98]'

    return (
        <div className="relative h-[140px] font-kanit">
            <button
                type="button"
                onClick={handleCardClick}
                disabled={isDisabled || isBlockedBySelection}
                aria-pressed={isSelectable ? selected : undefined}
                aria-label={
                    isSelectable
                        ? `${selected ? 'ยกเลิกเลือก' : 'เลือก'}โต๊ะ ${table.table_number} เพื่อรวมคิดเงิน`
                        : undefined
                }
                className={`
                    flex h-full w-full flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 font-kanit
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]
                    ${cardTone}
                `}
            >
                {/* สถานะจุดมุมขวาบน (เยื้องซ้ายให้พ้นปุ่มเมนูจัดการโต๊ะ / ช่องเลือก) */}
                {!selectionMode && (
                    <span
                        className={`
                            absolute top-3.5 right-12 w-2.5 h-2.5 rounded-full
                            ${isDisabled ? 'bg-stone-300'
                                : isOccupied ? 'bg-[#C27803]'
                                : 'bg-emerald-400'}
                        `}
                        aria-hidden="true"
                    />
                )}

                {/* ป้ายสถานะ */}
                <span className={`text-[11px] font-medium mb-1 ${isOccupied ? 'text-[#A0732E]' : 'text-stone-400'}`}>
                    {isDisabled ? 'ปิดใช้งาน' : isOccupied ? (selected ? 'เลือกรวมบิลแล้ว' : 'มีลูกค้า') : 'ว่าง'}
                </span>

                {/* เลขโต๊ะ */}
                <span className={`text-3xl font-bold leading-none truncate ${isOccupied ? 'text-[#5C3D1E]' : 'text-[#2D241E]'}`}>
                    {table.table_number}
                </span>

                {/* ส่วนล่างการ์ด — ตรึงไว้ก้นการ์ด (mt-auto) ทุกใบสูงเท่ากันเสมอ
                    โต๊ะที่มีลูกค้าแค่แสดงข้อมูลเพิ่ม ไม่ทำให้การ์ดใหญ่ขึ้น */}
                <div className="mt-auto pt-2.5 space-y-1 w-full">
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

            {/* ช่องเลือก (โหมดรวมโต๊ะ) — เป็นตัวบ่งชี้ภาพ ส่วนการกดอยู่ที่ทั้งการ์ด */}
            {isSelectable && (
                <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
                        selected
                            ? 'border-[#8C6D58] bg-[#8C6D58] text-white shadow-sm'
                            : 'border-[#C49A72] bg-white text-transparent'
                    }`}
                >
                    <Check className="h-4 w-4" strokeWidth={3} />
                </span>
            )}

            {/* เมนูจัดการโต๊ะ — ซ่อนระหว่างโหมดรวมโต๊ะ เพื่อไม่ให้กดผิดปุ่ม */}
            {!isDisabled && !selectionMode && (
                <div ref={menuRef} className="absolute right-2 top-2 z-20">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((open) => !open)}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-label={`ตัวเลือกโต๊ะ ${table.table_number}`}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[#E8DFD5] bg-white/90 text-[#7A6B5F] transition-colors duration-150 hover:bg-white hover:text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FDF6EE]"
                    >
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    </button>

                    {isMenuOpen && (
                        <div
                            role="menu"
                            aria-label={`จัดการโต๊ะ ${table.table_number}`}
                            className="absolute right-0 mt-1 w-56 overflow-hidden rounded-xl border border-[#E8DFD5] bg-white p-1 shadow-lg"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => runAction(onClick)}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#2D241E] transition-colors duration-150 hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
                            >
                                <UtensilsCrossed className="h-3.5 w-3.5 text-[#8C6D58]" aria-hidden="true" />
                                {isOccupied ? 'เปิดบิล / สั่งอาหาร' : 'เปิดโต๊ะ'}
                            </button>

                            {isOccupied && onCancelBill && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => runAction(onCancelBill)}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 transition-colors duration-150 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                                >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    ยกเลิกทั้งบิล
                                </button>
                            )}

                            {isOccupied && onCloseUnpaid && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => runAction(onCloseUnpaid)}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-amber-700 transition-colors duration-150 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                                >
                                    <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                                    ปิดบิลลูกค้าหนี (walkout)
                                </button>
                            )}

                            {onSyncStatus && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => runAction(onSyncStatus)}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#7A6B5F] transition-colors duration-150 hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                    ซิงค์สถานะโต๊ะ
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
