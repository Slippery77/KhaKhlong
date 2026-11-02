import { useState, useId, useEffect } from 'react'
import { X, ArrowRightLeft, Check, Users, AlertCircle, Loader2, Layers } from 'lucide-react'
import type { DiningTable } from '../types/table.types'

interface MoveTableModalProps {
    isOpen: boolean
    sourceTable: DiningTable
    tables: DiningTable[]
    isLoading: boolean
    error: string | null
    getTableOutboxCount: (table: DiningTable) => number
    onConfirm: (targetTable: DiningTable) => void
    onClose: () => void
}

export default function MoveTableModal({
    isOpen,
    sourceTable,
    tables,
    isLoading,
    error,
    getTableOutboxCount,
    onConfirm,
    onClose,
}: MoveTableModalProps) {
    const titleId = useId()
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
    const [filterFloor, setFilterFloor] = useState<number | null>(null)

    // รวบรวมชั้นทั้งหมดที่มีในร้าน
    const allFloors = Array.from(
        new Set(tables.map((t) => t.floor_no).filter((f): f is number => f !== null)),
    ).sort((a, b) => a - b)

    // คัดกรองเฉพาะโต๊ะปลายทางที่:
    // 1. ไม่ใช่โต๊ะต้นทาง
    // 2. ว่าง (available)
    // 3. ไม่มี Outbox ค้างในเครื่องนี้
    const availableTables = tables.filter((t) => {
        if (t.table_id === sourceTable.table_id) return false
        if (t.status !== 'available') return false
        if (getTableOutboxCount(t) > 0) return false
        if (filterFloor !== null && t.floor_no !== filterFloor) return false
        return true
    })

    const selectedTargetTable = tables.find((t) => t.table_id === selectedTableId)

    // ปิดด้วยปุ่ม Escape
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, isLoading, onClose])

    // รีเซ็ตการเลือกเมื่อเปิด modal
    useEffect(() => {
        if (isOpen) {
            setSelectedTableId(null)
            setFilterFloor(sourceTable.floor_no ?? null)
        }
    }, [isOpen, sourceTable])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs font-kanit animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-[#FAF7F2] border border-[#E8DFD5] shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DFD5] bg-[#F4EFE6]/80 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58]">
                            <ArrowRightLeft className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 id={titleId} className="text-base font-semibold text-[#2D241E]">
                                ย้ายโต๊ะ
                            </h2>
                            <p className="text-xs text-[#7A6B5F]">
                                จากโต๊ะ{' '}
                                <span className="font-semibold text-[#5C3D1E]">
                                    {sourceTable.table_number}
                                </span>{' '}
                                (ชั้น {sourceTable.floor_no ?? '-'}) ไปยังโต๊ะใหม่ที่ว่างอยู่
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        aria-label="ปิดหน้าต่าง"
                        className="rounded-lg p-1.5 text-[#7A6B5F] hover:bg-[#EFE8DC] hover:text-[#2D241E] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:opacity-50"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {/* เนื้อหา */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ตัวกรองชั้น (Floor tabs) */}
                    {allFloors.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
                            <span className="text-xs text-[#7A6B5F] flex items-center gap-1 mr-1 shrink-0">
                                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>ชั้น:</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setFilterFloor(null)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                                    filterFloor === null
                                        ? 'bg-[#8C6D58] text-white shadow-xs'
                                        : 'bg-[#EFE8DC]/80 text-[#7A6048] hover:bg-[#E8DFD5]'
                                }`}
                            >
                                ทั้งหมด
                            </button>
                            {allFloors.map((floor) => (
                                <button
                                    key={floor}
                                    type="button"
                                    onClick={() => setFilterFloor(floor)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                                        filterFloor === floor
                                            ? 'bg-[#8C6D58] text-white shadow-xs'
                                            : 'bg-[#EFE8DC]/80 text-[#7A6048] hover:bg-[#E8DFD5]'
                                    }`}
                                >
                                    ชั้น {floor}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* รายการโต๊ะว่าง (Grid) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-[#7A6B5F]">
                                เลือกโต๊ะปลายทางที่ต้องการ (ว่าง {availableTables.length} โต๊ะ)
                            </span>
                        </div>

                        {availableTables.length === 0 ? (
                            <div className="py-10 text-center rounded-xl border border-dashed border-[#d9c6b0] bg-[#FAF7F2]">
                                <p className="text-sm text-stone-500 font-medium">ไม่มีโต๊ะว่างในขณะนี้</p>
                                <p className="text-xs text-stone-400 mt-1">
                                    {filterFloor !== null
                                        ? `ไม่มีโต๊ะว่างบนชั้น ${filterFloor} ลองเลือกดูชั้นอื่น`
                                        : 'โต๊ะทั้งหมดในร้านกำลังมีลูกค้า หรือปิดใช้งาน'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto p-1">
                                {availableTables.map((table) => {
                                    const isSelected = selectedTableId === table.table_id
                                    return (
                                        <button
                                            key={table.table_id}
                                            type="button"
                                            onClick={() => setSelectedTableId(table.table_id)}
                                            className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-[#8C6D58] bg-[#FDF6EE] ring-2 ring-[#8C6D58] shadow-sm'
                                                    : 'border-[#E8DFD5] bg-white hover:border-[#8C6D58]/60 hover:bg-[#FAF7F2]'
                                            }`}
                                        >
                                            {/* Checkmark badge */}
                                            {isSelected && (
                                                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#8C6D58] text-white flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                                                </div>
                                            )}

                                            <span className="text-lg font-bold text-[#2D241E] leading-tight">
                                                {table.table_number}
                                            </span>

                                            <div className="flex items-center gap-1 mt-1 text-[11px] text-stone-500">
                                                <Users className="w-3 h-3 text-stone-400" aria-hidden="true" />
                                                <span>{table.capacity} ที่นั่ง</span>
                                                {table.floor_no !== null && (
                                                    <span className="text-stone-400">· ช.{table.floor_no}</span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8DFD5] bg-[#F4EFE6]/80 shrink-0">
                    <div className="text-xs">
                        {selectedTargetTable ? (
                            <span className="text-[#5C3D1E]">
                                ย้ายไป:{' '}
                                <strong className="text-[#2D241E] font-semibold">
                                    โต๊ะ {selectedTargetTable.table_number}
                                </strong>{' '}
                                (ชั้น {selectedTargetTable.floor_no ?? '-'})
                            </span>
                        ) : (
                            <span className="text-stone-400">กรุณาเลือกโต๊ะปลายทาง</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-xl border border-[#d9c6b0] text-xs font-medium text-[#5C3D1E] hover:bg-[#EFE8DC] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={!selectedTargetTable || isLoading}
                            onClick={() => selectedTargetTable && onConfirm(selectedTargetTable)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8C6D58] text-white text-xs font-medium hover:bg-[#7a5c45] active:scale-[0.98] transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                    <span>กำลังย้ายโต๊ะ...</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>ยืนยันย้ายโต๊ะ</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

