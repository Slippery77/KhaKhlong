import Header from "../../../components/Header";
import { useEffect, useState, useRef } from "react";
import MenuCard from "../components/MenuCard";
import MenuSidebar from "../components/MenuSidebar";
import OrderSidebar from "../components/OrderSidebar";
import ModifierPopup from "../components/ModifierPopup";
import PaymentModal from "../components/PaymentModal";
import SearchBar from "../components/SearchBar";
import VoidItemModal from "../components/VoidItemModal";
import CompItemModal from "../components/CompItemModal";
import { ArrowLeft, Search, ChefHat, CheckCircle2, X, CloudUpload, AlertTriangle } from "lucide-react";
// import { useKDS } from "../../kds/context/KDSContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFullMenu } from "../hooks/useFullMenu";
import { useOrderCartHydration, type ApiOrderDetail } from "../hooks/useOrderCartHydration";
import type { Menu, CartMenu, ModifierOption } from "../types/pos.types";
import { useAuth } from "../../auth/context/AuthContext";
import { apiFetch,ApiError } from "../../../libs/appClient";
import { voidOrderItems, compOrderItems, cancelOrder } from "../api/orders.api";
import CancelBillModal, { type BillActionPayload } from "../components/CancelBillModal"
import { enqueueOrder, hasUnsentOrder, type NewOrderItem } from "../../offline/outbox"
import { flushOutbox } from "../../offline/flush"
import { fetchWithSnapshot, readSnapshot } from "../../offline/snapshotCache"
import { useOutbox } from "../../offline/hooks/useOutbox"
import { useConnectionStatus } from "../../offline/hooks/useConnectionStatus"
import { openOutboxPanel } from "../../offline/outboxPanel"
import OfflineBillSummary from "../../offline/components/OfflineBillSummary"
import type { DiningTable } from "../../tables/types/table.types"
import type { Shift } from "../../shifts/types/shift.types"

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


function MenuCardSkeleton() {
    return (
        <div
            className="flex h-[204px] flex-col overflow-hidden rounded-2xl border border-[#E2D6C5] bg-white animate-pulse shadow-xs"
            aria-busy="true"
        >
            <div className="h-[132px] w-full bg-[#EFE8DC]/70" />
            <div className="flex flex-1 flex-col justify-between p-3">
                <div className="h-4 w-3/4 rounded bg-stone-200/70" />
                <div className="flex items-center justify-between">
                    <div className="h-4 w-14 rounded bg-stone-200/60" />
                    <div className="h-4 w-8 rounded bg-stone-200/40" />
                </div>
            </div>
        </div>
    );
}

export default function MainPOS() {
    const [sendError , setSendError] = useState<string|null>(null);
    // const { sendOrderToKitchen } = useKDS()
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
        queued:boolean //true = บันทึกในเครื่องแล้ว แต่ยังไม่ถึง server
    }>({
        show: false,
        tableName: "",
        itemCount: 0,
        queued:false,
    })

    // State สำหรับเปิดหน้าต่างชำระเงิน
    const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false)
    // กันแก้ตะกร้าระหว่างกำลังส่งครัว (กันจำนวนที่ส่งกับที่แสดงไม่ตรงกัน)
    const [isSending, setIsSending] = useState<boolean>(false)
    const [voidTarget, setVoidTarget] = useState<CartMenu | null>(null)
    const [compTarget, setCompTarget] = useState<CartMenu | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    // ยกเลิกทั้งบิล (void ทั้งหมด + ปิดบิล) — ต้องมี PIN ผู้อนุมัติ
    const [isCancelBillOpen, setIsCancelBillOpen] = useState(false)
    const [cancelBillLoading, setCancelBillLoading] = useState(false)
    const [cancelBillError, setCancelBillError] = useState<string | null>(null)
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

    // ── [ใหม่] สถานะ outbox ของ "บิลนี้" ─────────────────────────────
    // useOutbox อ่าน IndexedDB แบบสด → ส่งสำเร็จ/ล้ม เมื่อไหร่ หน้านี้รู้ทันที (แม้ runner เป็นคนส่ง)
    const { status: connection } = useConnectionStatus()
    const { entries: outboxEntries } = useOutbox(user?.tenantSlug)
    const billQueue = orderId ? outboxEntries.filter((e) => e.orderId === orderId) : []
    const billQueuedItems = billQueue.reduce(
        (n, e) => n + (e.kind === 'addItems' ? e.payload.items.length : 0),
        0,
    )
    const billFailed = billQueue.find((e) => e.status === 'failed')

    // โหลดรายการจริงจาก server เมื่อ "บิลนี้ไม่มีของค้างแล้ว" และเพิ่งเกิดเหตุการณ์ใดเหตุการณ์หนึ่ง
    //   1. คิวของบิลนี้เพิ่งว่าง (ส่งครบ) → ได้ order_item_id/สถานะครัว ใช้ void/comp ได้
    //   2. เพิ่งกลับมาออนไลน์ → แทนที่ตะกร้าว่าง/ข้อมูลเก่าตอนเข้าโต๊ะแบบออฟไลน์
    // ข้ามถ้าตะกร้ามีรายการที่ยังไม่ได้กดส่งครัว — refresh จะเขียนทับจนรายการนั้นหาย
    // เก็บฟังก์ชันล่าสุดไว้ใน ref (แบบเดียวกับ useOrderCartHydration) — effect ด้านล่างจะได้ไม่ต้องใส่ใน deps
    const refreshRef = useRef(refreshCartFromServer)
    useEffect(() => {
        refreshRef.current = refreshCartFromServer
    })
    const lastSync = useRef({ queueSize: billQueue.length, connection })
    useEffect(() => {
        const prev = lastSync.current
        lastSync.current = { queueSize: billQueue.length, connection }
        if (!orderId || connection !== 'online' || billQueue.length > 0) return
        const drained = prev.queueSize > 0
        const reconnected = prev.connection !== 'online'
        if (!drained && !reconnected) return
        const hasDraft = cartMenu.some((item) => item.quantity > (item.sentQuantity ?? 0))
        if (hasDraft) return
        void refreshRef.current(orderId).catch(() => undefined)
    }, [billQueue.length, connection, orderId, cartMenu])

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

    // ยกเลิกทั้งบิล = void รายการที่ยังไม่เสิร์ฟ + ปิดบิลในครั้งเดียว (server ทำใน transaction เดียว)
    async function handleCancelBill(payload: BillActionPayload) {
        if (!orderId) {
            setCancelBillError('ไม่พบบิลที่เปิดอยู่ กรุณากลับไปหน้าโต๊ะแล้วเข้าใหม่')
            return
        }
        setCancelBillLoading(true)
        setCancelBillError(null)
        try {
            const res = await cancelOrder(
                orderId,
                { reason: payload.reason, note: payload.note, approverPin: payload.approverPin },
                accessToken,
            )
            setIsCancelBillOpen(false)
            setcartMenu([])
            setOrder(false)
            setOrderId(null)
            setSentToast((prev) => ({ ...prev, show: false }))
            setActionToast(
                `ยกเลิกบิลแล้ว ${res.data.voidedCount} รายการ · อนุมัติโดย ${res.data.approvedBy.displayName}`,
            )
            // ให้ผู้ใช้เห็น toast ก่อนกลับไปหน้าโต๊ะ (โต๊ะว่างแล้วจาก DB trigger)
            window.setTimeout(() => navigate(`/${user?.tenantSlug}/tables`), 1400)
        } catch (err) {
            setCancelBillError(
                err instanceof ApiError ? err.message : 'ยกเลิกบิลไม่สำเร็จ กรุณาลองใหม่',
            )
        } finally {
            setCancelBillLoading(false)
        }
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

        const showSentToast = (queued: boolean) => {
            setSentToast({ show: true, tableName: currentTable, itemCount: pendingCount, queued })
            setTimeout(() => setSentToast((prev) => ({ ...prev, show: false })), 4500)
        }

        // [ใหม่] ไม่มีโต๊ะ / ยังไม่รู้ว่าเป็นใคร → ส่งไม่ได้ (เดิมส่งเข้า localStorage ซึ่งครัวไม่เห็นจริง)
        const tenantSlug = user?.tenantSlug
        if (!tableIdFromUrl || !tenantSlug || !user?.sub) {
            setSendError('ไม่พบข้อมูลโต๊ะ กรุณากลับไปเลือกโต๊ะใหม่')
            return
        }

        setIsSending(true)
        setSendError(null)
        try {
            // ── 1. หาเลขบิลของโต๊ะนี้ ───────────────────────────────
            //   a. orderId ที่หน้านี้รู้อยู่แล้ว (มาจาก URL หรือเพิ่งหย่อนรอบก่อน)
            //   b. ถาม server ก่อน ติดต่อไม่ได้ใช้ผังโต๊ะในเครื่อง (enqueue อัปเดตให้แล้วถ้าเปิดบิลตอนออฟไลน์)
            //   c. ไม่เจอ = โต๊ะว่าง → ส่ง null ให้ enqueueOrder สร้างบิลใหม่
            let resolvedOrderId = orderId
            if (!resolvedOrderId) {
                const { data: tables } = await fetchWithSnapshot(tenantSlug, 'tables', async () => {
                    const res = await apiFetch<{ status: string; data: DiningTable[] }>('/tables', accessToken)
                    return res.data
                })
                resolvedOrderId = tables.find((t) => t.table_id === tableIdFromUrl)?.open_order_id ?? null
            }

            // ── 2. แปลงเฉพาะรายการที่ยังไม่ส่ง → 1 จาน = 1 รายการ ─────
            // ไม่ต้องสร้าง orderItemId เอง — enqueueOrder สร้าง UUID ให้ครั้งเดียว (ส่งซ้ำกี่รอบก็ id เดิม)
            const items: NewOrderItem[] = []
            for (const { item: cartItem, quantity } of pendingEntries) {
                const modifierIds = cartItem.selectedAddons?.map((a) => a.id) ?? []
                const specialRequest = [cartItem.selectedSpiciness, cartItem.note]
                    .filter(Boolean)
                    .join(", ") || undefined

                for (let i = 0; i < quantity; i++) {
                    items.push({
                        menuItemId: cartItem.id,
                        specialRequest,
                        modifierIds: modifierIds.length > 0 ? modifierIds : undefined,
                    })
                }
            }

            // ── 3. หย่อนลง outbox (บันทึกในเครื่องก่อนเสมอ ทั้งออนไลน์และออฟไลน์) ──
            const shift = await readSnapshot<Shift | null>(tenantSlug, 'currentShift')
            const { orderId: queuedOrderId } = await enqueueOrder({
                tenantSlug,
                userId: user.sub,
                shiftId: shift?.data?.shiftId ?? null,
                tableId: tableIdFromUrl,
                orderId: resolvedOrderId,
                items,
            })
            setOrderId(queuedOrderId)
            markAsSent() // ถึงตรงนี้ของไม่หายแล้ว (อยู่ใน IndexedDB) → ล็อกจำนวนในตะกร้า

            // ── 4. ส่งทันที ไม่รอรอบ 30 วินาที ─────────────────────────
            // ออฟไลน์ = คืน 'unreachable' เร็ว ๆ ของยังอยู่ในคิว runner ส่งให้เมื่อเน็ตกลับ
            // ส่งครบแล้ว effect "คิวของบิลนี้เพิ่งว่าง" ด้านบนจะโหลดรายการจริงจาก server เอง
            await flushOutbox()
            showSentToast(await hasUnsentOrder(queuedOrderId))
        } catch (err) {
            // มาถึงตรงนี้ = ยังไม่ได้หย่อนลงคิว (หาโต๊ะไม่ได้ / IndexedDB ใช้ไม่ได้) → ตะกร้ายังไม่ถูกล็อก กดใหม่ได้
            setSendError(err instanceof ApiError ? err.message : 'ส่งครัวไม่สำเร็จ ไม่พบข้อมูลโต๊ะในเครื่อง ลองเชื่อมต่อแล้วกดใหม่')
        } finally {
            setIsSending(false)
        }
    }

    // สรุปบิลฝั่ง server (นับเฉพาะรายการที่ส่งครัวแล้วและยังไม่ถูก void)
    const billItemCount = cartMenu.reduce(
        (count, item) =>
            count +
            (item.orderItemIds ?? []).filter(
                (_, index) => item.orderItemStatuses?.[index] !== 'voided',
            ).length,
        0,
    )
    const billTotal = cartMenu.reduce((sum, item) => {
        const comped = Math.min((item.orderItemComped ?? []).filter(Boolean).length, item.quantity)
        const chargeable = Math.max((item.sentQuantity ?? 0) - comped, 0)
        return sum + item.price * chargeable
    }, 0)

    // ชำระเงินได้เมื่อ: มีบิล + ไม่อยู่ระหว่างส่ง + ไม่มีรายการค้างใน outbox + ไม่มีรายการ draft ในตะกร้า + มีจานในบิล > 0
    const hasPendingOutbox = billQueue.length > 0;
    const hasUnsentDraft = cartMenu.some((item) => item.quantity > (item.sentQuantity ?? 0));
    const canPay = Boolean(orderId && !isSending && !hasPendingOutbox && !hasUnsentDraft && billItemCount > 0);

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
                        isLoading={isLoading}
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

                    {/* [ใหม่] สถานะออฟไลน์ของบิลนี้ */}
                    {(billQueue.length > 0 || (connection !== 'online' && orderId)) && (
                        <div className="space-y-2 px-6 pt-4 font-kanit">
                            {/* (ค) เข้าโต๊ะที่มีบิลตอนออฟไลน์ — ดึงรายการเดิมไม่ได้ สรุปจากผังโต๊ะในเครื่องแทน */}
                            {connection !== 'online' && orderId && tableIdFromUrl && user?.tenantSlug &&
                                !cartMenu.some((item) => (item.orderItemIds?.length ?? 0) > 0) && (
                                    <OfflineBillSummary tenantSlug={user.tenantSlug} tableId={tableIdFromUrl} />
                                )}
                            {billFailed ? (
                                <div role="alert" className="flex items-center gap-2 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318]">
                                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span className="flex-1">ส่งครัวไม่สำเร็จ: {billFailed.lastError}</span>
                                    <button type="button" onClick={openOutboxPanel} className="cursor-pointer font-semibold underline underline-offset-2">
                                        ดูรายการ
                                    </button>
                                </div>
                            ) : billQueue.length > 0 ? (
                                <div role="status" className="flex items-center gap-2 rounded-xl border border-[#d9c6b0] bg-[#F3EDE4] px-4 py-2.5 text-sm text-[#2D241E]">
                                    <CloudUpload className="h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
                                    <span className="flex-1">
                                        {billQueuedItems} รายการของบิลนี้ยังไม่ถึงครัว · บันทึกไว้ในเครื่องแล้ว ส่งให้อัตโนมัติเมื่อเชื่อมต่อได้
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-6 flex-1 content-start">
                        {isLoading && menu.length === 0 ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <MenuCardSkeleton key={i} />
                            ))
                        ) : error && menu.length === 0 ? (
                            <div className="col-span-4 flex flex-col items-center gap-3 py-20 text-center font-kanit">
                                <p className="text-sm text-red-600">{error}</p>
                                <button
                                    type="button"
                                    onClick={reload}
                                    className="rounded-xl border border-[#d9c6b0] px-4 py-2 text-sm text-[#2D241E] transition hover:bg-[#FAF7F2] active:scale-95 cursor-pointer"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        ) : isMenuExist ? (
                            filteredMenu.map((m) => {
                                const countInCart = cartMenu
                                    .filter((c) => c.id === m.id)
                                    .reduce((sum, c) => sum + c.quantity, 0);
                                return (
                                    <MenuCard
                                        key={m.id}
                                        menu={m}
                                        cartCount={countInCart}
                                        onClickMenuCard={handleMenuClick}
                                    />
                                );
                            })
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
                            canPay={canPay}
                            outboxPendingCount={billQueue.length}
                            isSending={isSending}
                            onDeleteFromCart={onDeleteFromCart}
                            onReduceValue={onReduceValue}
                            onIncreaseValue={onIncreaseValue}
                            onSendToKitchen={handleSendToKitchen}
                            onPayment={() => canPay && setIsPaymentOpen(true)}
                            onVoidItem={(item) => {
                                setActionError(null)
                                setVoidTarget(item)
                            }}
                            onCompItem={(item) => {
                                setActionError(null)
                                setCompTarget(item)
                            }}
                            onCancelBill={
                                orderId
                                    ? () => {
                                          setCancelBillError(null)
                                          setIsCancelBillOpen(true)
                                      }
                                    : undefined
                            }
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

                {/* Modal ยกเลิกทั้งบิล (void ทั้งหมด + ปิดบิล) */}
                <CancelBillModal
                    isOpen={isCancelBillOpen}
                    mode="cancel"
                    itemCount={billItemCount}
                    total={billTotal}
                    loading={cancelBillLoading}
                    error={cancelBillError}
                    onClose={() => {
                        if (cancelBillLoading) return
                        setIsCancelBillOpen(false)
                        setCancelBillError(null)
                    }}
                    onConfirm={handleCancelBill}
                />

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
                            <span className="text-sm font-semibold">
                                {sentToast.queued ? 'บันทึกออเดอร์แล้ว รอส่งครัว' : 'ส่งออเดอร์เข้าครัวสำเร็จ!'}
                            </span>
                            <span className="text-xs text-stone-300">
                                {sentToast.queued
                                    ? `${sentToast.tableName} (${sentToast.itemCount} รายการใหม่) ยังติดต่อเซิร์ฟเวอร์ไม่ได้ จะส่งเข้าครัวให้อัตโนมัติ`
                                    : `${sentToast.tableName} (${sentToast.itemCount} รายการใหม่) สร้างสถานะ 'รอทำ' ใน KDS แล้ว`}
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