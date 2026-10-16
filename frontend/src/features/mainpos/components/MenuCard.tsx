import { type Menu } from "../types/pos.types"

// TODO (เมนูจริงจาก API)
//   - import type Menu จาก '../types/pos.types' แทน '../pages/MainPOS'
//   - ถ้า menu.isAvailable = false: แสดงสีเทา (opacity-50), ป้าย "หมดวันนี้", cursor-not-allowed
//     และไม่เรียก onClickMenuCard (หรือให้ MainPOS กันไว้ใน handleMenuClick)
//   - key ที่ MainPOS ใช้ (key={m.id}) จะเป็น UUID string ใช้ได้เหมือนเดิม

interface MenuCardProps {
    menu: Menu
    onClickMenuCard: (menu: Menu) => void
}

export default function MenuCard(props: MenuCardProps) {
    return (
        <div className="bg-[#EFE8DC] border border-[#E0D5C5] rounded-2xl p-5 h-28 flex flex-col justify-between cursor-pointer hover:bg-[#EAE0D2] hover:border-[#D5C6B3] active:scale-[0.99] transition-all select-none font-kanit"
            onClick={() => props.onClickMenuCard(props.menu)}>
            <div className="text-[#2D241E] font-medium text-base">
                {props.menu.name}
            </div>
            <div className="flex items-center justify-between text-[#B39E8C] font-medium text-base">
                <span>฿{props.menu.price}</span>
                <svg
                    className="w-4 h-4 text-[#C8B8A6]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </div>
        </div>
    )
}