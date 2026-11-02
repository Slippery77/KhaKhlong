import { useLiveQuery } from 'dexie-react-hooks';
import type { OutboxEntry } from '../db';
import { listOutbox } from '../outbox';

const EMPTY: OutboxEntry[] = [];

/** นับจำนวน "บิล" (orderId ไม่ซ้ำ) — พนักงานคิดเป็นบิล ไม่ได้คิดเป็นแถวใน outbox */
function countOrders(entries: OutboxEntry[]): number {
  return new Set(entries.map((e) => e.orderId)).size;
}

/**
 * อ่าน outbox ของร้านแบบ "สด" — IndexedDB เปลี่ยนเมื่อไหร่ component re-render เอง
 * (หย่อนลงกล่อง / ส่งสำเร็จ / ล้ม / ลบ จากที่ไหนก็ตาม รวมถึงแท็บอื่น)
 */
export function useOutbox(tenantSlug: string | undefined) {
  const entries =
    useLiveQuery(() => (tenantSlug ? listOutbox(tenantSlug) : EMPTY), [tenantSlug]) ?? EMPTY;
  // useLiveQuery คืน undefined ระหว่างโหลดครั้งแรก → ใช้ array ว่างแทน

  const pending = entries.filter((e) => e.status === 'pending');
  const failed = entries.filter((e) => e.status === 'failed');

  return {
    entries,
    pendingCount: pending.length, // จำนวนแถว (หน้า dev ใช้)
    failedCount: failed.length,
    // [ใหม่] จำนวนบิล — ใช้แสดงบนจอให้พนักงานเห็น
    // บิลที่มีทั้งแถว pending และ failed นับเป็น "ส่งไม่สำเร็จ" อย่างเดียว (แถว pending ถูกบล็อกอยู่)
    failedOrderCount: countOrders(failed),
    pendingOrderCount: countOrders(pending.filter((e) => !failed.some((f) => f.orderId === e.orderId))),
    totalOrderCount: countOrders(entries),
  };
}