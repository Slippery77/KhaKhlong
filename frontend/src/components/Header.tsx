import { 
Menu, 
UtensilsCrossed, 
ChefHat, 
LogOut, 
X,
Package,
ChartLine,
Wallet,
Settings,
Utensils} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useLocation, Link, useParams } from "react-router-dom"
import { useKDS } from "../features/kds/context/KDSContext"
import { useLogin } from "../features/auth/hooks/useLogin"

export interface Employee {
    name: string
    role: string
}

export default function Header() {
    const location = useLocation()
    const { orders } = useKDS()
    const [employee] = useState<Employee>({ name: "วิชัย ใจดี", role: "ผู้จัดการ" })
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { logout } = useLogin();
    // อ่าน slug จาก URL แทน user.tenantSlug เพราะ user หายเมื่อ refresh หน้า
    const { tenantSlug } = useParams<{ tenantSlug: string }>()
    const isKDS = location.pathname.includes("/kds")
    const isPOS = location.pathname.includes("/mainpos")
    const isTables = location.pathname.includes("/tables")
    const isSetting = location.pathname.includes("/setting")
    const isSiftwork = location.pathname.includes("/siftwork")
    const isSalereport = location.pathname.includes("/sale-report")
    const isStock = location.pathname.includes("/stock")
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
                <Link to={`/${tenantSlug}/tables`} className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-[#EFE8DC] group-hover:bg-[#E5DCCF] transition-colors flex items-center justify-center text-[#8C6D58]">
                        <UtensilsCrossed className="w-4 h-4 stroke-2" />
                    </div>
                    <span className="font-semibold text-[#2D241E] text-base group-hover:text-stone-900 transition-colors">
                        ครัวบ้าน
                    </span>
                </Link>

                <span className="text-stone-300 font-light">/</span>

                <span className="text-sm font-medium text-[#8C6D58]">
                    {isKDS && ("KDS")}
                    {isPOS && ("POS")}
                    {isTables && ("โต๊ะ")}
                    {isStock && ("สต็อก")}
                    {isSalereport && ("ยอดขาย")}
                    {isSetting && ("ตั้งค่า")}
                    {isSiftwork && ("ปิดกะ/นับเงิน")}
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
                                to={`/${tenantSlug}/tables`}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isTables ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <Utensils className="w-4 h-4 text-[#8C6D58]" />
                                <span>โต๊ะ</span>
                            </Link>

                            <Link
                                to={`/${tenantSlug}/kds`}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isKDS ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <ChefHat className="w-4 h-4 text-[#8C6D58]" />
                                    <span>KDS</span>
                                </div>
                                {pendingOrdersCount > 0 && (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#C27803] text-white">
                                        {pendingOrdersCount} รอทำ
                                    </span>
                                )}
                            </Link>

                            <Link
                                to={`/${tenantSlug}/stock`}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isStock ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <Package className="w-4 h-4 text-[#8C6D58]" />
                                <span>สต็อก</span>
                            </Link>

                            <Link
                                to={`/${tenantSlug}/sale-report`}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isSalereport ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <ChartLine className="w-4 h-4 text-[#8C6D58]" />
                                <span>ยอดขาย</span>
                            </Link>

                            <Link
                                to={`/${tenantSlug}/siftwork`}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isSiftwork ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <Wallet className="w-4 h-4 text-[#8C6D58]" />
                                <span>ปิดกะ/นับเงิน</span>
                            </Link>

                            <Link
                                to={`/${tenantSlug}/setting/menu`}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all hover:bg-[#FAF7F2] ${
                                    isSetting ? "font-semibold text-[#8C6D58] bg-[#FAF7F2]/80" : "text-[#2D241E]"
                                }`}
                            >
                                <Settings className="w-4 h-4 text-[#8C6D58]" />
                                <span>ตั้งค่า</span>
                            </Link>

                            <div className="border-t border-stone-100 my-1" />

                            <button
                                type="button"
                                onClick={() => {
                                    setIsMenuOpen(false)
                                    logout()
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
