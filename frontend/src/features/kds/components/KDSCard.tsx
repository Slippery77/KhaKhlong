import { useState, useEffect } from "react"
import type { KDSOrder, KDSStatus } from "../types/kds.types"
import { Clock, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

export interface KDSCardProps {
    order: KDSOrder
    onUpdateStatus: (orderId: string, nextStatus: KDSStatus) => void
    onCancelOrder: (orderId: string) => void
    onCompleteOrder: (orderId: string) => void
}

export default function KDSCard({
    order,
    onUpdateStatus,
    onCancelOrder,
    onCompleteOrder,
}: KDSCardProps) {
    // นับเวลาที่ผ่านไปแบบ Real-time (วินาที)
    const [secondsElapsed, setSecondsElapsed] = useState(() =>
        Math.max(0, Math.floor((Date.now() - order.createdAt) / 1000))
    )
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsElapsed(Math.max(0, Math.floor((Date.now() - order.createdAt) / 1000)))
        }, 1000)
        return () => clearInterval(interval)
    }, [order.createdAt])

    // ฟังก์ชันจัดรูปแบบเวลาเป็น ภาษาไทย (เช่น "45 วิ" หรือ "2 นาที 15 วิ")
    const formatElapsedTime = (totalSeconds: number): string => {
        if (totalSeconds < 60) {
            return `${totalSeconds} วิ`
        }
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        if (seconds === 0) {
            return `${minutes} นาที`
        }
        return `${minutes} นาที ${seconds} วิ`
    }

    // กำหนดสีและสไตล์ตามสถานะ
    const getStatusTheme = (status: KDSStatus) => {
        switch (status) {
            case "รอทำ":
                return {
                    borderLeft: "border-l-4 border-l-[#C27803]",
                    badgeBg: "bg-[#C27803] text-white",
                    actionBtnBg: "bg-[#AA8971] hover:bg-[#977861] text-white",
                    timeColor: "text-stone-500",
                }
            case "กำลังทำ":
                return {
                    borderLeft: "border-l-4 border-l-[#3B75A6]",
                    badgeBg: "bg-[#3B75A6] text-white",
                    actionBtnBg: "bg-[#AA8971] hover:bg-[#977861] text-white",
                    timeColor: "text-stone-500",
                }
            case "พร้อมเสิร์ฟ":
                return {
                    borderLeft: "border-l-4 border-l-[#2E7D4E]",
                    badgeBg: "bg-[#2E7D4E] text-white",
                    actionBtnBg: "bg-[#2E7D4E] hover:bg-[#25663F] text-white",
                    timeColor: "text-stone-500",
                }
        }
    }

    const theme = getStatusTheme(order.status)

    return (
        <div
            className={`bg-white rounded-2xl border border-stone-200/90 ${theme.borderLeft} p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between font-kanit`}
        >
            <div>
                {/* Header ของ Card: โต๊ะ, สถานะ, และเวลาที่ผ่านไป */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#2D241E]">
                            {order.table}
                        </span>
                        <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${theme.badgeBg}`}
                        >
                            {order.status}
                        </span>
                    </div>

                    <div
                        className={`flex items-center gap-1 text-xs font-medium ${theme.timeColor}`}
                        title={`สั่งเมื่อ ${new Date(order.createdAt).toLocaleTimeString("th-TH")}`}
                    >
                        <Clock className="w-3.5 h-3.5 stroke-[1.75]" />
                        <span>{formatElapsedTime(secondsElapsed)}</span>
                    </div>
                </div>

                {/* รายการอาหารในออเดอร์ */}
                <div className="py-3 flex flex-col gap-2.5">
                    {order.items.map((item, index) => (
                        <div key={index} className="flex flex-col text-sm text-[#2D241E]">
                            <div className="font-semibold text-sm flex items-start gap-1.5">
                                <span className="text-[#8C6D58] font-bold">×{item.quantity}</span>
                                <span>{item.name}</span>
                            </div>

                            {/* ตัวเลือกเพิ่มเติม (ระดับความเผ็ด / ท็อปปิ้ง) */}
                            {item.selectedSpiciness && (
                                <p className="text-xs text-stone-500 pl-5 mt-0.5">
                                    • {item.selectedSpiciness}
                                </p>
                            )}

                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div className="pl-5 space-y-0.5">
                                    {item.selectedAddons.map((addon, aIdx) => (
                                        <p key={aIdx} className="text-xs text-stone-500">
                                            • {addon.name}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* หมายเหตุ */}
                            {item.note && (
                                <p className="text-xs text-amber-700 italic pl-5 mt-0.5">
                                    • หมายเหตุ: {item.note}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ส่วนปุ่มการทำงานด้านล่างของ Card */}
            <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
                {/* ยืนยันการยกเลิกออเดอร์ (เฉพาะสถานะ รอทำ) */}
                {showCancelConfirm ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>ต้องการยกเลิกออเดอร์นี้ใช่ไหม?</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onCancelOrder(order.id)
                                    setShowCancelConfirm(false)
                                }}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer"
                            >
                                ยืนยันยกเลิก
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
                        {/* สถานะ รอทำ: มีปุ่ม "ยกเลิกออเดอร์" และปุ่มเลื่อนสถานะเป็น "กำลังทำ" */}
                        {order.status === "รอทำ" && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCancelConfirm(true)}
                                    className="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                                    title="ยกเลิกออเดอร์นี้"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>ยกเลิกออเดอร์</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onUpdateStatus(order.id, "กำลังทำ")}
                                    className={`flex-1 py-2.5 px-4 rounded-xl ${theme.actionBtnBg} font-medium text-sm transition-all cursor-pointer active:scale-[0.98] text-center shadow-xs flex items-center justify-center gap-1.5`}
                                >
                                    <span>กำลังทำ</span>
                                    <ArrowRight className="w-4 h-4 opacity-75" />
                                </button>
                            </div>
                        )}

                        {/* สถานะ กำลังทำ: มีปุ่มเลื่อนสถานะเป็น "พร้อมเสิร์ฟ" */}
                        {order.status === "กำลังทำ" && (
                            <button
                                type="button"
                                onClick={() => onUpdateStatus(order.id, "พร้อมเสิร์ฟ")}
                                className={`w-full py-2.5 px-4 rounded-xl ${theme.actionBtnBg} font-medium text-sm transition-all cursor-pointer active:scale-[0.98] text-center shadow-xs flex items-center justify-center gap-1.5`}
                            >
                                <span>พร้อมเสิร์ฟ</span>
                                <CheckCircle2 className="w-4 h-4 opacity-75" />
                            </button>
                        )}

                        {/* สถานะ พร้อมเสิร์ฟ: มีปุ่มเสิร์ฟแล้ว/เสร็จสิ้น */}
                        {order.status === "พร้อมเสิร์ฟ" && (
                            <button
                                type="button"
                                onClick={() => onCompleteOrder(order.id)}
                                className={`w-full py-2.5 px-4 rounded-xl ${theme.actionBtnBg} font-medium text-sm transition-all cursor-pointer active:scale-[0.98] text-center shadow-xs flex items-center justify-center gap-1.5`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>เสิร์ฟแล้ว (เสร็จสิ้น)</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
