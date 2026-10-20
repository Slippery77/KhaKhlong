import Header from "../../../components/Header"
import { useState } from "react"
import MenuCard from "../components/MenuCard"
import MenuSidebar from "../components/MenuSidebar"
import OrderSidebar from "../components/OrderSidebar"
import ModifierPopup from "../components/ModifierPopup"
import PaymentModal from "../components/PaymentModal"
import SearchBar from "../components/SearchBar"
import { ArrowLeft, Search, ChefHat, CheckCircle2, X, ChartLine } from "lucide-react"
import { useKDS } from "../../kds/context/KDSContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useFullMenu } from "../hooks/useFullMenu"
import type { Menu, CartMenu, ModifierOption } from "../types/pos.types"
import { useAuth } from "../../auth/context/AuthContext"

export default function MainPOS() {
    const { sendOrderToKitchen } = useKDS()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [searchParams] = useSearchParams()

    // รับ tableId, tableName, orderId จาก URL (มาจากหน้าโต๊ะ)
    const tableIdFromUrl = searchParams.get('tableId')
    const tableNameFromUrl = searchParams.get('tableName')
        ? decodeURIComponent(searchParams.get('tableName')!)
        : null

    // เมนูจริงจาก GET /menu/full (ดู hooks/useFullMenu.ts)
    const { categories, isLoading, error, reload } = useFullMenu()

    // แปลง items ของทุกหมวดเป็น Menu[] ที่ component ในหน้านี้ใช้
    // รวมทุกหมวดไว้ใน array เดียว เพื่อให้ช่องค้นหาหาข้ามหมวดได้
    // TODO modifiers: ยังไม่ได้ต่อ modifier_groups จาก API → ตอนนี้ทุกเมนูกดแล้วเข้าตะกร้าเลย ไม่เปิด ModifierPopup
    //   ทำต่อ: ให้ useFullMenu คืน modifier_groups ด้วย แล้ว map item.modifier_group_ids → ModifierGroup[] ใส่ใน modifiers
    const menu: Menu[] = categories.flatMap((c) =>
        c.items.map((item) => ({
            id: item.menu_item_id,
            name: item.name,
            price: item.price,
            categoryId: item.category_id,
            isAvailable: item.is_available,
        }))
    )

    const [isOrdered, setOrder] = useState<boolean>(false)
    const [cartMenu, setcartMenu] = useState<CartMenu[]>([])
    const [seletedCategory, setSelectCategory] = useState<string | null>(null)
    const [currentTable] = useState<string>(tableNameFromUrl ?? "โต๊ะ 1")
    const [currentText, setcurrentText] = useState<string>("")

    // แจ้งเตือนเมื่อส่งเข้าครัวสำเร็จ
    const [sentToast, setSentToast] = useState<{
        show: boolean
        tableName: string
        itemCount: number
    }>({
        show: false,
        tableName: "",
        itemCount: 0,
    })

    // State สำหรับเปิดหน้าต่างชำระเงิน
    const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false)

    // แจ้งเตือนเมื่อชำระเงินสำเร็จ
    const [paidToast, setPaidToast] = useState<{
        show: boolean
        billDesc: string
    }>({
        show: false,
        billDesc: "",
    })

    function handlePaymentSuccess(billDesc: string) {
        setcartMenu([])
        setOrder(false)
        setIsPaymentOpen(false)
        setPaidToast({
            show: true,
            billDesc,
        })

        setTimeout(() => {
            setPaidToast((prev) => ({ ...prev, show: false }))
        }, 5000)
    }

    // รายการโต๊ะสำหรับเลือก (ไม่ใช้แล้ว — เลือกจากหน้าโต๊ะแทน)
    // const AVAILABLE_TABLES = [...]

    // State สำหรับเปิด Modifier Popup/Panel
    const [selectedMenuForModifier, setSelectedMenuForModifier] = useState<Menu | null>(null)

    // ยังไม่ได้กดหมวด → ใช้หมวดแรกจาก API (ไม่ต้อง setState ใน useEffect ตอนโหลดเสร็จ)
    const activeCategoryId = seletedCategory ?? categories[0]?.category_id

    const filteredMenu = menu.filter((m) => {
        const matchSearch = m.name.toLocaleLowerCase().includes(currentText.trim().toLocaleLowerCase())

        if (currentText.trim() !== "") return matchSearch

        return m.categoryId === activeCategoryId
    })

    const isMenuExist = filteredMenu.length > 0

    // เมื่อคลิก MenuCard: ถ้ามี modifier ให้เปิด ModifierPopup ถ้าไม่มีให้เพิ่มเข้าตะกร้าเลย
    function handleMenuClick(clickedMenu: Menu) {
        // เมนูหมดวันนี้ กดไม่ได้ (TODO MenuCard: แสดงสีเทา + ป้าย "หมดวันนี้")
        if (!clickedMenu.isAvailable) return

        if (clickedMenu.modifiers && clickedMenu.modifiers.length > 0) {
            setSelectedMenuForModifier(clickedMenu)
            return
        }
        onAddToCart(clickedMenu)
    }

    function onAddToCart(menuToAdd: Menu) {
        setcartMenu((prev) => {
            const isExist = prev.find(
                (item) =>
                    item.id === menuToAdd.id &&
                    !item.selectedSpiciness &&
                    (!item.selectedAddons || item.selectedAddons.length === 0)
            )
            if (isExist) {
                return prev.map((item) =>
                    item.cartItemId === isExist.cartItemId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [
                ...prev,
                {
                    ...menuToAdd,
                    cartItemId: `${menuToAdd.id}-${Date.now()}`,
                    basePrice: menuToAdd.price,
                    quantity: 1,
                },
            ]
        })

        setOrder(true)
    }

    // เมื่อกดปุ่ม "เพิ่มในออเดอร์" จาก ModifierPopup
    function handleConfirmModifier(data: {
        menu: Menu
        selectedSpiciness: string
        selectedAddons: ModifierOption[]
        note: string
        quantity: number
        totalUnitPrice: number
    }) {
        const newItem: CartMenu = {
            cartItemId: `${data.menu.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            id: data.menu.id,
            name: data.menu.name,
            price: data.totalUnitPrice, // ราคาต่อหน่วยที่บวก addons แล้ว
            basePrice: data.menu.price,
            quantity: data.quantity,
            selectedSpiciness: data.selectedSpiciness,
            selectedAddons: data.selectedAddons,
            note: data.note,
        }

        setcartMenu((prev) => [...prev, newItem])
        setOrder(true)
        setSelectedMenuForModifier(null)
    }

    function onDeleteFromCart(item: CartMenu) {
        setcartMenu((prev) => {
            const updated = prev.filter((m) =>
                item.cartItemId ? m.cartItemId !== item.cartItemId : m.id !== item.id
            )
            if (updated.length === 0) {
                setOrder(false)
            }
            return updated
        })
    }

    function onReduceValue(item: CartMenu) {
        setcartMenu((prev) => {
            const target = prev.find((m) =>
                item.cartItemId ? m.cartItemId === item.cartItemId : m.id === item.id
            )
            if (!target) return prev

            if (target.quantity <= 1) {
                const updated = prev.filter((m) =>
                    item.cartItemId ? m.cartItemId !== item.cartItemId : m.id !== item.id
                )
                if (updated.length === 0) {
                    setOrder(false)
                }
                return updated
            }

            return prev.map((m) =>
                (item.cartItemId ? m.cartItemId === item.cartItemId : m.id === item.id)
                    ? { ...m, quantity: m.quantity - 1 }
                    : m
            )
        })
    }

    function onIncreaseValue(item: CartMenu) {
        setcartMenu((prev) =>
            prev.map((m) =>
                (item.cartItemId ? m.cartItemId === item.cartItemId : m.id === item.id)
                    ? { ...m, quantity: m.quantity + 1 }
                    : m
            )
        )
    }

    function handleSelectCategory(categoryId: string) {
        setSelectCategory(categoryId)
        setcurrentText("")
    }

    // เมื่อกดปุ่ม "ส่งครัว" จาก OrderSidebar
    function handleSendToKitchen() {
        if (cartMenu.length === 0) return

        sendOrderToKitchen(currentTable, cartMenu)
        const count = cartMenu.reduce((sum, item) => sum + item.quantity, 0)

        // เคลียร์ตะกร้าเมื่อส่งเข้าครัวแล้ว
        setcartMenu([])
        setOrder(false)

        // แจ้งเตือนส่งเข้าครัวสำเร็จ
        setSentToast({
            show: true,
            tableName: currentTable,
            itemCount: count,
        })

        setTimeout(() => {
            setSentToast((prev) => ({ ...prev, show: false }))
        }, 4500)
    }

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Category Sidebar */}
                <aside className="w-50 h-full border-r border-stone-200 flex flex-col items-center py-4 gap-3 bg-[#FAF7F2]">
                    <MenuSidebar
                        categories={categories}
                        seletedCategory={activeCategoryId}
                        onSelectCategory={handleSelectCategory}
                    />
                </aside>

                {/* Main Menu Grid */}
                <main className="flex-1 flex flex-col h-full">
                    <div className="h-14 border-b border-stone-200 px-6 flex items-center gap-4 bg-[#FAF7F2]/60">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => navigate(`/${user?.tenantSlug}/tables`)}
                                className="flex items-center gap-1.5 text-sm font-medium text-[#6B5A49] hover:text-[#2D241E] active:scale-95 transition-all cursor-pointer font-kanit"
                                title="กลับไปหน้าโต๊ะ"
                            >
                                <ArrowLeft className="w-4 h-4 text-[#8C7A68]" />
                                <span>โต๊ะ</span>
                            </button>

                            <div className="h-4 w-[1px] bg-stone-300 mx-1" />

                            <span className="text-base font-semibold text-[#2D241E] font-kanit">
                                โต๊ะ {currentTable}
                            </span>
                        </div>

                        <div className="flex-1 max-w-md">
                            <SearchBar value={currentText} onSearch={setcurrentText} />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 overflow-y-auto p-6 flex-1 content-start">
                        {isLoading ? (
                            <p className="col-span-4 py-20 text-center text-sm text-stone-400 font-kanit">กำลังโหลดเมนู...</p>
                        ) : error ? (
                            <div className="col-span-4 flex flex-col items-center gap-3 py-20 text-center font-kanit">
                                <p className="text-sm text-red-600">{error}</p>
                                <button
                                    type="button"
                                    onClick={reload}
                                    className="rounded-xl border border-[#d9c6b0] px-4 py-2 text-sm text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        ) : isMenuExist ? (
                            filteredMenu.map((m) => (
                                <MenuCard key={m.id} menu={m} onClickMenuCard={handleMenuClick} />
                            ))
                        ) : (
                            <div className="col-span-4 flex flex-col items-center justify-center py-20 text-center select-none font-kanit">
                                <div className="w-16 h-16 rounded-full bg-[#EFE8DC]/80 flex items-center justify-center mb-3 text-[#A89887]">
                                    <Search className="w-8 h-8 stroke-[1.5]" />
                                </div>
                                <h3 className="text-base font-semibold text-[#2D241E]">
                                    ไม่พบเมนูที่ค้นหา {currentText && `"${currentText}"`}
                                </h3>
                                <p className="text-sm text-stone-400 mt-1">
                                    ลองค้นหาด้วยชื่ออื่น หรือเลือกหมวดหมู่อื่นดูนะครับ
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Aside: แสดง ModifierPopup เมื่อเลือกเมนูที่มี modifier หรือแสดง OrderSidebar ตามปกติ */}
                <aside className="w-96 border-l border-stone-200 flex flex-col h-full bg-[#FAF7F2]">
                    {selectedMenuForModifier ? (
                        <ModifierPopup
                            menu={selectedMenuForModifier}
                            onClose={() => setSelectedMenuForModifier(null)}
                            onConfirm={handleConfirmModifier}
                        />
                    ) : (
                        <OrderSidebar
                            isOrdered={isOrdered}
                            cartMenu={cartMenu}
                            onDeleteFromCart={onDeleteFromCart}
                            onReduceValue={onReduceValue}
                            onIncreaseValue={onIncreaseValue}
                            onSendToKitchen={handleSendToKitchen}
                            onPayment={() => setIsPaymentOpen(true)}
                        />
                    )}
                </aside>

                {/* Modal ชำระเงิน */}
                {isPaymentOpen && (
                    <PaymentModal
                        table={currentTable}
                        cartMenu={cartMenu}
                        onClose={() => setIsPaymentOpen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                    />
                )}

                {/* Toast แจ้งเตือนเมื่อชำระเงินสำเร็จ พร้อมปุ่มไปหน้ารายการขาย */}
                {paidToast.show && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2D241E] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3.5 font-kanit border border-stone-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">ชำระเงินสำเร็จ! ({paidToast.billDesc})</span>
                            <span className="text-xs text-stone-300">
                                บิลถูกบันทึกลงในรายการขายอัตโนมัติเรียบร้อยแล้ว
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                            <button
                                type="button"
                                onClick={() => navigate("/sale-report")}
                                className="px-3 py-1.5 rounded-xl bg-[#A68874] hover:bg-[#967763] text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <ChartLine className="w-3.5 h-3.5" />
                                <span>ดูรายการขาย</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaidToast((prev) => ({ ...prev, show: false }))}
                                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Toast แจ้งเตือนเมื่อส่งเข้าครัวสำเร็จ พร้อมปุ่มเปิดดูจอครัว KDS */}
                {sentToast.show && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2D241E] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3.5 font-kanit border border-stone-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">ส่งออเดอร์เข้าครัวสำเร็จ!</span>
                            <span className="text-xs text-stone-300">
                                {sentToast.tableName} ({sentToast.itemCount} รายการ) สร้างสถานะ 'รอทำ' ใน KDS แล้ว
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                            <button
                                type="button"
                                onClick={() => navigate("/kds")}
                                className="px-3 py-1.5 rounded-xl bg-[#A68874] hover:bg-[#967763] text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                                <ChefHat className="w-3.5 h-3.5" />
                                <span>ดูหน้าจอครัว (KDS)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSentToast((prev) => ({ ...prev, show: false }))}
                                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}