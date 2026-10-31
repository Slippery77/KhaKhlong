import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import { useTables } from '../hooks/useTables'
import TableCard from '../components/TableCard'
import type { DiningTable } from '../types/table.types'
import { useAuth } from '../../auth/context/AuthContext'
import { CheckCircle2, RefreshCw, X } from 'lucide-react'
import OpenShiftCard from '../../shifts/components/OpenShiftCard'
import { useShift } from '../../shifts/hooks/useShift'
import StaleDataBanner from '../../offline/components/StaleDataBanner'
import CancelBillModal, {
    type BillActionMode,
    type BillActionPayload,
} from '../../mainpos/components/CancelBillModal'
import { cancelOrder, closeUnpaid } from '../../mainpos/api/orders.api'
import { syncTableStatus } from '../api/tables.api'

// จัดกลุ่มโต๊ะตามชั้น (floor_no มาจาการ JOIN floors — null แปลว่าชั้นถูกลบไปแล้ว ให้ไป"group อื่น")
function groupByFloor(tables: DiningTable[]): Map<number, DiningTable[]> {
    const map = new Map<number, DiningTable[]>()
    for (const t of tables) {
        const group = map.get(t.floor_no ?? -1) ?? []
        group.push(t)
        map.set(t.floor_no ?? -1, group)
    }
    return map
}

export default function TablesPage() {
    const { tables, isLoading, error, staleSince, reload } = useTables()
    const navigate = useNavigate()
    const { user, accessToken } = useAuth()
    // null = แสดงทุกชั้น, ตัวเลข = แสดงเฉพาะชั้นที่เลือกจาก sidebar
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
    // modal ยกเลิกทั้งบิล / ปิดบิลลูกค้าหนี (ใช้ component เดียวกับหน้า POS)
    const [billTarget, setBillTarget] = useState<{ table: DiningTable; mode: BillActionMode } | null>(null)
    const [billLoading, setBillLoading] = useState(false)
    const [billError, setBillError] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const occupiedCount = tables.filter((t) => t.status === 'occupied').length
    const floors = groupByFloor(tables)
    // ชั้นที่จะแสดง = ชั้นที่เลือกไว้ หรือทุกชั้นถ้าไม่ได้เลือก
    const visibleFloors = selectedFloor === null
        ? Array.from(floors.entries())
        : Array.from(floors.entries()).filter(([floor]) => floor === selectedFloor)
    const visibleTables = visibleFloors.flatMap(([, floorTables]) => floorTables)
    const visibleOccupied = visibleTables.filter((t) => t.status === 'occupied').length
    const { shift, isLoading:isShiftLoading, isSubmitting, error:shiftError, staleSince: shiftStaleSince, openShift} = useShift()
    // ออฟไลน์ (ข้อมูลกะมาจาก cache) ห้ามเด้งให้เปิดกะ — เปิดกะต้องใช้ server เสมอ
    const needOpenShift = !isShiftLoading && !shiftError && shiftStaleSince === null && shift === null

    function handleTableClick(table: DiningTable) {
        // ส่ง tableId และ tableName ไปหน้า POS ผ่าน URL query params
        navigate(
            `/${user?.tenantSlug}/mainpos?tableId=${table.table_id}&tableName=${encodeURIComponent(table.table_number)}${
                table.open_order_id ? `&orderId=${table.open_order_id}` : ''
            }`,
        )
    }

    // แจ้งผลแล้วหายเองใน 5 วินาที
    useEffect(() => {
        if (!toast) return
        const timer = window.setTimeout(() => setToast(null), 5000)
        return () => window.clearTimeout(timer)
    }, [toast])

    function openBillModal(table: DiningTable, mode: BillActionMode) {
        if (!table.open_order_id) {
            setToast('โต๊ะนี้ไม่มีบิลเปิดอยู่ — ลองกด "ซิงค์สถานะโต๊ะ" ก่อน')
            return
        }
        setBillError(null)
        setToast(null)
        setBillTarget({ table, mode })
    }

    async function handleBillConfirm(payload: BillActionPayload) {
        if (!billTarget) return
        const orderId = billTarget.table.open_order_id
        if (!orderId) {
            setBillError('ไม่พบบิลเปิดของโต๊ะนี้ กรุณาซิงค์สถานะโต๊ะก่อน')
            return
        }
        setBillLoading(true)
        setBillError(null)
        try {
            if (billTarget.mode === 'cancel') {
                const res = await cancelOrder(
                    orderId,
                    { reason: payload.reason, note: payload.note, approverPin: payload.approverPin },
                    accessToken,
                )
                setToast(
                    `ยกเลิกบิล ${billTarget.table.table_number} แล้ว ${res.data.voidedCount} รายการ · อนุมัติโดย ${res.data.approvedBy.displayName}`,
                )
            } else {
                const res = await closeUnpaid(
                    orderId,
                    {
                        closeReason: payload.closeReason ?? 'walkout',
                        note: payload.note,
                        approverPin: payload.approverPin,
                    },
                    accessToken,
                )
                setToast(
                    `ปิดบิล ${billTarget.table.table_number} โดยไม่เก็บเงินแล้ว · อนุมัติโดย ${res.data.approvedBy.displayName}`,
                )
            }
            setBillTarget(null)
            await reload()
        } catch (err) {
            setBillError(err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่')
        } finally {
            setBillLoading(false)
        }
    }

    async function handleSyncStatus(table: DiningTable) {
        try {
            const res = await syncTableStatus(table.table_id, accessToken)
            const label =
                res.data.status === 'occupied'
                    ? 'มีลูกค้า'
                    : res.data.status === 'out_of_service'
                        ? 'ปิดใช้งาน'
                        : 'ว่าง'
            setToast(`ซิงค์สถานะโต๊ะ ${table.table_number} แล้ว: ${label}`)
            await reload()
        } catch (err) {
            setToast(err instanceof Error ? err.message : 'ซิงค์สถานะโต๊ะไม่สำเร็จ')
        }
    }

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF7F2]">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar ชั้น */}
                <aside className="w-30 shrink-0 bg-[#F3EDE4] border-r border-stone-200 flex flex-col items-center py-4 gap-2 overflow-y-auto">
                    {/* ปุ่ม "ทั้งหมด" — กลับมาแสดงโต๊ะทุกชั้น */}
                    <button
                        type="button"
                        onClick={() => setSelectedFloor(null)}
                        className={`w-16 rounded-xl transition-all py-2 px-1 text-center cursor-pointer ${
                            selectedFloor === null
                                ? 'bg-[#8C6D58] hover:bg-[#7a5c45] active:scale-95'
                                : 'bg-[#EDE3D6] hover:bg-[#E4D6C4] active:scale-95'
                        }`}
                    >
                        <p className={`text-[11px] font-semibold ${selectedFloor === null ? 'text-[#FAF7F2]' : 'text-[#5C3D1E]'}`}>
                            ทั้งหมด
                        </p>
                        <p className={`text-[10px] mt-0.5 ${selectedFloor === null ? 'text-[#E8DFD5]' : 'text-[#8C6D58]'}`}>
                            {tables.length} โต๊ะ
                        </p>
                    </button>

                    {Array.from(floors.keys()).map((floor) => {
                        const floorTables = floors.get(floor)!
                        const occupied = floorTables.filter((t) => t.status === 'occupied').length
                        const isActive = selectedFloor === floor
                        return (
                            <button
                                key={floor}
                                type="button"
                                onClick={() => setSelectedFloor(floor)}
                                className={`w-16 rounded-xl transition-all py-2 px-1 text-center cursor-pointer ${
                                    isActive
                                        ? 'bg-[#8C6D58] hover:bg-[#7a5c45] active:scale-95'
                                        : 'bg-[#EDE3D6] hover:bg-[#E4D6C4] active:scale-95'
                                }`}
                            >
                                <p className={`text-[11px] font-semibold ${isActive ? 'text-[#FAF7F2]' : 'text-[#5C3D1E]'}`}>
                                    ชั้น {floor}
                                </p>
                                <p className={`text-[10px] mt-0.5 ${isActive ? 'text-[#E8DFD5]' : 'text-[#8C6D58]'}`}>
                                    {occupied}/{floorTables.length} โต๊ะ
                                </p>
                            </button>
                        )
                    })}

                    {/* สรุปโต๊ะที่มีลูกค้าทั้งหมด */}
                    <div className="mt-auto w-16 rounded-xl bg-[#EDE3D6] py-2 px-1 text-center">
                        <p className="text-[10px] text-[#8C6D58]">มีลูกค้า</p>
                        <p className="text-lg font-bold text-[#5C3D1E] leading-tight">{occupiedCount}</p>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {/* Header โต๊ะ */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-lg font-bold text-[#2D241E] font-kanit">ผังโต๊ะ</h1>
                            {!isLoading && !error && (
                                <p className="text-sm text-stone-400 font-kanit mt-0.5">
                                    {selectedFloor === null
                                        ? `${tables.length} โต๊ะ · มีลูกค้า ${occupiedCount} โต๊ะ`
                                        : `ชั้น ${selectedFloor} · ${visibleTables.length} โต๊ะ · มีลูกค้า ${visibleOccupied} โต๊ะ`}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={reload}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-stone-100 active:scale-95 transition-all font-kanit cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>รีเฟรช</span>
                        </button>
                    </div>

                    {/* ติดต่อ server ไม่ได้ — กำลังแสดงผังโต๊ะล่าสุดที่บันทึกไว้ในเครื่อง */}
                    {!isLoading && !error && staleSince !== null && (
                        <div className="mb-4 font-kanit">
                            <StaleDataBanner label="ข้อมูลโต๊ะ" savedAt={staleSince} onRetry={reload} />
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <p className="text-sm text-stone-400 font-kanit">กำลังโหลดข้อมูลโต๊ะ...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-3 py-20 font-kanit">
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                type="button"
                                onClick={reload}
                                className="rounded-xl border border-[#d9c6b0] px-4 py-2 text-sm text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 font-kanit">
                            <p className="text-sm text-stone-400">ยังไม่มีโต๊ะ กรุณาเพิ่มโต๊ะในหน้าตั้งค่าก่อน</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {visibleFloors.map(([floor, floorTables]) => {
                                // แยกโต๊ะมีลูกค้าขึ้นก่อน เพื่อให้เป็นแถว/กลุ่มต่างหากจากโต๊ะว่าง
                                const occupiedTables = floorTables.filter((t) => t.status === 'occupied')
                                const freeTables = floorTables.filter((t) => t.status !== 'occupied')
                                return (
                                    <section key={floor} id={`floor-${floor}`}>
                                        <h2 className="text-sm font-semibold text-stone-400 font-kanit mb-3">
                                            ชั้น {floor} — {floorTables.length} โต๊ะ
                                        </h2>

                                        {/* โต๊ะที่มีลูกค้า */}
                                        {occupiedTables.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold text-[#A0732E] font-kanit mb-2">
                                                    มีลูกค้า ({occupiedTables.length})
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-stretch">
                                                    {occupiedTables.map((table) => (
                                                        <TableCard
                                                            key={table.table_id}
                                                            table={table}
                                                            onClick={handleTableClick}
                                                            onCancelBill={(target) => openBillModal(target, 'cancel')}
                                                            onCloseUnpaid={(target) => openBillModal(target, 'closeUnpaid')}
                                                            onSyncStatus={handleSyncStatus}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* โต๊ะว่าง + ปิดใช้งาน */}
                                        {freeTables.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-stone-400 font-kanit mb-2">
                                                    ว่าง ({freeTables.length})
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-stretch">
                                                    {freeTables.map((table) => (
                                                        <TableCard
                                                            key={table.table_id}
                                                            table={table}
                                                            onClick={handleTableClick}
                                                            onSyncStatus={handleSyncStatus}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>
            {billTarget && (
                <CancelBillModal
                    isOpen={true}
                    mode={billTarget.mode}
                    itemCount={billTarget.table.item_count}
                    total={billTarget.table.total_amount}
                    loading={billLoading}
                    error={billError}
                    onClose={() => {
                        if (billLoading) return
                        setBillTarget(null)
                        setBillError(null)
                    }}
                    onConfirm={handleBillConfirm}
                />
            )}

            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#2D241E] px-5 py-3 font-kanit text-white shadow-xl"
                >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span className="text-sm font-medium">{toast}</span>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        aria-label="ปิดการแจ้งเตือน"
                        className="cursor-pointer rounded-lg p-1 text-white/70 transition-colors duration-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {needOpenShift &&(
                <div
                    role="dialog"
                    aria-model="true"
                    aria-label="เปิดกะก่อนเริ่มขาย"
                    className = "fixed inset-0 z-50 flex items-center justify-center bg-[#2D241E]/40 p-4 font-kanit"
                >
                    <div className='w-full max-w-md'>
                        <OpenShiftCard isSubmitting={isSubmitting} onSubmit={openShift}/>
                    </div>
                </div>
            )}
        </div>
    )
}
