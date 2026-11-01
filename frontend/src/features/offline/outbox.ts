import type { DiningTable } from '../tables/types/table.types';
import type { FullMenuData } from '../mainpos/types/item.types';
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

  // transaction = ลงทั้งหมดหรือไม่ลงเลย (ไม่มีกรณี createOrder ลงแต่ addItems หาย)
  // รวม db.snapshots ด้วย — ผังโต๊ะในเครื่องต้องเปลี่ยนพร้อมกับคิว
  await db.transaction('rw', db.outbox, db.snapshots, async () => {
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
    await markTableInSnapshot(input.tenantSlug, input.tableId, orderId, input.items);
  });

  return { orderId };
}

/**
 * [ใหม่] ราคาโดยประมาณของจานที่สั่ง = ราคาเมนู + ราคาตัวเลือก (modifier) จาก snapshot เมนู
 * เป็นแค่ตัวเลขแสดงบนการ์ดโต๊ะตอนออฟไลน์ — ราคาจริง server คำนวณเองตอนรับรายการ
 * ไม่มี snapshot เมนู / หาเมนูไม่เจอ → นับเป็น 0
 */
async function estimateTotal(tenantSlug: string, items: NewOrderItem[]): Promise<number> {
  const row = await db.snapshots.get([tenantSlug, 'menu']);
  if (!row) return 0;
  const menu = row.data as FullMenuData;

  const itemPrice = new Map(menu.categories.flatMap((c) => c.items).map((i) => [i.menu_item_id, i.price] as const));
  const modifierPrice = new Map(
    (menu.modifier_groups ?? []).flatMap((g) => g.modifiers).map((m) => [m.modifier_id, m.price_delta] as const),
  );

  return items.reduce((sum, item) => {
    const base = itemPrice.get(item.menuItemId) ?? 0;
    const extras = (item.modifierIds ?? []).reduce((s, id) => s + (modifierPrice.get(id) ?? 0), 0);
    return sum + base + extras;
  }, 0);
}

/**
 * [ใหม่] แก้ผังโต๊ะใน snapshot ให้ตรงกับสิ่งที่เพิ่งหย่อน
 *
 * ปัญหาที่แก้: ออฟไลน์อยู่ เปิดบิลโต๊ะ 5 แล้วกลับหน้าโต๊ะ
 * snapshot ยังบอกว่าโต๊ะ 5 ว่าง (open_order_id = null) → กดเข้าอีกรอบจะสร้างบิลใหม่ซ้ำ
 * พอส่งขึ้น server บิลที่ 2 ได้ 409 "โต๊ะมีบิลเปิดอยู่แล้ว" แล้วรายการจะค้างเป็น failed
 *
 * โหลดสดจาก server ครั้งถัดไปจะได้ค่าจริงเขียนทับเอง
 */
async function markTableInSnapshot(
  tenantSlug: string,
  tableId: string,
  orderId: string,
  items: NewOrderItem[],
): Promise<void> {
  const row = await db.snapshots.get([tenantSlug, 'tables']);
  if (!row) return; // ยังไม่เคยโหลดผังโต๊ะ — ไม่มีอะไรให้แก้

  const added = await estimateTotal(tenantSlug, items);
  const tables = (row.data as DiningTable[]).map((table) =>
    table.table_id === tableId
      ? {
          ...table,
          status: 'occupied' as const,
          open_order_id: orderId,
          item_count: table.item_count + items.length,
          total_amount: Number(table.total_amount) + added, // Number(): pg ส่ง numeric มาเป็น string ได้
        }
      : table,
  );
  // savedAt คงค่าเดิม — ป้าย "แสดงข้อมูล ณ HH:MM" ต้องบอกเวลาที่ได้จาก server จริง ไม่ใช่เวลาที่เราแก้เอง
  await db.snapshots.put({ ...row, data: tables });
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