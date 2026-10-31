import { useState } from "react"
import { Utensils, Plus, SlidersHorizontal } from "lucide-react"
import { type Menu } from "../types/pos.types"

interface MenuCardProps {
    menu: Menu
    cartCount?: number
    onClickMenuCard: (menu: Menu) => void
}

export default function MenuCard({ menu, cartCount = 0, onClickMenuCard }: MenuCardProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null)
    const hasImage = Boolean(menu.imageUrl && menu.imageUrl !== failedUrl)
    const hasModifiers = Boolean(menu.modifiers && menu.modifiers.length > 0)
    const isSoldOut = !menu.isAvailable

    const handleTrigger = () => {
        if (!isSoldOut) onClickMenuCard(menu)
    }

    return (
        <div
            role="button"
            tabIndex={isSoldOut ? -1 : 0}
            aria-disabled={isSoldOut}
            aria-label={`${menu.name} ราคา ${menu.price} บาท${isSoldOut ? " (หมดวันนี้)" : ""}`}
            onClick={handleTrigger}
            onKeyDown={(e) => {
                if (!isSoldOut && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    onClickMenuCard(menu)
                }
            }}
            className={`group relative flex h-[204px] flex-col overflow-hidden rounded-2xl border text-left font-kanit transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2 ${
                isSoldOut
                    ? "cursor-not-allowed border-[#E2D9CE] bg-[#F5F1EB] opacity-65"
                    : "cursor-pointer border-[#E2D6C5] bg-white shadow-[0_2px_10px_rgba(45,36,30,0.04)] hover:-translate-y-0.5 hover:border-[#C5B19C] hover:shadow-[0_8px_20px_rgba(45,36,30,0.09)] active:scale-[0.98]"
            }`}
        >
            {/* ── กรอบรูปอาหารด้านบน (~65% ของความสูงการ์ด) ────────────────── */}
            <div className="relative h-[132px] w-full shrink-0 overflow-hidden bg-linear-to-br from-[#F3ECE1] to-[#E6DBC9]">
                {hasImage ? (
                    <img
                        src={menu.imageUrl!}
                        alt={menu.name}
                        loading="lazy"
                        onError={() => setFailedUrl(menu.imageUrl ?? null)}
                        className={`h-full w-full object-cover transition-transform duration-300 ${
                            isSoldOut ? "grayscale-35" : "group-hover:scale-105"
                        }`}
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#B5A28E]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 shadow-xs">
                            <Utensils className="h-4 w-4 text-[#9C8671]" aria-hidden="true" />
                        </div>
                        <span className="text-[11px] font-medium text-[#9C8671]/80">
                            ไม่มีรูปภาพ
                        </span>
                    </div>
                )}

                {/* ป้ายจำนวนในตะกร้า (มุมขวาบน) */}
                {cartCount > 0 && !isSoldOut && (
                    <span
                        aria-label={`อยู่ในรายการแล้ว ${cartCount} จาน`}
                        className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#8C6D58] px-1.5 text-xs font-bold text-white shadow-md ring-2 ring-white tabular-nums"
                    >
                        {cartCount}
                    </span>
                )}

                {/* ป้ายมีตัวเลือกเพิ่มเติม (มุมซ้ายล่างของรูป) */}
                {hasModifiers && !isSoldOut && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-[#2D241E]/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                        <SlidersHorizontal className="h-2.5 w-2.5" aria-hidden="true" />
                        ตัวเลือก
                    </span>
                )}

                {/* ป้ายทับเมื่อ "หมดวันนี้" */}
                {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#2D241E]/45 backdrop-blur-[1px]">
                        <span className="rounded-xl bg-[#2D241E]/90 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                            หมดวันนี้
                        </span>
                    </div>
                )}
            </div>

            {/* ── รายละเอียดชื่อเมนูและราคาด้านล่าง (~35% ของความสูงการ์ด) ─── */}
            <div className="flex h-[72px] shrink-0 flex-col justify-between bg-white px-3.5 py-2.5">
                <h3 className="truncate text-sm leading-snug font-semibold text-[#2D241E]">
                    {menu.name}
                </h3>

                <div className="flex items-center justify-between">
                    <span
                        className={`text-sm font-bold tabular-nums ${
                            isSoldOut ? "text-[#9B8E82] line-through" : "text-[#8C6D58]"
                        }`}
                    >
                        ฿{menu.price.toLocaleString()}
                    </span>

                    {!isSoldOut && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F4EDE2] text-[#8C6D58] transition-colors duration-200 group-hover:bg-[#8C6D58] group-hover:text-white">
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
