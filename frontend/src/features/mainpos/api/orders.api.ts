import { apiFetch } from '../../../libs/appClient'

export interface OrderItemActionResult {
  items: {
    order_item_id: string
    order_id: string
    status: string
    voided_by?: string | null
    voided_at?: string | null
    void_reason?: string | null
    is_comped?: boolean
    comped_by?: string | null
    comped_at?: string | null
    comp_reason?: string | null
  }[]
  approvedBy: { usersId: string; displayName: string }
}

interface ItemActionPayload {
  orderItemIds: string[]
  reason: string
  approverPin: string
}

/** ยกเลิกรายการ — ต้องมี PIN ผู้จัดการ/เจ้าของร้าน (สิทธิ์ void:approve) */
export async function voidOrderItems(
  payload: ItemActionPayload,
  accessToken: string | null,
) {
  return apiFetch<{ status: string; data: OrderItemActionResult }>(
    '/orders/items/void',
    accessToken,
    'POST',
    payload,
  )
}

/** Comp รายการ (ให้ฟรี 100%) — ต้องมี PIN ผู้จัดการ/เจ้าของร้าน (สิทธิ์ discount:approve) */
export async function compOrderItems(
  payload: ItemActionPayload,
  accessToken: string | null,
) {
  return apiFetch<{ status: string; data: OrderItemActionResult }>(
    '/orders/items/comp',
    accessToken,
    'POST',
    payload,
  )
}

export type CloseReason = 'voided_all' | 'empty' | 'walkout'

export interface CancelOrderPayload {
  /** เหตุผลที่ยกเลิกทั้งบิล (เก็บใน void_reason ของทุกรายการ) */
  reason: string
  note?: string
  /** PIN 6 หลักของผู้จัดการ/เจ้าของร้านที่อนุมัติ */
  approverPin: string
}

export interface CancelOrderResult {
  order: {
    order_id: string
    table_id: string
    closed_at: string | null
    closed_by: string | null
    close_reason: CloseReason | 'paid' | null
    close_note: string | null
  }
  voidedCount: number
  closeReason: CloseReason
  approvedBy: { usersId: string; displayName: string }
}

/**
 * ยกเลิกทั้งบิล — void ทุกรายการที่ยังไม่เสิร์ฟแล้วปิดบิลในครั้งเดียว
 * โต๊ะจะกลับเป็นว่างทันที (ผ่าน DB trigger) · ต้องมี PIN ผู้อนุมัติ
 */
export async function cancelOrder(
  orderId: string,
  payload: CancelOrderPayload,
  accessToken: string | null,
) {
  return apiFetch<{ status: string; data: CancelOrderResult }>(
    `/orders/${orderId}/cancel`,
    accessToken,
    'POST',
    payload,
  )
}

export interface CloseUnpaidPayload {
  closeReason: CloseReason
  /** บังคับเมื่อ walkout และบิลยังมีรายการ */
  note?: string
  approverPin: string
}

/** ปิดบิลโดยไม่เก็บเงิน (walkout/voided_all/empty) — ต้องมี PIN ผู้อนุมัติ */
export async function closeUnpaid(
  orderId: string,
  payload: CloseUnpaidPayload,
  accessToken: string | null,
) {
  return apiFetch<{
    status: string
    data: { order: CancelOrderResult['order']; approvedBy: { usersId: string; displayName: string } }
  }>(`/orders/${orderId}/close-unpaid`, accessToken, 'POST', payload)
}
