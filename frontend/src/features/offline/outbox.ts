import { db, type OrderItemBody, type OutboxEntry } from './db';

/** จานที่จะสั่ง 1 จาน (ยังไม่มี orderItemId — enqueueOrder สร้างให้) */
export type NewOrderItem = Omit<OrderItemBody, 'orderItemId'>;

export interface EnqueueOrderInput {
  tenantSlug: string;
  userId: string;
  shiftId: string | null;
  tableId: string;
  /** บิลที่เปิดอยู่แล้วของโต๊ะนี้ · null = โต๊ะว่าง ต้องเปิดบิลใหม่ */
  orderId: string | null;
  /** 1 จาน = 1 รายการ (สั่ง 2 จาน = ส่งมา 2 ตัว) */
  items: NewOrderItem[];
}

/**
 * หย่อนคำสั่ง "ส่งครัว" 1 ครั้งลง outbox
 *
 * กฎสำคัญ: สร้าง UUID ทั้งหมดตรงนี้ "ครั้งเดียว"
 * ส่งไป server กี่รอบก็ใช้ id เดิม → server รู้ว่าเป็นรายการเดิม (ON CONFLICT DO NOTHING)
 *
 * คืน orderId — บิลใหม่ผู้เรียกจะได้รู้เลขบิลทันทีแม้ยังไม่ได้ส่ง
 */
export async function enqueueOrder(input: EnqueueOrderInput): Promise<{ orderId: string }> {
  if (input.items.length === 0) throw new Error('ไม่มีรายการอาหาร');

  const orderId = input.orderId ?? crypto.randomUUID();
  const base = {
    tenantSlug: input.tenantSlug,
    userId: input.userId,
    orderId,
    shiftId: input.shiftId,
    status: 'pending' as const,
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
  };

  // transaction = ลงทั้ง 2 แถวหรือไม่ลงเลย (ไม่มีกรณี createOrder ลงแต่ addItems หาย)
  await db.transaction('rw', db.outbox, async () => {
    if (!input.orderId) {
      await db.outbox.add({ ...base, kind: 'createOrder', payload: { orderId, tableId: input.tableId } });
    }
    await db.outbox.add({
      ...base,
      kind: 'addItems',
      payload: {
        kitchenTicketId: crypto.randomUUID(), // 1 ค่าต่อการกดส่งครัว 1 ครั้ง
        items: input.items.map((item) => ({ ...item, orderItemId: crypto.randomUUID() })),
      },
    });
  });

  return { orderId };
}

/** รายการทั้งหมดของร้าน เรียงตามลำดับที่หย่อน (seq) */
export function listOutbox(tenantSlug: string): Promise<OutboxEntry[]> {
  return db.outbox.where('tenantSlug').equals(tenantSlug).sortBy('seq');
}

/** ปุ่ม "ลองส่งอีกครั้ง" — รายการที่ล้มของบิลนี้กลับไปรอส่ง */
export async function retryOrder(orderId: string): Promise<void> {
  await db.outbox
    .where('orderId')
    .equals(orderId)
    .modify({ status: 'pending', lastError: null });
}

/** ปุ่ม "ลบ" — ทิ้งทุกรายการของบิลนี้ที่ยังค้างในเครื่อง (ไม่แตะข้อมูลที่ส่งถึง server แล้ว) */
export async function discardOrder(orderId: string): Promise<void> {
  await db.outbox.where('orderId').equals(orderId).delete();
}

/** มีของค้าง (รอส่งหรือล้ม) ของ user นี้ไหม — ใช้บล็อก logout ในส่วนที่ 2 */
export async function hasUnsentForUser(tenantSlug: string, userId: string): Promise<boolean> {
  const count = await db.outbox
    .where('tenantSlug')
    .equals(tenantSlug)
    .filter((entry) => entry.userId === userId)
    .count();
  return count > 0;
}

/** มีรายการรอส่งไหม — runner ใช้ตัดสินว่าต้อง flush รอบ 30 วินาทีหรือไม่ */
export async function hasPending(tenantSlug: string): Promise<boolean> {
  const count = await db.outbox
    .where('tenantSlug')
    .equals(tenantSlug)
    .filter((entry) => entry.status === 'pending')
    .count();
  return count > 0;
}