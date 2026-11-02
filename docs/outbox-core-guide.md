# Outbox ส่วนที่ 2: แกนกลาง (ขั้น 1 ถึง 4)

> ต่อจาก `outbox-design.md` (แนวคิดและการตัดสินใจ) · เอกสารนี้คือโค้ด + วิธีทดสอบ **ทีละขั้น**
> ทำขั้นหนึ่งให้ทดสอบผ่านก่อนค่อยไปขั้นถัดไป
> โค้ดทั้งหมดผ่าน `tsc -b`, `eslint` (0 error ในไฟล์ใหม่), `vite build` และทดสอบบน Chromium กับ mock API ครบ 7 สถานการณ์แล้ว (ผลอยู่ท้ายขั้น 4)
> **ไม่แตะ** `MainPOS.tsx`, `KDSContext.tsx`, โค้ด backend

## ภาพรวม

| ขั้น | ทำอะไร | ไฟล์ | เวลาประมาณ |
|---|---|---|---|
| 1 | ตาราง outbox (Dexie `version(2)`) + ลง `dexie-react-hooks` | `db.ts` | 15 นาที |
| 2 | หย่อนลงกล่อง / ลองส่งใหม่ / ลบ | `outbox.ts` | 20 นาที |
| 3 | ส่ง (flush) + ตัวสั่งส่งเบื้องหลัง | `flush.ts`, `components/OutboxRunner.tsx`, `App.tsx` | 40 นาที |
| 4 | hook อ่าน outbox + หน้าทดสอบ dev | `hooks/useOutbox.ts`, `pages/OutboxDevPage.tsx`, `routes/AppRouter.tsx` | 30 นาที |

> **ต่างจาก `outbox-design.md` ข้อ 8.1 สองจุด**
> - ตัวสั่ง flush เบื้องหลังเป็น **component `<OutboxRunner />`** แทน `startOutboxRunner()` ใน `main.tsx` — เพราะ flush ต้องใช้ token และ user ซึ่งอยู่ใน `AuthContext` (React) · `main.tsx` อยู่นอก React อ่านไม่ได้
> - `useOutbox` ย้ายมาอยู่ขั้น 4 เพราะหน้าทดสอบต้องใช้

---

## ขั้น 1: ตาราง outbox

### แนวคิด: อัปเกรด schema ของ Dexie

IndexedDB มี "เลขเวอร์ชัน" ของฐานข้อมูล · เครื่องไหนเปิดแอปแล้วเจอเลขในโค้ด **มากกว่า** เลขในเครื่อง → browser รันขั้นตอนอัปเกรดให้ครั้งเดียว

```
เครื่องผู้ใช้ตอนนี้: pwa-pos v1  [snapshots]
โค้ดใหม่ประกาศ:     v1 + v2
เปิดแอป → Dexie เห็นว่าเครื่องเป็น v1 โค้ดมีถึง v2 → สร้างตาราง outbox เพิ่ม → เครื่องเป็น v2  [snapshots, outbox]
                                                                    ↑ snapshot เดิมอยู่ครบ
```

| ห้ามทำ | เกิดอะไร |
|---|---|
| แก้ `version(1)` ให้มี `outbox` | เครื่องที่เป็น v1 อยู่แล้ว **ไม่อัปเกรด** (เลขไม่เพิ่ม) → ไม่มีตาราง outbox → `db.outbox.add` พัง `NotFoundError` บนเครื่องที่เคยใช้ (แต่เครื่องใหม่ทำงาน — บั๊กแบบนี้หายาก) |
| ลบ `snapshots` ออกจาก `version(2)` | Dexie ตีความว่า **ลบตาราง** → snapshot หายทุกเครื่อง |

กฎ: เพิ่ม `version(n+1)` ต่อท้ายเสมอ และใน version ใหม่ต้องเขียน **ทุกตาราง** ที่ยังใช้อยู่

> ใน DevTools จะเห็นเลขเวอร์ชันเป็น **20** ไม่ใช่ 2 — Dexie คูณ 10 ให้ (เผื่อเลขทศนิยมของ Dexie รุ่นเก่า) ไม่ต้องตกใจ

### 1.1 ลง package

```powershell
cd D:\PWA-POS
npm i -w frontend dexie-react-hooks@4.4.0 --save-exact
```

`--save-exact` = ล็อกเวอร์ชันตายตัวเหมือน `dexie` (ไม่มี `^`)

### 1.2 `features/offline/db.ts` — เพิ่ม 2 ส่วน

**(ก) ชนิดข้อมูลของ outbox** — วางก่อน `class PosDatabase`

```ts
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
```

ทำไม `OutboxEntry` เป็น union 2 แบบ: TypeScript จะรู้เองว่า `kind === 'createOrder'` แล้ว `payload` ต้องมี `tableId` · `kind === 'addItems'` แล้ว `payload` ต้องมี `items` — ใส่ผิดคู่ tsc แดงทันที (เหมือน `CachedResult` ใน `snapshotCache.ts`)

ทำไม body ต้องตรง DTO: backend เปิด `ValidationPipe` (whitelist) — ส่ง field เกินอาจได้ 400 · **`shiftId` จึงเก็บไว้ในเครื่องเท่านั้น ไม่ใส่ใน payload** จนกว่า backend จะรับ

**(ข) ในคลาส** — เพิ่ม `outbox!` และ `version(2)` ผลลัพธ์ทั้งคลาส:

```ts
class PosDatabase extends Dexie {
  snapshots!: Table<Snapshot, [string, SnapshotKind]>;
  outbox!: Table<OutboxEntry, number>; // primary key = seq (number)

  constructor() {
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
    });
  }
}
```

### ทดสอบขั้น 1

1. `cd frontend; npm run dev` แล้ว login → เข้าหน้าโต๊ะ (หน้านี้จะเปิด DB)
2. F12 > Application > IndexedDB > `pwa-pos` (กด ↻ ถ้าไม่ขึ้น)
   - ต้องเห็น **2 ตาราง**: `outbox` (ว่าง) และ `snapshots`
   - คลิกชื่อ `pwa-pos` → Version ต้องเป็น **20**
3. **สำคัญ — ทดสอบการอัปเกรด**: ห้าม Clear site data ก่อนทดสอบข้อนี้ · snapshot เดิม (โต๊ะ/กะ/เมนู) ต้องยังอยู่ครบใน `snapshots`
4. `npx tsc -b` ผ่าน

> ผลที่ทดสอบแล้ว: สร้าง DB เวอร์ชัน 10 ที่มี snapshot ค้างไว้ → เปิดแอป → ได้เวอร์ชัน 20, มี `outbox` + `snapshots`, snapshot เดิมยังอยู่

---

## ขั้น 2: หย่อนลงกล่อง — `features/offline/outbox.ts` (ไฟล์ใหม่)

### แนวคิด

- **สร้าง UUID ทั้งหมดตอนหย่อน ครั้งเดียว** — `orderId` (บิลใหม่), `orderItemId` ทุกจาน, `kitchenTicketId` · ส่งกี่รอบก็ id เดิม server จึงไม่สร้างซ้ำ
- **โต๊ะว่าง = 2 แถว** (`createOrder` + `addItems`) · **โต๊ะมีบิล = 1 แถว** (`addItems`)
- 2 แถวนั้นลงใน **transaction เดียว** — ไม่มีทางที่ `createOrder` ลงแต่ `addItems` หาย
- ปุ่ม "ลองส่งอีกครั้ง" / "ลบ" ทำ **ทั้งบิล** (`orderId`) ไม่ใช่ทีละแถว — เพราะรายการในบิลเดียวกันพึ่งกัน

```ts
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
```

จุดที่ควรสังเกต:
- `Omit<OrderItemBody, 'orderItemId'>` = ชนิดเดียวกันแต่ตัด field `orderItemId` ออก → ผู้เรียก**ใส่เองไม่ได้** บังคับให้ id มาจาก `enqueueOrder` เท่านั้น
- `'pending' as const` = บอก TypeScript ว่าเป็นค่าตายตัว `'pending'` ไม่ใช่ `string` ทั่วไป (ไม่งั้นไม่ตรงกับ `OutboxStatus`)
- `.modify({...})` = แก้ทุกแถวที่ตรงเงื่อนไขในคำสั่งเดียว
- `.filter()` หลัง `.where()` = กรองต่อในหน่วยความจำ (ใช้กับเงื่อนไขที่ไม่มี index เช่น `userId`)

### ทดสอบขั้น 2 (ยังไม่มีหน้าจอ — ใช้ Console ของ DevTools)

ตอน `npm run dev` เปิด Console แล้ววาง (Vite ให้ import ไฟล์ด้วย path `/src/...` ได้):

```js
const { enqueueOrder, listOutbox, discardOrder } = await import('/src/features/offline/outbox.ts')

// บิลใหม่ 2 จาน (ใส่ tableId / menuItemId จริงของร้าน — ดูได้ใน snapshots)
await enqueueOrder({ tenantSlug: 'ร้านของเบนซ์', userId: 'x', shiftId: null,
  tableId: '<table_id>', orderId: null, items: [{ menuItemId: '<menu_item_id>' }, { menuItemId: '<menu_item_id>' }] })

await listOutbox('ร้านของเบนซ์')
```

ต้องเห็น:
1. ได้ `{ orderId: '...' }` กลับมา
2. IndexedDB `outbox` มี **2 แถว** seq ติดกัน: `createOrder` และ `addItems` (`items` 2 ตัว แต่ละตัวมี `orderItemId` ไม่ซ้ำกัน)
3. ทั้ง 2 แถวมี `orderId` เดียวกัน, `status: "pending"`, `attempts: 0`
4. `await discardOrder('<orderId>')` → 2 แถวหายพร้อมกัน

> ยังไม่มีอะไรส่งไป server ในขั้นนี้ — ถูกต้องแล้ว

---

## ขั้น 3: ส่ง (flush)

### แนวคิด

```
flushOutbox()
  ├─ ยังไม่ login → skipped
  ├─ ขอล็อก (Web Locks) ไม่ได้ → busy (แท็บอื่นส่งอยู่)
  └─ วนรายการของร้าน เรียงตาม seq
       ข้าม: ไม่ใช่ pending / ไม่ใช่ของ user นี้ / บิลนี้มีรายการ failed แล้ว
       ส่ง → 2xx                  ลบออก ไปต่อ
            → TypeError / 5xx     attempts+1 · หยุดทั้งรอบ → unreachable
            → 401                 attempts+1 · หยุดทั้งรอบ → unauthorized
            → 4xx อื่น            failed + lastError · บล็อกบิลนี้ · บิลอื่นไปต่อ
```

`apiFetch` จัดการ refresh token ให้แล้ว (401 → `refreshOnce()` → ยิงซ้ำ) · flush จึงเห็น 401 เฉพาะกรณี refresh ไม่ผ่านจริง

**ทำไมต้องมี `<OutboxRunner />`**: flush ต้องรู้ token และ user — อยู่ใน `AuthContext` ซึ่งอ่านได้จาก component เท่านั้น · runner เป็น component ที่ `return null` (ไม่แสดงอะไร) คอยส่งข้อมูล login ให้ `flush.ts` ผ่าน `setFlushAuth()` (แบบเดียวกับที่ `AuthContext` ส่ง handler ให้ `appClient` ผ่าน `setAuthHandlers()`)

### 3.1 `features/offline/flush.ts` (ไฟล์ใหม่)

```ts
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
```

จุดที่ควรสังเกต:
- `entry.seq!` — `!` บอก TypeScript ว่า "มีค่าแน่นอน" (แถวที่อ่านจาก DB มี `seq` เสมอ แต่ type ประกาศเป็น optional เพราะตอน `add` ยังไม่มี)
- `navigator.locks.request(..., { ifAvailable: true }, cb)` — ถ้าแท็บอื่นถือล็อก `cb` ถูกเรียกด้วย `lock = null` ทันที ไม่รอคิว · ล็อกปลดเองเมื่อ `cb` ทำงานเสร็จ (แม้ error)
- `isUnreachableError` ใช้ตัวเดียวกับ snapshot — นิยาม "ติดต่อไม่ได้" ตรงกันทั้งแอป

### 3.2 `features/offline/components/OutboxRunner.tsx` (ไฟล์ใหม่)

```tsx
import { useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { getConnectionState, subscribeConnection } from '../connectionStatus';
import { flushOutbox, setFlushAuth } from '../flush';
import { hasPending } from '../outbox';

const PERIODIC_FLUSH_MS = 30_000;

/**
 * ตัวสั่ง flush เบื้องหลัง — ไม่แสดงอะไรบนจอ (return null)
 * เป็น component เพราะต้องอ่าน token/user จาก AuthContext (ซึ่งอยู่ใน React)
 *
 * ทริกเกอร์:
 *  1. login / token เปลี่ยน / เปิดแอป   ส่งของค้างจากรอบก่อน
 *  2. สถานะการเชื่อมต่อกลับมา online    เน็ตกลับ → ส่งทันที
 *  3. ทุก 30 วินาที ถ้ามีรายการรอส่ง     กันพลาดกรณีไม่มี event
 * (หลังหย่อนลงกล่อง ผู้หย่อนเรียก flushOutbox() เอง)
 */
export default function OutboxRunner() {
  const { accessToken, user } = useAuth();
  const userId = user?.sub;
  const tenantSlug = user?.tenantSlug;

  // 1. ส่งข้อมูล login ล่าสุดให้ flush.ts + flush ทันที
  useEffect(() => {
    if (!userId || !tenantSlug) {
      setFlushAuth(null);
      return;
    }
    setFlushAuth({ accessToken, userId, tenantSlug });
    void flushOutbox();
  }, [accessToken, userId, tenantSlug]);

  // 2 + 3. ฟังสถานะการเชื่อมต่อ และตั้งเวลา
  useEffect(() => {
    if (!tenantSlug) return;

    let previous = getConnectionState().status;
    const unsubscribe = subscribeConnection(() => {
      const now = getConnectionState().status;
      if (now === 'online' && previous !== 'online') void flushOutbox();
      previous = now;
    });

    const timer = setInterval(async () => {
      if (await hasPending(tenantSlug)) void flushOutbox();
    }, PERIODIC_FLUSH_MS);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [tenantSlug]);

  return null;
}
```

- `useEffect` ตัวแรก deps `[accessToken, userId, tenantSlug]` — token ใหม่หลัง refresh ก็อัปเดตให้ flush เอง
- `subscribeConnection` = ฟังก์ชันเดียวกับที่ `OfflineBanner` ใช้ (external store จากรอบก่อน) — ฟังการเปลี่ยนจาก "ไม่ online" เป็น "online" เท่านั้น
- ไม่มี `setState` ใน effect → ไม่โดน ESLint `set-state-in-effect`

### 3.3 `App.tsx`

```tsx
import OfflineBanner from './features/offline/components/offlineBanner';
import OutboxRunner from './features/offline/components/OutboxRunner';   // [ใหม่]

        <AppRouter />
        <UpdatePrompt />
        <OfflineBanner/>
        <OutboxRunner />    {/* [ใหม่] */}
```

ต้องอยู่ใต้ `AuthProvider` — `App` ถูกครอบด้วย `AuthProvider` ใน `main.tsx` อยู่แล้ว

### ทดสอบขั้น 3 (Console + backend จริง)

**ก. ส่งสำเร็จ** (backend รันอยู่ · เปิดกะแล้ว · ใช้โต๊ะว่าง)

```js
const { enqueueOrder } = await import('/src/features/offline/outbox.ts')
const { flushOutbox } = await import('/src/features/offline/flush.ts')
await enqueueOrder({ tenantSlug: '...', userId: '<user.sub จาก sessionStorage pos_user>', shiftId: null,
  tableId: '<โต๊ะว่าง>', orderId: null, items: [{ menuItemId: '<เมนู>' }] })
await flushOutbox()        // ต้องได้ 'done'
```

ต้องเห็น: outbox ว่าง · หน้าโต๊ะกดรีเฟรช → โต๊ะนั้น "มีลูกค้า" · หน้า KDS มีรายการ

> `userId` ต้องตรงกับ `sub` ของคนที่ login อยู่ ไม่งั้น flush จะข้าม (กฎ "ของคนอื่นรอเจ้าของ")

**ข. ติดต่อไม่ได้แล้วส่งเองเมื่อกลับมา**
1. Ctrl+C backend → หย่อน 1 รายการ → `await flushOutbox()` ได้ `'unreachable'` · แถวยัง `pending`, `attempts: 1`
2. เปิด backend → **ไม่ต้องทำอะไร** · ภายใน ~15 วินาที (ping) ป้ายขึ้น "เชื่อมต่อแล้ว" แล้ว outbox ว่างเอง (`OutboxRunner` flush ให้)

**ค. Web Locks** — เปิด 2 แท็บ, หย่อนในแท็บ A แล้วเรียก `flushOutbox()` พร้อมกันทั้ง 2 แท็บ → แท็บหนึ่งได้ `'done'` อีกแท็บได้ `'busy'`

---

## ขั้น 4: หน้าทดสอบ dev

ทดสอบด้วย Console ได้ แต่หน้าจอทำให้เห็นคิวเปลี่ยนสด ๆ และทดสอบกรณี 409 ได้ง่าย

### 4.1 `features/offline/hooks/useOutbox.ts` (ไฟล์ใหม่ — ส่วนที่ 3 ใช้ต่อ)

```ts
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
```

`useLiveQuery(ฟังก์ชันอ่าน, deps)` = รันฟังก์ชันอ่าน แล้ว **รันใหม่เองทุกครั้งที่ตารางที่อ่านเปลี่ยน** — ทั้งจากโค้ดนี้, จาก `flush.ts` หรือจากแท็บอื่น · ไม่ต้องมี `useState` / `useEffect` เอง

### 4.2 `features/offline/pages/OutboxDevPage.tsx` (ไฟล์ใหม่)

```tsx
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../auth/context/AuthContext';
import type { DiningTable } from '../../tables/types/table.types';
import type { FullMenuData } from '../../mainpos/types/item.types';
import type { Shift } from '../../shifts/types/shift.types';
import { db } from '../db';
import { discardOrder, enqueueOrder, retryOrder } from '../outbox';
import { flushOutbox, type FlushResult } from '../flush';
import { useOutbox } from '../hooks/useOutbox';

/**
 * หน้าทดสอบ outbox — มีเฉพาะตอน npm run dev (ดู AppRouter)
 * ใช้ข้อมูลโต๊ะ/เมนู/กะ จาก snapshot → ต้องเปิดหน้าโต๊ะและหน้า POS สักครั้งก่อน
 */
export default function OutboxDevPage() {
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug;
  const { entries, pendingCount, failedCount } = useOutbox(tenantSlug);

  // อ่าน snapshot แบบสด (เปลี่ยนเมื่อหน้าอื่นโหลดข้อมูลใหม่)
  const tables = useLiveQuery(
    async () => (tenantSlug ? (await db.snapshots.get([tenantSlug, 'tables']))?.data as DiningTable[] : undefined),
    [tenantSlug],
  );
  const menu = useLiveQuery(
    async () => (tenantSlug ? (await db.snapshots.get([tenantSlug, 'menu']))?.data as FullMenuData : undefined),
    [tenantSlug],
  );
  const shift = useLiveQuery(
    async () => (tenantSlug ? (await db.snapshots.get([tenantSlug, 'currentShift']))?.data as Shift | null : undefined),
    [tenantSlug],
  );

  const menuItems = menu?.categories.flatMap((c) => c.items) ?? [];
  const [tableId, setTableId] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (line: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString('th-TH')} ${line}`, ...prev].slice(0, 20));

  if (!user || !tenantSlug) return <p className="p-6">ต้อง login ก่อน</p>;

  const selectedTable = tables?.find((t) => t.table_id === tableId);

  const enqueue = async () => {
    if (!selectedTable || !menuItemId) return;
    const { orderId } = await enqueueOrder({
      tenantSlug,
      userId: user.sub,
      shiftId: shift?.shiftId ?? null,
      tableId: selectedTable.table_id,
      orderId: selectedTable.open_order_id, // null = เปิดบิลใหม่
      items: Array.from({ length: quantity }, () => ({ menuItemId })),
    });
    addLog(`หย่อน ${quantity} จาน โต๊ะ ${selectedTable.table_number} บิล ${orderId.slice(0, 8)}`);
    addLog(`flush: ${await flushOutbox()}`);
  };

  const flush = async () => {
    const result: FlushResult = await flushOutbox();
    addLog(`flush: ${result}`);
  };

  const box = 'rounded-2xl border border-[#E8DFD5] bg-white p-4';
  const button =
    'cursor-pointer rounded-xl bg-[#8C6D58] px-3 py-1.5 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6 font-kanit text-[#2D241E]">
      <h1 className="text-lg font-bold">Outbox (dev)</h1>
      <p className="mb-4 text-sm opacity-70">
        ร้าน {tenantSlug} · ผู้ใช้ {user.username} · กะ {shift?.shiftId?.slice(0, 8) ?? 'ไม่มีใน snapshot'} · รอส่ง {pendingCount} · ล้ม {failedCount}
      </p>

      <section className={`${box} mb-4 flex flex-wrap items-end gap-3`}>
        <label className="text-sm">
          โต๊ะ
          <select className="mt-1 block rounded-lg border p-1.5" value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">— เลือก —</option>
            {tables?.map((t) => (
              <option key={t.table_id} value={t.table_id}>
                {t.table_number} {t.open_order_id ? `(บิล ${t.open_order_id.slice(0, 8)})` : '(ว่าง)'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          เมนู
          <select className="mt-1 block rounded-lg border p-1.5" value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
            <option value="">— เลือก —</option>
            {menuItems.map((m) => (
              <option key={m.menu_item_id} value={m.menu_item_id}>
                {m.name} {m.is_available ? '' : '(หมด)'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          จำนวน
          <input type="number" min={1} max={10} className="mt-1 block w-16 rounded-lg border p-1.5" value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
        </label>
        <button type="button" className={button} disabled={!tableId || !menuItemId} onClick={enqueue}>หย่อน + flush</button>
        <button type="button" className={button} onClick={flush}>flush อย่างเดียว</button>
      </section>

      <section className={`${box} mb-4 overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-1">seq</th><th className="p-1">kind</th><th className="p-1">บิล</th>
              <th className="p-1">สถานะ</th><th className="p-1">ครั้ง</th><th className="p-1">error</th><th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.seq} className="border-b last:border-0">
                <td className="p-1">{e.seq}</td>
                <td className="p-1">{e.kind}{e.kind === 'addItems' ? ` ×${e.payload.items.length}` : ''}</td>
                <td className="p-1 font-mono">{e.orderId.slice(0, 8)}</td>
                <td className="p-1">{e.status}</td>
                <td className="p-1">{e.attempts}</td>
                <td className="p-1">{e.lastError}</td>
                <td className="p-1 whitespace-nowrap">
                  {e.status === 'failed' && (
                    <button type="button" className="mr-2 cursor-pointer text-[#8C6D58] underline"
                      onClick={async () => { await retryOrder(e.orderId); addLog(`retry: ${await flushOutbox()}`); }}>
                      ลองส่งอีกครั้ง
                    </button>
                  )}
                  <button type="button" className="cursor-pointer text-rose-600 underline" onClick={() => discardOrder(e.orderId)}>
                    ลบบิลนี้
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td className="p-1 opacity-60" colSpan={7}>outbox ว่าง</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className={box}>
        <h2 className="mb-2 text-sm font-medium">log</h2>
        <pre className="text-xs">{log.join('\n')}</pre>
      </section>
    </div>
  );
}
```

- โต๊ะ/เมนู/กะ อ่านจาก snapshot ด้วย `useLiveQuery` — **ต้องเข้าหน้าโต๊ะและหน้า POS สักครั้งก่อน** ไม่งั้น dropdown ว่าง
- เลือกโต๊ะที่มีบิล → `orderId` = `open_order_id` → หย่อนแค่ `addItems` · โต๊ะว่าง → `null` → หย่อน 2 แถว
- หน้านี้ไม่ได้ทำตาม design system เต็มที่ (เป็นเครื่องมือ dev ไม่ถึงมือผู้ใช้)

### 4.3 `routes/AppRouter.tsx`

```tsx
import { lazy, Suspense } from 'react';          // [ใหม่] บรรทัดแรก
import { Route, Routes } from 'react-router-dom';
// ...

// [ใหม่] วางก่อน export function AppRouter
// หน้าทดสอบ outbox — มีเฉพาะตอน npm run dev
// import.meta.env.DEV ถูกแทนเป็น false ตอน build → lazy(import(...)) ถูกตัดทิ้ง ไม่มีใน bundle จริง
const OutboxDevPage = import.meta.env.DEV
    ? lazy(() => import('../features/offline/pages/OutboxDevPage'))
    : null;

export function AppRouter() {
    return (
        <Routes>
            {/* ... route เดิม ... */}
            {/* [ใหม่] วางก่อน route '*' */}
            {OutboxDevPage && (
                <Route
                    path='/:tenantSlug/dev/outbox'
                    element={<Suspense fallback={null}><OutboxDevPage /></Suspense>}
                />
            )}
            <Route path='*' element={<StoreFinderPage />} />
```

ทำไมใช้ `lazy(() => import(...))` ไม่ใช่ `import OutboxDevPage from ...` ด้านบน:
- `import` ด้านบนไฟล์จะดึงหน้านี้เข้า bundle **เสมอ** แม้ไม่มี route ใช้
- `import()` แบบ dynamic อยู่ในเงื่อนไข `import.meta.env.DEV` → ตอน build Vite แทนเป็น `false ? ... : null` → ตัดทิ้งทั้งก้อน
- ต้องวางก่อน `path='*'` ไม่งั้น `*` จับไปก่อน (React Router v7 จับตามความเจาะจงอยู่แล้ว แต่วางก่อนอ่านง่ายกว่า)

> ตรวจแล้ว: `npm run build` แล้ว grep `dist/assets/*.js` ไม่พบ `OutboxDevPage` หรือ `Outbox (dev)`

### ทดสอบขั้น 4 — ครบทุกกรณี

เตรียม: `npm run dev` + backend · login → เข้าหน้าโต๊ะ → กดโต๊ะใดก็ได้ (โหลดเมนู) → เปิด `http://localhost:5173/<ร้าน>/dev/outbox`

| # | ทำ | ต้องเห็น |
|---|---|---|
| 1 | โต๊ะว่าง + เมนู + 2 จาน → "หย่อน + flush" | ตารางว่าง · log `flush: done` · KDS มี 2 จาน |
| 2 | Ctrl+C backend → โต๊ะว่างอีกโต๊ะ → หย่อน | 2 แถว `pending` · แถวแรก `attempts 1` "ติดต่อเซิร์ฟเวอร์ไม่ได้" · ป้ายกลางล่างขึ้น |
| 3 | เปิด backend รอ ≤ 20 วินาที ไม่กดอะไร | ตารางว่างเอง · บิลขึ้นในระบบ |
| 4 | **เลือกโต๊ะจากข้อ 1** (dropdown ยังบอก "ว่าง" เพราะ snapshot เก่า) → หย่อน | `createOrder` **failed** "โต๊ะนี้มีบิลเปิดค้างอยู่แล้ว" · `addItems` ยัง `pending` (ถูกบล็อก ไม่ส่งตาม) |
| 5 | ข้อ 4 ค้างอยู่ → หย่อนโต๊ะว่างอีกโต๊ะ | โต๊ะใหม่ส่งสำเร็จ ทั้งที่บิลข้อ 4 ยังติด (จัดกลุ่มตามบิลทำงาน) |
| 6 | ข้อ 4 → "ลบบิลนี้" | ทั้ง 2 แถวของบิลนั้นหาย |
| 7 | ไปหน้าเมนูตั้ง "หมดวันนี้" ให้เมนูหนึ่ง → กลับมาเลือกโต๊ะที่มีบิล + เมนูนั้น → หย่อน | `addItems` failed "เมนูนี้หมดวันนี้แล้ว" → เปิดเมนูคืน → "ลองส่งอีกครั้ง" → ส่งสำเร็จ |

> ข้อ 4 คือปัญหา "snapshot โต๊ะไม่อัปเดตหลังหย่อน" ที่ออกแบบไว้ให้แก้ในส่วนที่ 3 (อัปเดต snapshot ทันทีที่หย่อน `createOrder`) — ตอนนี้เห็นด้วยตาว่าเกิดจริง

### ผลที่ทดสอบแล้ว (Chromium + mock API ที่จำลองพฤติกรรม backend)

| สถานการณ์ | ผล |
|---|---|
| S1 ออนไลน์ บิลใหม่ 2 จาน | outbox ว่าง · server ได้ 2 จาน ✅ |
| S2 backend ล่ม → หย่อน | `createOrder` pending attempts 1 + `addItems` pending ✅ |
| S2 backend กลับมา (ไม่กดอะไร) | ภายใน 20 วินาที outbox ว่าง บิลถึง server ✅ |
| S3 409 โต๊ะมีบิล | `createOrder` failed + `addItems` pending ถูกบล็อก ✅ |
| S4 แก้สาเหตุแล้ว "ลองส่งอีกครั้ง" | outbox ว่าง บิลถึง server ✅ |
| S5 409 เมนูหมด → "ลบบิลนี้" | failed แล้วลบได้ ✅ |
| **S6 server บันทึกแล้วแต่ตอบ 500 → ส่งซ้ำ** | **server ยังมี 3 จาน ไม่ใช่ 6** — idempotency ทำงาน ✅ |
| อัปเกรด DB v10 → v20 | `outbox` เพิ่ม · snapshot เดิมอยู่ครบ ✅ |
| `npm run build` | ไม่มีหน้า dev ใน bundle ✅ |

---

## หลังจบขั้น 4

```
เปิดแอป ✅ → โต๊ะ ✅ → เมนู ✅ → หย่อนลงกล่อง ✅ → ส่งเอง/ส่งเมื่อเน็ตกลับ ✅ → (หน้า POS ยังไม่ได้ต่อสาย)
```

ส่วนที่ 3 (UI + กติกา) จะทำต่อ:
- `OfflineBanner` แสดง "รอส่ง X รายการ" / "ส่งไม่สำเร็จ X รายการ"
- `FailedOutbox` — รายการที่ล้มสำหรับผู้ใช้จริง (แทนหน้า dev)
- อัปเดต snapshot โต๊ะทันทีที่หย่อน `createOrder` (แก้ข้อ 4)
- บล็อก logout + ซ่อน "อัปเดตเลย" เมื่อ outbox ไม่ว่าง

```powershell
git add frontend package-lock.json
git commit -m "feat(offline): outbox queue with flush runner and dev test page"
```
