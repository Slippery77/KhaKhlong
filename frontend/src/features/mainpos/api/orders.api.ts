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
