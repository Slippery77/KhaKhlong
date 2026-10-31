# คู่มือเขียน OfflineBanner (ป้ายสถานะการเชื่อมต่อ)

> เป้าหมาย: ป้ายลอย **กลางจอด้านล่าง** บอกทุกหน้าว่าตอนนี้ติดต่อ server ได้หรือไม่
> ไฟล์ที่ต้องเขียน: **ใหม่ 3 ไฟล์ · แก้ 3 ไฟล์** — ไม่แตะ `appClient.ts`, `MainPOS.tsx` หรือไฟล์ของเพื่อน
> โค้ดทั้งหมดผ่าน `tsc -b`, `eslint`, `vite build` และทดสอบบน Chromium 8 สถานการณ์แล้ว (ผลอยู่หัวข้อ 6)

---

## สารบัญ

1. [แนวคิด](#1-แนวคิด)
2. [ภาพรวมไฟล์](#2-ภาพรวมไฟล์)
3. [เขียนไฟล์ใหม่ 3 ไฟล์](#3-เขียนไฟล์ใหม่-3-ไฟล์)
4. [แก้ไฟล์เดิม 3 ไฟล์](#4-แก้ไฟล์เดิม-3-ไฟล์)
5. [ลำดับเหตุการณ์จริง](#5-ลำดับเหตุการณ์จริง)
6. [ทดสอบ](#6-ทดสอบ)
7. [ข้อจำกัด + คำถามกรรมการ](#7-ข้อจำกัด--คำถามกรรมการ)

---

## 1. แนวคิด

### 1.1 ป้ายนี้ต่างจาก `StaleDataBanner` ยังไง

| | `StaleDataBanner` (มีแล้ว) | `OfflineBanner` (ทำรอบนี้) |
|---|---|---|
| ตอบคำถาม | "ข้อมูล**บนหน้านี้**เก่าแค่ไหน" | "**ตอนนี้**ต่อ server ได้ไหม" |
| อยู่ที่ | ในหน้าโต๊ะ | ทุกหน้า (วางใน `App.tsx`) |
| ใช้ต่อในขั้น outbox | — | แสดง "รอส่ง X รายการ" ตรงนี้ |

### 1.2 สถานะ 3 แบบ

| สถานะ | ความหมาย | ตัวอย่าง |
|---|---|---|
| `online` | ติดต่อ server ได้ | ปกติ — **ไม่แสดงป้าย** |
| `offline` | เครื่องไม่มีเน็ตเลย | ถอดสาย LAN, ปิด Wi-Fi |
| `unreachable` | เครื่องมีเน็ต แต่ server ไม่ตอบ | backend ล่ม, Render กำลังตื่น, Wi-Fi ต่อแต่เน็ตไม่ออก |

ทำไมแยก `offline` กับ `unreachable`: บอกพนักงานได้ว่าต้องแก้ที่ไหน — `offline` = เช็คเน็ตร้าน, `unreachable` = เน็ตปกติ ปัญหาอยู่ที่ระบบ

### 1.3 จะรู้ได้ยังไงว่าออฟไลน์ — ใช้ 3 แหล่งรวมกัน

| แหล่ง | รู้อะไร | ข้อจำกัด |
|---|---|---|
| ① event `offline` / `online` ของ browser | การ์ดเน็ตหลุด/กลับมา — รู้ทันที | **Wi-Fi ต่ออยู่แต่ backend ล่ม → browser ยังบอก online** |
| ② ผลของ `fetchWithSnapshot` | request จริงไปถึง server หรือไม่ | รู้เฉพาะตอนมีการโหลดข้อมูล |
| ③ ping `GET /api` ทุก 15 วินาที | server กลับมาหรือยัง | ยิงเฉพาะตอนมีปัญหา |

```
① ใช้จับ "เน็ตหลุด" ได้เร็วที่สุด
② ใช้จับ "backend ล่ม" ที่ ① มองไม่เห็น
③ ใช้รู้ว่า "กลับมาแล้ว" โดยไม่ต้องรอให้ผู้ใช้กดอะไร
```

**ตัวอย่างที่ ① อย่างเดียวพลาด**: ร้านต่อ Wi-Fi เราเตอร์ แต่สายเน็ตของเราเตอร์หลุด → `navigator.onLine === true` เพราะเครื่องยังต่อเราเตอร์อยู่ แต่ไปถึง server ไม่ได้

### 1.4 ping อะไร

`GET /api` → `AppController.getHello()` มี `@Public()` อยู่แล้ว (ไม่ต้อง login) ตอบ `"Hello POS!"`
- ใช้ `fetch` ตรง **ไม่ใช้ `apiFetch`** เพราะ endpoint นี้ตอบเป็น text (`apiFetch` เรียก `res.json()` จะพัง) และไม่ต้องให้ระบบ refresh token ทำงาน
- Throttler ของ backend = 100 ครั้ง/นาที/IP → ping 4 ครั้ง/นาทีเฉพาะตอนมีปัญหา ไม่ชนลิมิต

### 1.5 เก็บสถานะไว้ที่ไหน — "external store"

สถานะนี้ต้อง (ก) อ่านได้ทุก component (ข) อัปเดตได้จากโค้ดที่ไม่ใช่ component (`fetchWithSnapshot`, event ของ window)

| วิธี | ข้อเสีย |
|---|---|
| `useState` ใน component | โค้ดนอก React (`snapshotCache.ts`) เรียก setState ไม่ได้ |
| React Context | ต้องสร้าง Provider ใหม่ครอบแอป + โค้ดนอก React ก็ยังเข้าไม่ถึง |
| **ตัวแปรในโมดูล + `useSyncExternalStore`** | ✅ โค้ดไหนก็เรียก `reportUnreachable()` ได้ · component อ่านผ่าน hook มาตรฐานของ React 18+ |

`useSyncExternalStore` คือ hook ที่ React ทำมาเพื่องานนี้โดยเฉพาะ — อ่านค่าจากที่เก็บนอก React และ re-render เมื่อค่าเปลี่ยน (Redux, Zustand ข้างในก็ใช้ hook ตัวนี้)

```
                    ┌──────────────────────────┐
 event offline ───► │                          │
 fetchWithSnapshot ►│  connectionStatus.ts     │──แจ้ง──► useConnectionStatus() ──► OfflineBanner
 ping ทุก 15 วิ ───► │  state = { status, ... } │
                    └──────────────────────────┘
```

---

## 2. ภาพรวมไฟล์

```
frontend/src/
  features/offline/
    connectionStatus.ts            ใหม่  ที่เก็บสถานะ + ping + ตัวเฝ้าดู
    useConnectionStatus.ts         ใหม่  hook ให้ component อ่านสถานะ
    components/OfflineBanner.tsx   ใหม่  ป้ายที่แสดงผล
    snapshotCache.ts               แก้   รายงานผลการเชื่อมต่อ (+import, +3 บรรทัด)
  App.tsx                          แก้   วาง <OfflineBanner />
  main.tsx                         แก้   เรียก startConnectionMonitor()
```

ลำดับที่แนะนำให้เขียน: `connectionStatus.ts` → `useConnectionStatus.ts` → `OfflineBanner.tsx` → แก้ 3 ไฟล์ → ทดสอบ

---

## 3. เขียนไฟล์ใหม่ 3 ไฟล์

### 3.1 `features/offline/connectionStatus.ts`

แบ่งเป็น 4 ส่วน: (ก) ชนิดข้อมูล (ข) state + ผู้ติดตาม (ค) ช่องรายงานผล (ง) ping + ตัวเฝ้าดู

```ts
// ===================== (ก) ชนิดข้อมูล =====================

export type ConnectionStatus = 'online' | 'offline' | 'unreachable';
// union type — พิมพ์ 'onlin' ผิด TypeScript แดงทันที

export interface ConnectionState {
  status: ConnectionStatus;
  justReconnected: boolean;
  // true ช่วง 3 วินาทีหลังกลับมา — ให้ป้ายแสดง "เชื่อมต่อแล้ว" แล้วหายเอง
  // เก็บไว้ใน store (ไม่ใช่ใน component) เพราะ ESLint ของโปรเจกต์ห้าม setState ใน useEffect
}

const PING_INTERVAL_MS = 15_000;     // 15_000 = 15000 (ขีดล่างช่วยอ่านตัวเลข TypeScript ยอมรับ)
const PING_TIMEOUT_MS = 5_000;       // server ไม่ตอบใน 5 วิ = ถือว่าติดต่อไม่ได้
const RECONNECTED_SHOW_MS = 3_000;   // แสดง "เชื่อมต่อแล้ว" 3 วิ

// ===================== (ข) state + ผู้ติดตาม =====================

let state: ConnectionState = {
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  // ค่าเริ่มต้น: ถ้าเปิดแอปตอนไม่มีเน็ต เริ่มที่ 'offline' เลย
  // typeof navigator !== 'undefined' = กันพังถ้ารันนอก browser (เช่นเทสต์บน Node)
  justReconnected: false,
};

const listeners = new Set<() => void>();
// รายชื่อ "ผู้ติดตาม" — ทุกครั้งที่ state เปลี่ยน เรียกทุกฟังก์ชันในนี้
// React (ผ่าน useSyncExternalStore) จะใส่ฟังก์ชันของตัวเองเข้ามา
// ใช้ Set แทน Array: ลบง่าย และกันใส่ซ้ำ

let reconnectedTimer: ReturnType<typeof setTimeout> | null = null;
// เก็บ id ของตัวตั้งเวลาซ่อน "เชื่อมต่อแล้ว" ไว้ยกเลิกได้
// ReturnType<typeof setTimeout> = ชนิดที่ setTimeout คืน (บน browser เป็น number)

function setState(next: ConnectionState) {
  if (next.status === state.status && next.justReconnected === state.justReconnected) return;
  // ค่าไม่เปลี่ยน → ไม่ต้องแจ้งใคร (กัน re-render ทั้งแอปทุกครั้งที่โหลดข้อมูลสำเร็จ)
  state = next;
  // ⚠ ต้องเป็น object ใหม่ ห้ามแก้ state.status = ... ตรง ๆ
  //   React เทียบด้วย === ถ้าเป็น object เดิม React จะคิดว่าไม่มีอะไรเปลี่ยน
  listeners.forEach((listener) => listener());   // แจ้งผู้ติดตามทุกคน
}

function setStatus(status: ConnectionStatus) {
  const wasDown = state.status !== 'online';           // ก่อนหน้านี้มีปัญหาอยู่ไหม
  const cameBack = wasDown && status === 'online';     // เพิ่งกลับมาออนไลน์ใช่ไหม

  if (cameBack) {
    if (reconnectedTimer) clearTimeout(reconnectedTimer);   // ยกเลิกตัวตั้งเวลาเก่า (ถ้ามี)
    reconnectedTimer = setTimeout(() => {
      reconnectedTimer = null;
      setState({ ...state, justReconnected: false });     // ครบ 3 วิ → ซ่อน "เชื่อมต่อแล้ว"
    }, RECONNECTED_SHOW_MS);
  }

  setState({
    status,
    justReconnected: cameBack ? true : status === 'online' ? state.justReconnected : false,
    // เพิ่งกลับมา                 → true
    // ออนไลน์อยู่แล้ว              → คงค่าเดิม (ไม่ตัดช่วง 3 วิทิ้งกลางคัน)
    // หลุดอีกรอบ (offline/unreach) → false
  });
}

export function subscribeConnection(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
  // คืนฟังก์ชันยกเลิก — React เรียกตอน component ถูกถอดออก
}

export function getConnectionState(): ConnectionState {
  return state;
  // ⚠ ต้องคืน object เดิมถ้าไม่มีอะไรเปลี่ยน
  //   ถ้าเขียน return { ...state } React จะเห็น object ใหม่ทุกครั้ง → render วนไม่จบ
}

// ===================== (ค) ช่องรายงานผล =====================

export function reportReachable(): void {
  setStatus('online');
  // เรียกเมื่อ request ไปถึง server — แม้ได้ 401/403/404 ก็นับว่า "ติดต่อได้"
}

export function reportUnreachable(): void {
  setStatus(navigator.onLine ? 'unreachable' : 'offline');
  // เครื่องไม่มีเน็ตอยู่แล้ว → บอก 'offline' (ตรงสาเหตุกว่า 'unreachable')
}

// ===================== (ง) ping + ตัวเฝ้าดู =====================

export async function pingServer(): Promise<boolean> {
  if (!navigator.onLine) {
    setStatus('offline');      // ไม่มีเน็ต ยิงไปก็ไม่ถึง
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  // fetch ไม่มี timeout ในตัว — ใช้ AbortController สั่งยกเลิกเองหลัง 5 วิ
  // (เน็ตแย่ ๆ fetch อาจค้างเป็นนาที)

  try {
    const res = await fetch('/api', { cache: 'no-store', signal: controller.signal });
    // cache: 'no-store' = ห้าม browser/service worker ตอบจาก cache ต้องถึง server จริง
    // signal = ผูกกับ controller ด้านบน → abort() แล้ว fetch จะโยน error
    if (res.ok) {
      setStatus('online');
      return true;
    }
    setStatus('unreachable');  // ได้ 5xx = proxy ต่อ backend ไม่ได้
    return false;
  } catch {
    setStatus(navigator.onLine ? 'unreachable' : 'offline');   // fetch ล้ม หรือ timeout
    return false;
  } finally {
    clearTimeout(timer);       // สำเร็จก่อน 5 วิ → ยกเลิกตัวตั้งเวลา
  }
}

export function startConnectionMonitor(): () => void {
  const handleOffline = () => setStatus('offline');
  // browser แจ้งว่าการ์ดเน็ตหลุด → เชื่อได้เลย

  const handleOnline = () => { void pingServer(); };
  // browser แจ้งว่าการ์ดเน็ตกลับมา → ยังไม่เชื่อ ต้อง ping ยืนยันว่าถึง server จริง
  // void = ตั้งใจไม่รอผล (event handler ไม่ต้อง async)

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  const interval = setInterval(() => {
    if (state.status !== 'online') void pingServer();
    // ping เฉพาะตอนมีปัญหา — ออนไลน์ปกติไม่ยิงเพิ่ม
  }, PING_INTERVAL_MS);

  return () => {
    // ฟังก์ชันหยุดเฝ้า — ตอนนี้ยังไม่มีใครเรียก เผื่อใช้ในเทสต์
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}
```

> **คอมเมนต์ในไฟล์จริง**: เขียนสั้นกว่านี้ได้ — ที่ยาวในคู่มือเพื่ออธิบาย ไม่จำเป็นต้องคัดลอกคอมเมนต์ทุกบรรทัด

---

### 3.2 `features/offline/useConnectionStatus.ts`

```ts
import { useSyncExternalStore } from 'react';
import { getConnectionState, subscribeConnection, type ConnectionState } from './connectionStatus';

export function useConnectionStatus(): ConnectionState {
  return useSyncExternalStore(subscribeConnection, getConnectionState);
  // argument 1 = subscribe: React เรียกครั้งเดียวเพื่อสมัครรับแจ้งเตือน
  // argument 2 = getSnapshot: React เรียกทุก render เพื่ออ่านค่าปัจจุบัน
  // ค่าเปลี่ยน → listener ถูกเรียก → React เรียก getSnapshot → ได้ object ใหม่ → re-render
}
```

ทำไมแยกเป็นไฟล์ hook ต่างหาก: component ไม่ต้องรู้ว่าข้างในเป็น external store — วันหนึ่งเปลี่ยนไปใช้ Context หรือ Zustand ก็แก้แค่ไฟล์นี้

---

### 3.3 `features/offline/components/OfflineBanner.tsx`

```tsx
import { useState } from 'react';
import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { pingServer } from '../connectionStatus';
import { useConnectionStatus } from '../useConnectionStatus';

export default function OfflineBanner() {
  const { status, justReconnected } = useConnectionStatus();
  const [isChecking, setIsChecking] = useState(false);
  // สถานะปุ่ม "ลองใหม่" — เป็น state ของป้ายนี้เท่านั้น ไม่ต้องอยู่ใน store

  if (status === 'online' && !justReconnected) return null;
  // ออนไลน์ปกติ → ไม่แสดงอะไรเลย (ไม่กินพื้นที่จอ)

  const retry = async () => {
    setIsChecking(true);        // ปุ่มหมุน + กดซ้ำไม่ได้
    await pingServer();          // ผลจะไปอัปเดต store เอง → ป้ายเปลี่ยนเอง
    setIsChecking(false);
  };

  const view =
    status === 'offline'
      ? {
          Icon: WifiOff,
          title: 'ออฟไลน์',
          detail: 'ไม่มีอินเทอร์เน็ต · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
          tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',   // สีครีมของแบรนด์
          canRetry: false,   // ไม่มีเน็ต กดไปก็ไม่ถึง — รอ event 'online' แทน
        }
      : status === 'unreachable'
        ? {
            Icon: CloudOff,
            title: 'ติดต่อเซิร์ฟเวอร์ไม่ได้',
            detail: 'กำลังลองใหม่อัตโนมัติ · ใช้ข้อมูลที่บันทึกไว้ในเครื่อง',
            tone: 'border-[#d9c6b0] bg-[#F3EDE4] text-[#2D241E]',
            canRetry: true,  // เน็ตมี อาจลองก่อนรอบ 15 วิได้
          }
        : {
            // มาถึงตรงนี้ = status 'online' + justReconnected true
            Icon: Wifi,
            title: 'เชื่อมต่อแล้ว',
            detail: 'กดรีเฟรชในหน้านั้นเพื่อดูข้อมูลล่าสุด',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',   // สีเขียว = ข่าวดี
            canRetry: false,
          };
  // เขียนเป็น object เดียวแทน if-else ใน JSX หลายจุด → JSX ด้านล่างอ่านง่าย

  const { Icon } = view;
  // ต้องดึงออกมาเป็นตัวแปรชื่อขึ้นต้นตัวใหญ่ก่อน
  // JSX ถือว่า <icon /> ตัวเล็ก = แท็ก HTML · <Icon /> ตัวใหญ่ = component

  return (
    <div
      role="status"
      aria-live="polite"
      // screen reader อ่านข้อความเมื่อป้ายเปลี่ยน
      className={`fixed bottom-4 left-1/2 z-[1000] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-start gap-2.5 rounded-2xl border px-3.5 py-2.5 font-kanit shadow-md transition-colors duration-200 ${view.tone}`}
      // fixed bottom-4               ลอยห่างขอบล่าง 16px ไม่ดันเนื้อหาหน้า
      // left-1/2 + -translate-x-1/2  จัดกึ่งกลางแนวนอน (ขอบซ้ายอยู่กลางจอ แล้วเลื่อนกลับครึ่งความกว้างตัวเอง)
      // w-max                        กว้างเท่าข้อความ
      // max-w-[calc(100vw-2rem)]     จอแคบไม่ล้นขอบ
      // z-[1000]                     อยู่เหนือ modal ทั่วไป
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{view.title}</p>
        <p className="opacity-70">{view.detail}</p>
      </div>
      {view.canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={isChecking}
          aria-label="ลองเชื่อมต่อเซิร์ฟเวอร์อีกครั้ง"
          // ปุ่มมีแต่ไอคอน ต้องมี aria-label (กฎ AGENTS.md)
          className="cursor-pointer rounded-lg p-1 text-[#8C6D58] transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
```

**ทำไมวางกลางล่าง** (เปลี่ยนจากแผน "ซ้ายล่าง"): ตอนทดสอบเจอว่าซ้ายล่าง **ทับการ์ด "มีลูกค้า"** ใน sidebar หน้าโต๊ะ · ขวาล่างเป็นของ `UpdatePrompt` · กลางล่างของหน้าโต๊ะว่าง ยังเป็นแบบ B (ลอย ไม่แก้ layout) เหมือนเดิม

---

## 4. แก้ไฟล์เดิม 3 ไฟล์

### 4.1 `features/offline/snapshotCache.ts`

**เพิ่ม import** (บนสุด ใต้ import `ApiError`)

```ts
import { reportReachable, reportUnreachable } from './connectionStatus';
```

**แก้ใน `fetchWithSnapshot`** — บรรทัดที่มี `+` คือของใหม่

```ts
  try {
    const data = await fetcher();
+   reportReachable(); // ได้คำตอบจาก server → บอกป้ายสถานะว่าออนไลน์
    void saveSnapshot(tenantSlug, kind, data);
    return { data, isStale: false };
  } catch (error) {
-   if (!isUnreachableError(error)) throw error;
+   if (!isUnreachableError(error)) {
+     reportReachable(); // 4xx = server ตอบแล้ว (แค่ปฏิเสธ) → นับว่าติดต่อได้
+     throw error;
+   }
+   reportUnreachable(); // ไปไม่ถึง server → ป้ายขึ้นทันที ไม่ต้องรอ ping

    const cached = await readSnapshot<T>(tenantSlug, kind);
    ...
```

ทำไมต้องรายงานจากตรงนี้: เป็นจุดที่ **รู้เร็วที่สุด** ว่า backend ล่ม — พนักงานกด "รีเฟรช" หน้าโต๊ะ ป้ายขึ้นทันทีพร้อมแถบข้อมูลเก่า ไม่ต้องรอ ping รอบถัดไป

### 4.2 `App.tsx`

```tsx
import UpdatePrompt from './features/offline/components/UpdatePrompt';
+import OfflineBanner from './features/offline/components/OfflineBanner';

        <AppRouter />
        <UpdatePrompt />
+       <OfflineBanner />
```

### 4.3 `main.tsx`

```tsx
import { requestPersistentStorage } from './features/offline/db';
+import { startConnectionMonitor } from './features/offline/connectionStatus';

requestPersistentStorage();
+
+// เฝ้าดูสถานะเน็ต/เซิร์ฟเวอร์ตลอดอายุแอป (ป้าย OfflineBanner อ่านผลจากตัวนี้)
+startConnectionMonitor();
```

ทำไมเรียกใน `main.tsx` ไม่ใช่ใน `useEffect` ของ component: ต้องเริ่มครั้งเดียวต่อการเปิดแอป · `StrictMode` เรียก effect 2 รอบตอน dev → จะได้ `setInterval` 2 ตัว

---

## 5. ลำดับเหตุการณ์จริง

### ฉาก A — backend ล่มระหว่างใช้งาน

1. พนักงานกด "รีเฟรช" หน้าโต๊ะ → `fetchWithSnapshot` → `ApiError(500)` → `reportUnreachable()`
2. store: `online` → `unreachable` → แจ้ง listener → `OfflineBanner` render ใหม่
3. ป้ายกลางล่าง: **"ติดต่อเซิร์ฟเวอร์ไม่ได้ · กำลังลองใหม่อัตโนมัติ"** + แถบข้อมูลเก่าในหน้าโต๊ะ
4. `setInterval` เห็นว่าไม่ใช่ `online` → `pingServer()` ทุก 15 วิ
5. backend กลับมา → ping ได้ 200 → `setStatus('online')` → `cameBack = true`
6. ป้ายเขียว **"เชื่อมต่อแล้ว"** → 3 วิ → `justReconnected = false` → ป้ายหาย

### ฉาก B — เน็ตหลุด

1. browser ยิง event `offline` → `setStatus('offline')` → ป้าย **"ออฟไลน์"** (ไม่มีปุ่มลองใหม่)
2. ping ข้ามเพราะ `navigator.onLine === false`
3. เน็ตกลับ → event `online` → `pingServer()` ทันที → สำเร็จ → "เชื่อมต่อแล้ว" 3 วิ

### ฉาก C — Wi-Fi ต่อแต่เน็ตไม่ออก (ที่ `navigator.onLine` พลาด)

1. browser ยังบอก online → ไม่มี event
2. พนักงานเข้าหน้าโต๊ะ → `fetchWithSnapshot` ได้ `TypeError` → `reportUnreachable()` → `navigator.onLine` เป็น true → **`unreachable`**
3. ping ทุก 15 วิจนกว่าจะกลับมา

---

## 6. ทดสอบ

### 6.1 ผลที่รันแล้ว (Chromium + mock API)

| # | ทำ | ผล |
|---|---|---|
| 1 | เปิดหน้าโต๊ะ ออนไลน์ | ไม่มีป้าย ✅ |
| 2 | ปิด backend → กดรีเฟรช | "ติดต่อเซิร์ฟเวอร์ไม่ได้" ✅ |
| 3 | เปิด backend → กดปุ่มหมุนบนป้าย | "เชื่อมต่อแล้ว" ✅ |
| 4 | รอ 3 วิ | ป้ายหาย ✅ |
| 5 | ตั้ง Offline | "ออฟไลน์" ✅ |
| 6 | ตั้ง Online | "เชื่อมต่อแล้ว" ✅ (ping ยืนยันก่อน) |
| 7 | ปิด backend → รีเฟรช → เปิด backend ไม่กดอะไร | "ติดต่อเซิร์ฟเวอร์ไม่ได้" ✅ |
| 8 | รอ 16 วิ | ป้ายหายเอง (ping อัตโนมัติสำเร็จ) ✅ |

`tsc -b` ผ่าน · `eslint` ไฟล์ใหม่ 0 error · `vite build` ผ่าน

### 6.2 ทดสอบบนเครื่อง

```powershell
cd backend;  npx nest start --watch             # terminal 1
cd frontend; npm run build; npm run preview     # terminal 2
```

> ป้ายนี้ **ใช้ได้ตอน `npm run dev` ด้วย** (ไม่ขึ้นกับ service worker) — แต่ทดสอบ "ออฟไลน์แล้ว reload" ต้องใช้ preview

1. login → หน้าโต๊ะ → ไม่มีป้าย
2. Ctrl+C backend → กด "รีเฟรช" → ป้ายกลางล่าง + แถบข้อมูลเก่า
3. เปิด backend → รอไม่เกิน 15 วิ → ป้ายเขียว → หาย
4. F12 > Network > Offline → ป้าย "ออฟไลน์" → No throttling → "เชื่อมต่อแล้ว"
5. Network > ดู request `api` ตอนออนไลน์ปกติ → **ต้องไม่มี** ping ทุก 15 วิ

---

## 7. ข้อจำกัด + คำถามกรรมการ

### ข้อจำกัดที่รู้อยู่

| เรื่อง | ผล | แผน |
|---|---|---|
| รายงานผลเฉพาะใน `fetchWithSnapshot` | backend ล่มตอนอยู่หน้า Users/Stock (ไม่ใช้ snapshot) ป้ายยังไม่ขึ้น จนกว่าจะมี event offline หรือกลับไปหน้าโต๊ะ | ถ้าต้องการครอบคลุมทุกหน้า: เพิ่ม `reportReachable/Unreachable` ใน `apiFetch` (แก้ `appClient.ts` ~4 บรรทัด — ไฟล์กลางของทีม) |
| `isUnreachableError` นับ `TypeError` ทุกตัว | ถ้าโค้ดใน `fetcher` มีบั๊กโยน TypeError (เช่นอ่าน field ของ undefined) จะถูกนับเป็นออฟไลน์ | fetcher ตอนนี้แค่ `return res.data` จึงไม่เกิด · เขียน fetcher ใหม่ต้องระวัง |
| ป้ายกลางล่างอาจบังเนื้อหาบางหน้า | หน้า POS ยังไม่ได้ลองจริง | ถ้าบังปุ่มสำคัญ ค่อยย้าย |
| ป้าย "เชื่อมต่อแล้ว" ไม่โหลดข้อมูลใหม่ให้ | ต้องกดรีเฟรชเอง | ขั้น outbox: กลับมาออนไลน์ → flush คิวอัตโนมัติ |

### คำถามที่กรรมการน่าจะถาม

**Q: ทำไมไม่ใช้ `navigator.onLine` อย่างเดียว**
A: บอกได้แค่ว่าเครื่องต่อเครือข่ายอยู่หรือไม่ ไม่ได้บอกว่าถึง server · ร้านที่ Wi-Fi ต่อแต่เน็ตไม่ออก หรือ backend ล่ม `navigator.onLine` ยังเป็น `true` จึงรวมกับผลของ request จริงและ ping

**Q: ping ทุก 15 วินาทีเปลือง server ไหม**
A: ping เฉพาะตอนติดต่อไม่ได้ ออนไลน์ปกติไม่ยิงเลย · endpoint เป็น `@Public()` ไม่แตะ DB ฝั่ง auth · throttle 100 ครั้ง/นาที ping ใช้แค่ 4

**Q: ทำไมไม่ใช้ React Context**
A: สถานะต้องอัปเดตจากโค้ดนอก React (`snapshotCache.ts`, event ของ window) Context เข้าไม่ถึง · `useSyncExternalStore` เป็น API มาตรฐานของ React 18 สำหรับกรณีนี้ (ไลบรารีอย่าง Redux และ Zustand ก็ใช้ hook นี้อยู่ข้างใน)
