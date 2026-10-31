import Dexie, { type Table } from 'dexie';


// ===================== outbox (คิวคำสั่งที่รอส่ง server) =====================

/** body ของ POST /orders — ตรงกับ CreateOrderDto ฝั่ง backend */
export interface CreateOrderBody {
  orderId: string;
  tableId: string;
}

/** 1 จาน = 1 แถว — ตรงกับ CreateOrderItemDto ฝั่ง backend */
export interface OrderItemBody {
  orderItemId: string;
  menuItemId: string;
  specialRequest?: string;
  modifierIds?: string[];
}

/** body ของ POST /orders/:id/items — ตรงกับ AddOrderItemsDto ฝั่ง backend */
export interface AddItemsBody {
  items: OrderItemBody[];
  kitchenTicketId: string;
}

export type OutboxStatus = 'pending' | 'failed';

/** ส่วนที่ทุกรายการมีเหมือนกัน */
interface OutboxBase {
  seq?: number; // Dexie ใส่ให้เอง (เลขรัน = ลำดับการส่ง)
  tenantSlug: string;
  userId: string; // คนที่กด — ใช้ในเครื่องเท่านั้น ไม่ส่งขึ้น server
  orderId: string; // ใช้จัดกลุ่มรายการของบิลเดียวกัน
  shiftId: string | null; // กะตอนกด (เก็บไว้ก่อน รอ backend SHIFT_MISMATCH)
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: number;
}

/** 1 รายการใน outbox — kind บอกว่า payload เป็นแบบไหน (discriminated union) */
export type OutboxEntry =
  | (OutboxBase & { kind: 'createOrder'; payload: CreateOrderBody })
  | (OutboxBase & { kind: 'addItems'; payload: AddItemsBody });

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
export type SnapshotKind = 'tables' | 'currentShift'| 'menu';

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
  outbox!: Table<OutboxEntry,number>;// primary key = seq (number)

  constructor() {
    // ต้องเรียก super() ก่อนใช้ this เสมอ (กติกาของคลาสลูก)
    // 'pwa-pos' = ชื่อฐานข้อมูล IndexedDB ที่จะเปิด (ไม่มีก็สร้างใหม่)
    // ห้ามเปลี่ยนชื่อหลังปล่อยใช้งาน — browser จะมองเป็นฐานใหม่ที่ว่างเปล่า ข้อมูลเดิมค้างอยู่ฐานเก่า
    // ใช้ชื่อเดียวทุกร้าน แยกร้านด้วยคอลัมน์ tenantSlug แทน
    super('pwa-pos');

    // version(1): schema แรก
    // '[tenantSlug+kind]' = primary key แบบผสม 2 คอลัมน์ (ร้าน + ชนิด ไม่ซ้ำกัน)
    // 'tenantSlug'        = index เพิ่ม ใช้ลบข้อมูลทั้งร้านตอน logout
    // ห้ามแก้ version เดิมหลังปล่อยใช้งานแล้ว — เปลี่ยน schema ให้เพิ่ม db.version(2) ต่อท้าย
    this.version(1).stores({
      snapshots: '[tenantSlug+kind], tenantSlug',
    });

    // version(2): เพิ่มตาราง outbox — snapshots เหมือนเดิมทุกตัวอักษร
    // '++seq'      = primary key เลขรันอัตโนมัติ 1, 2, 3, ... (ใช้เป็นลำดับการส่ง)
    // 'tenantSlug' = ดึงเฉพาะของร้านนี้
    // 'orderId'    = หา/ลบทุกรายการของบิลเดียวกัน
    // 'status'     = นับจำนวน pending / failed
    this.version(2).stores({
      snapshots: '[tenantSlug+kind], tenantSlug',
      outbox: '++seq, tenantSlug, orderId, status',
    })
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
