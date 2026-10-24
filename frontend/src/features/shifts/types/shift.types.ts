// สถานะกะตาม trigger trg_shift_flow ในฐานข้อมูล
export type ShiftStatus =
  | 'open'
  | 'closed_auto'
  | 'pending_verification'
  | 'verified'
  | 'escalated';

export interface Shift {
  shiftId: string;
  /** วันทำการ รูปแบบ YYYY-MM-DD (ห้ามแปลงเป็น Date ก่อนแสดงผล จะเพี้ยนเรื่อง timezone) */
  businessDate: string;
  openingCash: number;
  expectedClosingCash: number | null;
  actualClosingCash: number | null;
  variance: number | null;
  status: ShiftStatus;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  reopenCount: number;
}

export interface ApiEnvelope<T> {
  status: 'success';
  data: T;
}

export type BlockedOrderAction = 'pay' | 'close_unpaid' | 'in_progress';

export interface BlockedOrder {
  orderId: string;
  orderNumber: number;
  tableNumber: string | null;
  activeItemCount: number;
  suggestedAction: BlockedOrderAction;
}

/** body ของ 409 จาก POST /shifts/:id/close */
export interface OpenOrdersBlockBody {
  code: 'OPEN_ORDERS_BLOCK_CLOSE';
  message: string;
  orders: BlockedOrder[];
}
