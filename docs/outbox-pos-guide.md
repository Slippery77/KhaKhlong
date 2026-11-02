# Outbox ส่วนที่ 4 — ต่อเข้าหน้า POS จริง (`MainPOS`)

> ฐานโค้ด: `feat-benz` @ `a7685ca` (ส่วนที่ 3 commit แล้ว) · `MainPOS.tsx` ยังไม่ถูกเพื่อนแก้ใน `main`/`feat-aod` → ไม่ชน
> ทดสอบแล้วกับ **backend จริง + PostgreSQL** (ผลท้ายไฟล์)
> ตัดสินใจ: ส่งผ่าน outbox **เสมอ** (แบบ ก.) · ยังไม่บล็อกชำระเงิน · ยังไม่บล็อก void/comp

---

## 0. ต้องแก้ก่อน — ชื่อไฟล์ `OfflineBanner` ใน git ยังเป็นตัวเล็ก

commit `a7685ca` ใน git ยังเป็น `offlineBanner.tsx` แต่ `App.tsx` import `OfflineBanner`
Windows ไม่แยกตัวพิมพ์ → build ในเครื่องผ่าน · **Linux (Vercel/Render, CI) build พัง**:

```
error TS2307: Cannot find module './features/offline/components/OfflineBanner'
```

สาเหตุ: เปลี่ยนชื่อผ่าน Explorer/VS Code ไม่ใช่ `git mv` · Windows ต้องเปลี่ยน 2 จังหวะ (เปลี่ยนตัวพิมพ์อย่างเดียว git ไม่เห็น):

```bash
git mv frontend/src/features/offline/components/offlineBanner.tsx frontend/src/features/offline/components/tmpBanner.tsx
git mv frontend/src/features/offline/components/tmpBanner.tsx frontend/src/features/offline/components/OfflineBanner.tsx
git commit -m "fix(offline): rename offlineBanner.tsx to OfflineBanner.tsx for case-sensitive builds"
```

ตรวจ: `git ls-files frontend/src/features/offline/components` ต้องเห็น `OfflineBanner.tsx` (O ใหญ่)

---

## 1. ภาพรวม

### เดิม (`handleSendToKitchen`)

```
GET /tables (หา open_order_id) → POST /orders (ถ้าโต๊ะว่าง) → POST /orders/:id/items
เน็ตหลุดกลางทาง = "ส่งครัวไม่สำเร็จ" ของไม่ได้เก็บที่ไหน
ไม่มี tableId = ส่งเข้า localStorage (KDSContext) ซึ่งครัวจริงไม่เห็น
```

### ใหม่

```
1. หาเลขบิล: orderId ในหน้า → fetchWithSnapshot('tables') (server ก่อน ไม่ได้ใช้ผังในเครื่อง) → null = บิลใหม่
2. แปลงตะกร้า → 1 จาน = 1 รายการ
3. enqueueOrder() — บันทึกลง IndexedDB (ตั้งแต่ตรงนี้ของไม่หายแล้ว) → ล็อกตะกร้า (markAsSent)
4. flushOutbox() ทันที
   ส่งได้  → toast "ส่งออเดอร์เข้าครัวสำเร็จ!" · คิวบิลนี้ว่าง → โหลดรายการจริงจาก server
   ส่งไม่ได้ → toast "บันทึกออเดอร์แล้ว รอส่งครัว" · แถบ "X รายการของบิลนี้ยังไม่ถึงครัว"
```

**ทำไมออนไลน์ก็ผ่าน outbox (แบบ ก.)** — ทางเดียว = โค้ดเดียว ทดสอบชุดเดียว
และไม่มีปัญหา "ยิงไปแล้วเน็ตหลุดกลางทาง ไม่รู้ server ได้ไหม" เพราะ UUID สร้างครั้งเดียวตอนหย่อน ส่งซ้ำกี่รอบก็ `ON CONFLICT DO NOTHING`
แนวเดียวกับ local-first ของ Square POS / Toast / Loyverse (บันทึกในเครื่องก่อน ส่งตามหลัง) และ Transactional Outbox (microservices.io)

### สิ่งที่เพิ่มบนจอ

| สถานการณ์ | ที่แสดง |
|---|---|
| ส่งแล้วยังไม่ถึง server | แถบน้ำตาล "X รายการของบิลนี้ยังไม่ถึงครัว · บันทึกไว้ในเครื่องแล้ว ส่งให้อัตโนมัติ…" |
| ส่งแล้ว server ปฏิเสธ (4xx) | แถบแดง "ส่งครัวไม่สำเร็จ: {เหตุผลจาก server}" + "ดูรายการ" (เปิด OutboxPanel) |
| (ค) เข้าโต๊ะที่มีบิล ตอนออฟไลน์ | "บิลนี้มี X รายการ ยอด ฿Y (ข้อมูล ณ HH:MM น.) · ดูรายละเอียดได้เมื่อเชื่อมต่อ สั่งเพิ่มได้ตามปกติ" |
| กลับมาออนไลน์ / คิวบิลนี้ว่าง | แถบหาย · ตะกร้าโหลดรายการจริงจาก server (มี `order_item_id` → void/comp ได้) |

---

## 2. `outbox.ts` — เพิ่ม `hasUnsentOrder`

ต่อท้ายไฟล์ `frontend/src/features/offline/outbox.ts`:

```ts
/** บิลนี้ยังมีของค้างในเครื่องไหม (รอส่งหรือล้ม) — หน้า POS ใช้ตัดสินข้อความหลังกดส่งครัว */
export async function hasUnsentOrder(orderId: string): Promise<boolean> {
  const count = await db.outbox.where('orderId').equals(orderId).count();
  return count > 0;
}
```

ใช้ index `orderId` ที่ประกาศไว้ใน `db.ts` version(2) แล้ว — ไม่ต้องแก้ schema

---

## 3. `OfflineBillSummary.tsx` — แถบ (ค)

**ปัญหา**: เข้าโต๊ะที่มีบิลตอนออฟไลน์ → `useOrderCartHydration` เรียก `GET /orders/:id` ไม่ได้ (ไม่ได้แคช) → ตะกร้าว่าง → พนักงานคิดว่าบิลหาย
**แก้**: สรุปจาก snapshot ผังโต๊ะ (มี `item_count`, `total_amount` อยู่แล้ว) · ใช้ `useLiveQuery` → สั่งเพิ่มแล้วตัวเลขขยับทันที (enqueue แก้ snapshot ให้ — ส่วนที่ 3 ข้อ 5)

**ทำไมไม่แคช `GET /orders/:id` ทุกบิล**: ต้องแคชทีละบิล ข้อมูลเปลี่ยนตลอด (ครัวเปลี่ยนสถานะ, void, comp) แคชแล้วก็เก่าทันที · scope ออฟไลน์ = "สั่งเพิ่มได้" ไม่ใช่ "แก้บิลเก่าได้" · สรุปจำนวน + ยอดพอให้พนักงานมั่นใจ

ไฟล์ใหม่ `frontend/src/features/offline/components/OfflineBillSummary.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { WifiOff } from 'lucide-react';
import type { DiningTable } from '../../tables/types/table.types';
import { db } from '../db';

interface OfflineBillSummaryProps {
  tenantSlug: string;
  tableId: string;
}

const timeFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

/**
 * (ค) เข้าโต๊ะที่มีบิลเปิดอยู่ตอนออฟไลน์
 *
 * รายการเดิมในบิลต้องดึงจาก GET /orders/:id ซึ่งไม่ได้แคชไว้ → ตะกร้าว่าง
 * พนักงานจะงงว่า "บิลหายไหม" → แสดงสรุปจากผังโต๊ะในเครื่อง (จำนวนรายการ + ยอด) ให้รู้ว่ายังอยู่
 * สั่งเพิ่มได้ตามปกติ (หย่อนลง outbox เข้าบิลเดิม) · กลับมาออนไลน์ หน้า POS โหลดรายการจริงให้เอง
 */
export default function OfflineBillSummary({ tenantSlug, tableId }: OfflineBillSummaryProps) {
  // useLiveQuery: หย่อนรายการใหม่ (enqueue แก้ snapshot โต๊ะ) ตัวเลขตรงนี้ขยับตามทันที
  const snapshot = useLiveQuery(() => db.snapshots.get([tenantSlug, 'tables']), [tenantSlug]);
  const table = (snapshot?.data as DiningTable[] | undefined)?.find((t) => t.table_id === tableId);

  if (!snapshot || !table || table.item_count === 0) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-[#d9c6b0] bg-[#F3EDE4] px-4 py-2.5 text-sm text-[#2D241E]"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
      <span className="flex-1">
        บิลนี้มี <span className="font-semibold">{table.item_count} รายการ</span> ยอด{' '}
        <span className="font-semibold">
          ฿{Number(table.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>{' '}
        <span className="text-[#2D241E]/70">
          (ข้อมูล ณ {timeFormat.format(snapshot.savedAt)} น.) · ดูรายละเอียดได้เมื่อเชื่อมต่ออีกครั้ง สั่งเพิ่มได้ตามปกติ
        </span>
      </span>
    </div>
  );
}
```

---

## 4. `MainPOS.tsx`

แก้ 7 จุด ทำตามลำดับ · build ผ่านหลังจุด 5 (จุด 1–4 ยังมี import ไม่ได้ใช้ → eslint เตือนได้ ปกติ)

### 4.1 import

บรรทัด 2:

```tsx
import { useEffect, useRef, useState } from "react"
```

บรรทัด 11 (ไอคอนเพิ่ม 2 ตัว):

```tsx
import { ArrowLeft, Search, ChefHat, CheckCircle2, X, CloudUpload, AlertTriangle } from "lucide-react"
```

**ลบ** บรรทัด 12:

```tsx
import { useKDS } from "../../kds/context/KDSContext"
```

แทนบรรทัด `import CancelBillModal …` ด้วย:

```tsx
import CancelBillModal, { type BillActionPayload } from "../components/CancelBillModal"
import { enqueueOrder, hasUnsentOrder, type NewOrderItem } from "../../offline/outbox"
import { flushOutbox } from "../../offline/flush"
import { fetchWithSnapshot, readSnapshot } from "../../offline/snapshotCache"
import { useOutbox } from "../../offline/hooks/useOutbox"
import { useConnectionStatus } from "../../offline/hooks/useConnectionStatus"
import { openOutboxPanel } from "../../offline/outboxPanel"
import OfflineBillSummary from "../../offline/components/OfflineBillSummary"
import type { DiningTable } from "../../tables/types/table.types"
import type { Shift } from "../../shifts/types/shift.types"
```

### 4.2 ลบ `useKDS`

ใน `MainPOS()` **ลบ**:

```tsx
    const { sendOrderToKitchen } = useKDS()
```

ทางสำรอง localStorage ถูกตัดทิ้ง — ครัวจริงอ่านจาก `GET /kds/queue` (DB) ไม่ได้อ่าน localStorage · `KDSContext` ยังใช้ที่อื่นได้ตามเดิม ไม่ต้องแตะ

### 4.3 state toast — เพิ่ม `queued`

```tsx
    const [sentToast, setSentToast] = useState<{
        show: boolean
        tableName: string
        itemCount: number
        queued: boolean // [ใหม่] true = บันทึกในเครื่องแล้ว แต่ยังไม่ถึง server
    }>({
        show: false,
        tableName: "",
        itemCount: 0,
        queued: false,
    })
```

### 4.4 สถานะคิวของบิลนี้ + โหลดรายการจริงเมื่อคิวว่าง

วางต่อจาก `useOrderCartHydration({ … })` ก่อน `function handlePaymentSuccess`:

```tsx
    // ── [ใหม่] สถานะ outbox ของ "บิลนี้" ─────────────────────────────
    // useOutbox อ่าน IndexedDB แบบสด → ส่งสำเร็จ/ล้ม เมื่อไหร่ หน้านี้รู้ทันที (แม้ runner เป็นคนส่ง)
    const { status: connection } = useConnectionStatus()
    const { entries: outboxEntries } = useOutbox(user?.tenantSlug)
    const billQueue = orderId ? outboxEntries.filter((e) => e.orderId === orderId) : []
    const billQueuedItems = billQueue.reduce(
        (n, e) => n + (e.kind === 'addItems' ? e.payload.items.length : 0),
        0,
    )
    const billFailed = billQueue.find((e) => e.status === 'failed')

    // โหลดรายการจริงจาก server เมื่อ "บิลนี้ไม่มีของค้างแล้ว" และเพิ่งเกิดเหตุการณ์ใดเหตุการณ์หนึ่ง
    //   1. คิวของบิลนี้เพิ่งว่าง (ส่งครบ) → ได้ order_item_id/สถานะครัว ใช้ void/comp ได้
    //   2. เพิ่งกลับมาออนไลน์ → แทนที่ตะกร้าว่าง/ข้อมูลเก่าตอนเข้าโต๊ะแบบออฟไลน์
    // ข้ามถ้าตะกร้ามีรายการที่ยังไม่ได้กดส่งครัว — refresh จะเขียนทับจนรายการนั้นหาย
    // เก็บฟังก์ชันล่าสุดไว้ใน ref (แบบเดียวกับ useOrderCartHydration) — effect ด้านล่างจะได้ไม่ต้องใส่ใน deps
    const refreshRef = useRef(refreshCartFromServer)
    useEffect(() => {
        refreshRef.current = refreshCartFromServer
    })
    const lastSync = useRef({ queueSize: billQueue.length, connection })
    useEffect(() => {
        const prev = lastSync.current
        lastSync.current = { queueSize: billQueue.length, connection }
        if (!orderId || connection !== 'online' || billQueue.length > 0) return
        const drained = prev.queueSize > 0
        const reconnected = prev.connection !== 'online'
        if (!drained && !reconnected) return
        const hasDraft = cartMenu.some((item) => item.quantity > (item.sentQuantity ?? 0))
        if (hasDraft) return
        void refreshRef.current(orderId).catch(() => undefined)
    }, [billQueue.length, connection, orderId, cartMenu])
```

**อธิบาย**

- `billQueue` — แถวใน outbox ของบิลนี้ · `useOutbox` เป็น live query → runner ส่งสำเร็จเบื้องหลัง หน้านี้รู้เอง
- `lastSync` ref — จำค่ารอบก่อน เพื่อตรวจ "เพิ่ง" เปลี่ยน (ขอบขาขึ้น) ไม่ใช่ทุก render
  - `drained`: รอบก่อนมีของ ตอนนี้ว่าง = เพิ่งส่งครบ
  - `reconnected`: รอบก่อนไม่ online ตอนนี้ online
- `hasDraft` — ตะกร้ามีของที่ยังไม่กดส่ง → **ห้าม** refresh (`refreshCartFromServer` แทนตะกร้าทั้งก้อน รายการร่างจะหาย)
- `refreshRef` + `useEffect` ไม่มี deps — เก็บฟังก์ชันล่าสุด (ลอกแบบ `onHydrateRef` ใน `useOrderCartHydration`)
  ไม่เขียน `refreshRef.current = …` ตรง ๆ ใน body เพราะ eslint `react-hooks/refs` ห้ามแก้ ref ระหว่าง render

**ทำไมแทน `await refreshCartFromServer()` เดิมหลังส่ง**: เดิมส่งเสร็จในฟังก์ชันเดียว · ใหม่การส่งจริงอาจเกิดทีหลังมาก (runner ส่งตอนเน็ตกลับ ตอนนั้นฟังก์ชันจบไปนานแล้ว) → ต้องให้ "ข้อมูลเปลี่ยน" เป็นตัวสั่ง ไม่ใช่ "ฟังก์ชันจบ"

### 4.5 `handleSendToKitchen` — เขียนใหม่

แทนทั้งฟังก์ชัน (ตั้งแต่คอมเมนต์ `// เมื่อกดปุ่ม "ส่งครัว"` จนก่อน `// สรุปบิลฝั่ง server`):

```tsx
    // เมื่อกดปุ่ม "ส่งครัว" จาก OrderSidebar
    async function handleSendToKitchen() {
        if (isSending) return

        // ส่งเฉพาะจำนวนที่ยังไม่เคยส่งครัว — รายการที่ส่งแล้วยังคงอยู่ใน Sidebar
        const pendingEntries = cartMenu
            .map((item) => ({
                item,
                quantity: item.quantity - (item.sentQuantity ?? 0),
            }))
            .filter((entry) => entry.quantity > 0)

        const pendingCount = pendingEntries.reduce((sum, entry) => sum + entry.quantity, 0)
        if (pendingCount === 0) return

        // ทำเครื่องหมายว่าส่งแล้ว โดยไม่ลบรายการออกจาก Sidebar
        const markAsSent = () => {
            const sentNow = new Map(
                pendingEntries.map((entry) => [entry.item.cartItemId, entry.quantity]),
            )
            setcartMenu((prev) =>
                prev.map((item) => {
                    const quantity = sentNow.get(item.cartItemId)
                    if (!quantity) return item
                    return {
                        ...item,
                        sentQuantity: (item.sentQuantity ?? 0) + quantity,
                    }
                }),
            )
        }

        const showSentToast = (queued: boolean) => {
            setSentToast({ show: true, tableName: currentTable, itemCount: pendingCount, queued })
            setTimeout(() => setSentToast((prev) => ({ ...prev, show: false })), 4500)
        }

        // [ใหม่] ไม่มีโต๊ะ / ยังไม่รู้ว่าเป็นใคร → ส่งไม่ได้ (เดิมส่งเข้า localStorage ซึ่งครัวไม่เห็นจริง)
        const tenantSlug = user?.tenantSlug
        if (!tableIdFromUrl || !tenantSlug || !user?.sub) {
            setSendError('ไม่พบข้อมูลโต๊ะ กรุณากลับไปเลือกโต๊ะใหม่')
            return
        }

        setIsSending(true)
        setSendError(null)
        try {
            // ── 1. หาเลขบิลของโต๊ะนี้ ───────────────────────────────
            //   a. orderId ที่หน้านี้รู้อยู่แล้ว (มาจาก URL หรือเพิ่งหย่อนรอบก่อน)
            //   b. ถาม server ก่อน ติดต่อไม่ได้ใช้ผังโต๊ะในเครื่อง (enqueue อัปเดตให้แล้วถ้าเปิดบิลตอนออฟไลน์)
            //   c. ไม่เจอ = โต๊ะว่าง → ส่ง null ให้ enqueueOrder สร้างบิลใหม่
            let resolvedOrderId = orderId
            if (!resolvedOrderId) {
                const { data: tables } = await fetchWithSnapshot(tenantSlug, 'tables', async () => {
                    const res = await apiFetch<{ status: string; data: DiningTable[] }>('/tables', accessToken)
                    return res.data
                })
                resolvedOrderId = tables.find((t) => t.table_id === tableIdFromUrl)?.open_order_id ?? null
            }

            // ── 2. แปลงเฉพาะรายการที่ยังไม่ส่ง → 1 จาน = 1 รายการ ─────
            // ไม่ต้องสร้าง orderItemId เอง — enqueueOrder สร้าง UUID ให้ครั้งเดียว (ส่งซ้ำกี่รอบก็ id เดิม)
            const items: NewOrderItem[] = []
            for (const { item: cartItem, quantity } of pendingEntries) {
                const modifierIds = cartItem.selectedAddons?.map((a) => a.id) ?? []
                const specialRequest = [cartItem.selectedSpiciness, cartItem.note]
                    .filter(Boolean)
                    .join(", ") || undefined

                for (let i = 0; i < quantity; i++) {
                    items.push({
                        menuItemId: cartItem.id,
                        specialRequest,
                        modifierIds: modifierIds.length > 0 ? modifierIds : undefined,
                    })
                }
            }

            // ── 3. หย่อนลง outbox (บันทึกในเครื่องก่อนเสมอ ทั้งออนไลน์และออฟไลน์) ──
            const shift = await readSnapshot<Shift | null>(tenantSlug, 'currentShift')
            const { orderId: queuedOrderId } = await enqueueOrder({
                tenantSlug,
                userId: user.sub,
                shiftId: shift?.data?.shiftId ?? null,
                tableId: tableIdFromUrl,
                orderId: resolvedOrderId,
                items,
            })
            setOrderId(queuedOrderId)
            markAsSent() // ถึงตรงนี้ของไม่หายแล้ว (อยู่ใน IndexedDB) → ล็อกจำนวนในตะกร้า

            // ── 4. ส่งทันที ไม่รอรอบ 30 วินาที ─────────────────────────
            // ออฟไลน์ = คืน 'unreachable' เร็ว ๆ ของยังอยู่ในคิว runner ส่งให้เมื่อเน็ตกลับ
            // ส่งครบแล้ว effect "คิวของบิลนี้เพิ่งว่าง" ด้านบนจะโหลดรายการจริงจาก server เอง
            await flushOutbox()
            showSentToast(await hasUnsentOrder(queuedOrderId))
        } catch (err) {
            // มาถึงตรงนี้ = ยังไม่ได้หย่อนลงคิว (หาโต๊ะไม่ได้ / IndexedDB ใช้ไม่ได้) → ตะกร้ายังไม่ถูกล็อก กดใหม่ได้
            setSendError(err instanceof ApiError ? err.message : 'ส่งครัวไม่สำเร็จ ไม่พบข้อมูลโต๊ะในเครื่อง ลองเชื่อมต่อแล้วกดใหม่')
        } finally {
            setIsSending(false)
        }
    }
```

**ต่างจากเดิม**

| จุด | เดิม | ใหม่ |
|---|---|---|
| ไม่มี tableId | ส่ง localStorage + บอกว่าสำเร็จ (โกหก) | error "ไม่พบข้อมูลโต๊ะ" |
| หาเลขบิล | `GET /tables` ตรง — ออฟไลน์ล้ม | `fetchWithSnapshot('tables')` — ออฟไลน์ใช้ผังในเครื่อง |
| สร้างบิล | `POST /orders` ทันที | `enqueueOrder({ orderId: null })` สร้าง UUID + แถว createOrder |
| `orderItemId` | สร้างเองในลูป | `enqueueOrder` สร้าง (ที่เดียว ครั้งเดียว) |
| `markAsSent` | หลัง server ตอบ | หลังลง IndexedDB (ของปลอดภัยแล้ว) |
| error | ทุกกรณี | เฉพาะยังไม่ได้ลงคิว — หลังลงคิวแล้ว error ไปโผล่ที่แถบสถานะบิล/OutboxPanel แทน |
| `shiftId` | ไม่มี | จาก snapshot `currentShift` (เก็บไว้รอ `SHIFT_MISMATCH`) |

### 4.6 แถบสถานะบิล + (ค)

วางเหนือ grid เมนู — หา `<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto p-6 flex-1 content-start">` แล้ววางก่อนบรรทัดนั้น:

```tsx
                    {/* [ใหม่] สถานะออฟไลน์ของบิลนี้ */}
                    {(billQueue.length > 0 || (connection !== 'online' && orderId)) && (
                        <div className="space-y-2 px-6 pt-4 font-kanit">
                            {/* (ค) เข้าโต๊ะที่มีบิลตอนออฟไลน์ — ดึงรายการเดิมไม่ได้ สรุปจากผังโต๊ะในเครื่องแทน */}
                            {connection !== 'online' && orderId && tableIdFromUrl && user?.tenantSlug &&
                                !cartMenu.some((item) => (item.orderItemIds?.length ?? 0) > 0) && (
                                    <OfflineBillSummary tenantSlug={user.tenantSlug} tableId={tableIdFromUrl} />
                                )}
                            {billFailed ? (
                                <div role="alert" className="flex items-center gap-2 rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318]">
                                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span className="flex-1">ส่งครัวไม่สำเร็จ: {billFailed.lastError}</span>
                                    <button type="button" onClick={openOutboxPanel} className="cursor-pointer font-semibold underline underline-offset-2">
                                        ดูรายการ
                                    </button>
                                </div>
                            ) : billQueue.length > 0 ? (
                                <div role="status" className="flex items-center gap-2 rounded-xl border border-[#d9c6b0] bg-[#F3EDE4] px-4 py-2.5 text-sm text-[#2D241E]">
                                    <CloudUpload className="h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
                                    <span className="flex-1">
                                        {billQueuedItems} รายการของบิลนี้ยังไม่ถึงครัว · บันทึกไว้ในเครื่องแล้ว ส่งให้อัตโนมัติเมื่อเชื่อมต่อได้
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    )}
```

เงื่อนไข (ค): ไม่ online + มีบิล + ตะกร้า **ไม่มี** รายการที่มี `orderItemIds` (= hydrate ไม่สำเร็จ) · hydrate สำเร็จแล้วไม่ต้องแสดง เพราะเห็นรายการจริงอยู่แล้ว

### 4.7 ข้อความ toast

แทน 2 `<span>` ในกล่อง toast "ส่งออเดอร์เข้าครัวสำเร็จ!":

```tsx
                            <span className="text-sm font-semibold">
                                {sentToast.queued ? 'บันทึกออเดอร์แล้ว รอส่งครัว' : 'ส่งออเดอร์เข้าครัวสำเร็จ!'}
                            </span>
                            <span className="text-xs text-stone-300">
                                {sentToast.queued
                                    ? `${sentToast.tableName} (${sentToast.itemCount} รายการใหม่) ยังติดต่อเซิร์ฟเวอร์ไม่ได้ จะส่งเข้าครัวให้อัตโนมัติ`
                                    : `${sentToast.tableName} (${sentToast.itemCount} รายการใหม่) สร้างสถานะ 'รอทำ' ใน KDS แล้ว`}
                            </span>
                        </div>
```

---

## 5. ทดสอบ (ใช้ `npm run dev` + backend จริง)

เตรียม: เปิดกะ · โต๊ะว่าง ≥ 2 · **เข้าหน้า POS ตอนออนไลน์ 1 ครั้ง** (ให้มีเมนูในเครื่อง — ข้อจำกัดที่ตกลงกันไว้)
ดู DB: `SELECT t.table_number, count(oi.*) FROM orders o JOIN dining_tables t USING (table_id) LEFT JOIN order_items oi USING (order_id) WHERE o.closed_at IS NULL GROUP BY 1;`

| # | ขั้นตอน | ต้องเห็น |
|---|---|---|
| M1 | ออนไลน์ โต๊ะ 1 สั่ง 2 จาน → ส่งครัว | toast "ส่งออเดอร์เข้าครัวสำเร็จ!" · KDS มี 2 จาน · DB โต๊ะ 1 = 2 · ปุ่ม void ใช้ได้ (มี `order_item_id`) |
| M2 | โต๊ะ 3 (ว่าง) → Network Offline → สั่ง 1 → ส่งครัว | toast "บันทึกออเดอร์แล้ว รอส่งครัว" · แถบ "1 รายการของบิลนี้ยังไม่ถึงครัว" · ป้ายล่าง "รอส่ง 1 บิล" |
| M2b | สั่งเพิ่ม 1 → ส่งครัว | แถบ "2 รายการ…" · outbox มี `createOrder` **ใบเดียว** + `addItems` 2 แถว |
| M2c | กลับหน้าโต๊ะ (ยังออฟไลน์) | โต๊ะ 3 "มีลูกค้า 2 รายการ ฿…" |
| M3 | (ยังออฟไลน์) กดโต๊ะ 1 ที่มีบิลจาก M1 | ตะกร้าว่าง + แถบ (ค) "บิลนี้มี 2 รายการ ยอด ฿… (ข้อมูล ณ …)" |
| M3b | สั่ง 1 → ส่งครัว | แถบ (ค) ตัวเลขเป็น 3 · แถบ "1 รายการของบิลนี้ยังไม่ถึงครัว" |
| M4 | Network กลับ Online · ไม่กดอะไร · รอ ≤ 15 วิ | แถบทั้งหมดหาย · ตะกร้าโต๊ะ 1 โหลดรายการจริง 3 จาน · DB โต๊ะ 1 = 3, โต๊ะ 3 = 2 · outbox ว่าง |
| M5 | ออฟไลน์ สั่งของลงตะกร้าแต่ **ไม่กด** ส่งครัว → กลับออนไลน์ | ตะกร้าไม่ถูกล้าง (ป้องกัน `hasDraft`) |
| M6 | ปิด backend แทน Offline แล้วทำ M2 | เหมือน M2 แต่ป้าย "ติดต่อเซิร์ฟเวอร์ไม่ได้" |

### ผลจากเครื่องทดสอบ (backend จริง + PostgreSQL 16 + Playwright)

| # | ผล |
|---|---|
| M1 | toast สำเร็จ · outbox ว่าง · DB `1:2` · badge "ส่งครัวแล้ว 2" ✅ |
| M2 | toast "บันทึกออเดอร์แล้ว รอส่งครัว" · outbox `createOrder:pending, addItems:pending` · แถบ "1 รายการ…" ✅ |
| M2b | outbox `createOrder` 1 + `addItems` 2 · แถบ "2 รายการ…" ✅ |
| M2c | โต๊ะ 3 "มีลูกค้า … 2 รายการ" ✅ |
| M3 | แถบ (ค) "บิลนี้มี 2 รายการ ยอด ฿170.00 (ข้อมูล ณ 11:24 น.)" ✅ |
| M3b | ระหว่างออฟไลน์ DB ยังเป็น `1:2` (ยังไม่ส่ง — ถูก) ✅ |
| M4 | outbox ว่าง · DB `1:3 3:2` · แถบหาย · ตะกร้าโต๊ะ 1 "ส่งครัวแล้ว 2 / ส่งครัวแล้ว 1" (โหลดจาก server) ✅ |

M5, M6 ยังไม่ได้ทดสอบอัตโนมัติ — ทดสอบมือ

`tsc -b` ✅ · `eslint` (MainPOS, offline) ✅ · `npm run build` ✅

---

## 6. Commit

```bash
git add frontend/src/features/offline/outbox.ts frontend/src/features/offline/components/OfflineBillSummary.tsx frontend/src/features/mainpos/pages/MainPOS.tsx
git commit -m "feat(pos): send to kitchen through offline outbox, show per-bill queue status and offline bill summary"
```

---

## 7. ข้อจำกัด (เขียนลง scope)

| ข้อจำกัด | ผลกระทบ | ทางแก้ในอนาคต |
|---|---|---|
| ต้องเข้าหน้า POS ตอนออนไลน์ 1 ครั้งหลัง login | ไม่งั้นออฟไลน์ไม่มีเมนู | warmup (`menu-warmup-guide.md`) |
| ชำระเงินบิลที่ยังมีของค้าง ไม่ถูกบล็อก (ตัดสินใจข้อ 3) | ออฟไลน์กดชำระ → server ไม่รู้จักบิล/ยอดขาด · ออนไลน์ยอดอาจขาดรายการที่ค้าง | ปิด `canPay` เมื่อ `billQueue.length > 0` (1 บรรทัด) |
| void/comp รายการที่ยังไม่ถึง server (ตัดสินใจข้อ 4) | ปุ่มไม่ทำงาน/ล้ม เพราะยังไม่มี `order_item_id` | ลบผ่าน OutboxPanel |
| ดูรายละเอียดบิลเก่าตอนออฟไลน์ไม่ได้ | เห็นแค่จำนวน + ยอดรวม | แคช `GET /orders/:id` (ไม่แนะนำ — ข้อมูลเปลี่ยนเร็ว) |
| เครื่องอื่นเปิดบิลโต๊ะเดียวกันระหว่างเครื่องนี้ออฟไลน์ | บิลเครื่องนี้ได้ 409 → แถบแดง → ต้องลบแล้วสั่งใหม่ในบิลของอีกเครื่อง | backend merge เข้าบิลที่เปิดอยู่ (เกิน scope) |

---

## สรุป

- **สิ่งที่ถูกต้อง**: หน้า POS ใช้ outbox ทางเดียวทั้งออนไลน์/ออฟไลน์ · ทดสอบกับ backend จริงครบ M1–M4 · ตัดทาง localStorage ที่ครัวไม่เห็นทิ้ง
- **สิ่งที่ควรปรับปรุง**: แก้ชื่อไฟล์ `OfflineBanner` ใน git (ข้อ 0) ก่อนทุกอย่าง · บล็อกชำระเงินบิลที่ค้างเป็น 1 บรรทัด ควรทำก่อนเดโม (ถ้ากรรมการกดชำระตอนออฟไลน์จะเห็น error)
- **ความเสี่ยง**: ข้อ 0 ทำ build บน Linux พัง (deploy ไม่ได้) · ข้อจำกัดตารางข้อ 7 ต้องอธิบายได้ตอนเดโม
- **คำแนะนำ**: ทำข้อ 0 → 2 → 3 → 4 · รัน M1–M5 · เสร็จแล้วเหลือแค่ทดสอบรวม + เอกสาร
- **ระดับความมั่นใจ**: High (ทดสอบกับ backend จริง)
