import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import { useTables } from '../hooks/useTables'
import TableCard from '../components/TableCard'
import type { DiningTable } from '../types/table.types'
import { useAuth } from '../../auth/context/AuthContext'
import { CheckCircle2, Link2, Loader2, RefreshCw, Wallet, X } from 'lucide-react'
import OpenShiftCard from '../../shifts/components/OpenShiftCard'
import { useShift } from '../../shifts/hooks/useShift'
import StaleDataBanner from '../../offline/components/StaleDataBanner'
import CancelBillModal, {
    type BillActionMode,
    type BillActionPayload,
} from '../../mainpos/components/CancelBillModal'
import PaymentModal from '../../mainpos/components/PaymentModal'
import { usePayment } from '../../mainpos/hooks/usePayment'
import { cancelOrder, closeUnpaid } from '../../mainpos/api/orders.api'
import { syncTableStatus } from '../api/tables.api'

/** รวมคิดเงินได้สูงสุดตามข้อจำกัดของ POST /payments/attempts (orderIds ไม่เกิน 10) */
const MAX_MERGE_TABLES = 10

const baht = (n: number) =>
    `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

/** ยอดรวมของโต๊ะที่เลือก — มาจาก server เท่านั้น ผูกกับชุดบิล (key) ที่ขอไป */
interface MergeSummaryState {
    key: string
    amount: number | null
    itemCount: number | null
    error: string | null
}

export default function TablesPage() {
    const { tables, isLoading, error, staleSince, reload } = useTables()
    const navigate = useNavigate()
    const { user, accessToken } = useAuth()
    const { getOrdersSummary } = usePayment()
    // null = แสดงทุกชั้น, ตัวเลข = แสดงเฉพาะชั้นที่เลือกจาก sidebar
    const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
    // modal ยกเลิกทั้งบิล / ปิดบิลลูกค้าหนี (ใช้ component เดียวกับหน้า POS)
    const [billTarget, setBillTarget] = useState<{ table: DiningTable; mode: BillActionMode } | null>(null)
    const [billLoading, setBillLoading] = useState(false)
    const [billError, setBillError] = useState<string | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    // ── รวมโต๊ะคิดเงิน ─────────────────────────────────────────────
    const [isMergeMode, setIsMergeMode] = useState(false)
    const [selectedTableIds, setSelectedTableIds] = useState<string[]>([])
    const [isMergePaymentOpen, setIsMergePaymentOpen] = useState(false)
    const [mergeSummary, setMergeSummary] = useState<MergeSummaryState | null>(null)

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

    // ตัดโต๊ะที่ไม่มีบิลเปิดแล้วออกเอง (เช่น เครื่องอื่นชำระไปแล้วหลังรีเฟรช) — คงลำดับที่เลือก
    const selectedTables = selectedTableIds
        .map((id) => tables.find((t) => t.table_id === id))
        .filter((t): t is DiningTable => Boolean(t && t.status === 'occupied' && t.open_order_id))
    const selectedOrderIds = selectedTables.map((t) => t.open_order_id as string)
    const selectedOrderKey = selectedOrderIds.join(',')
    const mergeLabel = selectedTables.map((t) => t.table_number).join(' + ')
    const canMergePay = selectedTables.length >= 2
    const currentSummary = mergeSummary && mergeSummary.key === selectedOrderKey ? mergeSummary : null
    const isSummaryLoading = selectedOrderKey !== '' && currentSummary === null

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

    // ดึงยอดรวมของโต๊ะที่เลือกจาก server (หน่วง 250ms กันยิงถี่ตอนติ๊กหลายโต๊ะติดกัน)
    // client ไม่รวมยอดเอง — ยอดจริงยืนยันอีกครั้งตอนสร้าง payment attempt
    useEffect(() => {
        if (!isMergeMode || !selectedOrderKey) return
        let cancelled = false
        const timer = window.setTimeout(() => {
            getOrdersSummary(selectedOrderKey.split(','))
                .then((data) => {
                    if (!cancelled) {
                        setMergeSummary({ key: selectedOrderKey, amount: data.amount, itemCount: data.itemCount, error: null })
                    }
                })
                .catch((err: unknown) => {
                    if (!cancelled) {
                        setMergeSummary({
                            key: selectedOrderKey,
                            amount: null,
                            itemCount: null,
                            error: err instanceof Error ? err.message : 'ดึงยอดรวมไม่สำเร็จ',
                        })
                    }
                })
        }, 250)
        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [getOrdersSummary, isMergeMode, selectedOrderKey])

    // กด Esc เพื่อออกจากโหมดรวมโต๊ะ (ยกเว้นตอนหน้าชำระเงินเปิดอยู่)
    useEffect(() => {
        if (!isMergeMode || isMergePaymentOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') exitMergeMode()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isMergeMode, isMergePaymentOpen])

    function exitMergeMode() {
        setIsMergeMode(false)
        setSelectedTableIds([])
        setMergeSummary(null)
    }

    function toggleMergeMode() {
        if (isMergeMode) {
            exitMergeMode()
            return
        }
        setToast(null)
        setIsMergeMode(true)
    }

    function toggleSelectTable(table: DiningTable) {
        setSelectedTableIds((prev) => {
            if (prev.includes(table.table_id)) return prev.filter((id) => id !== table.table_id)
            if (prev.length >= MAX_MERGE_TABLES) {
                setToast(`รวมคิดเงินได้สูงสุด ${MAX_MERGE_TABLES} โต๊ะต่อครั้ง`)
                return prev
            }
            return [...prev, table.table_id]
        })
    }

    async function handleMergePaymentSuccess(receiptNumber: string) {
        setIsMergePaymentOpen(false)
        setToast(`ชำระเงินรวม ${mergeLabel} สำเร็จ · ใบเสร็จ ${receiptNumber}`)
        exitMergeMode()
        await reload()
    }

    async function handleMergePaymentClose() {
        setIsMergePaymentOpen(false)
        // ยอดอาจเปลี่ยนระหว่างเปิดหน้าชำระ → โหลดโต๊ะใหม่และให้แถบล่างขอยอดใหม่
        setMergeSummary(null)
        await reload()
    }

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

    const renderCard = (table: DiningTable) => (
        <TableCard
            key={table.table_id}
            table={table}
            onClick={handleTableClick}
            onCancelBill={table.status === 'occupied' ? (target) => openBillModal(target, 'cancel') : undefined}
            onCloseUnpaid={table.status === 'occupied' ? (target) => openBillModal(target, 'closeUnpaid') : undefined}
            onSyncStatus={handleSyncStatus}
            selectionMode={isMergeMode}
            selected={selectedTableIds.includes(table.table_id)}
            onToggleSelect={toggleSelectTable}
        />
    )

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

                {/* Main Content — เว้นที่ล่างให้แถบรวมโต๊ะไม่บังการ์ด */}
                <main className={`flex-1 overflow-y-auto p-6 ${isMergeMode ? 'pb-36' : ''}`}>
                    {/* Header โต๊ะ */}
                    <div className="flex items-center justify-between gap-3 mb-6">
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
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleMergeMode}
                                disabled={!isMergeMode && occupiedCount < 2}
                                aria-pressed={isMergeMode}
                                title={occupiedCount < 2 ? 'ต้องมีโต๊ะที่มีลูกค้าอย่างน้อย 2 โต๊ะ' : undefined}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium font-kanit transition-all duration-200 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
                                    isMergeMode
                                        ? 'border-[#8C6D58] bg-[#8C6D58] text-white hover:bg-[#7a5c45]'
                                        : 'border-[#d9c6b0] bg-white text-[#8C6D58] hover:bg-[#F6EBDD]'
                                }`}
                            >
                                {isMergeMode ? <X className="w-3.5 h-3.5" aria-hidden="true" /> : <Link2 className="w-3.5 h-3.5" aria-hidden="true" />}
                                <span>{isMergeMode ? 'ยกเลิกรวมโต๊ะ' : 'รวมโต๊ะคิดเงิน'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={reload}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-stone-100 active:scale-95 transition-all font-kanit cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>รีเฟรช</span>
                            </button>
                        </div>
                    </div>

                    {/* คำแนะนำโหมดรวมโต๊ะ */}
                    {isMergeMode && (
                        <div
                            role="status"
                            className="mb-5 flex items-start gap-3 rounded-2xl border border-[#E8DFD5] bg-[#F6EBDD] px-4 py-3 font-kanit"
                        >
                            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
                            <div className="text-sm text-[#5C3D1E]">
                                <p className="font-semibold">โหมดรวมโต๊ะคิดเงิน</p>
                                <p className="text-xs text-[#7A6B5F] mt-0.5">
                                    แตะโต๊ะที่มีลูกค้าตั้งแต่ 2 โต๊ะขึ้นไป แต่ละโต๊ะยังสั่งอาหารแยกกันตามปกติ แล้วชำระเงินรวมเป็นใบเสร็จเดียว · กด Esc เพื่อยกเลิก
                                </p>
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
                                                    {occupiedTables.map(renderCard)}
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
                                                    {freeTables.map(renderCard)}
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

            {/* แถบลอยด้านล่าง: สรุปโต๊ะที่เลือก + ยอดรวมจาก server + ปุ่มชำระเงินรวม */}
            {isMergeMode && (
                <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5 font-kanit">
                    <div
                        role="region"
                        aria-label="สรุปการรวมโต๊ะคิดเงิน"
                        className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-4 rounded-2xl border border-[#d9c6b0] bg-white px-5 py-4 shadow-[0_12px_32px_rgba(45,36,30,0.18)]"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-stone-500">
                                เลือกแล้ว {selectedTables.length} โต๊ะ
                                {selectedTables.length < 2 && ' · เลือกอีกอย่างน้อย ' + (2 - selectedTables.length) + ' โต๊ะ'}
                            </p>
                            {selectedTables.length > 0 ? (
                                <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="โต๊ะที่เลือก">
                                    {selectedTables.map((t) => (
                                        <li key={t.table_id}>
                                            <button
                                                type="button"
                                                onClick={() => toggleSelectTable(t)}
                                                aria-label={`เอาโต๊ะ ${t.table_number} ออกจากการรวม`}
                                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#E8DFD5] bg-[#FAF7F2] px-2 py-0.5 text-xs font-semibold text-[#5C3D1E] transition-colors duration-150 hover:border-[#C49A72] hover:bg-[#F6EBDD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
                                            >
                                                {t.table_number}
                                                <X className="h-3 w-3 text-[#8C6D58]" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-1 text-sm text-stone-400">แตะการ์ดโต๊ะที่มีลูกค้าเพื่อเลือก</p>
                            )}
                        </div>

                        <div className="text-right" aria-live="polite">
                            <p className="text-[11px] text-stone-500">
                                {currentSummary?.itemCount != null
                                    ? `ยอดรวม · ${currentSummary.itemCount.toLocaleString('th-TH')} รายการ`
                                    : 'ยอดรวม'}
                            </p>
                            {selectedTables.length === 0 ? (
                                <p className="text-xl font-bold tabular-nums text-stone-300">—</p>
                            ) : isSummaryLoading ? (
                                <span className="mt-1 inline-block h-7 w-28 animate-pulse rounded-lg bg-stone-200/80" />
                            ) : currentSummary?.error ? (
                                <p className="max-w-48 text-xs text-rose-600">{currentSummary.error}</p>
                            ) : (
                                <p className="text-xl font-bold tabular-nums text-[#2D241E]">
                                    {currentSummary?.amount != null ? baht(currentSummary.amount) : '—'}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedTableIds([])}
                                disabled={selectedTables.length === 0}
                                className="cursor-pointer rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-600 transition-colors duration-150 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ล้าง
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMergePaymentOpen(true)}
                                disabled={!canMergePay || isSummaryLoading || Boolean(currentSummary?.error)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#8C6D58] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#7a5c45] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                            >
                                {isSummaryLoading && canMergePay ? (
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Wallet className="h-4 w-4" aria-hidden="true" />
                                )}
                                ชำระเงินรวม{canMergePay ? ` (${selectedTables.length} โต๊ะ)` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isMergePaymentOpen && canMergePay && (
                <PaymentModal
                    table={`โต๊ะ ${mergeLabel}`}
                    orderIds={selectedOrderIds}
                    onClose={handleMergePaymentClose}
                    onPaymentSuccess={handleMergePaymentSuccess}
                />
            )}

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
                    className={`fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#2D241E] px-5 py-3 font-kanit text-white shadow-xl ${
                        isMergeMode ? 'bottom-36' : 'bottom-6'
                    }`}
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
                    aria-modal="true"
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
