import { type CartMenu } from "../types/pos.types"
import { UtensilsCrossed, SendHorizontal, Trash2, Minus, Plus, Loader2, XCircle, BadgePercent } from "lucide-react"

interface PropsOrderSidebar {
    cartMenu: CartMenu[]
    isOrdered: boolean
    canPay: boolean
    isSending?: boolean
    onDeleteFromCart?: (item: CartMenu) => void
    onDeleteFormCart?: (item: CartMenu) => void
    onReduceValue?: (item: CartMenu) => void
    onIncreaseValue?: (item: CartMenu) => void
    onSendToKitchen?: () => void
    onPayment?: () => void
    onVoidItem?: (item: CartMenu) => void
    onCompItem?: (item: CartMenu) => void
    onCancelBill?: () => void
}

// จำนวนที่ยังไม่ถูกส่งเข้าครัว (ส่งแล้วจะยังแสดงใน Sidebar จนกว่าจะชำระเงิน)
const getPendingQuantity = (item: CartMenu) =>
    Math.max(item.quantity - (item.sentQuantity ?? 0), 0)

// จำนวนที่ถูก Comp (ให้ฟรี) — ต้องนับรายชิ้น ไม่ใช่ทั้งกลุ่ม
const getCompedQuantity = (item: CartMenu) =>
    Math.min((item.orderItemComped ?? []).filter(Boolean).length, item.quantity)

// จำนวนที่ยังต้องจ่ายเงินจริง = ทั้งหมด − ที่ให้ฟรี
const getChargeableQuantity = (item: CartMenu) =>
    Math.max(item.quantity - getCompedQuantity(item), 0)

export default function OrderSidebar(props: PropsOrderSidebar) {
    const handleDelete = (item: CartMenu) => {
        if (props.onDeleteFromCart) {
            props.onDeleteFromCart(item)
        } else if (props.onDeleteFormCart) {
            props.onDeleteFormCart(item)
        }
    }

    const subtotal = props.cartMenu.reduce(
        (sum, item) => sum + item.price * getChargeableQuantity(item), 0
    )

    // มูลค่าของที่ให้ฟรี (COMP) — แสดงเป็นบรรทัดแยกให้เห็นชัดว่าถูกตัดออกจากยอดจ่าย
    const compedSubtotal = props.cartMenu.reduce(
        (sum, item) => sum + item.price * getCompedQuantity(item), 0
    )

    const totalItems = props.cartMenu.reduce((sum,item)=> sum + item.quantity,0)
    const totalPendingItems = props.cartMenu.reduce(
        (sum, item) => sum + getPendingQuantity(item),
        0
    )
    const sentSubtotal = props.cartMenu.reduce((sum, item) => {
        const sentChargeable = Math.max((item.sentQuantity ?? 0) - getCompedQuantity(item), 0)
        return sum + item.price * sentChargeable
    }, 0)
    const pendingSubtotal = props.cartMenu.reduce(
        (sum, item) => sum + item.price * getPendingQuantity(item),
        0
    )
    return (
        <div className="w-full h-full flex flex-col justify-between font-kanit">
            <div className="h-14 border-b border-stone-200 px-6 flex items-center justify-between">
                <h2 className="text-[#2D241E] font-medium text-base">ออเดอร์ปัจจุบัน</h2>
                {props.isOrdered && totalItems > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EFE8DC] text-[#7A6048] font-medium">
                        {totalItems} รายการ
                    </span>
                )}
            </div>

            {!props.isOrdered && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    <UtensilsCrossed className="w-14 h-14 text-[#C4B3A2] mb-3" strokeWidth={1.25} />
                    <p className="text-stone-600 font-medium text-base">ยังไม่มีรายการ</p>
                    <p className="text-stone-400 text-sm mt-1">กดเมนูเพื่อเพิ่มออเดอร์</p>
                </div>
            )}

            {props.isOrdered && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
                    {props.cartMenu.map((item) => {
                        const sentQty = item.sentQuantity ?? 0
                        const pendingQty = getPendingQuantity(item)
                        const statuses = item.orderItemStatuses ?? []
                        const voidedQty = statuses.filter((s) => s === 'voided').length
                        const voidableQty = statuses.filter((s) => s === 'queued' || s === 'preparing').length
                        const compedFlags = item.orderItemComped ?? []
                        const compedQty = getCompedQuantity(item)
                        const chargeableQty = getChargeableQuantity(item)
                        // Comp ได้เฉพาะชิ้นที่เสิร์ฟแล้วและยังไม่เคย Comp (กลุ่มอาจมีบางชิ้น Comp ไปแล้ว)
                        const compableQty = statuses.reduce(
                            (count, status, index) =>
                                status === 'served' && !compedFlags[index] ? count + 1 : count,
                            0,
                        )
                        const isAllVoided = item.quantity === 0 && voidedQty > 0
                        return (
                        <div
                            key={item.cartItemId || item.id}
                            className={`bg-white/90 border border-stone-200/80 rounded-xl p-3 flex flex-col gap-2 shadow-2xs hover:bg-white hover:border-stone-300 transition-colors duration-200 group ${isAllVoided ? 'opacity-80' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className={`text-[#2D241E] font-medium text-sm ${isAllVoided ? 'line-through text-stone-400' : ''}`}>
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-[#A68874] font-medium mt-0.5">
                                        ฿{item.price} / รายการ
                                    </p>

                                    {/* สถานะการส่งครัว: รายการที่ส่งแล้วยังอยู่จนกว่าจะชำระเงิน */}
                                    {(voidedQty > 0 || item.hasComped || sentQty > 0 || pendingQty > 0) && (
                                        <div className="flex flex-wrap items-center gap-1 mt-1">
                                            {voidedQty > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                                                    ยกเลิก (VOID) {voidedQty}
                                                </span>
                                            )}
                                            {compedQty > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                                    ให้ฟรี (COMP) {compedQty}
                                                </span>
                                            )}
                                            {sentQty > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    ส่งครัวแล้ว {sentQty}
                                                </span>
                                            )}
                                            {pendingQty > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EFE8DC] text-[#7A6048] border border-[#E2D5C4]">
                                                    รอส่ง {pendingQty}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* แสดงรายละเอียดตัวเลือก modifier */}
                                    {item.selectedSpiciness && (
                                        <p className="text-[11px] text-stone-500 mt-1">
                                            • {item.selectedSpiciness}
                                        </p>
                                    )}
                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                        <p className="text-[11px] text-stone-500">
                                            • {item.selectedAddons.map((a) => `${a.name} (+฿${a.price})`).join(", ")}
                                        </p>
                                    )}
                                    {item.note && (
                                        <p className="text-[11px] text-stone-400 italic">
                                            • หมายเหตุ: {item.note}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(item)}
                                    disabled={pendingQty === 0 || props.isSending}
                                    className="p-1 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-stone-400 disabled:hover:bg-transparent"
                                    title={
                                        pendingQty === 0
                                            ? `${item.name} ส่งครัวแล้ว ลบไม่ได้`
                                            : sentQty > 0
                                                ? `ลบเฉพาะ ${pendingQty} รายการที่ยังไม่ส่ง`
                                                : `ลบ ${item.name}`
                                    }
                                >
                                    <Trash2 className="w-4 h-4 stroke-[1.75]" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-100 pt-2 mt-0.5">
                                <div className="flex items-center gap-1">
                                    <div className="flex items-center bg-[#FAF7F2] border border-stone-200/80 rounded-lg p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => props.onReduceValue?.(item)}
                                            disabled={props.isSending || item.quantity <= sentQty}
                                            className="w-5 h-5 flex items-center justify-center text-stone-500 hover:text-[#2D241E] hover:bg-[#EFE8DC] active:scale-90 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            title={item.quantity <= sentQty ? 'ส่งครัวแล้ว ลดจำนวนไม่ได้' : 'ลดจำนวน'}
                                        >
                                            <Minus className="w-3 h-3 stroke-2" />
                                        </button>
                                        <span className="min-w-6 text-center text-xs font-semibold text-stone-700 select-none">
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => props.onIncreaseValue?.(item)}
                                            disabled={props.isSending}
                                            className="w-5 h-5 flex items-center justify-center text-stone-500 hover:text-[#2D241E] hover:bg-[#EFE8DC] active:scale-90 rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            title="เพิ่มจำนวน"
                                        >
                                            <Plus className="w-3 h-3 stroke-2" />
                                        </button>
                                    </div>
                                    {(voidableQty > 0 || compableQty > 0) && (
                                        <div className="flex items-center gap-1">
                                            {voidableQty > 0 && props.onVoidItem && (
                                                <button
                                                    type="button"
                                                    onClick={() => props.onVoidItem?.(item)}
                                                    disabled={props.isSending}
                                                    className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title={`ยกเลิก ${voidableQty} รายการ (ต้องอนุมัติด้วย PIN ผู้จัดการ)`}
                                                    aria-label={`ยกเลิก ${item.name} ${voidableQty} รายการ ต้องอนุมัติด้วย PIN`}
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {compableQty > 0 && props.onCompItem && (
                                                <button
                                                    type="button"
                                                    onClick={() => props.onCompItem?.(item)}
                                                    disabled={props.isSending}
                                                    className="p-1 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title={`Comp ${compableQty} รายการ (ต้องอนุมัติด้วย PIN ผู้จัดการ)`}
                                                    aria-label={`Comp ${item.name} ${compableQty} รายการ ต้องอนุมัติด้วย PIN`}
                                                >
                                                    <BadgePercent className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <span className="text-right">
                                    {compedQty > 0 && (
                                        <span className="block text-[10px] text-stone-400 line-through">
                                            ฿{(item.price * item.quantity).toLocaleString()}
                                        </span>
                                    )}
                                    <span className={`font-semibold text-sm ${compedQty > 0 ? 'text-amber-700' : 'text-[#2D241E]'}`}>
                                        ฿{(item.price * chargeableQty).toLocaleString()}
                                    </span>
                                </span>
                            </div>
                        </div>
                        )
                    })}
                </div>
            )}

            <div className="border-t border-stone-200 p-5 bg-[#FAF7F2]">
                {/* ยอดรวมทั้งออเดอร์ (รายการที่ส่งครัวแล้ว + ที่ยังไม่ส่ง) */}
                <div className="pb-4 space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-stone-600 text-sm">ยอดรวมออเดอร์</span>
                        <span className="text-[#A68874] font-semibold text-base">฿ {subtotal.toLocaleString()}</span>
                    </div>
                    {sentSubtotal > 0 && (
                        <div className="flex justify-between text-[11px] text-emerald-700">
                            <span>ส่งครัวแล้ว</span>
                            <span>฿ {sentSubtotal.toLocaleString()}</span>
                        </div>
                    )}
                    {pendingSubtotal > 0 && (
                        <div className="flex justify-between text-[11px] text-stone-400">
                            <span>ยังไม่ส่งครัว</span>
                            <span>฿ {pendingSubtotal.toLocaleString()}</span>
                        </div>
                    )}
                    {compedSubtotal > 0 && (
                        <div className="flex justify-between text-[11px] text-amber-700">
                            <span>ให้ฟรี (COMP)</span>
                            <span>−฿ {compedSubtotal.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={props.onSendToKitchen}
                        className="w-full py-2.5 px-4 rounded-full border border-[#AA8971] text-[#8C6D58] font-medium text-sm hover:bg-[#EFE8DD]/50 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={totalPendingItems === 0 || props.isSending}
                    >
                        {props.isSending ? (
                            <Loader2 className="w-4 h-4 text-[#8C6D58] animate-spin" />
                        ) : (
                            <SendHorizontal className="w-4 h-4 text-[#8C6D58]" strokeWidth={1.75} />
                        )}
                        <span>
                            {props.isSending
                                ? 'กำลังส่งครัว...'
                                : totalPendingItems > 0
                                    ? `ส่งครัว (${totalPendingItems})`
                                    : 'ส่งครัวแล้ว'}
                        </span>
                    </button>
                    {/* ชำระเงินได้เมื่อรายการทั้งหมดถูกส่งครัวแล้ว — กันจ่ายเงินโดยที่ยังมีรายการค้างในตะกร้า */}
                    <button
                        type="button"
                        onClick={props.onPayment}
                        className="w-full py-2.5 px-4 rounded-full bg-[#A68874] text-white font-medium text-sm hover:bg-[#967763] active:scale-[0.99] transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!props.canPay || totalPendingItems > 0}
                        title={totalPendingItems > 0 ? 'ส่งครัวรายการที่ยังไม่ส่งก่อนชำระเงิน' : undefined}
                    >
                        ชำระเงิน
                    </button>
                    {totalPendingItems > 0 && (
                        <p className="text-[11px] text-stone-400 text-center">
                            ส่งครัวรายการที่ยังไม่ส่งก่อน จึงจะชำระเงินได้
                        </p>
                    )}
                    {props.onCancelBill && (
                        <button
                            type="button"
                            onClick={props.onCancelBill}
                            disabled={!props.isOrdered || props.isSending}
                            title={
                                !props.isOrdered
                                    ? 'ยังไม่มีรายการในบิลนี้'
                                    : 'ยกเลิกทั้งบิล — ต้องมี PIN ผู้จัดการหรือเจ้าของร้าน'
                            }
                            className="w-full py-2.5 px-4 rounded-full border border-rose-200 text-rose-600 font-medium text-sm hover:bg-rose-50 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#FAF7F2]"
                        >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                            <span>ยกเลิกทั้งบิล</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}