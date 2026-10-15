import { Menu, UtensilsCrossed, ChefHat, ShoppingBag, LogOut, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { useKDS } from "../features/kds/context/KDSContext"
import { useAuth } from "../features/auth/context/AuthContext"

export interface Employee {
    name: string
    role: string
}

export default function Header() {
    const location = useLocation()
    const navigate = useNavigate()
    const { orders } = useKDS()
    const [employee] = useState<Employee>({ name: "วิชัย ใจดี", role: "ผู้จัดการ" })
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth();
    const isKDS = location.pathname.includes("/kds")
    const isPOS = location.pathname.includes("/mainpos")
    const isMenu = location.pathname.includes("/menu")
    const pendingOrdersCount = orders.filter((o) => o.status === "รอทำ").length

    // ปิดเมนูเมื่อคลิกข้างนอก
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isMenuOpen])

    return (
        <header className="h-14 bg-[#FAF7F2] border-b border-stone-200 px-8 flex items-center justify-between font-kanit select-none shrink-0 relative z-30">
            {/* โลโก้ และ Breadcrumb ตามรูป mockup */}
            <div className="flex items-center gap-3">
                <Link to="/mainpos" className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] group-hover:bg-[#E5DCCF] transition-colors flex items-center justify-center text-[#8C6D58]">
                        <UtensilsCrossed className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="font-semibold text-[#2D241E] text-base group-hover:text-stone-900 transition-colors">
                        ครัวบ้าน
                    </span>
                </Link>

                <span className="text-stone-300 font-light">/</span>

                <span className="text-sm font-medium text-[#8C6D58]">
                    {isKDS ? "KDS" : isPOS ? "POS" : "ระบบ"}
                </span>
            </div>

            {/* ข้อมูลผู้ใช้งาน และปุ่มเปิดเมนู */}
            <div className="flex items-center gap-3" ref={menuRef}>
                <div className="flex flex-col text-right">
                    <span className="text-sm font-medium text-[#2D241E] leading-tight">
                        {employee.name}
                    </span>
                    <span className="text-xs text-stone-500 font-normal">
                        {employee.role}
                    </span>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-1.5 text-[#2D241E] hover:bg-[#EFE8DC] active:scale-95 rounded-lg transition-all cursor-pointer ${
                            isMenuOpen ? "bg-[#EFE8DC]" : ""
                        }`}
                        title="เมนูหลัก"
                    >
                        {isMenuOpen ? (
                            <X className="w-6 h-6 stroke-[1.75]" />
                        ) : (
                            <Menu className="w-6 h-6 stroke-[1.75]" />
                        )}
                    </button>

                    {/* เมนูดรอปดาวน์สำหรับสลับระหว่าง POS และ KDS */}
                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-4 py-2 border-b border-stone-100">
                                <p className="text-xs text-stone-400 font-medium">เมนูระบบ</p>
                            </div>

                            <Link
                                to="/mainpos"
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isPOS ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <ShoppingBag className="w-4 h-4 text-[#8C6D58]" />
                                <span>หน้าขาย (POS)</span>
                            </Link>

                            <Link
                                to="/kds"
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isKDS ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <ChefHat className="w-4 h-4 text-[#8C6D58]" />
                                    <span>จอครัว (KDS)</span>
                                </div>
                                {pendingOrdersCount > 0 && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#C27803] text-white">
                                        {pendingOrdersCount} รอทำ
                                    </span>
                                )}
                            </Link>

                            <Link 
                            //TODO ทำไว้ทดสอบเดี๋ยวลบออก
                                to={`/${user?.tenantSlug}/menu/admin`}
                                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isMenu ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <ChefHat className="w-4 h-4 text-[#8C6D58]" />
                                    <span>หน้าเมนู (test)</span>
                                </div>
                            </Link>

                            <div className="border-t border-stone-100 my-1" />

                            <button
                                type="button"
                                onClick={() => {
                                    setIsMenuOpen(false)
                                    navigate("/")
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-left"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>ออกจากระบบ</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}