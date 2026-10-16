import { useState } from "react"
import type { Menu, ModifierGroup, ModifierOption } from "../types/pos.types"
import { X, Minus, Plus, Check } from "lucide-react"

// TODO (ตัวเลือกจริงจาก API) ตอนนี้ popup ผูกกับ mockup "ระดับความเผ็ด" อยู่
//   1) selectedSpiciness เริ่มต้นเป็น "เผ็ดปกติ" (hardcode) → ร้านอื่นไม่มีตัวเลือกนี้
//      และใช้ state ตัวเดียวกับทุกกลุ่ม radio → ถ้าเมนูมี 2 กลุ่ม single (เช่น ความเผ็ด + ขนาด) จะทับกัน
//      แก้: เก็บเป็น Record<groupId, ModifierOption> เช่น const [singleChoice, setSingleChoice] = useState<Record<string, ModifierOption>>({})
//   2) group.type === "radio" / "checkbox" → ถ้า map จาก selection_type ใน hook แล้วใช้ต่อได้
//   3) is_required: ปุ่ม "เพิ่มในออเดอร์" ต้อง disabled จนกว่ากลุ่มที่บังคับจะถูกเลือกครบ
//   4) ราคา radio อาจไม่ใช่ 0 (เช่น ไซซ์ใหญ่ +10) → บวก price ของตัวที่เลือกใน singleChoice เข้าไปด้วย
//   5) onConfirm ส่ง selectedSpiciness: string → เปลี่ยนเป็นส่งตัวเลือกทั้งหมดที่เลือก
//      ⚠ กระทบ CartMenu, OrderSidebar และ KDS (KDSCard / KDSContext ใช้ selectedSpiciness)
//      ถ้ายังไม่อยากแก้ KDS: รวมชื่อตัวเลือก single ทั้งหมดเป็น string เดียวส่งไปแทนก่อน เช่น "เผ็ดน้อย, ไซซ์ใหญ่"

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
    const [selectedSpiciness, setSelectedSpiciness] = useState<string>("เผ็ดปกติ")
    const [selectedAddons, setSelectedAddons] = useState<ModifierOption[]>([])
    const [note, setNote] = useState<string>("")
    const [quantity, setQuantity] = useState<number>(1)

    // สลับเลือก Checkbox (เพิ่ม / ลบ addon)
    const handleToggleAddon = (option: ModifierOption) => {
        setSelectedAddons((prev) => {
            const exists = prev.some((item) => item.id === option.id)
            if (exists) {
                return prev.filter((item) => item.id !== option.id)
            }
            return [...prev, option]
        })
    }

    // คำนวณราคา
    const addonsPrice = selectedAddons.reduce((sum, item) => sum + item.price, 0)
    const totalUnitPrice = menu.price + addonsPrice
    const totalPrice = totalUnitPrice * quantity

    // ฟังก์ชันเช็ค type ของ modifier ด้วย if statement ตามที่ต้องการ
    const renderModifierGroup = (group: ModifierGroup) => {
        // กรณีเป็น radio (เลือกได้ 1 อย่าง เช่น ระดับความเผ็ด)
        if (group.type === "radio") {
            return (
                <div key={group.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-500 font-kanit">
                        {group.title}
                    </label>
                    <div className="space-y-2">
                        {group.Choice.map((option) => {
                            const isSelected = selectedSpiciness === option.name
                            return (
                                <div
                                    key={option.id}
                                    onClick={() => setSelectedSpiciness(option.name)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none font-kanit ${
                                        isSelected
                                            ? "bg-[#F3EBE1] border-[#C8B8A6]"
                                            : "bg-[#FBF8F4] border-[#E8DEC8] hover:bg-[#F5EFEB]"
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all bg-white ${
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
                            )
                        })}
                    </div>
                </div>
            )
        }

        // กรณีเป็น checkbox (เลือกได้หลายอย่าง เช่น ท็อปปิ้งเพิ่มเติม)
        if (group.type === "checkbox") {
            return (
                <div key={group.id} className="space-y-2">
                    <label className="text-sm font-medium text-stone-500 font-kanit">
                        {group.title}
                    </label>
                    <div className="space-y-2">
                        {group.Choice.map((option) => {
                            const isChecked = selectedAddons.some((item) => item.id === option.id)
                            return (
                                <div
                                    key={option.id}
                                    onClick={() => handleToggleAddon(option)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all cursor-pointer select-none font-kanit ${
                                        isChecked
                                            ? "bg-[#F3EBE1] border-[#C8B8A6]"
                                            : "bg-[#FBF8F4] border-[#E8DEC8] hover:bg-[#F5EFEB]"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
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
                </div>
            )
        }

        return null
    }

    const handleConfirm = () => {
        onConfirm({
            menu,
            selectedSpiciness,
            selectedAddons,
            note: note.trim(),
            quantity,
            totalUnitPrice,
        })
    }

    return (
        <div className="w-full h-full flex flex-col justify-between font-kanit bg-[#FAF7F2]">
            {/* Header */}
            <div className="p-6 border-b border-stone-200 bg-white/70">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">เพิ่มรายการ</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 transition-colors p-1 -mr-2 cursor-pointer"
                        title="ปิด"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <h2 className="text-2xl font-bold text-[#2D241E] mt-1">{menu.name}</h2>
                <p className="text-base font-semibold text-[#A68874] mt-1">฿{menu.price}</p>
            </div>

            {/* Scrollable Modifier List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {menu.modifiers && menu.modifiers.map((group) => renderModifierGroup(group))}

                {/* หมายเหตุ */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-500 font-kanit">หมายเหตุ</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="เช่น ไม่ใส่ผัก , ไม่ใส่ขิง ...."
                        className="w-full h-20 p-3 rounded-2xl border border-stone-200/90 bg-white text-sm text-[#2D241E] placeholder:text-stone-300 focus:outline-none focus:border-[#A68874] resize-none font-kanit transition-colors"
                    />
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-stone-200 p-5 bg-white flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-500">จำนวน</span>
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
                            title="ลดจำนวน"
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
                            title="เพิ่มจำนวน"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full py-3 px-5 rounded-xl bg-[#AC8E79] hover:bg-[#9B7D69] text-white font-medium text-base flex items-center justify-between shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                    <span>เพิ่มในออเดอร์</span>
                    <span>฿{totalPrice.toLocaleString()}</span>
                </button>
            </div>
        </div>
    )
}