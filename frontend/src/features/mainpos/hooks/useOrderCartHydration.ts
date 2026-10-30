import { useEffect, useRef } from "react"
import { apiFetch } from "../../../libs/appClient"
import type { CartMenu, ModifierOption } from "../types/pos.types"

/**
 * Hydration ตะกร้าจากบิลที่เปิดอยู่ (GET /orders/:id)
 *
 * เหตุผล: ตะกร้าฝั่ง client เป็น state ใน memory ถ้าออกจากหน้า POS ไปดู KDS/โต๊ะ
 * แล้วกลับเข้ามา ตะกร้าจะว่างทั้งที่บิลยังเปิดอยู่ ทำให้รายการที่ส่งครัว/เสิร์ฟแล้วหาย
 * จาก OrderSidebar
 *
 * หลักการ: 1 จาน = 1 แถวใน DB → aggregate กลับเป็น CartMenu ตาม
 * (menu_item_id + special_request + modifier) แล้วตั้ง sentQuantity เป็นจำนวนที่
 * ส่งเข้าครัวแล้ว (status ไม่ใช่ draft) เพื่อให้รายการที่เสิร์ฟแล้วยังแสดงอยู่
 * จนกว่าจะชำระเงิน
 */

export interface ApiOrderItemModifier {
  modifierId: string
  name: string
  priceDelta: number | string
}

export interface ApiOrderItem {
  order_item_id: string
  menu_item_id: string
  unit_price_snapshot: number | string
  item_name_snapshot: string
  status: "draft" | "queued" | "preparing" | "ready" | "served" | "voided"
  special_request: string | null
  is_comped: boolean
  kitchen_ticket_id: string | null
  created_at: string
  modifiers: ApiOrderItemModifier[]
}

export interface ApiOrderDetail {
  order_id: string
  closed_at: string | null
  items: ApiOrderItem[]
}

interface CartGroup {
  first: ApiOrderItem
  quantity: number
  sentQuantity: number
  modifiers: ModifierOption[]
  orderItemIds: string[]
  orderItemStatuses: string[]
  orderItemComped: boolean[]
  hasVoided: boolean
  hasComped: boolean
}

const toNumber = (value: number | string | null | undefined) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const buildGroupKey = (item: ApiOrderItem) => {
  const modifierKey = (item.modifiers ?? [])
    .map((m) => m.modifierId)
    .sort()
    .join(",")
  return `${item.menu_item_id}|${item.special_request ?? ""}|${modifierKey}`
}

const mapModifiers = (item: ApiOrderItem): ModifierOption[] =>
  (item.modifiers ?? []).map((m) => ({
    id: m.modifierId,
    name: m.name,
    price: toNumber(m.priceDelta),
  }))

export function mapOrderItemsToCart(items: ApiOrderItem[]): CartMenu[] {
  const groups = new Map<string, CartGroup>()

  for (const item of items) {
    const key = buildGroupKey(item)
    const existing = groups.get(key)
    const isSent = item.status !== "draft" && item.status !== "voided"

    if (existing) {
      if (item.status === "voided") {
        existing.hasVoided = true
        existing.orderItemIds.push(item.order_item_id)
        existing.orderItemStatuses.push(item.status)
        existing.orderItemComped.push(false)
        continue
      }
      existing.quantity += 1
      if (isSent) existing.sentQuantity += 1
      existing.orderItemIds.push(item.order_item_id)
      existing.orderItemStatuses.push(item.status)
      existing.orderItemComped.push(item.is_comped)
      if (item.is_comped) existing.hasComped = true
      continue
    }

    if (item.status === "voided") {
      groups.set(key, {
        first: item,
        quantity: 0,
        sentQuantity: 0,
        modifiers: mapModifiers(item),
        orderItemIds: [item.order_item_id],
        orderItemStatuses: [item.status],
        orderItemComped: [false],
        hasVoided: true,
        hasComped: false,
      })
      continue
    }

    groups.set(key, {
      first: item,
      quantity: 1,
      sentQuantity: isSent ? 1 : 0,
      modifiers: mapModifiers(item),
      orderItemIds: [item.order_item_id],
      orderItemStatuses: [item.status],
      orderItemComped: [item.is_comped],
      hasVoided: false,
      hasComped: item.is_comped,
    })
  }

  return Array.from(groups.values())
    .filter((group) => group.quantity > 0 || group.hasVoided)
    .map((group) => {
      const { first, quantity, sentQuantity, modifiers, orderItemIds, orderItemStatuses, orderItemComped, hasVoided, hasComped } = group
      const modifierTotal = modifiers.reduce((sum, m) => sum + m.price, 0)
      const basePrice = toNumber(first.unit_price_snapshot)

      return {
        cartItemId: `${first.order_item_id}-group`,
        id: first.menu_item_id,
        name: first.item_name_snapshot,
        price: basePrice + modifierTotal,
        basePrice,
        quantity: quantity || 0,
        selectedAddons: modifiers.length > 0 ? modifiers : undefined,
        // backend เก็บ spiciness + note รวมกันใน special_request
        note: first.special_request ?? undefined,
        sentQuantity,
        orderItemIds,
        orderItemStatuses,
        orderItemComped,
        hasVoided,
        hasComped,
      }
    })
}

interface UseOrderCartHydrationParams {
  /** orderId ที่มาจาก URL ตอนกดโต๊ะที่มีบิลเปิดอยู่ (ไม่ใช่ orderId ที่เพิ่งสร้างระหว่างใช้งาน) */
  orderId: string | null
  accessToken: string | null
  onHydrate: (cartMenu: CartMenu[]) => void
}

export function useOrderCartHydration({
  orderId,
  accessToken,
  onHydrate,
}: UseOrderCartHydrationParams) {
  const hydratedOrderRef = useRef<string | null>(null)
  const onHydrateRef = useRef(onHydrate)
  const mountedRef = useRef(true)

  // เก็บ callback ล่าสุดไว้ ไม่ให้ effect ทำงานซ้ำทุกครั้งที่ parent re-render
  useEffect(() => {
    onHydrateRef.current = onHydrate
  }, [onHydrate])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!orderId || !accessToken) return
    if (hydratedOrderRef.current === orderId) return

    // ทำเครื่องหมายก่อนยิง request กัน StrictMode เรียก effect ซ้ำแล้ว hydrate 2 รอบ
    hydratedOrderRef.current = orderId

    apiFetch<{ status: string; data: ApiOrderDetail }>(
      `/orders/${orderId}`,
      accessToken,
    )
      .then((res) => {
        if (!mountedRef.current) return
        // บิลที่ปิดแล้ว (ชำระเงิน/ปิดบิลไปแล้ว) ไม่ต้อง hydrate กลับมา
        if (res.data?.closed_at) return
        const cartMenu = mapOrderItemsToCart(res.data?.items ?? [])
        if (cartMenu.length > 0) onHydrateRef.current(cartMenu)
      })
      .catch(() => {
        // โหลดรายการบิลไม่สำเร็จ → ปล่อยตะกร้าว่าง ผู้ใช้ยังส่งครัวรายการใหม่ได้
        // (ถ้าปล่อย ref ไว้จะไม่ retry อัตโนมัติ ซึ่งยอมรับได้เพราะผู้ใช้รีเฟรชหน้าได้)
      })
  }, [orderId, accessToken])
}
