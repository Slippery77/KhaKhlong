// ============================================================
// Frontend UI types (ใช้ใน KDSCard / KDSPage)
// ============================================================

export type KDSStatus = "รอทำ" | "กำลังทำ" | "พร้อมเสิร์ฟ"

// ── สำหรับ KDSContext (sendOrderToKitchen จาก POS) ──────────
export interface KDSOrderItemAddon {
    id: string
    name: string
    price: number
}

export interface KDSOrderItem {
    id: string
    name: string
    quantity: number
    price: number
    basePrice?: number
    selectedSpiciness?: string
    selectedAddons?: KDSOrderItemAddon[]
    note?: string
}

/** KDSOrder ใช้ใน KDSContext เท่านั้น (legacy ไว้ให้ POS ส่งออเดอร์ไปที่ context) */
export interface KDSOrder {
    id: string
    orderNumber: number
    table: string
    status: KDSStatus
    createdAt: number // Unix ms
    items: KDSOrderItem[]
    totalPrice: number
    totalQuantity: number
}

// ============================================================
// Backend API types (ใช้ใน useKDSQueue / KDSPage / KDSCard)
// ============================================================

/** สถานะที่ backend ยอมรับ (5 สถานะ) */
export type BackendKDSStatus =
    | "queued"
    | "preparing"
    | "ready"
    | "served"
    | "voided"

/** modifier ที่แนบมากับแต่ละรายการ */
export interface ApiKDSModifier {
    modifier_id: string
    name: string
    price_delta: number
}

/**
 * 1 แถวจาก GET /kds/queue
 * backend ส่งมาเป็น flat list ระดับ order_item
 */
export interface ApiKDSItem {
    order_item_id: string
    order_id: string
    order_number: number | null
    table_number: string | null
    item_name_snapshot: string
    status: BackendKDSStatus
    kitchen_ticket_id: string | null
    special_request: string | null
    modifiers: ApiKDSModifier[]
    queued_at: string | null
    preparing_at: string | null
    ready_at: string | null
    served_at: string | null
    created_at: string
    updated_at: string
}

/**
 * Backend จัดกลุ่ม order_items ตาม kitchen_ticket_id
 * frontend แสดงเป็น "ตั๋ว" หนึ่งใบต่อการกดส่งครัวหนึ่งครั้ง
 */
export interface KDSTicket {
    /** kitchen_ticket_id — null เมื่อ item ยังเป็น draft */
    ticketId: string
    orderId: string
    orderNumber: number | null
    tableNumber: string
    /** สถานะหยาบของตั๋ว: ใช้สถานะของ item ที่ "เร็วสุด" ในสายทาง queued→preparing→ready */
    overallStatus: KDSStatus
    createdAt: number // Unix ms (ใช้ queued_at ของ item แรกในตั๋ว)
    items: ApiKDSItem[]
}

// ── helper: แปลง backend status → Thai UI status ────────────
export function toUIStatus(s: BackendKDSStatus): KDSStatus | null {
    if (s === "queued")    return "รอทำ"
    if (s === "preparing") return "กำลังทำ"
    if (s === "ready")     return "พร้อมเสิร์ฟ"
    return null // served / voided ไม่แสดงบนจอครัว
}

export function toBackendStatus(s: KDSStatus): BackendKDSStatus {
    if (s === "รอทำ")        return "queued"
    if (s === "กำลังทำ")     return "preparing"
    if (s === "พร้อมเสิร์ฟ") return "ready"
    return "queued"
}

// ── helper: จัดกลุ่ม ApiKDSItem[] เป็น KDSTicket[] ──────────
export function groupItemsToTickets(items: ApiKDSItem[]): KDSTicket[] {
    // เฉพาะ queued / preparing / ready เท่านั้น
    const active = items.filter(
        (i) => i.status === "queued" || i.status === "preparing" || i.status === "ready",
    )

    const ticketMap = new Map<string, ApiKDSItem[]>()
    for (const item of active) {
        const key = item.kitchen_ticket_id ?? item.order_item_id
        if (!ticketMap.has(key)) ticketMap.set(key, [])
        ticketMap.get(key)!.push(item)
    }

    const tickets: KDSTicket[] = []
    for (const [ticketId, ticketItems] of ticketMap) {
        // overall status = status ของ item ที่ "ช้าสุด" (queued > preparing > ready)
        const priority: BackendKDSStatus[] = ["queued", "preparing", "ready"]
        const lowestStatus = priority.find((p) => ticketItems.some((i) => i.status === p))
            ?? "queued"
        const uiStatus = toUIStatus(lowestStatus)!

        // createdAt = queued_at ของ item แรก หรือ created_at fallback
        const firstItem = ticketItems[0]
        const createdAt = new Date(firstItem.queued_at ?? firstItem.created_at).getTime()

        tickets.push({
            ticketId,
            orderId: firstItem.order_id,
            orderNumber: firstItem.order_number,
            tableNumber: firstItem.table_number ?? "-",
            overallStatus: uiStatus,
            createdAt,
            items: ticketItems,
        })
    }

    // เรียงตามเวลาเก่าสุดก่อน
    return tickets.sort((a, b) => a.createdAt - b.createdAt)
}
