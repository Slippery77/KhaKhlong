import { ApiError } from '../../libs/appClient';
import { db, type SnapshotKind } from './db';

/**
 * แนวคิด: "Network first, fallback to cache"
 *
 *   ลองถาม server ก่อนเสมอ
 *     สำเร็จ   ใช้ข้อมูลสด + บันทึกเป็น snapshot ไว้ใช้คราวหน้า
 *     ล้มเพราะติดต่อ server ไม่ได้   ใช้ snapshot ล่าสุดแทน และบอกว่าเป็นข้อมูลเก่า
 *     ล้มเพราะ server ตอบปฏิเสธ (401/403/404/409)   โยน error ต่อ ไม่ใช้ cache
 *
 * ทำไมไม่ "cache first" (อ่าน cache ก่อนเสมอ)
 * โต๊ะและกะเปลี่ยนตลอดเวลาจากเครื่องอื่น ถ้าอ่าน cache ก่อนจะเห็นโต๊ะว่างทั้งที่มีลูกค้าแล้ว
 */

export interface FreshResult<T> {
  data: T;
  isStale: false;
}

export interface StaleResult<T> {
  data: T;
  isStale: true;
  savedAt: number;
}

export type CachedResult<T> = FreshResult<T> | StaleResult<T>;

/**
 * แยกว่า error นี้แปลว่า "ติดต่อ server ไม่ได้" หรือ "server ตอบปฏิเสธ"
 *
 * - TypeError: fetch() โยนเองเมื่อไม่มีเน็ต / DNS ล้ม / server ปิด (เช่น "Failed to fetch")
 * - 502/503/504: proxy (Vite, Vercel) ติดต่อ backend ไม่ได้ หรือ backend ยังไม่ตื่น (Render cold start)
 * - 500: Vite proxy ตอบ 500 เมื่อ backend ไม่ได้รันอยู่ — นับเป็นติดต่อไม่ได้ด้วย
 *   (ข้อเสีย: บั๊กจริงฝั่ง backend ที่ตอบ 500 จะเห็นข้อมูลเก่าพร้อมแถบเตือน แทนที่จะเห็น error)
 */
export function isUnreachableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError) return error.status >= 500;
  return false;
}

export async function saveSnapshot<T>(tenantSlug: string, kind: SnapshotKind, data: T): Promise<void> {
  try {
    await db.snapshots.put({ tenantSlug, kind, data, savedAt: Date.now() });
  } catch (error) {
    // บันทึกไม่ได้ (เช่น โหมดไม่ระบุตัวตนบางแบบ) ไม่ควรทำให้หน้าจอพัง — แค่ไม่มี cache ไว้ใช้
    console.warn('[offline] บันทึก snapshot ไม่สำเร็จ', kind, error);
  }
}

export async function readSnapshot<T>(
  tenantSlug: string,
  kind: SnapshotKind,
): Promise<{ data: T; savedAt: number } | undefined> {
  try {
    const row = await db.snapshots.get([tenantSlug, kind]);
    return row ? { data: row.data as T, savedAt: row.savedAt } : undefined;
  } catch {
    return undefined;
  }
}

/** ลบ snapshot ทั้งหมดของร้าน — ใช้ตอน logout / เปลี่ยนร้าน (ต่อในขั้นแก้ AuthContext) */
export async function clearTenantSnapshots(tenantSlug: string): Promise<void> {
  try {
    await db.snapshots.where('tenantSlug').equals(tenantSlug).delete();
  } catch {
    // ไม่มีอะไรให้ทำต่อ
  }
}

/**
 * เรียก API แบบมี cache สำรอง
 *
 * @param tenantSlug ร้านปัจจุบัน — ถ้าไม่มี (ยังไม่ login) จะเรียก API ตรง ๆ ไม่ยุ่งกับ cache
 * @param kind       ชนิดข้อมูล ใช้เป็น key ใน IndexedDB
 * @param fetcher    ฟังก์ชันที่เรียก API จริงและคืนข้อมูล (ไม่ต้องรู้เรื่อง cache เลย)
 *
 * โยน error เดิมต่อ เมื่อ: server ตอบปฏิเสธ หรือ ติดต่อไม่ได้แต่ไม่เคยมี cache ของร้านนี้
 */
export async function fetchWithSnapshot<T>(
  tenantSlug: string | undefined,
  kind: SnapshotKind,
  fetcher: () => Promise<T>,
): Promise<CachedResult<T>> {
  if (!tenantSlug) {
    return { data: await fetcher(), isStale: false };
  }

  try {
    const data = await fetcher();
    // ไม่ต้อง await — หน้าจอแสดงผลได้ทันที การบันทึกทำเบื้องหลัง
    void saveSnapshot(tenantSlug, kind, data);
    return { data, isStale: false };
  } catch (error) {
    if (!isUnreachableError(error)) throw error;

    const cached = await readSnapshot<T>(tenantSlug, kind);
    if (!cached) throw error;

    return { data: cached.data, isStale: true, savedAt: cached.savedAt };
  }
}
