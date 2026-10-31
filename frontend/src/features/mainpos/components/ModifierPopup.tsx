import { useState, useMemo } from "react"
import type { Menu, ModifierGroup, ModifierOption } from "../types/pos.types"
import { X, Minus, Plus, Check, AlertCircle, Utensils } from "lucide-react"

interface ModifierPopupProps {
    menu: Menu
    onClose: () => void
    onConfirm: (data: {
        menu: Menu
        selectedSpiciness: string
        selectedAddons: ModifierOption[]
        note: string
        quantity: number
        totalUnitPrice: number
    }) => void
}

export default function ModifierPopup({ menu, onClose, onConfirm }: ModifierPopupProps) {
    // radio group แต่ละกลุ่มเก็บแยกด้วย groupId เป็น key
    const [singleChoices, setSingleChoices] = useState<Record<string, ModifierOption>>({})
    // checkbox ทุกกลุ่มรวมกัน (id unique ต่างกันอยู่แล้ว)
    const [multiChoices, setMultiChoices] = useState<ModifierOption[]>([])
    const [note, setNote] = useState<string>("")
    const [quantity, setQuantity] = useState<number>(1)
    const [submitted, setSubmitted] = useState<boolean>(false)
    const [failedUrl, setFailedUrl] = useState<string | null>(null)

    const hasImage = Boolean(menu.imageUrl && menu.imageUrl !== failedUrl)
    const modifiers = useMemo(() => menu.modifiers ?? [], [menu.modifiers])

    // กลุ่มที่ required แต่ยังไม่เลือก
    const requiredUnfilled = useMemo(() =>
        modifiers
            .filter((g) => g.isRequired && g.type === "radio")
            .filter((g) => !singleChoices[g.id]),
        [modifiers, singleChoices],
    )
    const isValid = requiredUnfilled.length === 0

    // คำนวณราคา: รวม radio ที่มี price > 0 + checkbox ที่เลือก
    const singlePrice = Object.values(singleChoices).reduce((sum, o) => sum + o.price, 0)
    const multiPrice = multiChoices.reduce((sum, o) => sum + o.price, 0)
    const totalUnitPrice = menu.price + singlePrice + multiPrice
    const totalPrice = totalUnitPrice * quantity

    const handleRadio = (group: ModifierGroup, option: ModifierOption) => {
        setSingleChoices((prev) => {
            // กลุ่มไม่บังคับ: กดตัวเดิมซ้ำ = ยกเลิกการเลือก
            if (!group.isRequired && prev[group.id]?.id === option.id) {
                const next = { ...prev }
                delete next[group.id]
                return next
            }
            return { ...prev, [group.id]: option }
        })
    }

    const handleCheckbox = (option: ModifierOption) => {
        setMultiChoices((prev) =>
            prev.some((o) => o.id === option.id)
                ? prev.filter((o) => o.id !== option.id)
                : [...prev, option],
        )
    }

    const handleConfirm = () => {
        setSubmitted(true)
        if (!isValid) return

        // รวมชื่อตัวเลือก single ทั้งหมดเป็น string เดียวเพื่อส่งไป KDS
        const selectedSpiciness = Object.values(singleChoices)
            .map((o) => o.name)
            .join(", ")

        onConfirm({
            menu,
            selectedSpiciness,
            selectedAddons: multiChoices,
            note: note.trim(),
            quantity,
            totalUnitPrice,
        })
    }

    const renderGroup = (group: ModifierGroup) => {
        const isRequiredUnfilled = submitted && group.isRequired && group.type === "radio" && !singleChoices[group.id]

        return (
            <div key={group.id} className="space-y-2">
                {/* Group header */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#2D241E] font-kanit">
                        {group.title}
                    </span>
                    {group.isRequired && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3EBE1] text-[#A68874]">
                            จำเป็น
                        </span>
                    )}
                    {!group.isRequired && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400">
                            ไม่บังคับ
                        </span>
                    )}
                </div>

                {/* Required error */}
                {isRequiredUnfilled && (
                    <div className="flex items-center gap-1.5 text-rose-500 text-xs font-kanit">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>กรุณาเลือก{group.title}</span>
                    </div>
                )}

                {/* Radio (single) */}
                {group.type === "radio" && (
                    <div className="space-y-2">
                        {group.Choice.map((option) => {
                            const isSelected = singleChoices[group.id]?.id === option.id
                            return (
                                <div
                                    key={option.id}
                                    onClick={() => handleRadio(group, option)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none font-kanit ${
                                        isSelected
                                            ? "bg-[#F3EBE1] border-[#C8B8A6]"
                                            : isRequiredUnfilled
                                            ? "bg-rose-50/40 border-rose-200 hover:bg-[#F5EFEB]"
                                            : "bg-[#FBF8F4] border-[#E8DEC8] hover:bg-[#F5EFEB]"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all bg-white shrink-0 ${
                                                isSelected ? "border-[#A68874]" : "border-stone-300"
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#A68874]" />
                                            )}
                                        </div>
                                        <span className="text-[#2D241E] font-medium text-sm">
                                            {option.name}
                                        </span>
                                    </div>
                                    {option.price > 0 && (
                                        <span className="text-sm font-medium text-[#A68874]">
                                            +฿{option.price}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Checkbox (multi) */}
                {group.type === "checkbox" && (
                    <div className="space-y-2">
                        {group.Choice.map((option) => {
                            const isChecked = multiChoices.some((o) => o.id === option.id)
                            return (
                                <div
                                    key={option.id}
                                    onClick={() => handleCheckbox(option)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none font-kanit ${
                                        isChecked
                                            ? "bg-[#F3EBE1] border-[#C8B8A6]"
                                            : "bg-[#FBF8F4] border-[#E8DEC8] hover:bg-[#F5EFEB]"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                                                isChecked
                                                    ? "bg-[#A68874] border-[#A68874] text-white"
                                                    : "bg-white border-stone-300"
                                            }`}
                                        >
                                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                                        </div>
                                        <span className="text-[#2D241E] font-medium text-sm">
                                            {option.name}
                                        </span>
                                    </div>
                                    {option.price > 0 && (
                                        <span className="text-sm font-medium text-[#A68874]">
                                            +฿{option.price}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col justify-between font-kanit bg-[#FAF7F2]">
            {/* Header */}
            <div className="p-5 border-b border-stone-200 bg-white/80 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-stone-400 font-medium">ปรับแต่งรายการอาหาร</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 transition-colors p-1 -mr-1 rounded-lg hover:bg-stone-100 cursor-pointer"
                        title="ปิด"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center gap-3.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E5D9C8] bg-[#F3ECE1] flex items-center justify-center">
                        {hasImage ? (
                            <img
                                src={menu.imageUrl!}
                                alt={menu.name}
                                onError={() => setFailedUrl(menu.imageUrl ?? null)}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <Utensils className="h-6 w-6 text-[#9C8671]" aria-hidden="true" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-[#2D241E] leading-snug line-clamp-2">
                            {menu.name}
                        </h2>
                        <p className="text-base font-bold text-[#8C6D58] mt-0.5 tabular-nums">
                            ฿{menu.price.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Modifier List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {modifiers.map((group) => renderGroup(group))}

                {/* หมายเหตุ */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2D241E] font-kanit">
                        หมายเหตุ
                        <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400">
                            ไม่บังคับ
                        </span>
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="เช่น ไม่ใส่ผัก, ไม่ใส่ขิง..."
                        className="w-full h-20 p-3 rounded-2xl border border-stone-200/90 bg-white text-sm text-[#2D241E] placeholder:text-stone-300 focus:outline-none focus:border-[#A68874] resize-none font-kanit transition-colors"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-stone-200 p-5 bg-white shrink-0 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">จำนวน</span>
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-stone-700 select-none">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => q + 1)}
                            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleConfirm}
                    className={`w-full py-3 px-5 rounded-xl text-white font-medium text-base flex items-center justify-between shadow-sm transition-all cursor-pointer ${
                        !isValid && submitted
                            ? "bg-stone-300"
                            : "bg-[#AC8E79] hover:bg-[#9B7D69] active:scale-[0.99]"
                    }`}
                >
                    <span>เพิ่มในออเดอร์</span>
                    <span>฿{totalPrice.toLocaleString()}</span>
                </button>
            </div>
        </div>
    )
}
