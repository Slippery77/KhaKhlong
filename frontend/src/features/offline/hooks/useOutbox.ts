import { useLiveQuery } from 'dexie-react-hooks';
import type { OutboxEntry } from '../db';
import { listOutbox } from '../outbox';

const EMPTY: OutboxEntry[] = [];

/**
 * อ่าน outbox ของร้านแบบ "สด" — IndexedDB เปลี่ยนเมื่อไหร่ component re-render เอง
 * (หย่อนลงกล่อง / ส่งสำเร็จ / ล้ม / ลบ จากที่ไหนก็ตาม รวมถึงแท็บอื่น)
 */
export function useOutbox(tenantSlug: string | undefined) {
  const entries =
    useLiveQuery(() => (tenantSlug ? listOutbox(tenantSlug) : EMPTY), [tenantSlug]) ?? EMPTY;
  // useLiveQuery คืน undefined ระหว่างโหลดครั้งแรก → ใช้ array ว่างแทน

  return {
    entries,
    pendingCount: entries.filter((e) => e.status === 'pending').length,
    failedCount: entries.filter((e) => e.status === 'failed').length,
  };
}