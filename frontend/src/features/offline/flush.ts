import { ApiError, apiFetch } from '../../libs/appClient';
import { reportReachable, reportUnreachable } from './connectionStatus';
import { db, type OutboxEntry } from './db';
import { isUnreachableError } from './snapshotCache';

/** ข้อมูล login ปัจจุบัน — OutboxRunner (React) คอยอัปเดตให้ */
export interface FlushAuth {
  accessToken: string | null;
  userId: string;
  tenantSlug: string;
}

let currentAuth: FlushAuth | null = null;

export function setFlushAuth(auth: FlushAuth | null): void {
  currentAuth = auth;
}

/**
 * ผลของการ flush 1 รอบ
 * done        ส่งครบทุกรายการที่ส่งได้ (อาจมีบางบิล failed)
 * unreachable ติดต่อ server ไม่ได้ หยุดกลางทาง
 * unauthorized ได้ 401 (refresh ไม่สำเร็จ) ต้อง login ใหม่
 * busy        แท็บอื่นกำลัง flush อยู่
 * skipped     ยังไม่ login
 */
export type FlushResult = 'done' | 'unreachable' | 'unauthorized' | 'busy' | 'skipped';

const LOCK_NAME = 'pwa-pos-outbox-flush';

/** ส่งของใน outbox ไป server — เรียกซ้ำได้ตลอด ปลอดภัย */
export async function flushOutbox(): Promise<FlushResult> {
  const auth = currentAuth;
  if (!auth) return 'skipped';

  // browser ที่ไม่มี Web Locks (เก่ามาก) → ทำงานได้ แค่ไม่กันหลายแท็บ
  if (!navigator.locks) return runFlush(auth);

  // ifAvailable: ล็อกถูกถืออยู่ → ได้ lock = null ทันที ไม่ต่อคิวรอ
  return navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) =>
    lock ? runFlush(auth) : 'busy',
  );
}

async function runFlush(auth: FlushAuth): Promise<FlushResult> {
  const entries = await db.outbox.where('tenantSlug').equals(auth.tenantSlug).sortBy('seq');

  // บิลที่มีรายการล้มอยู่แล้ว — รายการหลังจากนี้ของบิลเดียวกันห้ามส่ง (กันพังเป็นทอด ๆ)
  const blockedOrders = new Set(entries.filter((e) => e.status === 'failed').map((e) => e.orderId));

  for (const entry of entries) {
    if (entry.status !== 'pending') continue;
    if (entry.userId !== auth.userId) continue; // ของคนอื่น รอเจ้าของ login
    if (blockedOrders.has(entry.orderId)) continue;

    try {
      await send(entry, auth.accessToken);
      await db.outbox.delete(entry.seq!); // ส่งสำเร็จ = ลบออกจากกล่อง
      reportReachable();
    } catch (error) {
      const attempts = entry.attempts + 1;

      if (isUnreachableError(error)) {
        // ไปไม่ถึง server — รายการหลังจากนี้ก็ไปไม่ถึงเหมือนกัน หยุดทั้งรอบ
        await db.outbox.update(entry.seq!, { attempts, lastError: 'ติดต่อเซิร์ฟเวอร์ไม่ได้' });
        reportUnreachable();
        return 'unreachable';
      }

      if (error instanceof ApiError && error.status === 401) {
        // appClient ลอง refresh ให้แล้วยังไม่ผ่าน = ต้อง login ใหม่ · เก็บของไว้ หยุดทั้งรอบ
        await db.outbox.update(entry.seq!, { attempts, lastError: 'ต้องเข้าสู่ระบบใหม่' });
        return 'unauthorized';
      }

      // 4xx อื่น (409 โต๊ะมีบิลแล้ว / เมนูหมด / ไม่มีกะเปิด, 400) — ส่งซ้ำก็ได้ผลเดิม
      await db.outbox.update(entry.seq!, {
        status: 'failed',
        attempts,
        lastError: error instanceof Error ? error.message : 'ส่งไม่สำเร็จ',
      });
      blockedOrders.add(entry.orderId); // บิลนี้หยุด บิลอื่นไปต่อ
    }
  }

  return 'done';
}

/** ยิง API ตามชนิดรายการ — ใช้ endpoint เดิมที่หน้า POS ใช้อยู่ */
function send(entry: OutboxEntry, accessToken: string | null): Promise<unknown> {
  if (entry.kind === 'createOrder') {
    return apiFetch('/orders', accessToken, 'POST', entry.payload);
  }
  return apiFetch(`/orders/${entry.orderId}/items`, accessToken, 'POST', entry.payload);
}