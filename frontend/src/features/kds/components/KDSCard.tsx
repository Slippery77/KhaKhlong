import { useState, useEffect } from "react"
import type { KDSTicket, KDSStatus } from "../types/kds.types"
import { toBackendStatus } from "../types/kds.types"
import { Clock, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

export interface KDSCardProps {
    ticket: KDSTicket
    onUpdateStatus: (
        itemIds: string[],
        nextBackendStatus: "queued" | "preparing" | "ready" | "served" | "voided",
        voidReason?: string,
    ) => Promise<void>
}

export default function KDSCard({ ticket, onUpdateStatus }: KDSCardProps) {
    const [secondsElapsed, setSecondsElapsed] = useState(() =>
        Math.max(0, Math.floor((Date.now() - ticket.createdAt) / 1000)),
    )
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsElapsed(Math.max(0, Math.floor((Date.now() - ticket.createdAt) / 1000)))
        }, 1000)
        return () => clearInterval(interval)
    }, [ticket.createdAt])

    const formatElapsedTime = (totalSeconds: number): string => {
        if (totalSeconds < 60) return `${totalSeconds} วิ`
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return seconds === 0 ? `${minutes} นาที` : `${minutes} นาที ${seconds} วิ`
    }

    const getStatusTheme = (status: KDSStatus) => {
        switch (status) {
            case "รอทำ":
                return {
                    borderLeft: "border-l-4 border-l-[#C27803]",
                    badgeBg: "bg-[#C27803] text-white",
                    actionBtnBg: "bg-[#AA8971] hover:bg-[#977861] text-white",
                }
            case "กำลังทำ":
                return {
                    borderLeft: "border-l-4 border-l-[#3B75A6]",
                    badgeBg: "bg-[#3B75A6] text-white",
                    actionBtnBg: "bg-[#AA8971] hover:bg-[#977861] text-white",
                }
            case "พร้อมเสิร์ฟ":
                return {
                    borderLeft: "border-l-4 border-l-[#2E7D4E]",
                    badgeBg: "bg-[#2E7D4E] text-white",
                    actionBtnBg: "bg-[#2E7D4E] hover:bg-[#25663F] text-white",
                }
        }
    }

    const theme = getStatusTheme(ticket.overallStatus)
    const allItemIds = ticket.items.map((i) => i.order_item_id)

    const handleAction = async (nextUI: KDSStatus) => {
        setLoading(true)
        await onUpdateStatus(allItemIds, toBackendStatus(nextUI))
        setLoading(false)
    }

    const handleServed = async () => {
        setLoading(true)
        await onUpdateStatus(allItemIds, "served")
        setLoading(false)
    }

    const handleVoid = async () => {
        setLoading(true)
        await onUpdateStatus(allItemIds, "voided", "ยกเลิกโดยครัว")
        setShowCancelConfirm(false)
        setLoading(false)
    }

    return (
        <div
            className={`bg-white rounded-2xl border border-stone-200/90 ${theme.borderLeft} p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between font-kanit`}
        >
            {/* Header */}
            <div>
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                        {ticket.orderNumber && (
                            <span className="text-xs text-stone-400 font-medium">
                                #{ticket.orderNumber}
                            </span>
                        )}
                        <span className="text-lg font-bold text-[#2D241E]">
                            โต๊ะ {ticket.tableNumber}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${theme.badgeBg}`}>
                            {ticket.overallStatus}
                        </span>
                    </div>
                    <div
                        className="flex items-center gap-1 text-xs font-medium text-stone-500"
                        title={`ส่งครัวเมื่อ ${new Date(ticket.createdAt).toLocaleTimeString("th-TH")}`}
                    >
                        <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>{formatElapsedTime(secondsElapsed)}</span>
                    </div>
                </div>

                {/* รายการอาหาร — แสดงทุก item ใน ticket */}
                <div className="py-3 flex flex-col gap-3">
                    {ticket.items.map((item) => (
                        <div key={item.order_item_id} className="flex flex-col text-sm text-[#2D241E]">
                            {/* ชื่อเมนู */}
                            <div className="font-semibold flex items-start gap-1.5">
                                <span className="text-[#8C6D58] font-bold shrink-0">×1</span>
                                <span>{item.item_name_snapshot}</span>
                                {/* สถานะ item แต่ละตัว (ถ้าไม่ตรงกัน) */}
                                {item.status !== ticket.items[0]?.status && (
                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                                        item.status === "preparing" ? "bg-blue-100 text-blue-700"
                                        : item.status === "ready" ? "bg-green-100 text-green-700"
                                        : "bg-stone-100 text-stone-500"
                                    }`}>
                                        {item.status}
                                    </span>
                                )}
                            </div>

                            {/* modifiers */}
                            {item.modifiers && item.modifiers.length > 0 && (
                                <div className="pl-5 mt-0.5 space-y-0.5">
                                    {item.modifiers.map((mod) => (
                                        <p key={mod.modifier_id} className="text-xs text-stone-500">
                                            • {mod.name}
                                            {mod.price_delta > 0 && (
                                                <span className="text-[#A68874] ml-1">
                                                    +฿{mod.price_delta}
                                                </span>
                                            )}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* special_request */}
                            {item.special_request && (
                                <p className="text-xs text-amber-700 italic pl-5 mt-0.5">
                                    • {item.special_request}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
                {showCancelConfirm ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>ยืนยันยกเลิกออเดอร์นี้?</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleVoid}
                                disabled={loading}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                                {loading ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCancelConfirm(false)}
                                className="py-1.5 px-3 rounded-lg border border-stone-300 text-stone-600 hover:bg-white text-xs font-medium transition-all cursor-pointer"
                            >
                                ไม่ยกเลิก
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {ticket.overallStatus === "รอทำ" && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCancelConfirm(true)}
                                    disabled={loading}
                                    className="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>ยกเลิก</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAction("กำลังทำ")}
                                    disabled={loading}
                                    className={`flex-1 py-2.5 px-4 rounded-xl ${theme.actionBtnBg} font-medium text-sm transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50`}
                                >
                                    <span>{loading ? "กำลังอัปเดต..." : "กำลังทำ"}</span>
                                    {!loading && <ArrowRight className="w-4 h-4 opacity-75" />}
                                </button>
                            </div>
                        )}

                        {ticket.overallStatus === "กำลังทำ" && (
                            <button
                                type="button"
                                onClick={() => handleAction("พร้อมเสิร์ฟ")}
                                disabled={loading}
                                className={`w-full py-2.5 px-4 rounded-xl ${theme.actionBtnBg} font-medium text-sm transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50`}
                            >
                                <span>{loading ? "กำลังอัปเดต..." : "พร้อมเสิร์ฟ"}</span>
                                {!loading && <CheckCircle2 className="w-4 h-4 opacity-75" />}
                            </button>
                        )}

                        {ticket.overallStatus === "พร้อมเสิร์ฟ" && (
                            <button
                                type="button"
                                onClick={handleServed}
                                disabled={loading}
                                className={`w-full py-2.5 px-4 rounded-xl ${theme.actionBtnBg} font-medium text-sm transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{loading ? "กำลังบันทึก..." : "เสิร์ฟแล้ว"}</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
