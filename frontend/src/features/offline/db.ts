import Dexie, { type Table } from 'dexie';

/**
 * ฐานข้อมูลในเครื่อง (IndexedDB) ของแอป — ใช้ผ่าน Dexie
 *
 * ทำไมไม่ใช้ localStorage
 * - localStorage เก็บได้แค่ string ~5 MB และอ่าน/เขียนแบบ synchronous (บล็อกหน้าจอ)
 * - IndexedDB เก็บ object ได้ตรง ๆ หลายร้อย MB และเป็น async
 * - ข้อมูลอยู่ถาวรจนกว่าจะลบ ปิดแท็บ/ปิดเครื่องก็ไม่หาย (ต่างจาก sessionStorage)
 *
 * เปิดดูข้อมูลได้ที่ DevTools > Application > IndexedDB > pwa-pos
 */

/** ประเภทข้อมูลที่แคชไว้ใช้ตอนออฟไลน์ — เพิ่มชนิดใหม่ที่นี่ (เช่น 'menu') */
export type SnapshotKind = 'tables' | 'currentShift';

/**
 * snapshot = ภาพข้อมูล ณ เวลาที่โหลดสำเร็จครั้งล่าสุด
 * 1 แถวต่อ 1 ร้าน ต่อ 1 ชนิดข้อมูล (บันทึกทับทุกครั้งที่โหลดสำเร็จ)
 */
export interface Snapshot<T = unknown> {
  tenantSlug: string; // แยกร้าน — เครื่องเดียวอาจเคยเข้าหลายร้าน
  kind: SnapshotKind;
  data: T;
  savedAt: number; // Date.now() ตอนบันทึก ไว้บอกพนักงานว่าข้อมูลเก่าแค่ไหน
}

class PosDatabase extends Dexie {
  snapshots!: Table<Snapshot, [string, SnapshotKind]>;

  constructor() {
    super('pwa-pos');

    // version(1): schema แรก
    // '[tenantSlug+kind]' = primary key แบบผสม 2 คอลัมน์ (ร้าน + ชนิด ไม่ซ้ำกัน)
    // 'tenantSlug'        = index เพิ่ม ใช้ลบข้อมูลทั้งร้านตอน logout
    // ห้ามแก้ version เดิมหลังปล่อยใช้งานแล้ว — เปลี่ยน schema ให้เพิ่ม db.version(2) ต่อท้าย
    this.version(1).stores({
      snapshots: '[tenantSlug+kind], tenantSlug',
    });
  }
}

export const db = new PosDatabase();

/**
 * ขอให้ browser ไม่ลบข้อมูลของเราเองตอนพื้นที่ดิสก์ใกล้เต็ม
 * Chrome อนุญาตอัตโนมัติถ้าติดตั้งเป็นแอป (PWA) หรือใช้งานบ่อย — ไม่มี popup ถามผู้ใช้
 * ไม่ได้รับอนุญาตก็ไม่เป็นไร แอปยังทำงานได้ แค่ข้อมูลมีโอกาสถูกล้างเมื่อเครื่องพื้นที่เต็ม
 */
export function requestPersistentStorage(): void {
  if (!navigator.storage?.persist) return;
  navigator.storage
    .persisted()
    .then((already) => (already ? true : navigator.storage.persist()))
    .catch(() => false);
}
