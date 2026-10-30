import Header from "../../../components/Header"
import { useEffect, useState } from "react"
import MenuCard from "../components/MenuCard"
import MenuSidebar from "../components/MenuSidebar"
import OrderSidebar from "../components/OrderSidebar"
import ModifierPopup from "../components/ModifierPopup"
import PaymentModal from "../components/PaymentModal"
import SearchBar from "../components/SearchBar"
import VoidItemModal from "../components/VoidItemModal"
import CompItemModal from "../components/CompItemModal"
import { ArrowLeft, Search, ChefHat, CheckCircle2, X } from "lucide-react"
import { useKDS } from "../../kds/context/KDSContext"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useFullMenu } from "../hooks/useFullMenu"
import { useOrderCartHydration, type ApiOrderDetail } from "../hooks/useOrderCartHydration"
import type { Menu, CartMenu, ModifierOption } from "../types/pos.types"
import { useAuth } from "../../auth/context/AuthContext"
import { apiFetch,ApiError } from "../../../libs/appClient"
import { voidOrderItems, compOrderItems } from "../api/orders.api"

/** รายการที่ยกเลิกได้: ครัวยังไม่เสิร์ฟ (queued/preparing) */
const getVoidableItemIds = (item: CartMenu) =>
    (item.orderItemIds ?? []).filter((_, index) => {
        const status = item.orderItemStatuses?.[index]
        return status === 'queued' || status === 'preparing'
    })

/** รายการที่ Comp ได้: เสิร์ฟแล้วและยังไม่เคย Comp (นับรายชิ้น) */
const getCompableItemIds = (item: CartMenu) =>
    (item.orderItemIds ?? []).filter((_, index) => {
        const status = item.orderItemStatuses?.[index]
        const comped = item.orderItemComped?.[index] ?? false
        return status === 'served' && !comped
    })


export default function MainPOS() {
    const [sendError , setSendError] = useState<string|null>(null);
    const { sendOrderToKitchen } = useKDS()
    const navigate = useNavigate()
    const { user, accessToken } = useAuth()
    const [searchParams] = useSearchParams()

    // รับ tableId, tableName, orderId จาก URL (มาจากหน้าโต๊ะ)
    const tableIdFromUrl = searchParams.get('tableId')
    // ใช้เฉพาะ orderId ที่ส่งมาตอนกดโต๊ะ (ไม่ใช่ orderId ที่สร้างระหว่างใช้งาน) สำหรับ hydrate ตะกร้า
    const initialOrderId = searchParams.get('orderId')
    const tableNameFromUrl = searchParams.get('tableName')
        ? decodeURIComponent(searchParams.get('tableName')!)
        : null

    // เมนูจริงจาก GET /menu/full — hook คืน menu[] พร้อม modifiers[] แล้ว
    const { categories, menu, isLoading, error, reload } = useFullMenu()

    const [isOrdered, setOrder] = useState<boolean>(false)
    const [cartMenu, setcartMenu] = useState<CartMenu[]>([])
    const [seletedCategory, setSelectCategory] = useState<string | null>(null)
    const [currentTable] = useState<string>(tableNameFromUrl ?? "โต๊ะ 1")
    const [currentText, setcurrentText] = useState<string>("")
    // แทนที่จะให้ orderId หายไปหลัง handleSendToKitchen จบ
    const [orderId, setOrderId] = useState<string | null>(initialOrderId)
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
    // กันแก้ตะกร้าระหว่างกำลังส่งครัว (กันจำนวนที่ส่งกับที่แสดงไม่ตรงกัน)
    const [isSending, setIsSending] = useState<boolean>(false)
    const [voidTarget, setVoidTarget] = useState<CartMenu | null>(null)
    const [compTarget, setCompTarget] = useState<CartMenu | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    // toast แจ้งผล void/comp สำเร็จ (aria-live)
    const [actionToast, setActionToast] = useState<string | null>(null)

    useEffect(() => {
        if (!actionToast) return
        const timer = window.setTimeout(() => setActionToast(null), 5000)
        return () => window.clearTimeout(timer)
    }, [actionToast])

    // โหลดรายการในบิลจาก server ใหม่ (หลังส่งครัว/void/comp) เพื่อให้ order_item_id + สถานะตรงกับ DB
    async function refreshCartFromServer(targetOrderId: string | null) {
        if (!targetOrderId || !accessToken) return
        const res = await apiFetch<{ status: string; data: ApiOrderDetail }>(`/orders/${targetOrderId}`, accessToken)
        if (!res.data || res.data.closed_at) return
        const { mapOrderItemsToCart } = await import('../hooks/useOrderCartHydration')
        const nextCart = mapOrderItemsToCart(res.data.items ?? [])
        setcartMenu(nextCart)
        setOrder(nextCart.length > 0)
    }

    // เปิดโต๊ะที่มีบิลค้าง → ดึงรายการในบิลกลับมาแสดงใน Sidebar
    // รายการที่ส่งครัว/เสิร์ฟแล้วจะถูกทำเครื่องหมาย sentQuantity และคงอยู่ใน Sidebar จนชำระเงิน
    useOrderCartHydration({
        orderId: initialOrderId,
        accessToken,
        onHydrate: (items) => {
            setcartMenu((prev) => (prev.length > 0 ? prev : items))
            setOrder(true)
        },
    })

    function handlePaymentSuccess() {
        // ชำระเงินสำเร็จ = จบออเดอร์ → เคลียร์ Sidebar และกลับไปหน้าโต๊ะ
        // สถานะโต๊ะเป็นว่างแล้วจาก DB trigger ตอน INSERT payments
        setcartMenu([])
        setOrder(false)
        setIsPaymentOpen(false)
        setOrderId(null)
        setSentToast((prev) => ({ ...prev, show: false }))
        navigate(`/${user?.tenantSlug}/tables`)
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
        if (isSending) return
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
        if (isSending) return
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
        if (isSending) return
        setcartMenu((prev) => {
            const target = prev.find((m) =>
                item.cartItemId ? m.cartItemId === item.cartItemId : m.id === item.id
            )
            if (!target) return prev

            const sent = target.sentQuantity ?? 0
            if (sent > 0) {
                // รายการที่ส่งครัวแล้วลบไม่ได้ — ลบได้เฉพาะจำนวนที่ยังไม่ส่ง
                if (target.quantity <= sent) return prev
                return prev.map((m) =>
                    m.cartItemId === target.cartItemId ? { ...m, quantity: sent } : m
                )
            }

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
        if (isSending) return
        setcartMenu((prev) => {
            const target = prev.find((m) =>
                item.cartItemId ? m.cartItemId === item.cartItemId : m.id === item.id
            )
            if (!target) return prev

            const sent = target.sentQuantity ?? 0
            // ลดต่ำกว่าจำนวนที่ส่งครัวไปแล้วไม่ได้
            if (target.quantity - 1 < sent) return prev

            if (target.quantity - 1 <= 0) {
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
        if (isSending) return
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
    async function handleSendToKitchen() {
        if (isSending) return

        // ส่งเฉพาะจำนวนที่ยังไม่เคยส่งครัว — รายการที่ส่งแล้วยังคงอยู่ใน Sidebar
        const pendingEntries = cartMenu
            .map((item) => ({
                item,
                quantity: item.quantity - (item.sentQuantity ?? 0),
            }))
            .filter((entry) => entry.quantity > 0)

        const pendingCount = pendingEntries.reduce((sum, entry) => sum + entry.quantity, 0)
        if (pendingCount === 0) return

        // ทำเครื่องหมายว่าส่งแล้ว โดยไม่ลบรายการออกจาก Sidebar
        const markAsSent = () => {
            const sentNow = new Map(
                pendingEntries.map((entry) => [entry.item.cartItemId, entry.quantity]),
            )
            setcartMenu((prev) =>
                prev.map((item) => {
                    const quantity = sentNow.get(item.cartItemId)
                    if (!quantity) return item
                    return {
                        ...item,
                        sentQuantity: (item.sentQuantity ?? 0) + quantity,
                    }
                }),
            )
        }

        const showSentToast = () => {
            setSentToast({ show: true, tableName: currentTable, itemCount: pendingCount })
            setTimeout(() => setSentToast((prev) => ({ ...prev, show: false })), 4500)
        }

        if (!tableIdFromUrl || !accessToken) {
            // fallback: ไม่มี tableId → push localStorage อย่างเดียว (เฉพาะรายการใหม่)
            sendOrderToKitchen(
                currentTable,
                pendingEntries.map((entry) => ({ ...entry.item, quantity: entry.quantity })),
            )
            markAsSent()
            showSentToast()
            return
        }

        setIsSending(true)
        setSendError(null)
        try {
            const kitchenTicketId = crypto.randomUUID() // 1 ค่าต่อการกดส่งครัว 1 รอบ

            // ── 1. หา orderId ที่ใช้จริง ──────────────────────────────
            // ลำดับความสำคัญ:
            //   a. open_order_id จาก URL (ส่งมาตอนกดโต๊ะที่ occupied)
            //   b. ดึงจาก GET /tables เพื่อหา open_order_id ล่าสุด
            //   c. สร้างบิลใหม่ (โต๊ะว่าง)
            let resolvedOrderId  = orderId

            if (!resolvedOrderId) {
                // ดึง open_order_id จาก table ปัจจุบัน
                const tablesRes = await apiFetch<{ status: string; data: { table_id: string; open_order_id: string | null }[] }>(
                    '/tables',
                    accessToken,
                )
                const thisTable = tablesRes.data.find((t) => t.table_id === tableIdFromUrl)
                resolvedOrderId = thisTable?.open_order_id ?? null
            }

            if (!resolvedOrderId) {
                // โต๊ะว่างจริง → สร้างบิลใหม่
                const newOrderId = crypto.randomUUID()
                const createRes = await apiFetch<{ status: string; data: { order_id: string } }>(
                    '/orders',
                    accessToken,
                    'POST',
                    { orderId: newOrderId, tableId: tableIdFromUrl },
                )
                resolvedOrderId = createRes.data?.order_id ?? newOrderId
            }
            setOrderId(resolvedOrderId);

            // ── 2. แปลงเฉพาะรายการที่ยังไม่ส่ง → items (1 จาน = 1 แถว) ──
            const itemsToSend: {
                orderItemId: string
                menuItemId: string
                specialRequest?: string
                modifierIds?: string[]
            }[] = []

            for (const { item: cartItem, quantity } of pendingEntries) {
                const modifierIds = cartItem.selectedAddons?.map((a) => a.id) ?? []
                const specialRequest = [cartItem.selectedSpiciness, cartItem.note]
                    .filter(Boolean)
                    .join(", ") || undefined

                for (let i = 0; i < quantity; i++) {
                    itemsToSend.push({
                        orderItemId: crypto.randomUUID(),
                        menuItemId: cartItem.id,
                        specialRequest,
                        modifierIds: modifierIds.length > 0 ? modifierIds : undefined,
                    })
                }
            }

            // ── 3. POST /orders/:id/items + kitchenTicketId ───────────
            // backend จะ INSERT items ด้วย status='queued' + kitchen_ticket_id ทันที
            await apiFetch(
                `/orders/${resolvedOrderId}/items`,
                accessToken,
                'POST',
                { items: itemsToSend, kitchenTicketId },
            )

            // ── 4. คงตะกร้าไว้ (ล้างตอนชำระเงินเท่านั้น) + toast ─────
            markAsSent()
            showSentToast()
            // โหลดข้อมูลจาก DB เพื่อให้ได้ order_item_id และสถานะสำหรับ void/comp
            await refreshCartFromServer(resolvedOrderId).catch(() => undefined)
        } catch (err) {
            setSendError(err instanceof ApiError ? err.message : 'ส่งครัวไม่สำเร็จ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')
        } finally {
            setIsSending(false)
        }
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

                            <div className="h-4 w-1px bg-stone-300 mx-1" />

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
                            canPay={!!orderId && !isSending}
                            isSending={isSending}
                            onDeleteFromCart={onDeleteFromCart}
                            onReduceValue={onReduceValue}
                            onIncreaseValue={onIncreaseValue}
                            onSendToKitchen={handleSendToKitchen}
                            onPayment={() => orderId && setIsPaymentOpen(true)}
                            onVoidItem={(item) => {
                                setActionError(null)
                                setVoidTarget(item)
                            }}
                            onCompItem={(item) => {
                                setActionError(null)
                                setCompTarget(item)
                            }}
                        />
                    )}
                </aside>

                {/* Modal ชำระเงิน */}
                {isPaymentOpen && orderId && (
                    <PaymentModal
                        table={currentTable}
                        orderId={orderId}
                        onClose={() => setIsPaymentOpen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                    />
                )}

                {voidTarget && (
                    <VoidItemModal
                        isOpen={true}
                        itemName={voidTarget.name}
                        quantity={getVoidableItemIds(voidTarget).length}
                        loading={actionLoading}
                        error={actionError}
                        onClose={() => {
                            setVoidTarget(null)
                            setActionError(null)
                        }}
                        onConfirm={async ({ reason, approverPin }) => {
                            const ids = getVoidableItemIds(voidTarget)
                            if (ids.length === 0) {
                                setActionError('ไม่มีรายการที่ยกเลิกได้ในขณะนี้ กรุณารีเฟรชหน้าจอ')
                                return
                            }
                            setActionLoading(true)
                            setActionError(null)
                            try {
                                const res = await voidOrderItems(
                                    { orderItemIds: ids, reason, approverPin },
                                    accessToken,
                                )
                                await refreshCartFromServer(orderId).catch(() => undefined)
                                setVoidTarget(null)
                                setActionToast(
                                    `ยกเลิก ${ids.length} รายการ · อนุมัติโดย ${res.data.approvedBy.displayName}`,
                                )
                            } catch (err) {
                                setActionError(
                                    err instanceof ApiError ? err.message : 'ไม่สามารถยกเลิกรายการได้',
                                )
                            } finally {
                                setActionLoading(false)
                            }
                        }}
                    />
                )}

                {compTarget && (
                    <CompItemModal
                        isOpen={true}
                        itemName={compTarget.name}
                        quantity={getCompableItemIds(compTarget).length}
                        loading={actionLoading}
                        error={actionError}
                        onClose={() => {
                            setCompTarget(null)
                            setActionError(null)
                        }}
                        onConfirm={async ({ reason, approverPin }) => {
                            const ids = getCompableItemIds(compTarget)
                            if (ids.length === 0) {
                                setActionError('ไม่มีรายการที่ Comp ได้ในขณะนี้ กรุณารีเฟรชหน้าจอ')
                                return
                            }
                            setActionLoading(true)
                            setActionError(null)
                            try {
                                const res = await compOrderItems(
                                    { orderItemIds: ids, reason, approverPin },
                                    accessToken,
                                )
                                await refreshCartFromServer(orderId).catch(() => undefined)
                                setCompTarget(null)
                                setActionToast(
                                    `Comp ${ids.length} รายการ · อนุมัติโดย ${res.data.approvedBy.displayName}`,
                                )
                            } catch (err) {
                                setActionError(
                                    err instanceof ApiError ? err.message : 'ไม่สามารถ Comp รายการได้',
                                )
                            } finally {
                                setActionLoading(false)
                            }
                        }}
                    />
                )}

                {actionToast && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2D241E] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-kanit"
                    >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
                        <span className="text-sm font-medium">{actionToast}</span>
                        <button
                            type="button"
                            onClick={() => setActionToast(null)}
                            aria-label="ปิดการแจ้งเตือน"
                            className="p-1 rounded-lg text-white/70 hover:text-white transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {sendError && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-kanit">
                        <span className="text-sm font-medium">{sendError}</span>
                        <button type="button" onClick={() => setSendError(null)}
                            className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer">
                            <X className="w-4 h-4" />
                        </button>
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
                                {sentToast.tableName} ({sentToast.itemCount} รายการใหม่) สร้างสถานะ 'รอทำ' ใน KDS แล้ว
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                            <button
                                type="button"
                                onClick={() => navigate(`/${user?.tenantSlug}/kds`)}
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