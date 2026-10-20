import { type CartMenu } from "../types/pos.types"
import { UtensilsCrossed, SendHorizontal, Trash2, Minus, Plus } from "lucide-react"

interface PropsOrderSidebar {
    cartMenu: CartMenu[]
    isOrdered: boolean
    onDeleteFromCart?: (item: CartMenu) => void
    onDeleteFormCart?: (item: CartMenu) => void
    onReduceValue?: (item: CartMenu) => void
    onIncreaseValue?: (item: CartMenu) => void
    onSendToKitchen?: () => void
    onPayment?: () => void
}

export default function OrderSidebar(props: PropsOrderSidebar) {
    const handleDelete = (item: CartMenu) => {
        if (props.onDeleteFromCart) {
            props.onDeleteFromCart(item)
        } else if (props.onDeleteFormCart) {
            props.onDeleteFormCart(item)
        }
    }

    const subtotal = props.cartMenu.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    )

    const vat = (subtotal * 7) / 100

    const grandTotal = subtotal + vat

    const totalItems = props.cartMenu.reduce((sum, item) => sum + item.quantity, 0)

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
                    {props.cartMenu.map((item) => (
                        <div
                            key={item.cartItemId || item.id}
                            className="bg-white/90 border border-stone-200/80 rounded-xl p-3 flex flex-col gap-2 shadow-2xs hover:bg-white hover:border-stone-300 transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="text-[#2D241E] font-medium text-sm">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-[#A68874] font-medium mt-0.5">
                                        ฿{item.price} / รายการ
                                    </p>

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
                                    className="p-1 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer"
                                    title={`ลบ ${item.name}`}
                                >
                                    <Trash2 className="w-4 h-4 stroke-[1.75]" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-100 pt-2 mt-0.5">
                                <div className="flex items-center bg-[#FAF7F2] border border-stone-200/80 rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => props.onReduceValue?.(item)}
                                        className="w-5 h-5 flex items-center justify-center text-stone-500 hover:text-[#2D241E] hover:bg-[#EFE8DC] active:scale-90 rounded transition-all cursor-pointer"
                                        title="ลดจำนวน"
                                    >
                                        <Minus className="w-3 h-3 stroke-[2]" />
                                    </button>
                                    <span className="min-w-6 text-center text-xs font-semibold text-stone-700 select-none">
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => props.onIncreaseValue?.(item)}
                                        className="w-5 h-5 flex items-center justify-center text-stone-500 hover:text-[#2D241E] hover:bg-[#EFE8DC] active:scale-90 rounded transition-all cursor-pointer"
                                        title="เพิ่มจำนวน"
                                    >
                                        <Plus className="w-3 h-3 stroke-[2]" />
                                    </button>
                                </div>

                                <span className="font-semibold text-[#2D241E] text-sm">
                                    ฿{(item.price * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t border-stone-200 p-5 bg-[#FAF7F2]">
                <div className="flex justify-between items-center text-sm text-stone-500 mb-2">
                    <span>ยอดรวม</span>
                    <span className="font-medium text-stone-700">฿ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-stone-500 mb-3">
                    <span>VAT 7%</span>
                    <span className="font-medium text-stone-700">฿ {vat.toFixed(2)}</span>
                </div>

                <div className="border-t border-stone-200/80 pt-3 pb-4 flex justify-between items-center">
                    <span className="text-stone-800 font-semibold text-base">รวมทั้งหมด</span>
                    <span className="text-[#A68874] font-semibold text-base">฿ {grandTotal.toFixed(2)}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={props.onSendToKitchen}
                        className="w-full py-2.5 px-4 rounded-full border border-[#AA8971] text-[#8C6D58] font-medium text-sm hover:bg-[#EFE8DD]/50 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={props.cartMenu.length === 0}
                    >
                        <SendHorizontal className="w-4 h-4 text-[#8C6D58]" strokeWidth={1.75} />
                        <span>ส่งครัว</span>
                    </button>
                    <button
                        type="button"
                        onClick={props.onPayment}
                        className="w-full py-2.5 px-4 rounded-full bg-[#A68874] text-white font-medium text-sm hover:bg-[#967763] active:scale-[0.99] transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={props.cartMenu.length === 0}
                    >
                        ชำระเงิน ฿{grandTotal.toFixed(2)}
                    </button>
                </div>
            </div>
        </div>
    )
}