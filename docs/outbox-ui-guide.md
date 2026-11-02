# Outbox ส่วนที่ 3 — หน้าจอ + กฎกันข้อมูลหาย

> ต่อจาก `outbox-core-guide.md` (ส่วนที่ 1–2: คิว, flush, runner, หน้า dev)
> ฐานโค้ด: `main` @ `9f9fa9e` + fix รูปเมนู · ทดสอบแล้วด้วย mock API + Playwright (ผลอยู่ท้ายไฟล์)
> ตัดสินใจที่ใช้: **A** dexie-react-hooks · **B** รายการล้ม ดู/ลบ/ลองใหม่ได้ · **C** มีของค้างห้าม logout · **E** เปิดรายการจากป้ายสถานะ · **F** เมนู Header บอกเหตุผล + ปุ่ม "ดูรายการ"

---

## 0. ภาพรวม — ส่วนนี้แก้ปัญหาอะไร

ส่วนที่ 1–2 ทำให้ "ส่งได้" แต่พนักงาน **มองไม่เห็น** ว่ามีอะไรค้าง และ **ไม่มีอะไรกัน** การกระทำที่ทำให้ของค้างหาย

| # | ปัญหาถ้าไม่ทำ | สิ่งที่ทำ | ไฟล์ |
|---|---|---|---|
| 1 | ป้ายนับเป็น "แถว" (createOrder + addItems = 2) พนักงานงง | นับเป็น **บิล** | `hooks/useOutbox.ts` |
| 2 | ปุ่มเปิดรายการอยู่ 4 ที่ ต้องส่ง props ข้ามหลายชั้น | store เปิด/ปิดตัวเล็ก | `outboxPanel.ts` (ใหม่) |
| 3 | บิลล้มแล้วแก้ไม่ได้ ครัวไม่ได้ของ ไม่มีใครรู้ | หน้าต่างรายการ ดู/ลบ/ลองใหม่ (E) | `components/OutboxPanel.tsx` (ใหม่) |
| 4 | ออนไลน์แล้วป้ายหาย ทั้งที่ยังมีบิลล้ม | ป้ายแสดงจำนวนบิล + ปุ่ม "ดูรายการ" | `components/OfflineBanner.tsx` |
| 5 | เปิดบิลโต๊ะ 5 ตอนออฟไลน์ กลับมาหน้าโต๊ะยังเห็น "ว่าง" → เปิดบิลซ้ำ → 409 | หย่อนแล้วแก้ snapshot โต๊ะด้วย | `outbox.ts` |
| 6 | logout แล้ว token หาย ของค้างส่งไม่ได้ | บล็อก logout + บอกเหตุผล (C/F) | `useLogin.ts`, `Header.tsx` |
| 7 | กดอัปเดตแอป โค้ดใหม่อ่านคิวรูปแบบเก่าไม่ได้ | ซ่อน "อัปเดตเลย" | `UpdatePrompt.tsx` |
| 8 | ปิดกะทั้งที่ยังมีของค้าง → ส่งทีหลังเข้ากะใหม่ ยอดกะนี้ขาด | บล็อกปุ่มปิดกะ | `CloseShiftCard.tsx`, `ShiftPage.tsx` |

ลำดับการทำ: 1 → 2 → 3 → 4 (ทดสอบได้ทันที) → 5 → 6 → 7 → 8 · แต่ละข้อ build ผ่านเดี่ยว ๆ

**แนวคิดหลัก — "แหล่งความจริงเดียว"**
ทุกหน้าจอ (ป้าย, Header, หน้าปิดกะ, หน้าต่าง, UpdatePrompt) อ่านจาก `useOutbox()` ตัวเดียว ซึ่งใช้ `useLiveQuery` ของ Dexie
→ IndexedDB เปลี่ยน (หย่อน / ส่งสำเร็จ / ล้ม / ลบ / แท็บอื่นแก้) ทุกจอ re-render เอง **ไม่ต้องเขียน state ซิงก์กันเอง**
เปรียบเทียบ: เหมือนกระดานออเดอร์หน้าครัว ทุกคนมองกระดานแผ่นเดียว ไม่มีใครจดสำเนาแยก

---

## ขั้นเตรียม (ทำก่อนเริ่ม)

```bash
# 1. งานค้างจากรอบก่อน (ถ้ายังไม่ได้ทำ)
git checkout -- frontend/src/features/tables/pages/TablesPage.tsx   # ทิ้งที่แก้เอง — ของเพื่อนแก้แบบเดียวกันแล้ว
git add frontend/src/features/mainpos/hooks/useFullMenu.ts
git commit -m "fix(pos): restore menu image and description lost in merge"
git pull origin main
npm install

# 2. เปลี่ยนชื่อไฟล์ป้ายให้เป็น PascalCase (ตรงกับไฟล์อื่นใน components/)
git mv frontend/src/features/offline/components/offlineBanner.tsx frontend/src/features/offline/components/OfflineBanner.tsx
```

แล้วแก้ import ใน `App.tsx`:

```tsx
import OfflineBanner from './features/offline/components/OfflineBanner';  // เดิม .../offlineBanner
```

> Windows ไม่แยกตัวพิมพ์เล็ก/ใหญ่ — ถ้าเปลี่ยนชื่อด้วย Explorer git จะไม่เห็น ต้องใช้ `git mv` เท่านั้น
> ไม่แก้ import = Windows build ผ่าน แต่ Linux (Vercel) build พัง `Failed to resolve import`

---

## 1. `useOutbox` — นับเป็นบิล

**ทำไม**: บิลใหม่ 1 บิลตอนออฟไลน์ = 2 แถว (`createOrder` + `addItems`) กดส่งครัวเพิ่ม = +1 แถว
ถ้าป้ายบอก "รอส่ง 3 รายการ" พนักงานจะคิดว่า 3 จาน — ผิด · พนักงานคิดเป็น **บิล/โต๊ะ**

**กฎนับ**: บิลที่มีแถว `failed` อยู่ นับเป็น "ส่งไม่สำเร็จ" อย่างเดียว ไม่นับซ้ำใน "รอส่ง"
(แถว pending ของบิลนั้นถูกบล็อกอยู่ — flush ข้ามให้ ดูส่วนที่ 2 `blockedOrders`)

`frontend/src/features/offline/hooks/useOutbox.ts` (เขียนทับทั้งไฟล์):

```ts
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
```

ค่าเดิม `pendingCount` / `failedCount` ยังอยู่ → หน้า dev ไม่ต้องแก้

**ทดสอบ**: `npx tsc -b` ใน `frontend/` ผ่าน · หน้า `/:tenantSlug/dev/outbox` ยังแสดงตัวเลขเหมือนเดิม

---

## 2. `outboxPanel.ts` — store เปิด/ปิดหน้าต่าง

**ทำไม**: ปุ่ม "ดูรายการ" อยู่ 4 ที่ (ป้าย, Header, หน้าปิดกะ, UpdatePrompt) แต่หน้าต่างมี **ตัวเดียว** วางใน `App`
ทางเลือก:

| วิธี | ข้อดี | ข้อเสีย |
|---|---|---|
| `useState` ใน App + ส่ง props | ไม่มีไฟล์ใหม่ | Header อยู่ในทุกหน้า → ต้องส่ง prop ผ่าน AppRouter ทุก route |
| React Context | มาตรฐาน | ต้องมี Provider + ไฟล์ context อีกชุด เกินขนาดงาน (state แค่ boolean ตัวเดียว) |
| **store ตัวเล็ก + `useSyncExternalStore`** ✅ | เรียก `openOutboxPanel()` จากไหนก็ได้ · แบบเดียวกับ `connectionStatus.ts` ที่ทำไปแล้ว | — |

ไฟล์ใหม่ `frontend/src/features/offline/outboxPanel.ts`:

```ts
import { useSyncExternalStore } from 'react';

/**
 * สถานะ "เปิด/ปิด" หน้าต่างรายการค้างส่ง (OutboxPanel)
 *
 * ทำไมไม่ใช้ useState ธรรมดา
 * ปุ่มเปิดอยู่หลายที่ (ป้ายสถานะ, เมนู Header, หน้าปิดกะ) แต่หน้าต่างมีตัวเดียววางใน App
 * ถ้าใช้ useState ต้องส่ง props ผ่านหลายชั้น — ใช้ store ตัวเล็กแบบเดียวกับ connectionStatus แทน
 */

let isOpen = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function openOutboxPanel(): void {
  isOpen = true;
  emit();
}

export function closeOutboxPanel(): void {
  isOpen = false;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** true = หน้าต่างเปิดอยู่ */
export function useOutboxPanelOpen(): boolean {
  return useSyncExternalStore(subscribe, () => isOpen);
}
```

> ตั้งชื่อไฟล์ตัวเล็ก (`outboxPanel.ts`) เพราะไม่ใช่ component — ตรงกับ `connectionStatus.ts`, `outbox.ts`
> ระวังสับสนกับ `components/OutboxPanel.tsx` (ตัวใหญ่ = component) ในขั้นถัดไป

---

## 3. `OutboxPanel.tsx` — หน้าต่างรายการค้าง (E + B)

**แต่ละบิลแสดง**

- ชื่อโต๊ะ — outbox เก็บแค่ id จึงหาชื่อจาก snapshot โต๊ะ
  - บิลใหม่: `payload.tableId` ของแถว `createOrder`
  - บิลเดิม (มีแค่ `addItems`): หาโต๊ะที่ `open_order_id` ตรงกับ `orderId`
- รายการอาหาร "กะเพราหมู ×2, ข้าวไข่เจียว" — ชื่อจาก snapshot เมนู รวมจานซ้ำ
- สถานะ รอส่ง / ส่งไม่สำเร็จ + สาเหตุ (`lastError`) + เวลาที่สั่ง
- "ของผู้ใช้อื่น" ถ้า `userId` ไม่ใช่คน login อยู่ (runner ไม่ส่งของคนอื่น — ส่วนที่ 2)

**ปุ่ม**

| ปุ่ม | แสดงเมื่อ | ทำอะไร |
|---|---|---|
| ลองส่งอีกครั้ง | บิล failed | `retryOrder()` (failed → pending) แล้ว `flushOutbox()` ทันที |
| ลบ | ทุกบิล | ถามยืนยันในการ์ด (ไม่ใช้ `window.confirm`) แล้ว `discardOrder()` |
| ส่งตอนนี้ | มีบิลรอส่ง | `flushOutbox()` ไม่ต้องรอรอบ 30 วินาที |

บิลรอส่ง **ไม่มี** ปุ่มลองใหม่ — ส่งเองอัตโนมัติอยู่แล้ว ปุ่มซ้ำทำให้พนักงานกดรัว

**ทำไมยืนยันลบในการ์ด ไม่ใช้ `window.confirm`**: confirm ของ browser บล็อกทั้งหน้า, หน้าตาไม่เข้ากับแอป, และบนแท็บเล็ตกดพลาดง่าย
การ์ดเปลี่ยนเป็น "ลบแล้วครัวจะไม่ได้รับรายการนี้ และกู้คืนไม่ได้ [ไม่ลบ] [ยืนยันลบ]" — พนักงานเห็นผลที่ตามมาก่อนกด

ไฟล์ใหม่ `frontend/src/features/offline/components/OutboxPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Clock, Loader2, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import type { DiningTable } from '../../tables/types/table.types';
import type { FullMenuData } from '../../mainpos/types/item.types';
import { db, type OutboxEntry } from '../db';
import { flushOutbox } from '../flush';
import { useOutbox } from '../hooks/useOutbox';
import { discardOrder, retryOrder } from '../outbox';
import { closeOutboxPanel, useOutboxPanelOpen } from '../outboxPanel';

/** 1 บิลในหน้าต่าง = รวมทุกแถวของ orderId เดียวกัน */
interface OrderGroup {
  orderId: string;
  entries: OutboxEntry[];
  status: 'pending' | 'failed'; // มีแถวไหน failed = ทั้งบิล failed
  lastError: string | null;
  createdAt: number; // เวลาของแถวแรก
  isNewBill: boolean; // มีแถว createOrder = บิลที่เปิดตอนออฟไลน์
  tableId: string | null; // รู้เฉพาะบิลใหม่ (อยู่ใน payload ของ createOrder)
  isMine: boolean; // ของผู้ใช้ที่ login อยู่
}

/** จัดกลุ่มแถวตาม orderId — entries เรียงตาม seq มาแล้ว กลุ่มจึงเรียงตามบิลที่สั่งก่อน */
function groupByOrder(entries: OutboxEntry[], userId: string | undefined): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();
  for (const entry of entries) {
    let group = groups.get(entry.orderId);
    if (!group) {
      group = {
        orderId: entry.orderId,
        entries: [],
        status: 'pending',
        lastError: null,
        createdAt: entry.createdAt,
        isNewBill: false,
        tableId: null,
        isMine: entry.userId === userId,
      };
      groups.set(entry.orderId, group);
    }
    group.entries.push(entry);
    if (entry.status === 'failed') {
      group.status = 'failed';
      group.lastError = entry.lastError;
    } else if (!group.lastError && entry.lastError) {
      group.lastError = entry.lastError; // pending ที่เคยลองแล้ว เช่น "ติดต่อเซิร์ฟเวอร์ไม่ได้"
    }
    if (entry.kind === 'createOrder') {
      group.isNewBill = true;
      group.tableId = entry.payload.tableId;
    }
  }
  return [...groups.values()];
}

const timeFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

/**
 * หน้าต่างรายการออเดอร์ที่ยังไม่ถึง server (ตัดสินใจ E: เปิดจากป้ายสถานะ)
 * ดู / ลองส่งใหม่ / ลบ — วางไว้ตัวเดียวใน App เปิดจากที่ไหนก็ได้ด้วย openOutboxPanel()
 */
export default function OutboxPanel() {
  const isOpen = useOutboxPanelOpen();
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug;
  const { entries } = useOutbox(tenantSlug);

  // ชื่อโต๊ะ/ชื่อเมนูจาก snapshot — outbox เก็บแค่ id (ข้อมูลที่ server ต้องการ)
  const tables = useLiveQuery(
    async () =>
      tenantSlug ? ((await db.snapshots.get([tenantSlug, 'tables']))?.data as DiningTable[] | undefined) : undefined,
    [tenantSlug],
  );
  const menu = useLiveQuery(
    async () =>
      tenantSlug ? ((await db.snapshots.get([tenantSlug, 'menu']))?.data as FullMenuData | undefined) : undefined,
    [tenantSlug],
  );

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);

  // กด Esc ปิดหน้าต่าง
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOutboxPanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const groups = groupByOrder(entries, user?.sub);
  const menuName = new Map(
    (menu?.categories ?? []).flatMap((c) => c.items).map((item) => [item.menu_item_id, item.name] as const),
  );

  /** ชื่อโต๊ะ: บิลใหม่ดูจาก tableId · บิลเดิมหาโต๊ะที่ open_order_id ตรงกัน */
  const tableLabel = (group: OrderGroup): string => {
    const table = tables?.find((t) =>
      group.tableId ? t.table_id === group.tableId : t.open_order_id === group.orderId,
    );
    return table ? `โต๊ะ ${table.table_number}` : 'ไม่ทราบโต๊ะ';
  };

  /** "ข้าวผัด ×2, ต้มยำ" — รวมจานเมนูเดียวกัน */
  const itemSummary = (group: OrderGroup): string => {
    const counts = new Map<string, number>();
    for (const entry of group.entries) {
      if (entry.kind !== 'addItems') continue;
      for (const item of entry.payload.items) {
        const name = menuName.get(item.menuItemId) ?? 'เมนูที่ไม่รู้จัก';
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(', ') || '—';
  };

  const retry = async (orderId: string) => {
    setBusyOrderId(orderId);
    await retryOrder(orderId); // failed → pending
    await flushOutbox(); // ส่งทันที ไม่ต้องรอรอบ 30 วินาที
    setBusyOrderId(null);
  };

  const discard = async (orderId: string) => {
    setBusyOrderId(orderId);
    await discardOrder(orderId);
    setConfirmDeleteId(null);
    setBusyOrderId(null);
  };

  const sendAll = async () => {
    setIsFlushing(true);
    await flushOutbox();
    setIsFlushing(false);
  };

  const button =
    'flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    // พื้นหลังมืด — กดนอกกล่องเพื่อปิด
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/30 p-4 font-kanit sm:items-center"
      onClick={closeOutboxPanel}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="outbox-panel-title"
        onClick={(event) => event.stopPropagation()} // กดในกล่องไม่ปิด
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white text-[#2D241E] shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD5] p-4">
          <div>
            <h2 id="outbox-panel-title" className="text-base font-bold">
              ออเดอร์ที่ยังไม่ถึงครัว
            </h2>
            <p className="mt-0.5 text-xs text-[#7A6A5C]">
              เก็บไว้ในเครื่องนี้เท่านั้น · ส่งให้อัตโนมัติเมื่อติดต่อเซิร์ฟเวอร์ได้
            </p>
          </div>
          <button
            type="button"
            onClick={closeOutboxPanel}
            aria-label="ปิด"
            className="cursor-pointer rounded-lg p-1 text-[#2D241E]/60 hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-[#7A6A5C]">ส่งครบแล้ว ไม่มีรายการค้าง</p>
          )}

          {groups.map((group) => {
            const isBusy = busyOrderId === group.orderId;
            const isFailed = group.status === 'failed';
            return (
              <article
                key={group.orderId}
                className={`rounded-xl border p-3 ${isFailed ? 'border-[#F4C7C3] bg-[#FEF3F2]' : 'border-[#E8DFD5]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {tableLabel(group)}
                      {group.isNewBill && <span className="ml-1.5 text-xs font-normal text-[#7A6A5C]">· บิลใหม่</span>}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[#5C4A3D]">{itemSummary(group)}</p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isFailed ? 'bg-[#B42318] text-white' : 'bg-[#EFE8DC] text-[#6B5140]'
                    }`}
                  >
                    {isFailed ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
                    {isFailed ? 'ส่งไม่สำเร็จ' : 'รอส่ง'}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#7A6A5C]">
                  สั่งเมื่อ {timeFormat.format(group.createdAt)} น.
                  {!group.isMine && ' · ของผู้ใช้อื่น (ส่งเมื่อคนนั้นเข้าสู่ระบบ)'}
                </p>
                {group.lastError && (
                  <p className={`mt-1 text-xs ${isFailed ? 'text-[#B42318]' : 'text-[#7A6A5C]'}`}>
                    สาเหตุ: {group.lastError}
                  </p>
                )}

                {/* ปุ่ม — รายการรอส่งไม่ต้องมีปุ่มลองใหม่ (ส่งเองอัตโนมัติ) */}
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {confirmDeleteId === group.orderId ? (
                    <>
                      <span className="mr-auto self-center text-xs text-[#B42318]">
                        ลบแล้วครัวจะไม่ได้รับรายการนี้ และกู้คืนไม่ได้
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className={`${button} border border-[#d9c6b0] bg-white hover:bg-[#FAF7F2]`}
                      >
                        ไม่ลบ
                      </button>
                      <button
                        type="button"
                        onClick={() => discard(group.orderId)}
                        disabled={isBusy}
                        className={`${button} bg-[#B42318] text-white hover:bg-[#912018]`}
                      >
                        ยืนยันลบ
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(group.orderId)}
                        disabled={isBusy}
                        className={`${button} text-[#B42318] hover:bg-[#FEE4E2]`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ลบ
                      </button>
                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => retry(group.orderId)}
                          disabled={isBusy}
                          className={`${button} bg-[#8C6D58] text-white hover:bg-[#7a5c45]`}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          ลองส่งอีกครั้ง
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {groups.some((g) => g.status === 'pending') && (
          <footer className="flex justify-end border-t border-[#E8DFD5] p-3">
            <button
              type="button"
              onClick={sendAll}
              disabled={isFlushing}
              className={`${button} border border-[#d9c6b0] bg-white text-[#5C4A3D] hover:bg-[#FAF7F2]`}
            >
              {isFlushing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              ส่งตอนนี้
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
```

**จุดที่ต้องเข้าใจ**

- `useEffect` (Esc) อยู่ **ก่อน** `if (!isOpen) return null` — hook ต้องเรียกครบทุก render (Rules of Hooks)
- `groupByOrder` / `menuName` อยู่หลัง return ได้ เพราะไม่ใช่ hook
- `onClick={closeOutboxPanel}` ที่พื้นหลัง + `stopPropagation()` ที่กล่อง = กดนอกกล่องปิด กดในกล่องไม่ปิด
- `z-[1100]` สูงกว่าป้าย (`z-[1000]`) — หน้าต่างต้องอยู่บนสุด

วางใน `App.tsx` (ตัวเดียวทั้งแอป):

```tsx
import OutboxPanel from './features/offline/components/OutboxPanel';
// ...
        <OfflineBanner/>
        <OutboxRunner/>
        <OutboxPanel />
```

**ทดสอบ** (ยังไม่มีปุ่มเปิด — เปิดจาก Console ชั่วคราว):
1. `npm run dev` → เปิด `/:tenantSlug/dev/outbox` → หยุด backend → หย่อน 1 บิล
2. Console: `(await import('/src/features/offline/outboxPanel.ts')).openOutboxPanel()`
3. ต้องเห็น "โต๊ะ X · บิลใหม่ / ชื่อเมนู / รอส่ง / สาเหตุ: ติดต่อเซิร์ฟเวอร์ไม่ได้"
4. กด Esc / กดพื้นหลังมืด → ปิด

---

## 4. `OfflineBanner` — แสดงบิลค้าง + ปุ่ม "ดูรายการ"

**ตารางสถานะป้าย** (เรียงความสำคัญ บนชนะล่าง)

| เงื่อนไข | หัวข้อ | สี | บรรทัดเสริม |
|---|---|---|---|
| มีบิล failed | ส่งออเดอร์ไม่สำเร็จ X บิล | แดง | รอส่ง Y บิล (ถ้ามี) |
| offline | ออฟไลน์ | น้ำตาล | รอส่ง Y บิล |
| unreachable | ติดต่อเซิร์ฟเวอร์ไม่ได้ | น้ำตาล | รอส่ง Y บิล |
| online + มีรอส่ง | กำลังส่งออเดอร์ที่ค้าง | น้ำตาล | — |
| เพิ่งกลับมา | เชื่อมต่อแล้ว (3 วิ) | เขียว | — |
| online + ไม่มีอะไรค้าง | ไม่แสดง | | |

**ทำไม failed ชนะ offline**: offline หายเองเมื่อเน็ตกลับ · failed **ไม่หายเอง** ต้องมีคนจัดการ ถ้าไม่เด่น ครัวจะไม่ได้ของโดยไม่มีใครรู้

**ทำไม online + รอส่ง ยังแสดง**: เกิดได้ 2 กรณี (1) runner กำลังส่ง ไม่กี่วินาทีหาย (2) ของผู้ใช้อื่นที่ยังไม่ login — ต้องให้เห็น

`frontend/src/features/offline/components/OfflineBanner.tsx` (เขียนทับทั้งไฟล์):

```tsx
import { useState } from 'react';
import { AlertTriangle, CloudOff, CloudUpload, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { pingServer } from '../connectionStatus';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useOutbox } from '../hooks/useOutbox';
import { openOutboxPanel } from '../outboxPanel';

/**
 * ป้ายลอยกลางจอด้านล่าง บอกสถานะการเชื่อมต่อ + ออเดอร์ค้างส่งของทั้งแอป
 * - ออนไลน์ + ไม่มีของค้าง: ไม่แสดงอะไร
 * - ออฟไลน์ / ติดต่อ server ไม่ได้: แสดงค้างไว้จนกว่าจะกลับมา
 * - เพิ่งกลับมา: แสดง "เชื่อมต่อแล้ว" 3 วินาทีแล้วหาย
 * - [ใหม่] มีออเดอร์รอส่ง / ส่งไม่สำเร็จ: แสดงจำนวนบิล + ปุ่ม "ดูรายการ" (เปิด OutboxPanel)
 *
 * วางกลางล่าง: มุมขวาล่างเป็นของ UpdatePrompt และมุมซ้ายล่างทับการ์ดสรุป "มีลูกค้า" ใน sidebar หน้าโต๊ะ
 */
export default function OfflineBanner() {
  const { status, justReconnected } = useConnectionStatus();
  const { user } = useAuth();
  // ยังไม่ login → tenantSlug เป็น undefined → useOutbox คืนค่าว่าง ป้ายส่วนออเดอร์ไม่แสดง
  const { pendingOrderCount, failedOrderCount } = useOutbox(user?.tenantSlug);
  const [isChecking, setIsChecking] = useState(false);

  // hooks ทุกตัวต้องเรียกก่อน return แรก (กฎของ React: ลำดับ hook ต้องเท่าเดิมทุก render)
  const hasQueue = pendingOrderCount > 0 || failedOrderCount > 0;
  if (status === 'online' && !justReconnected && !hasQueue) return null;

  const retry = async () => {
    setIsChecking(true);
    await pingServer();
    setIsChecking(false);
  };

  // เลือกไอคอน ข้อความ และสีตามสถานะ — ลำดับความสำคัญ: ส่งไม่สำเร็จ > ออฟไลน์ > ติดต่อไม่ได้ > กำลังส่ง > เชื่อมต่อแล้ว
  const view =
    failedOrderCount > 0
      ? {
          // ต้องให้คนจัดการ (ลบ/ลองใหม่) — แสดงเด่นสุดแม้จะออนไลน์อยู่
          Icon: AlertTriangle,
          title: `ส่งออเดอร์ไม่สำเร็จ ${failedOrderCount} บิล`,
          detail: 'ครัวยังไม่ได้รับรายการนี้ · กด "ดูรายการ" เพื่อจัดการ',
          tone: 'border-[#F4C7C3] bg-[#FEF3F2] text-[#B42318]',
          canRetry: status === 'unreachable',
        }
      : status === 'offline'
        ? {
            Icon: WifiOff,
            title: 'ออฟไลน์',
            detail: 'ไม่มีอินเทอร์เน็ต · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
            tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
            canRetry: false, // ไม่มีเน็ต กดลองก็ไม่มีประโยชน์ รอ event 'online'
          }
        : status === 'unreachable'
          ? {
              Icon: CloudOff,
              title: 'ติดต่อเซิร์ฟเวอร์ไม่ได้',
              detail: 'กำลังลองใหม่อัตโนมัติ · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
              tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
              canRetry: true,
            }
          : hasQueue
            ? {
                // ออนไลน์แล้วแต่ยังมีของรอส่ง (OutboxRunner กำลังส่ง หรือเป็นของผู้ใช้อื่นที่ยังไม่ login)
                Icon: CloudUpload,
                title: 'กำลังส่งออเดอร์ที่ค้าง',
                detail: 'ส่งให้อัตโนมัติ ไม่ต้องกดซ้ำ',
                tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
                canRetry: false,
              }
            : {
                Icon: Wifi,
                title: 'เชื่อมต่อแล้ว',
                detail: 'กดรีเฟรชในหน้านั้นเพื่อดูข้อมูลล่าสุด',
                tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
                canRetry: false,
              };

  const { Icon } = view;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 z-[1000] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 font-kanit shadow-md transition-colors duration-200 ${view.tone}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{view.title}</p>
        <p className="opacity-70">{view.detail}</p>
        {/* [ใหม่] บรรทัดจำนวนรอส่ง — แสดงเมื่อป้ายหลักเป็นเรื่องอื่น (ออฟไลน์/ติดต่อไม่ได้) แต่มีของรอส่งด้วย */}
        {pendingOrderCount > 0 && (failedOrderCount > 0 || status !== 'online') && (
          <p className="mt-0.5 font-medium">รอส่ง {pendingOrderCount} บิล</p>
        )}
      </div>
      {hasQueue && (
        <button
          type="button"
          onClick={openOutboxPanel}
          className="shrink-0 cursor-pointer rounded-lg border border-current/20 bg-white/70 px-2.5 py-1 text-xs font-medium transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]"
        >
          ดูรายการ
        </button>
      )}
      {view.canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={isChecking}
          aria-label="ลองเชื่อมต่อเซิร์ฟเวอร์อีกครั้ง"
          className="cursor-pointer rounded-lg p-1 text-[#8C6D58] transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
```

**ทดสอบ**
1. ออนไลน์ ไม่มีของค้าง → ไม่มีป้าย
2. หยุด backend → หน้า dev หย่อน 1 บิล → "ติดต่อเซิร์ฟเวอร์ไม่ได้ … รอส่ง 1 บิล [ดูรายการ] [⟳]"
3. กด "ดูรายการ" → หน้าต่างขั้น 3 เปิด
4. เปิด backend → รอ ≤15 วิ → "เชื่อมต่อแล้ว" แล้วป้ายหาย · บิลหายจากหน้าต่าง
5. หน้า dev หย่อนบิลโต๊ะที่มีบิลบน server แล้ว (ได้ 409) → ป้าย **แดง** "ส่งออเดอร์ไม่สำเร็จ 1 บิล" ค้างแม้ออนไลน์

---

## 5. `outbox.ts` — แก้ snapshot โต๊ะตอนหย่อน

**ปัญหาจริง (ทดสอบเจอ)**:
ออฟไลน์ → เปิดบิลโต๊ะ 5 → กลับหน้าโต๊ะ → snapshot ยังบอก "ว่าง, `open_order_id = null`"
→ กดโต๊ะ 5 อีกรอบ สั่งเพิ่ม → `enqueueOrder({ orderId: null })` สร้าง **บิลใหม่อีกใบ**
→ เน็ตกลับ บิลแรกผ่าน บิลที่ 2 ได้ `409 โต๊ะนี้มีบิลเปิดค้างอยู่แล้ว` → failed → อาหารรอบ 2 ไม่ถึงครัว

**แก้**: ใน transaction เดียวกับที่หย่อน แก้แถวโต๊ะใน snapshot

- `status = 'occupied'`, `open_order_id = orderId` → รอบหน้าได้ `orderId` เดิม หย่อนแค่ `addItems`
- `item_count += จำนวนจาน`
- `total_amount += ราคาประมาณ` (ราคาเมนู + modifier จาก snapshot เมนู)
- `savedAt` **ไม่เปลี่ยน** — ป้าย "แสดงข้อมูล ณ HH:MM" ต้องบอกเวลาที่ได้จาก server จริง

**ทำไมใส่ใน transaction เดียวกัน**: ถ้าหย่อนสำเร็จแต่แก้ snapshot ล้ม (หรือกลับกัน) จะได้สถานะครึ่ง ๆ — Dexie ให้ใส่หลายตารางใน transaction เดียว (`db.outbox, db.snapshots`) ได้ทั้งหมดหรือไม่ได้เลย

**ทำไมเป็นแค่ราคาประมาณ**: ราคาจริง server คำนวณตอนรับรายการ · โหลดสดครั้งหน้าเขียนทับเอง · หน้าโต๊ะมีแถบ "สถานะอาจไม่ตรงกับปัจจุบัน" อยู่แล้ว

แก้ `frontend/src/features/offline/outbox.ts`:

**(ก) import เพิ่ม** บนสุด:

```ts
import type { DiningTable } from '../tables/types/table.types';
import type { FullMenuData } from '../mainpos/types/item.types';
import { db, type OrderItemBody, type OutboxEntry } from './db';
```

**(ข) ใน `enqueueOrder`** — เพิ่ม `db.snapshots` ใน transaction + เรียกฟังก์ชันใหม่ท้าย transaction:

```ts
  // transaction = ลงทั้งหมดหรือไม่ลงเลย (ไม่มีกรณี createOrder ลงแต่ addItems หาย)
  // [ใหม่] รวม db.snapshots ด้วย — ผังโต๊ะในเครื่องต้องเปลี่ยนพร้อมกับคิว
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
```

**(ค) ฟังก์ชันใหม่ 2 ตัว** — วางต่อจาก `enqueueOrder` ก่อน `listOutbox`:

```ts
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
```

> `Number(table.total_amount)` — PostgreSQL `numeric` ผ่าน node-pg มักมาเป็น **string** (`"120.00"`) ถ้าบวกตรง ๆ จะได้ `"120.0060"` (ต่อ string)

**ทดสอบ**
1. เปิดหน้าโต๊ะ + หน้า POS ครั้งหนึ่ง (ให้มี snapshot โต๊ะและเมนู)
2. หยุด backend → หน้า dev หย่อนโต๊ะว่าง 2 จาน
3. DevTools → Application → IndexedDB → pwa-pos → snapshots → `[ร้าน, tables]` → โต๊ะนั้น `occupied`, มี `open_order_id`, `item_count` 2
4. dropdown โต๊ะในหน้า dev ต้องขึ้น "(บิล xxxxxxxx)" → หย่อนอีก 1 จาน → ตารางคิวมีแค่ `addItems` เพิ่ม (ไม่มี `createOrder` ใบที่ 2)
5. หน้าโต๊ะ → การ์ดโต๊ะนั้น "มีลูกค้า 3 รายการ ฿…"
6. เปิด backend → ส่งครบ ไม่มีบิล failed

---

## 6. บล็อก logout (C + F)

**ทำไมบล็อก ไม่ใช่แค่เตือน**: ออกไปแล้ว token หาย runner ส่งของคนนี้ไม่ได้ (ส่งด้วย token ของคนอื่นก็ไม่ได้ — `createdBy` มาจาก JWT จะผิดคน)
ถ้าคนนั้นไม่กลับมา login เครื่องนี้ = ครัวไม่ได้ของเลย · Loyverse ทำแบบเดียวกัน (ห้ามออกถ้ามีรายการยังไม่ sync)

**2 ชั้น**

| ชั้น | ที่ | ทำไม |
|---|---|---|
| UI | Header: ปุ่ม disabled + กล่องแดง "มี X บิลยังไม่ส่งถึงครัว ออกจากระบบไม่ได้ [ดูรายการ]" | พนักงานรู้เหตุผลและทางแก้ **ก่อน** กด |
| logic | `useLogin.logout()` เช็คซ้ำ คืน `'blocked'` | กันคนเรียก `logout()` จากที่อื่นในอนาคต / คิวเปลี่ยนระหว่างเมนูเปิด |

นับเฉพาะของ **คนที่ login อยู่** — ของคนอื่นไม่เกี่ยวกับ token ของคนนี้ ออกได้

**(ก)** `frontend/src/features/auth/hooks/useLogin.ts`

import + type ใหม่ ต่อจาก import `clearTenantSnapshots`:

```ts
import { hasUnsentForUser } from '../../offline/outbox';

/** ผลของ logout — 'blocked' = ยังมีออเดอร์ค้างส่งในเครื่อง ไม่ได้ออกจากระบบ */
export type LogoutResult = 'ok' | 'blocked';
```

`logout` — เพิ่มเช็คบนสุด และ `return 'ok'` ท้ายสุด (หลัง `finally`):

```ts
    const logout = async (): Promise<LogoutResult> => {
        // [ใหม่] ตัดสินใจ C: มีออเดอร์ค้างส่งของคนนี้ → ห้ามออก
        // ออกไปแล้ว token หาย ออเดอร์จะส่งไม่ได้จนกว่าคนเดิมกลับมา login (ถ้าไม่กลับมา = ครัวไม่ได้รับ)
        if (user?.tenantSlug && user.sub && (await hasUnsentForUser(user.tenantSlug, user.sub))) {
            return 'blocked';
        }

        setIsSubmitting(true);
        try {
            await apiFetch('/auth/logout', accessToken, 'POST', {
                refreshToken: getRefreshToken() ?? undefined,
            });
        } catch (err) {
            console.error('logout failed', err);
        }
        finally{
            // กลับไปที่ "/" — ถ้าเครื่องจำร้านไว้จะเด้งเข้าหน้าร้านเดิมให้เอง
            // (ไม่พึ่ง useParams ซึ่งอาจว่างถ้า Header ถูกใช้ خارج route ของร้าน)
            // ลบข้อมูลออฟไลน์ (โต๊ะ/กะ/เมนู) ของร้านนี้ออกจากเครื่อง
            // ต้องทำก่อน clearAuth() เพราะหลังจากนั้น user จะเป็น null ไม่รู้ tenantSlug แล้ว
            if (user?.tenantSlug) await clearTenantSnapshots(user.tenantSlug);
            clearAuth();
            navigate('/');
        }
        return 'ok';
    };
```

**(ข)** `frontend/src/components/Header.tsx`

import เพิ่ม:

```tsx
import { useOutbox } from "../features/offline/hooks/useOutbox"
import { openOutboxPanel } from "../features/offline/outboxPanel"
```

ต่อจาก `const { logout } = useLogin();`:

```tsx
    // [ใหม่] ออเดอร์ค้างส่งของ "คนที่ login อยู่" (นับเป็นบิล) — มีแล้วห้าม logout (ตัดสินใจ C/F)
    const { entries: outboxEntries } = useOutbox(user?.tenantSlug)
    const myUnsentBills = new Set(
        outboxEntries.filter((e) => e.userId === user?.sub).map((e) => e.orderId),
    ).size
```

แทนปุ่ม "ออกจากระบบ" เดิม (ตั้งแต่ `<button` ถึง `>` ก่อน `<LogOut`):

```tsx
                            {/* [ใหม่] มีออเดอร์ค้างส่ง → บอกเหตุผลที่ออกไม่ได้ + ทางไปจัดการ */}
                            {myUnsentBills > 0 && (
                                <div className="mx-3 mb-1 rounded-lg bg-[#FEF3F2] px-3 py-2 text-xs text-[#B42318]">
                                    <p>มี {myUnsentBills} บิลยังไม่ส่งถึงครัว ออกจากระบบไม่ได้</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMenuOpen(false)
                                            openOutboxPanel()
                                        }}
                                        className="mt-1 cursor-pointer font-semibold underline underline-offset-2"
                                    >
                                        ดูรายการ
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={myUnsentBills > 0}
                                onClick={async () => {
                                    setIsMenuOpen(false)
                                    // logout เช็คซ้ำอีกชั้น (เผื่อคิวเปลี่ยนระหว่างเมนูเปิด) — ออกไม่ได้ก็ไม่เปลี่ยนหน้า
                                    const result = await logout()
                                    if (result === 'ok') navigate(`/${tenantSlug}/login`)
                                    else openOutboxPanel()
                                }}
                                
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
```

**จุดที่เปลี่ยนจากเดิม**: เดิม `logout(); navigate(...)` ไม่ `await` → เปลี่ยนหน้าทันทีแม้ logout ยังไม่จบ
ตอนนี้ต้อง `await` เพราะต้องรู้ผล `'ok' | 'blocked'` ก่อนตัดสินใจเปลี่ยนหน้า

**ทดสอบ**
1. หยุด backend → หย่อน 1 บิล → เปิดเมนู Header → กล่องแดง "มี 1 บิล…" + ปุ่มออกจากระบบจาง กดไม่ได้
2. กด "ดูรายการ" ในกล่อง → เมนูปิด หน้าต่างเปิด
3. เปิด backend รอส่งเสร็จ → เปิดเมนูใหม่ → กล่องหาย ปุ่มกดได้ → logout ปกติ
4. (ชั้น logic) หยุด backend หย่อน 1 บิล → Console ไม่มีทางเรียกตรงได้ง่าย — ข้ามได้ ชั้น UI พอสำหรับเดโม

---

## 7. `UpdatePrompt` — ซ่อน "อัปเดตเลย" ตอนมีของค้าง

**ทำไม**: วันหนึ่งอาจเพิ่ม field ใน payload ของคิว (เช่น `shiftId` ส่งขึ้น server) โค้ดเวอร์ชันใหม่ส่งของรูปแบบเก่าแล้ว backend ตอบ 400 → failed ทั้งหมด
หลักการเดียวกับ database migration: **ล้างคิวด้วยโค้ดที่สร้างมันก่อน แล้วค่อยเปลี่ยนเวอร์ชัน**

ไม่ซ่อนทั้งกล่อง — ยังบอกว่า "มีเวอร์ชันใหม่" แต่เปลี่ยนปุ่มเป็น "ดูรายการค้าง" และข้อความบอกเหตุผล

แก้ `frontend/src/features/offline/components/UpdatePrompt.tsx`:

import เพิ่ม:

```tsx
import { useAuth } from '../../auth/context/AuthContext';
import { useOutbox } from '../hooks/useOutbox';
import { openOutboxPanel } from '../outboxPanel';
```

ลบคอมเมนต์ `TODO (ตอนทำ outbox)` ใน JSDoc แทนด้วย:

```tsx
 * [ใหม่] มีออเดอร์ค้างใน outbox → ซ่อนปุ่ม "อัปเดตเลย"
 * เพราะเวอร์ชันใหม่อาจเปลี่ยนรูปแบบข้อมูลในคิว (เช่นเพิ่ม field ใน payload) โค้ดใหม่อ่านของเก่าไม่ได้
 * ส่งให้หมดด้วยโค้ดเวอร์ชันที่สร้างคิวนั้นก่อน แล้วค่อยอัปเดต
```

ก่อน `if (!offlineReady && !needRefresh) return null;` (hook ต้องอยู่ก่อน return):

```tsx
  const { user } = useAuth();
  const { totalOrderCount } = useOutbox(user?.tenantSlug);
  const hasQueue = totalOrderCount > 0;
```

ข้อความ:

```tsx
          {needRefresh
            ? hasQueue
              ? `ยังมีออเดอร์ค้างส่ง ${totalOrderCount} บิล · อัปเดตได้เมื่อส่งครบแล้ว`
              : 'กดอัปเดตตอนที่ไม่มีออเดอร์ค้างในหน้าจอ หน้าเว็บจะโหลดใหม่'
            : 'เปิดแอปได้แม้อินเทอร์เน็ตหลุด'}
```

ปุ่ม:

```tsx
            {hasQueue ? (
              // มีของค้าง: แทนที่ปุ่มอัปเดตด้วยทางไปดูรายการ
              <button
                type="button"
                onClick={openOutboxPanel}
                className="cursor-pointer rounded-xl bg-[#8C6D58] px-3 py-1.5 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
              >
                ดูรายการค้าง
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="cursor-pointer rounded-xl bg-[#8C6D58] px-3 py-1.5 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
              >
                อัปเดตเลย
              </button>
            )}
```

**ข้อจำกัดที่ต้องรู้**: กันได้แค่ปุ่มของเรา — ถ้าพนักงานปิดแท็บทั้งหมดแล้วเปิดใหม่ service worker ตัวใหม่จะทำงานเอง (`registerType: 'prompt'` รอแค่ตอนมีแท็บเปิดอยู่) · ยอมรับได้ในโปรเจกต์นี้ ถ้าจะกันจริงต้องใส่ `version` ในแถวคิวแล้วแปลงรูปแบบตอนอ่าน (future)

**ทดสอบ** (ต้องใช้ build ไม่ใช่ dev เพราะ `devOptions.enabled: false`):
1. `npm run build && npm run preview` → เปิดแอป
2. หยุด backend → หย่อน 1 บิล
3. แก้ข้อความอะไรก็ได้ในโค้ด → `npm run build` อีกรอบ (preview ยังรันอยู่) → รอ/รีโหลด 1 ครั้ง
4. กล่อง "มีเวอร์ชันใหม่ · ยังมีออเดอร์ค้างส่ง 1 บิล…" + ปุ่ม "ดูรายการค้าง" (ไม่มี "อัปเดตเลย")
5. เปิด backend รอส่งเสร็จ → ปุ่มกลับเป็น "อัปเดตเลย"

---

## 8. บล็อกปิดกะจากเครื่องนี้

**ทำไม**: backend ไม่รู้ว่าเครื่องนี้มีของค้าง (ยังไม่ได้ส่ง) → ปิดกะผ่าน
→ ภายหลังส่งขึ้นไป: กะใหม่เปิดแล้ว = ออเดอร์ไปเข้ากะใหม่ (ยอดกะเมื่อวานขาด) · ยังไม่เปิด = 409 ไม่มีกะเปิด → failed

นับ **ทุกผู้ใช้** ในเครื่อง (ต่างจาก logout) — ยอดกะเป็นของร้าน ไม่ใช่ของคน

**ข้อจำกัดที่ต้องเขียนใน scope**: กันได้แค่ **เครื่องนี้** · เครื่องอื่นปิดกะได้ปกติ ถ้าจะกันข้ามเครื่องต้องให้ backend ตรวจ `shiftId` (`SHIFT_MISMATCH` — ยังรอคุยกับเพื่อน)

**(ก)** `frontend/src/features/shifts/components/CloseShiftCard.tsx`

icon เพิ่ม `CloudUpload`:

```tsx
import { AlertTriangle, Banknote, Calculator, CloudUpload, Loader2 } from 'lucide-react';
```

props:

```tsx
interface CloseShiftCardProps {
  shift: Shift;
  isSubmitting: boolean;
  onSubmit: (actualClosingCash: number) => Promise<Shift | null>;
  /** [ใหม่] จำนวนบิลที่ค้างใน outbox ของเครื่องนี้ — มากกว่า 0 ห้ามปิดกะ */
  unsentBills?: number;
  /** [ใหม่] เปิดหน้าต่างรายการค้างส่ง */
  onShowUnsent?: () => void;
}

/** นับเงินแล้วปิดกะ — ยังไม่โชว์ยอดที่ควรมี (นับแบบไม่เห็นยอดตามขั้นตอนหน้าปิดกะ) */
export default function CloseShiftCard({
  shift,
  isSubmitting,
  onSubmit,
  unsentBills = 0,
  onShowUnsent,
}: CloseShiftCardProps) {
```

ต่อจาก `const isValid = ...`:

```tsx
  // [ใหม่] ปิดกะตอนมีของค้าง → ส่งทีหลังออเดอร์จะไปเข้ากะใหม่ (หรือได้ 409 ไม่มีกะเปิด) ยอดกะนี้จะขาด
  const isBlockedByOutbox = unsentBills > 0;
```

ใน `submit` (กันคนกด Enter ในช่องตัวเลข):

```tsx
    if (!isValid || isSubmitting || isBlockedByOutbox) return;
```

กล่องแจ้ง + disabled ปุ่มเริ่มนับ — แทนบรรทัด `{!isCounting ? (` ถึง `className={`${primaryButtonClass} mt-4`}`:

```tsx
      {/* [ใหม่] มีออเดอร์ค้างส่งในเครื่องนี้ */}
      {isBlockedByOutbox && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] px-3 py-2.5">
          <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-[#B42318]" aria-hidden="true" />
          <div className="flex-1 text-xs leading-relaxed text-[#B42318]">
            <p>
              เครื่องนี้ยังมีออเดอร์ที่ไม่ถึงเซิร์ฟเวอร์ {unsentBills} บิล — ส่งให้ครบหรือลบทิ้งก่อนจึงปิดกะได้
              ไม่อย่างนั้นยอดขายของกะนี้จะไม่ครบ
            </p>
            {onShowUnsent && (
              <button
                type="button"
                onClick={onShowUnsent}
                className="mt-1 cursor-pointer font-semibold underline underline-offset-2"
              >
                ดูรายการ
              </button>
            )}
          </div>
        </div>
      )}

      {!isCounting ? (
        <button
          type="button"
          onClick={() => setIsCounting(true)}
          disabled={isBlockedByOutbox}
          className={`${primaryButtonClass} mt-4`}
        >
```

ปุ่ม "ยืนยันปิดกะ":

```tsx
              disabled={!isValid || isSubmitting || isBlockedByOutbox}
```

**(ข)** `frontend/src/features/shifts/pages/ShiftPage.tsx`

```tsx
import { useOutbox } from '../../offline/hooks/useOutbox';
import { openOutboxPanel } from '../../offline/outboxPanel';
```

ต่อจาก `} = useShift();`:

```tsx
  // [ใหม่] ออเดอร์ค้างส่งในเครื่องนี้ (ทุกผู้ใช้ของร้าน) — ใช้บล็อกปุ่มปิดกะ
  const { totalOrderCount } = useOutbox(user?.tenantSlug);
```

ส่ง props:

```tsx
                  <CloseShiftCard
                    shift={shift}
                    isSubmitting={isSubmitting}
                    onSubmit={closeShift}
                    unsentBills={totalOrderCount}
                    onShowUnsent={openOutboxPanel}
                  />
```

props เป็น optional (`= 0`) → ถ้ามีที่อื่นใช้ `CloseShiftCard` อยู่ ไม่พัง

**ทดสอบ**
1. เปิดหน้าปิดกะครั้งหนึ่งตอนออนไลน์ (ให้มี snapshot กะ)
2. หยุด backend → หย่อน 1 บิล → หน้าปิดกะ → กล่องแดง "เครื่องนี้ยังมีออเดอร์ที่ไม่ถึงเซิร์ฟเวอร์ 1 บิล…" + "นับเงินและปิดกะ" กดไม่ได้
3. เปิด backend รอส่งเสร็จ → กล่องหาย ปุ่มกดได้

---

## 9. ทดสอบรวม (ผลจากเครื่องทดสอบ — mock API + Playwright, Chromium)

| # | สถานการณ์ | ผล |
|---|---|---|
| S0 | ออนไลน์ ไม่มีของค้าง | ไม่มีป้าย ✅ |
| S1 | ออฟไลน์ เปิดบิลโต๊ะ A5 2 จาน แล้วสั่งเพิ่ม 1 จาน | ป้าย "ติดต่อเซิร์ฟเวอร์ไม่ได้ · รอส่ง **1 บิล**" ✅ · snapshot A5 `available → occupied`, 3 รายการ, `savedAt` เท่าเดิม ✅ · รอบ 2 ไม่สร้างบิลซ้ำ ✅ |
| S2 | กด "ดูรายการ" | "โต๊ะ A5 · บิลใหม่ / กะเพราหมู ×3 / รอส่ง / สาเหตุ: ติดต่อเซิร์ฟเวอร์ไม่ได้ / [ลบ] [ส่งตอนนี้]" ✅ · Esc ปิด ✅ |
| S3 | เมนู Header | "มี 1 บิลยังไม่ส่งถึงครัว ออกจากระบบไม่ได้" + ปุ่ม disabled ✅ · ดูรายการเปิดหน้าต่าง ✅ · การ์ด A5 "3 รายการ ฿180.00" ✅ |
| S4 | หน้าปิดกะ | ปุ่ม "นับเงินและปิดกะ" disabled + กล่องแดง ✅ |
| S5 | เปิด backend | ส่งครบ ป้ายหาย ✅ · logout กดได้ ✅ |
| S6 | โต๊ะมีบิลบน server แล้ว (409) | ป้ายแดง "ส่งออเดอร์ไม่สำเร็จ 1 บิล" ✅ · กดลบขึ้นคำยืนยัน "กู้คืนไม่ได้" ✅ · ปลดโต๊ะแล้ว "ลองส่งอีกครั้ง" → ส่งผ่าน หน้าต่าง "ส่งครบแล้ว" ✅ |

`npx tsc -b` ✅ · `eslint` (offline, Header, shifts, auth/hooks) ✅ · `npm run build` ✅ (precache 20 ไฟล์)

UpdatePrompt (ขั้น 7) ทดสอบแค่ compile — ต้องทดสอบมือตามขั้นตอนในข้อ 7

**เจอระหว่างทดสอบ (ไม่เกี่ยวกับส่วนนี้)**: หน้าปิดกะตอนออฟไลน์ `StockAdjustmentCard` ขึ้น "Bad Gateway" — สต็อกไม่อยู่ใน scope offline · ถ้าจะให้เรียบร้อยให้แปลง error เป็น "ติดต่อเซิร์ฟเวอร์ไม่ได้"

---

## 10. Commit

```bash
git add -A frontend/src
git commit -m "feat(offline): outbox panel, unsent badge, block logout/update/close-shift while queue not empty"
```

---

## 11. ยังไม่ได้ทำ (ส่วนถัดไป)

1. **ต่อ outbox เข้า `MainPOS`** — ปุ่มส่งครัวจริงยังยิง API ตรง · ลบทางสำรอง localStorage (`MainPOS.tsx` ~บรรทัด 360) · ใช้ `open_order_id` จาก snapshot · **ต้องนัดเพื่อนก่อน** (เพื่อนแก้ไฟล์นี้บ่อย)
2. แถบ (ค) ในหน้า POS "บิลนี้มีแล้ว X รายการ" ตอนออฟไลน์
3. ทดสอบกับ backend จริง + สคริปต์เดโม
4. เอกสาร: scope 3.2.11, HANDOFF (บรรทัด 88, 290 ยังเขียนว่าไม่มี outbox), เหตุผลไม่ใช้ Workbox Background Sync
5. `SHIFT_MISMATCH` กับเพื่อน

---

## สรุป

- **สิ่งที่ถูกต้อง**: ทุกจออ่านจาก `useOutbox` ตัวเดียว ไม่มี state ซ้ำ · บล็อก 3 จุดเสี่ยงข้อมูลหาย (logout / อัปเดต / ปิดกะ) · แก้ snapshot โต๊ะใน transaction เดียวกับคิว กันบิลซ้ำ
- **สิ่งที่ควรปรับปรุง**: ป้ายนับของผู้ใช้อื่นด้วย ถ้าคนนั้นไม่กลับมา ป้าย "กำลังส่ง" จะค้าง — ทางออกคือลบผ่านหน้าต่าง (ควรจำกัดให้ manager/owner ลบของคนอื่นได้ — future)
- **ความเสี่ยง**: บล็อกปิดกะได้แค่เครื่องนี้ · snapshot โต๊ะที่แก้เองจะถูกทับเมื่อโหลดสด ถ้าโหลดสดก่อน flush เสร็จ (ออนไลน์แต่ของยังไม่ส่ง) โต๊ะจะกลับเป็น "ว่าง" ชั่วคราว — เกิดได้แค่ช่วงไม่กี่วินาที หรือกรณีของผู้ใช้อื่น
- **คำแนะนำ**: ทำตามลำดับ 1→8 build ทุกขั้น · เสร็จแล้วนัดเพื่อนเรื่อง MainPOS ทันที เพราะเป็นงานเดียวที่ทำให้ผู้ใช้จริงใช้ offline ได้
- **ระดับความมั่นใจ**: High สำหรับขั้น 1–6, 8 (ทดสอบอัตโนมัติผ่าน) · Medium สำหรับขั้น 7 (compile ผ่าน ยังไม่ได้ทดสอบ SW update จริง)
