# HANDOFF — PWA-POS (ค้าคล่อง / KhaKhlong)

> ไฟล์นี้คือสรุปสถานะล่าสุดสำหรับ **เปิดแชทใหม่แล้วทำงานต่อ** โดยไม่ต้องเล่าบริบทใหม่
> อัปเดต: 2026-10-23 · ใช้แทน `docs/backend-todo.md` (ไฟล์นั้นล้าสมัยแล้ว)

## วิธีใช้ในแชทใหม่

พิมพ์ประโยคนี้เป็นข้อความแรก:

```text
อ่าน docs/HANDOFF.md ก่อน แล้วทำงานต่อจากหัวข้อ "งานค้าง P0" ข้อ 1
```

ถ้าอยากให้ทุกแชทใหม่รู้บริบทอัตโนมัติ ให้คัดสรุปย่อใส่ `AGENTS.md` ที่ root โปรเจกต์

---

## 1. ข้อมูลโปรเจกต์

| รายการ | ค่า |
|---|---|
| Path | `C:\Users\chira\OneDrive\เดสก์ท็อป\Final-Project\PWA-POS` |
| Branch | `feat-aod` |
| HEAD | `4711703` — feat(inventory): นับวัตถุดิบหลายรายการตอนจบวัน + การ์ดปรับวัตถุดิบในหน้าปิดกะ (2026-10-22) |
| Remote | `https://github.com/Slippery77/KhaKhlong.git` |
| Working tree | สะอาด ณ commit `4711703` (ไฟล์ HANDOFF นี้ยังไม่ commit) |
| Frontend | React + TypeScript + Vite + Tailwind v4 · dev port **5173** · proxy `/api` → `http://localhost:3000` |
| Backend | NestJS 11 · port **3000** · prefix `/api` · Swagger เปิด |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` / `123456` |
| เอกสารคู่มือ | `docs/setup-guide.md`, `docs/backend-dev-guide.md`, `docs/backend-coding-standard.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/user-roles-permissions.md` |

### คำสั่งที่ใช้บ่อย

```powershell
# รัน backend (terminal 1)
cd backend; npx nest start --watch

# รัน frontend (terminal 2)
cd frontend; npm run dev

# type-check / build
cd backend;  npx tsc --noEmit
cd frontend; npx tsc -b; npx vite build

# test
cd backend; npx jest              # ปัจจุบันยังแดง (ดูหัวข้อ 6)
cd backend; npx jest src/modules/inventory src/modules/shifts   # ชุดที่ผ่าน

# psql
$env:PGPASSWORD='123456'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U pos_app -d pwa_pos -c "SELECT 1;"
```

---

## 2. สถานะโมดูล

### เสร็จและใช้งานได้

- **Auth** — login/logout/refresh token, JWT guard, permission guard, RLS + tenant isolation
- **Register** — สมัครร้านใหม่ (throttle 3 ครั้ง / 5 นาที / IP)
- **Menu** — หมวด/เมนู/ modifiers ครบ endpoint
- **Floors / Tables** — พื้นที่ โต๊ะ ผังร้าน
- **Orders** — create, list (open), get by id, add items (+kitchen ticket), move table, close-unpaid, sync
- **Inventory** — stock view, movements (รับเข้า/ปรับ/ของเสีย), **count batch** (รอบล่าสุด)
- **Shifts** — open, current, close, verify (PIN ผู้จัดการ/เจ้าของ), reopen, cashbook, list
- **KDS** — คิวครัว + mark ready
- **System Config** — GET/PATCH
- **Tenants / Store** — GET/PATCH
- **Users** — list, create, update, deactivate, reactivate (ยังไม่มี PIN management — ดู P0)
- **Roles / Permissions** — seed ครบ, employee 9 สิทธิ์

### ยังไม่เริ่ม (backend module ไม่มี)

- **Payments** — ตารางใน SQL พร้อมแล้ว แต่ไม่มี module/endpoint
- **Reports** — ไม่มี module; หน้า sale report ฝั่ง FE ใช้ mock
- **Audit Logs** — ไม่มี endpoint/UI (DB เขียน audit บางจุดแล้ว)
- **PWA/Offline** — ไม่มี manifest, service worker, Workbox, Dexie

---

## 3. งานรอบล่าสุด (2026-10-22) — ทำเสร็จแล้ว

**Inventory count batch + การ์ดปรับวัตถุดิบในหน้าปิดกะ** (commit `4711703`, 10 ไฟล์)

- Backend: `POST /inventory/count/batch` (`inventory:adjust`, 1–200 items, กัน id ซ้ำ, 404 ถ้า inactive, คืน `items[] / adjusted_count / unchanged_count`)
- Service: `recordStockCountBatch()` ใน `backend/src/modules/inventory/inventory.service.ts` (~บรรทัด 265–346)
- DTO: `backend/src/modules/inventory/dto/record-stock-count-batch.dto.ts`
- Frontend: `hooks/useStockAdjustment.ts`, `components/StockAdjustmentCard.tsx`, integrate ใน `ShiftPage.tsx`
- เทสต์: backend `jest src/modules/inventory src/modules/shifts` = 5 suites / 15 tests ผ่าน; E2E 17/17 ผ่าน
- E2E script: `%TEMP%\opencode\e2e-stock-count-batch.mjs` (ยังไม่อยู่ใน repo)

**Flow หน้าปิดกะ**
1. กะเปิดอยู่ → แสดงการ์ดปรับวัตถุดิบก่อน → แล้วจึงปิดกะ/นับเงิน
2. ยอดเงินตรง → ปิดกะได้เลย
3. ยอดไม่ตรง → ต้องให้ผู้จัดการ/เจ้าของร้านกรอก PIN (blind count ไม่โชว์ยอดคาดหวังก่อนยืนยัน)
4. ปิดกะแล้ว → แสดงการ์ดสถานะก่อน แล้วจึงปรับวัตถุดิบย้อนหลังได้

---

## 4. งานค้าง P0 — ต้องแก้ก่อนเดโม

### P0-1. Payment จริง + ปิดออเดอร์ใน DB (ใหญ่สุด)
- ปัญหา: `PaymentModal.tsx` เป็น mock คำนวณ VAT 7% ฝั่ง client และเขียนลง localStorage ผ่าน `SalesContext.tsx`; `MainPOS.handlePaymentSuccess()` แค่ล้าง cart
- ผลกระทบ: ออเดอร์ยัง `open` ใน DB → `POST /shifts/:id/close` ตอบ **409 `OPEN_ORDERS_BLOCK_CLOSE`** ปิดกะไม่ได้
- ต้องทำ: สร้าง module `payments` (ใช้ตาราง `payments`, `payment_attempts`, `receipt_sequences` ที่มีอยู่), ออกใบเสร็จ/พิมพ์ซ้ำ, ต่อ UI, ปิดออเดอร์เมื่อชำระสำเร็จ
- **ห้ามคำนวณ VAT/ยอดรวมใน NestJS หรือ client** — DB trigger เป็นผู้คำนวณ

### P0-2. ช่อง PIN ผู้จัดการในหน้าผู้ใช้
- ปัญหา: `backend/src/modules/users/dto/updateUser.dto.ts` ไม่มีฟิลด์ `pin`; `frontend/src/features/users/components/UserFormPopup.tsx` ไม่มีช่อง PIN (มีเฉพาะ `createUser.dto.ts`)
- ผลกระทบ: สร้าง manager จาก UI → ไม่มี PIN → รับรองกะตอนยอดไม่ตรงไม่ได้
- ต้องทำ: เพิ่ม `pin` ใน `UpdateUserDTO` + hash bcrypt ใน service + ช่องตั้ง/รีเซ็ต PIN ใน UI + audit

### P0-3. Navigation bug หลังชำระเงิน
- `frontend/src/features/mainpos/pages/MainPOS.tsx` บรรทัด ~423, ~455: `navigate("/sale-report")` และ `navigate("/kds")` ไม่มี `tenantSlug` → หน้าว่าง
- แก้เป็น `` navigate(`/${tenantSlug}/sale-report`) `` และทำนองเดียวกัน (ดูวิธีใช้ `useParams` ใน `Header.tsx`)

### P0-4. Sale report เป็นข้อมูลปลอม
- `frontend/src/features/saleReport/context/SalesContext.tsx` seed 3 รายการ `tx-mock-*` ลง localStorage
- ต้องทำ: ต่อ Reports module จริง หรือซ่อน/ติดป้ายว่าเป็นข้อมูลตัวอย่างก่อนเดโม

---

## 5. งานค้าง P1 / P2

### P1 — ความถูกต้องและความปลอดภัย

- **`GET /shifts` ใช้ `report:view_all`** (`shifts.controller.ts`) → employee ดูประวัติกะตัวเองไม่ได้ทั้งที่มี `report:view_own_shift` (ยืนยันจาก DB: employee มี 9 สิทธิ์ รวมตัวนี้)
- **PIN lock ไม่คงทน** — `pin_failed_attempts` / `pin_locked_until` มีใน DB แต่ไม่มีโค้ดเขียน; ตอนนี้กันด้วย Map ใน memory → restart แล้วปลดล็อก, หลาย instance ไม่แชร์
- **ไม่มี cron `escalate_overdue_shifts()`** — ไม่มี `@nestjs/schedule`; สถานะ `escalated` ไม่เกิดอัตโนมัติ
- **`token_version` ไม่ถูกตรวจใน JWT guard** (`backend/src/modules/auth/guards/jwtAuth.guard.ts`) → เปลี่ยนรหัสผ่านแล้ว session เก่ายังใช้ได้
- **`POST /orders/sync` รับ `@Body() dto: any`** → ValidationPipe ไม่ตรวจ; ควรเพิ่ม DTO + จำกัด batch
- **ไม่มี login lockout / audit login** — `password_locked_until` ไม่ถูกใช้, `login_success` / `login_failed` ไม่ถูกเขียน
- **ไม่มี `GET /users/me`, `POST /auth/pin-login`**
- **ไม่มี catch-all route** — path แปลกได้หน้าว่าง; `/:tenantSlug/homepage` ยังเป็น `<div>Dashboard (TODO)</div>`

### P2 — ฟีเจอร์ตาม scope

- **PWA/Offline**: manifest + service worker (Workbox) + IndexedDB (Dexie) + คิว sync ออเดอร์ — scope 3.2.11 กำหนด offline เฉพาะ Menu + Order
- **Reports module**: ยอดขาย, เมนูขายดี, วิธีชำระ, รายงานกะ + หน้าประวัติกะ
- **Store / System Config UI** (backend พร้อมแล้ว แต่ไม่มีหน้า)
- **Dashboard homepage**
- **Orders**: void/comp (`void:approve`, `discount:approve`), sync DTO
- **Menu reorder endpoint** (ยังไม่มี)
- **Audit Log endpoint/UI**
- **Inventory polish**: ช่องค้นหาในการ์ดนับวัตถุดิบ, ใช้ business date แทน local date, แก้ note ใน `record_stock_count()` ที่มีช่องว่างนำหน้า + ทศนิยม 4 ตำแหน่ง

---

## 6. คุณภาพ / เทสต์ / เอกสาร

| รายการ | สถานะล่าสุด (2026-10-23) |
|---|---|
| Backend `npx jest` | **7 suites failed / 6 passed (7 tests failed / 16 passed)** — spec boilerplate ขาด DI mock: `permission-cache.service`, `menu.service`, `menu.controller`, `system-config.service`, `system-config.controller`, `tenants.controller`; `app.controller.spec` คาด `"Hello World!"` แต่ได้ `"Hello POS!"` |
| Backend `npx eslint "src/**/*.ts"` | **3,964 problems (3,908 errors, 3,283 auto-fixable)** — ส่วนใหญ่ prettier formatting; ควรทำ commit แยก |
| Frontend `npx eslint src` | **15 errors + 1 warning ใน 13 ไฟล์** (หลัก ๆ `react-hooks/set-state-in-effect`): `authStorage.ts`, `AuthContext.tsx`, `useAdminMenu.ts`, `ModifierGroupEditor.tsx`, `ModifierOptionRow.tsx`, `useModifierAdmin.ts`, `useKDSQueue.ts`, `ModifierPopup.tsx`, `useFullMenu.ts`, `SalesContext.tsx`, `useFloors.ts`, `useTables.ts`, `useUsers.ts` |
| Backend e2e | `backend/test/app.e2e-spec.ts` ยังเป็น boilerplate (ยิง `/` คาด `"Hello World!"`) → ใช้ไม่ได้ |
| E2E ที่ใช้งานจริง | Node `.mjs` ใน `%TEMP%\opencode\`: `e2e-shift.mjs`, `e2e-stock-count-batch.mjs`, `e2e-floors.mjs`, `e2e-kds-badge.mjs` — **ยังไม่อยู่ใน repo** ควรย้ายเข้า `backend/test/e2e/` |

**ข้อควรระวังเวลาเทสต์**
- E2E ต้องเขียนเป็น Node `.mjs` เท่านั้น (PowerShell ทำ UTF-8 เพี้ยน)
- เทสต์จะสร้าง tenant ใหม่ (`inv-<stamp>`, `shift-<stamp>`) ค้างใน DB → ล้างด้วย `admin_purge_tenant` เมื่อจำเป็น
- `POST /register` จำกัด 3 ครั้ง / 5 นาที / IP → รัน E2E ซ้ำถี่ ๆ จะโดน 429

---

## 7. กติกาและ decision ที่ห้ามลืม

### UI / Design system
- bg `#FAF7F2`, accent `#8C6D58`, hover `#7a5c45`, text `#2D241E`, border `#d9c6b0` / `#E8DFD5`, font Kanit, `rounded-xl` / `rounded-2xl`
- ห้ามใช้ emoji เป็นไอคอน → ใช้ `lucide-react`
- ทุกจุดคลิกต้องมี `cursor-pointer`, hover transition 150–300 ms, focus state ครบ, label/aria ครบ

### Backend
- Response convention: `{ status: 'success', data: ... }`
- โครงสร้าง 3 ชั้น: controller → service → repository; ใช้ `query` / `referenceQuery` ตาม `docs/backend-dev-guide.md`
- ทุก endpoint ต้องมี permission guard + RLS ทำงานผ่าน `app_tenant_id()`
- Transaction: batch ใดพังให้ rollback ทั้งชุด (ใช้ request เดียว)

### Shift / PIN
- Blind count: ไม่โชว์ยอดคาดหวังก่อนกดยืนยัน
- PIN ผู้จัดการ/เจ้าของร้าน **คนใดก็ได้ในร้าน**; `verified_by` = เจ้าของ PIN; DB trigger ตรวจ `has_permission(NEW.verified_by, 'shift:verify')`
- `POST /shifts/:id/verify` รับ `{ pin }`, guard `@AnyAuthenticated()`; ผิด 5 ครั้งต่อ `shift_id` → 429 ล็อก 5 นาที (in-memory)
- ปิดกะตอนยอดตรง = ปิดได้เลย; ยอดไม่ตรง = รอ manager/owner verify
- เปิดกะวันถัดไปได้แม้กะก่อนยังค้างตรวจสอบ (ไม่ block การขาย)

### Inventory
- Periodic Physical Count (INV-11): นับของเหลือจริงสิ้นวัน, `record_stock_count()` คำนวณ delta จาก ledger
- Audit อัตโนมัติเมื่อเพี้ยน > `inventory_variance_alert_percent` (20%) และ > 1 หน่วย (INV-12)
- หน้าปรับวัตถุดิบแสดงวัตถุดิบ active ทั้งหมด แต่บันทึกเฉพาะช่องที่กรอก
- เตือนแต่ไม่บล็อกการปิดกะ

### Payment (เมื่อเริ่มทำ)
- ห้ามคำนวณ VAT / service charge / ยอดรวมใน NestJS หรือ client — DB trigger คำนวณ
- ใช้ตาราง `payments`, `payment_attempts`, `receipt_sequences` ที่มีใน `FULL_INSTALL.sql`

---

## 8. ข้อจำกัดที่รู้อยู่

- `inventory_transactions` ไม่มี `shift_id` → ผูกการปรับวัตถุดิบกับกะไม่ได้ตรง ๆ
- `record_stock_count()` ไม่บันทึกแถวเมื่อ delta = 0
- ตัวเลข "วันนี้ปรับยอดแล้ว N รายการ" อิงวันปฏิทินเครื่อง + นับเฉพาะ adjustment
- หน้า users ตั้ง PIN ไม่ได้ (P0-2)
- Payment mock ทำให้ปิดกะโดน 409 (P0-1)
- `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` ล้าสมัย — ใช้ไฟล์นี้แทน
- ไม่มี `.env` ใน repo (มี `.env.example`); ต้องคัดลอกและตั้งค่าเอง

---

## 9. ลำดับที่แนะนำถัดไป

1. **P0-1 Payment จริง + ปิดออเดอร์** — ปลดล็อกทั้งการปิดกะและรายงานยอดขาย
2. **P0-2 PIN ผู้จัดการ + P0-3 navigate** — งานเล็ก ทำคู่กันได้เร็ว
3. **P0-4 Reports จริง** หรือซ่อน mock ก่อนเดโม
4. **P1** แก้ backend tests ให้เขียว + frontend lint + สิทธิ์ `GET /shifts`
5. **P2** PWA offline → Store UI → Dashboard

> ก่อนเริ่มงานทุกครั้ง: `git status` ต้องสะอาด, รัน `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) ให้ผ่านก่อน commit
