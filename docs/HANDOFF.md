# HANDOFF — PWA-POS (ค้าคล่อง / KhaKhlong)

> ไฟล์นี้คือสรุปสถานะล่าสุดสำหรับ **เปิดแชทใหม่แล้วทำงานต่อ** โดยไม่ต้องเล่าบริบทใหม่
> อัปเดต: **2026-10-30** · branch `feat-aod` · `origin/main` = `b352de6` (2026-10-28) · ดู `git log` สำหรับ hash ล่าสุด
> ใช้แทน `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` (สองไฟล์นั้นล้าสมัยแล้ว)

## วิธีใช้ในแชทใหม่

พิมพ์ประโยคนี้เป็นข้อความแรก:

```text
อ่าน docs/HANDOFF.md ก่อน แล้วทำงานต่อจากหัวข้อ "9. ลำดับที่แนะนำถัดไป"
```

บริบทแบบย่อ (stack, กติกา, คำสั่งเทสต์) อยู่ใน `AGENTS.md` ที่ root ของ repo — แก้ที่ root ที่เดียว (`docs/AGENTS.md` เป็น pointer ไปที่นั่น)

---

## 1. ข้อมูลโปรเจกต์

| รายการ | ค่า |
|---|---|
| Branch ที่ทำงาน | `feat-aod` — งาน void/comp, PIN lock ของ shifts และ escalation commit แล้ว (2026-10-30); ดู `git log` สำหรับ hash ล่าสุด |
| Integration branch | `main` (`origin/main` = `b352de6`, 2026-10-28) |
| Remote | `https://github.com/Slippery77/KhaKhlong.git` (branch เก่า `feat-aod`, `feat-benz`) |
| Frontend | React + TypeScript + Vite + Tailwind v4 · dev port **5173** · proxy `/api` → `http://localhost:3000` |
| Backend | NestJS 11 · port **3000** · prefix `/api` · Swagger เปิด |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` · รหัสผ่านอยู่ใน `.env` ของแต่ละเครื่อง (ห้ามเขียนรหัสจริงลงไฟล์นี้) |
| เอกสารคู่มือ | `docs/setup-guide.md`, `docs/backend-dev-guide.md`, `docs/backend-coding-standard.md`, `docs/payment-module-guide.md`, `docs/void-comp-approval-guide.md`, `docs/system-config-guide.md`, `docs/edit-vat-frontend-guide.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/user-roles-permissions.md` |

### คำสั่งที่ใช้บ่อย

```powershell
# ติดตั้ง dependency (repo เป็น npm workspaces — ต้องรันที่ root)
npm ci

# รัน backend (terminal 1)
cd backend; npx nest start --watch

# รัน frontend (terminal 2)
cd frontend; npm run dev

# type-check / build
cd backend;  npx tsc --noEmit
cd frontend; npx tsc -b; npx vite build

# test (รันเฉพาะชุดที่แก้ — ทั้งชุดยังมี boilerplate แดง)
cd backend; npx jest src/modules/shifts
cd backend; npx jest src/modules/orders

# E2E (ต้องมี backend + DB จริงรันอยู่)
node backend/test/e2e/e2e-void-comp.mjs
node backend/test/e2e/e2e-reports.mjs

# psql (ใส่รหัสผ่านของเครื่องตัวเองจาก .env)
$env:PGPASSWORD='<รหัสผ่าน pos_app จาก .env>'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U pos_app -d pwa_pos -c "SELECT 1;"
```

---

## 2. สถานะโมดูล

### เสร็จและใช้งานได้

- **Auth** — login/logout/refresh token, JWT guard, permission guard, RLS + tenant isolation · **store finder ที่ `/`** · **ตรวจ `token_version` ใน JWT guard แล้ว** (เปลี่ยนรหัสผ่าน = token เก่าใช้ไม่ได้)
- **Register** — สมัครร้านใหม่ (throttle 3 ครั้ง / 5 นาที / IP) · ตั้ง PIN เจ้าของร้านได้ตอนสมัคร (`PinInput`) · **แก้บั๊กลำดับพารามิเตอร์แล้ว** (ดู 3.9)
- **Menu** — หมวด/เมนู/ modifiers ครบ endpoint · ผูกเมนูกับกลุ่มตัวเลือกได้ (`linkModifier.tsx`)
- **Floors / Tables** — พื้นที่ โต๊ะ ผังร้าน
- **Orders** — create, list (open), get by id, add items (+kitchen ticket), move table, close-unpaid, sync (`sync` ยังรับ `any` — ดู P1) · **void / comp รายการพร้อม PIN ผู้อนุมัติ** (ดู 3.8)
- **Inventory** — stock view, movements (รับเข้า/ปรับ/ของเสีย), **count batch** (รอบล่าสุด)
- **Shifts** — open, current, close, verify (PIN ผู้จัดการ/เจ้าของ), reopen, cashbook, list · **`GET /shifts` ใช้ `report:view_all` หรือ `report:view_own_shift` แล้ว** (employee เห็นกะตัวเอง) · **PIN lock เก็บใน DB** (คงทนข้าม restart) · **กะค้างรับรองเกิน `shift_escalation_hours` (default 4 ชม.) ถูก escalate หา owner อัตโนมัติ**
- **KDS** — คิวครัว + mark ready
- **System Config** — GET/PATCH (หน้า UI ใช้เฉพาะ VAT)
- **Tenants / Store** — GET/PATCH + หน้า `setting/store`
- **Users** — list, create, update, deactivate, reactivate · ตั้ง PIN ได้ทั้งสร้างและแก้ไข (`UpdateUserDTO.pin` ตรวจ `/^\d{6}$/` + bcrypt) · `UserTable` แสดง badge `has_pin` (ไม่ส่ง `pin_hash` ออก API)
- **Roles / Permissions** — seed ครบ, employee 9 สิทธิ์
- **Payment** — `attempts` → `pay` → `cancel`; ออกเลขใบเสร็จ, ดู/พิมพ์ใบเสร็จ; UI `PaymentModal` 3 ขั้น ใช้ยอดจาก server เท่านั้น
- **Receipt (FE)** — `features/receipt/` พรีวิว 80mm + พิมพ์จริง, ป้าย "สำเนา" ตาม `isCopy`, เคารพ `max_reprints` (409)
- **Reports** — `sales/summary`, `sales/by-period`, `sales/top-items`, `sales/transactions`, `sales/receipt/:id`
- **Void / Comp (2026-10-30)** — batch endpoint + PIN ผู้อนุมัติ + audit ผ่าน trigger + FE modal + E2E 31 ข้อผ่าน
- **PWA shell** — `vite-plugin-pwa` + manifest + precache ทุกไฟล์ build + `navigateFallback '/index.html'` (deny `/api`) + แจ้งอัปเดตด้วย `UpdatePrompt` (`registerType: 'prompt'`, ไม่ reload เองกลางการสั่งอาหาร) + ไอคอน 64/192/512/maskable

### ยังไม่เริ่ม / ยังไม่ครบ

- **Audit Logs** — ไม่มี endpoint/UI (DB trigger เขียน audit บางเหตุการณ์ แต่ยังไม่มีหน้าดู)
- **Offline data layer** — PWA shell พร้อมแล้ว แต่ยังไม่มี Dexie/IndexedDB แคชเมนู/โต๊ะ/กะ และยังไม่มี outbox คิวออเดอร์ (service worker ไม่แคช `/api` โดยตั้งใจ)
- **Dashboard** — `/:tenantSlug/homepage` ยังเป็น `<div>Dashboard (TODO)</div>`
- **Reports เพิ่มเติม** — หน้ารายงานรายกะ, ตัวกรองช่วงวันที่บน UI, export
- **Shift escalation อัตโนมัติ** — มี service แล้วแต่ยังไม่ทำงานจริง (ดู 5/P1-1)

---

## 3. งานรอบล่าสุด

### 3.1 Payment จริง + ปิดบิล (commit แล้ว)

- Commit หลัก: `4bd4ad4` → merge `76da899`, `92ac97f`
- `backend/src/modules/payment/`: `POST /payments/attempts`, `GET /payments/attempts/:id`, `POST .../pay`, `POST .../cancel`, `GET /payments/:id/receipt`, `POST /payments/:id/print`
- DB trigger เป็นผู้คำนวณยอด/ออกเลขใบเสร็จ/ปิดออเดอร์/คืนโต๊ะ
- Frontend: `hooks/usePayment.ts`, `components/PaymentModal.tsx`, `MainPOS.tsx`
- PromptPay QR: `014f434`, `4c9f8cc`, `33a86f2`

### 3.2 Reports module (commit แล้วใน `da56495`)

- `backend/src/modules/reports/` (controller/service/repository/dto) + ลงทะเบียนใน `app.module.ts`
- สิทธิ์: `@RequireAnyPermission('report:view_all', 'report:view_own_shift')`
- Frontend `frontend/src/features/saleReport/api/reports.api.ts`; `SalesContext.tsx` ต่อ API จริง
- E2E `backend/test/e2e/e2e-reports.mjs`

### 3.3 UI อื่นในรอบ 2026-10-25 ถึง 2026-10-27

- `29eac7e` — หน้า Store settings + helper
- `27a7e35` — popup เปิดกะอัตโนมัติเมื่อ login ครั้งแรกของวัน
- Login/Register/Table page redesign จาก `feat-benz`

### 3.4 ใบเสร็จ + พิมพ์ซ้ำ (FE) — 2026-10-26

- `payment_cols` มี `vat_rate_snapshot`, `service_charge_rate_snapshot`, `rounding_adjustment` — ใช้เป็น **ป้ายกำกับ** บนใบเสร็จเท่านั้น ไม่คำนวณซ้ำ
- `frontend/src/features/receipt/`: `ReceiptPaper` (80mm), `ReceiptModal`, `useReceipt`/`receipt.api`, `receipt.print.css`
- ลำดับพิมพ์: กดพิมพ์ → `POST /print` → `flushSync` ให้ป้าย "สำเนา" ลงกระดาษ → `window.print()`
- ทดสอบ: `node backend/test/e2e/e2e-receipt.mjs` ผ่านทุกข้อ
- รายละเอียด: `docs/payment-module-guide.md` หัวข้อ 7.5

### 3.5 ทางเข้าเว็บ: store finder + จำรหัสร้าน (Phase 1) — 2026-10-27

- `GET /api/public/tenants/:slug` (`modules/tenants/public-tenants.controller.ts`) — `@Public()` + throttle 20/นาที, ตอบ `{ status, data:{ slug, exists, active } }` เสมอ
- FE: `store_finder_page.tsx` (route `/`, `/login`), `tenantStorage.ts`, `publicTenant.api.ts`, catch-all `*`
- **Phase 2/3 ที่ยังไม่ทำ:** login ด้วยอีเมล (`resolve_user_by_email` + DTO พร้อมแล้ว), device pairing + PIN

### 3.6 PIN ผู้ใช้ + ผูก modifier กับเมนู — 2026-10-27 (`bd022fe`)

- `UpdateUserDTO.pin` (`@Matches(/^\d{6}$/)`), hash ด้วย bcrypt ทั้ง create/update, คืน `has_pin` แทน `pin_hash`
- FE: ช่อง PIN ใน `UserFormPopup`, badge `has_pin` ใน `UserTable`, `PinInput` ตอนสมัครร้าน

### 3.7 ความปลอดภัยรอบ 2026-10-28 (`6b5c7d3`)

commit เดียว 4 เรื่อง:

1. **`token_version` ใน JWT guard** — `jwtAuth.guard.ts` เทียบ claim กับ DB; ไม่มี claim = ปฏิเสธ; เปลี่ยน/รีเซ็ตรหัสผ่านตัด session เก่าทันที · E2E `e2e-token-version.mjs`
2. **`GET /shifts` สิทธิ์ถูกต้อง** — `@RequireAnyPermission('report:view_all', 'report:view_own_shift')`; ถ้าไม่มี `report:view_all` service กรอง `opened_by = user.sub` ให้เห็นแค่กะตัวเอง
3. **PIN lock เก็บใน DB** — `pin_failed_attempts` / `pin_locked_until` ถูกเขียนจริง (แทน `Map` ใน memory), `findPinVerifiers()` กรองคนที่ยังไม่ถูกล็อก
4. **Shift escalation cron** — `common/shift-escalation.service.ts` เรียก `escalate_overdue_shifts()` ทุก 5 นาที (รอบแรกหลัง 10 วินาที) · ตอน commit นี้ยังเรียกด้วย `query()` จึงล้มด้วย `ไม่มี tenant context` — **แก้แล้ว 2026-10-30 (ดู 3.12)**

### 3.7.1 PWA shell — 2026-10-28 (`a992417`)

- `vite-plugin-pwa` ใน `vite.config.ts`: manifest (ชื่อ/สี/ไอคอน 64·192·512·maskable), `injectRegister: false` + ลงทะเบียนเองใน `features/offline/components/UpdatePrompt.tsx` (`useRegisterSW`)
- `registerType: 'prompt'` — ไม่ reload เองกลางการสั่งอาหาร (กันตะกร้าหาย)
- Workbox: precache ไฟล์ build ทั้งหมด, `maximumFileSizeToCacheInBytes` 4 MiB เพราะ `thailand-address.json` ~2.9 MB, `navigateFallback: '/index.html'`, deny `/api`
- **ไม่ได้แคช API ที่ service worker** — ตั้งใจให้ข้อมูลร้านเก็บใน IndexedDB (ยังไม่ทำ)
- ทดสอบ PWA ต้อง `npm run build` + `npm run preview` (dev ปิด service worker)

### 3.8 Void / Comp รายการอาหาร + PIN ผู้อนุมัติ — 2026-10-30 (`dc0bf7a`)

รายละเอียดเต็ม: `docs/void-comp-approval-guide.md`

- **Backend** `modules/orders/`:
  - `POST /orders/items/void` — `{ orderItemIds[], reason, approverPin }` · ต้องมี `void:approve`
  - `POST /orders/items/comp` — `{ orderItemIds[], reason, approverPin }` · ต้องมี `discount:approve`
  - route เดิมแบบต่อรายการ (`/orders/items/:id/void`) **ถูกลบ** → 404 (กันโค้ดเก่าเรียกค้าง)
  - `OrdersService.verifyApproverPin()` — PIN ของผู้จัดการ/เจ้าของร้าน**คนใดก็ได้ในร้าน**, ตรวจสิทธิ์ตาม permission key, PIN ผิดนับที่ "บัญชีที่กดขอ" 5 ครั้ง → 429 ล็อก 5 นาที, และเก็บตัวนับด้วย `DbContextService.durableQuery()` เพื่อไม่ให้ 403 rollback ลบตัวนับ
  - `void_order_item()` / `comp_order_item()` trigger ของ DB ตรวจ `has_permission(NEW.*_by, ...)` และ `*_by` จึงเก็บ **ผู้อนุมัติ** ไม่ใช่คนกด (คนกดไม่ได้ถูกบันทึก — ดู 8)
  - `OrdersModule` import `UsersModule`; `UsersRepository.recordPinFailureDurable()` + `DbContextService.durableQuery()` ถูกเพิ่มในรอบนี้
- **Frontend** `features/mainpos/`:
  - `components/ItemActionModal.tsx` — modal กลาง (PIN 6 หลัก + เหตุผล), a11y ครบ (label/aria), Esc/backdrop ปิด, scroll lock; `VoidItemModal` / `CompItemModal` เป็น wrapper บาง ๆ
  - ปุ่ม void/comp โผล่ทุกคน (สิทธิ์ยืนยันด้วย PIN ไม่ใช่ role) — prop `userRole` ถูกถอดออก
  - `api/orders.api.ts` — `voidOrderItems()` / `compOrderItems()`
  - `OrderSidebar.tsx` — badge `ให้ฟรี (COMP) n`, ยอดรวมไม่คิดรายการ comp, บรรทัด `ให้ฟรี (COMP) −฿`
  - `useOrderCartHydration.ts` + `pos.types.ts` — ติดธง `orderItemComped` ต่อรายการ
  - หลัง void/comp สำเร็จ `MainPOS.tsx` เรียก `refreshCartFromServer()` + toast
- **ทดสอบ**: `npx tsc --noEmit` / `npx tsc -b` ผ่าน · `npx eslint` สะอาดเฉพาะไฟล์ที่แตะ · `node backend/test/e2e/e2e-void-comp.mjs` = **31/31 ผ่าน** (รวมเคส employee ใช้ PIN ผู้จัดการ, lockout 429, route เก่า 404)

### 3.9 แก้บั๊ก register: `createOwner` สลับพารามิเตอร์ — 2026-10-30

- `UsersRepository.createOwner` เดิมประกาศ `(password, display_name, pin)` แต่ผู้เรียกส่ง `(password, pin, display_name)` → hash PIN ไปลง `display_name` และชื่อร้านไปลง `pin_hash`
- แก้ลำดับพารามิเตอร์ให้ตรงกับผู้เรียกแล้ว (`register.service.ts` ไม่ต้องแก้)
- **ผลกระทบถาวร**: ร้านที่สมัครก่อนแก้ยังมี hash อยู่ใน `display_name` และ PIN ใช้งานไม่ได้ — ซ่อมข้อมูลเดิมอัตโนมัติไม่ได้ ต้องแก้ด้วยมือถ้าจำเป็น (เช่น `admin_purge_tenant` แล้วสมัครใหม่ตอนเทสต์)

### 3.10 `shifts.verifyShift` — PIN lock คงทน + นับที่ผู้ขอ — 2026-10-30 (`02207bd`)

ของเดิม: นับครั้งผิดใน `catch` ของ transition error (ซึ่งรวม error ที่ไม่เกี่ยวกับ PIN) และเขียนผ่าน `db.query` ที่อยู่ใน transaction ของ request → 403 ทำให้ rollback ตัวนับหายทั้งหมด

- `verifyShift(shiftId, pin, requesterId?)`: ตรวจรูปแบบ PIN 6 หลัก → ตรวจ `pin_locked_until` ของ**ผู้ขอ** (429) → ตรวจสถานะกะ → หาเจ้าของ PIN จาก `findPinVerifiers()` (กรองคนถูกล็อกอยู่)
- PIN ไม่ตรง: `recordPinFailureDurable(requesterId, 5, 5)` แล้ว 403 (หรือ 429 ถ้าเพิ่งครบโควตา) — เดา PIN ข้ามบัญชีไม่ได้
- PIN ถูกแต่ transition ล้มเหลว (เช่น `invalid shift transition`, `must be verified by owner`): **ไม่นับครั้งผิด** แค่ map เป็น 409/403
- สำเร็จ: `clearPinFailuresForUser(requesterId)`
- `shifts.controller.ts` ส่ง `req.user?.sub` เข้า service แล้ว
- Spec `shifts.service.spec.ts` อัปเดตตามดีไซน์ใหม่ (ทั้งหมด 4 suites / 10 tests ผ่าน)

### 3.11 เอกสาร — 2026-10-30
- `AGENTS.md` (root) เขียนใหม่ทั้งไฟล์ — เดิมมี **conflict marker `<<<<<<<` ค้างอยู่ในไฟล์ committed**; ตอนนี้มีกติกา void/comp + durableQuery + รายชื่อ E2E ครบ
- `docs/AGENTS.md` เหลือเป็น pointer ไป root (กันสองชุดไม่ตรงกัน)
- `docs/HANDOFF.md` (ไฟล์นี้) เขียนใหม่จากสำเนาสุดท้ายที่ยังอ่านได้ (`7d73e71`) เพราะสำเนา `006b5b9` เพี้ยน encoding ทั้งไฟล์

### 3.12 `ShiftEscalationService` ทำงานจริง — 2026-10-30

- **อาการ**: log `[ShiftEscalationService] ไม่มี tenant context — route นี้ต้องผ่าน TenantContextInterceptor ก่อน` ทุก 5 นาที (เห็นที่ 14:08:59 / 14:13:49 / 14:18:49) และไม่มีกะไหนถูก escalate เลย
- **สาเหตุ**: service เรียก `this.db.query()` ซึ่งอ่าน client จาก AsyncLocalStorage ของ request — cron ไม่มี request จึง throw ทันที
- **ตรวจ DB ก่อนแก้**: `escalate_overdue_shifts()` เป็น `SECURITY DEFINER` (owner = `postgres`) ไล่ทุก tenant ด้วยตัวเองและข้าม RLS ได้ตามดีไซน์ (RLS ใช้ `ENABLE` ไม่ใช่ `FORCE`) — เรียกด้วย `pos_app` โดยไม่ตั้ง `app.current_tenant_id` แล้วได้ผลปกติ (คืน 0 ไม่ error)
- **แก้**: เปลี่ยนเป็น `db.referenceQuery()` (ใช้ pool ตรง ทำงานนอก request ได้) · log ที่ล้มเหลวเป็นระดับ `error` (เดิม `debug` จึงซ่อนบั๊ก) · เพิ่ม `onModuleDestroy` เคลียร์ timer + `unref()` · `run()` คืนจำนวนกะเพื่อ assert ในเทสต์
- **ทดสอบ**:
  - unit `backend/src/common/shift-escalation.service.spec.ts` — 4 tests ผ่าน (ยืนยันว่าใช้ `referenceQuery` ไม่ใช่ `query`, ทน `n` เป็น string, DB พังแล้วคืน 0)
  - E2E มือ: สร้างร้าน → เปิดกะ → ปิดด้วยยอดไม่ตรง (`pending_verification`) → ย้อน `closed_at` ไป 6 ชม. (เกณฑ์ 4 ชม.) → restart backend → 10 วินาทีถัดไป log `escalated 1 shift(s)` และ DB เป็น `status='escalated'`, `escalated_to` = owner ของร้าน
- ข้อควรรู้: service ยังเป็น `setInterval` ในโปรเซส — ถ้ารันหลาย instance พร้อมกัน ทุก instance จะเรียกฟังก์ชัน (ปลอดภัยเพราะ `FOR UPDATE` + เงื่อนไขสถานะ) แต่ถ้าอยากได้คิวเดียวควรย้ายไป `pg_cron`

---

## 4. งานค้าง P0

**ไม่มีงาน P0 ค้าง** — คงไว้เป็นบันทึกว่าอะไรเสร็จแล้ว

- P0-1 Reports + Payment — commit แล้ว (`da56495`, `4bd4ad4`)
- P0-2 PIN ผู้จัดการในหน้าผู้ใช้ — `bd022fe` + ใช้จริงใน void/comp/shift verify
- P0-3 หน้าพิมพ์ใบเสร็จ/พิมพ์ซ้ำ — `69ffbb2`
- P0-4 Void/Comp พร้อม PIN ผู้อนุมัติ — `dc0bf7a` (ดู 3.8)

---

## 5. งานค้าง P1 / P2

### P1 — ความถูกต้องและความปลอดภัย

1. **`POST /orders/sync` รับ `@Body() dto: any`** — ValidationPipe ไม่ตรวจ และ `createdBy` มาจาก body (ปลอมผู้สร้างบิลได้) ควรมี DTO + ใช้ user จาก JWT เหมือน `POST /orders` หรือเลิกใช้ถ้า PWA ส่งผ่าน `POST /orders` + add items
2. **ไม่มี login lockout / audit login** — `password_locked_until` ไม่ถูกใช้, `login_success` / `login_failed` ไม่ถูกเขียน (มีแค่ `logout`)
3. **ไม่มี `GET /users/me`, `POST /auth/pin-login`**
4. **`/:tenantSlug/homepage` ยังเป็น TODO**

### P2 — ฟีเจอร์ตาม scope

- **PWA shell**: manifest + service worker precache + update prompt + icons ทำแล้ว (`a992417`)
  - **ยังเหลือ**: IndexedDB (Dexie) แคช `GET /menu/full` / โต๊ะ / กะปัจจุบัน + outbox คิวออเดอร์ออฟไลน์
- **Reports ต่อยอด**: หน้ารายงานรายกะ/ประวัติกะ, ตัวกรอง `from`/`to`/`shiftId` บน UI (API รองรับแล้ว แต่ FE ส่งแค่ `period`), export
- **System Config UI ที่เหลือ** (หน้า VAT กับ Store ทำแล้ว)
- **Dashboard homepage**
- **Menu reorder endpoint**
- **Audit Log endpoint/UI**
- **Inventory polish**: ช่องค้นหาในการ์ดนับวัตถุดิบ, ใช้ business date แทน local date, note ใน `record_stock_count()` มีช่องว่างนำหน้า + ทศนิยม 4 ตำแหน่ง

### ปิดแล้ว (เคยอยู่ใน P1 — อย่าเปิดซ้ำ)

- `GET /shifts` สิทธิ์ผิด → แก้ใน `6b5c7d3`
- PIN lock เป็น memory Map / ไม่คงทน → เขียนลง DB ใน `6b5c7d3` (shifts) และ 2026-10-30 (orders + นับที่ผู้ขอ)
- `token_version` ไม่ถูกตรวจใน JWT guard → `6b5c7d3`
- ไม่มี cron `escalate_overdue_shifts()` → มี service แล้ว และ**ทำงานจริงแล้ว** 2026-10-30 (ดู 3.12)
- ไม่มี void/comp → 2026-10-30 (`dc0bf7a`)

---

## 6. คุณภาพ / เทสต์ / เอกสาร

| รายการ | สถานะล่าสุด (2026-10-30, branch `feat-aod`) |
|---|---|
| Backend `npx tsc --noEmit` | **ผ่าน** |
| Frontend `npx tsc -b` | **ผ่าน** |
| Frontend `npx vite build` | **ผ่าน** (มีคำเตือน chunk size) |
| Backend `npx jest` | **9 suites failed / 7 passed (9 tests failed / 22 passed / 31 total)** — ทั้งหมดที่แดงเป็น spec boilerplate เดิม (`app.controller` คาด `"Hello World!"`, `menu.*`, `payment.*`, `system-config.*`, `tenants.controller`, `permission-cache.*` ขาด DI mock) · ชุดที่แก้ต้องเขียว: `npx jest src/modules/shifts`, `npx jest src/common` |
| Backend `npx eslint "src/**/*.ts"` | ยังแดงหลายพัน problems (ส่วนใหญ่ prettier) — **อย่า auto-fix ปนกับ feature commit** |
| Frontend `npx eslint src` | ~40 problems เดิม (`react-hooks/set-state-in-effect`, `no-explicit-any` ใน `libs/appClient.ts`) — ไฟล์ที่แตะในงาน void/comp สะอาด |
| Backend e2e spec | `backend/test/app.e2e-spec.ts` ยังเป็น boilerplate (`"Hello World!"`) → ใช้ไม่ได้ |
| E2E ใน repo | `backend/test/e2e/`: `e2e-reports.mjs`, `e2e-receipt.mjs`, `e2e-public-tenant.mjs`, `e2e-token-version.mjs`, `e2e-void-comp.mjs` |
| E2E ที่ยังไม่อยู่ใน repo | สคริปต์ใน `%TEMP%\opencode\` ของเครื่องที่เขียน: `e2e-shift.mjs`, `e2e-stock-count-batch.mjs`, `e2e-floors.mjs`, `e2e-kds-badge.mjs` |

**ข้อควรระวังเวลาเทสต์**

- repo เป็น npm workspaces — `npm ci` ต้องรันที่ root ถ้ารันใน `backend`/`frontend` อย่างเดียว dependency จะไม่ครบและ `tsc` จะแดง
- E2E เขียนเป็น Node `.mjs` เท่านั้น (PowerShell ทำให้ UTF-8 เพี้ยน)
- **ห้ามอ่าน/เขียนไฟล์ไทยด้วย `Get-Content` / `Set-Content`** — console ทำให้เพี้ยน; ใช้ tool อ่าน/เขียนไฟล์ของ agent และตรวจด้วยการอ่านกลับ
- เทสต์สร้าง tenant ใหม่ (`inv-<stamp>`, `shift-<stamp>`, `rep-<stamp>`, `vc-<stamp>`) ค้างใน DB → ล้างด้วย `admin_purge_tenant` เมื่อจำเป็น
- `POST /register` จำกัด 3 ครั้ง / 5 นาที / IP → รัน E2E ซ้ำถี่จะโดน 429
- `e2e-void-comp.mjs` มีเทสต์ lockout 5 ครั้ง → **ต้องรันเป็นเคสสุดท้าย** (ล็อก owner ไว้ 5 นาที)
- E2E reports ต้องมี KDS ส่งอาหารจน `served` ก่อนจ่ายเงิน (PAY-03)

---

## 7. กติกาและ decision ที่ห้ามลืม

### UI / Design system
- bg `#FAF7F2`, accent `#8C6D58`, hover `#7a5c45`, text `#2D241E`, border `#d9c6b0` / `#E8DFD5`, font Kanit, `rounded-xl` / `rounded-2xl`
- ห้ามใช้ emoji เป็นไอคอน → ใช้ `lucide-react`
- ทุกจุดคลิกต้องมี `cursor-pointer`, hover transition 150–300 ms, focus state, label/aria ครบ

### Backend
- Response convention: `{ status: 'success', data: ... }`
- โครงสร้าง 3 ชั้น: controller → service → repository; `query` (ต้องมี request context) / `referenceQuery` (pool ตรง — เฉพาะตารางกลางที่ไม่มี RLS และฟังก์ชัน `SECURITY DEFINER` ที่ตั้งใจข้าม tenant) ตาม `docs/backend-dev-guide.md`
- ทุก endpoint ต้องมี permission guard + RLS ทำงานผ่าน `app_tenant_id()`
- Transaction: `DbContextService` เปิด `BEGIN` ต่อ request และ `COMMIT`/`ROLLBACK` ตอนจบ (`tenant-context.interceptor.ts`) — **งานที่ต้องรอดแม้ตอบ error ต้องใช้ `db.durableQuery()`** (เช่น ตัวนับ PIN ผิด)
- ต้องการสิทธิ์แบบ "อย่างใดอย่างหนึ่ง" ใช้ `@RequireAnyPermission(...)`

### Payment
- **ยอดเงิน/ภาษี/ส่วนลดมาจาก DB ทั้งหมด** — client และ NestJS ห้ามคำนวณยอดสุทธิเอง; `PaymentModal` แสดง `attempt.amount` จาก server
- Flow: `POST /payments/attempts` → `.../pay` หรือ `.../cancel`; ปิด modal ต้อง cancel attempt เสมอ
- เงินสด: `cashReceived` ≥ ยอด และทศนิยมไม่เกิน 2 ตำแหน่ง; QR: ห้ามส่ง `cashReceived`
- `pay` ซ้ำ = คืนใบเสร็จเดิม (idempotent)
- ต้องมีกะเปิดทั้งตอนสร้าง attempt และตอนจ่าย; รายการยังไม่ `served` → 409 (PAY-03)
- attempt ค้าง → 409 `PAYMENT_ATTEMPT_PENDING` + `paymentAttemptId`
- พิมพ์ซ้ำจำกัดตาม `max_reprints` (0 = ไม่จำกัด); ใบที่ 2 เป็นต้นไป `isCopy = true`

### Void / Comp
- ต้องมี PIN ผู้จัดการ/เจ้าของร้าน**ทุกครั้ง** — void = `void:approve`, comp = `discount:approve`; PIN ของใครก็ได้ในร้าน (ไม่ต้องสลับ login)
- `*_by` เก็บ **ผู้อนุมัติ** (DB trigger ตรวจ `has_permission(NEW.*_by, ...)`) — คนกดไม่ได้ถูกเก็บ
- PIN ผิดนับที่บัญชีผู้ขอ 5 ครั้ง / 5 นาที → 429; ตัวนับต้องเขียนด้วย `durableQuery`
- ปุ่มโผล่ทุกคน (สิทธิ์ยืนยันด้วย PIN) ไม่ผูกกับ role ใน UI
- รายการ comp ไม่ถูกคิดในยอดรวมบิล (ทั้ง FE ที่แสดง และ DB ที่คำนวณตอนจ่าย)
- รายละเอียด/สัญญา API: `docs/void-comp-approval-guide.md`

### Reports
- ทุก query กรอง `tenant_id = app_tenant_id()` และอ่านจาก `payments` / `cash_movements` / `shifts`
- `period`: `TODAY` | `WEEK` | `MONTH`; รายงานตามกะใช้ `shiftId` → เทียบ `business_date`
- `cashOnHand = opening_cash + cash_sales + cash_in − cash_out`
- ถ้าไม่ส่ง `shiftId`/`from`/`to` จะอิง `CURRENT_DATE` ของ DB ไม่ใช่ business date
- `top-items` และ `transactions` join ผ่าน `payment_attempt_orders`

### Shift / PIN
- Blind count: ไม่โชว์ยอดคาดหวังก่อนกดยืนยัน
- PIN ผู้จัดการ/เจ้าของร้านคนใดก็ได้ในร้าน; `verified_by` = เจ้าของ PIN; DB trigger ตรวจ `has_permission(NEW.verified_by, 'shift:verify')`
- `POST /shifts/:id/verify` รับ `{ pin }`, guard `@AnyAuthenticated()`; **นับ PIN ผิดที่บัญชีผู้ขอ** 5 ครั้ง → 429 ล็อก 5 นาที (เก็บใน DB)
- ปิดกะตอนยอดตรง = ปิดได้เลย; ยอดไม่ตรง = รอ manager/owner verify
- เปิดกะวันถัดไปได้แม้กะก่อนยังค้างตรวจสอบ
- ปิดกะไม่ได้ถ้ายังมีบิลเปิดค้างใน DB — ออเดอร์ออฟไลน์ที่ยังไม่ sync มองไม่เห็นจาก server

### Inventory
- Periodic Physical Count (INV-11): `record_stock_count()` คำนวณ delta จาก ledger
- Audit อัตโนมัติเมื่อเพี้ยน > `inventory_variance_alert_percent` (20%) และ > 1 หน่วย (INV-12)
- เตือนแต่ไม่บล็อกการปิดกะ

---

## 8. ข้อจำกัดที่รู้อยู่

- **ไม่บันทึกว่าใครเป็นคนกดขอ void/comp** — มีแค่ผู้อนุมัติ (`*_by`); ถ้าต้องการ audit เต็มต้องเพิ่มคอลัมน์ `requested_by` (ต้อง ALTER TABLE)
- **ร้านที่สมัครก่อนแก้บั๊ก `createOwner`** มี bcrypt hash ใน `display_name` และ PIN ใช้ไม่ได้ — ซ่อมข้อมูลเดิมอัตโนมัติไม่ได้
- `inventory_transactions` ไม่มี `shift_id` → ผูกการปรับวัตถุดิบกับกะไม่ได้ตรง ๆ
- `record_stock_count()` ไม่บันทึกแถวเมื่อ delta = 0
- Reports ที่ไม่ระบุ `shiftId` ใช้ `CURRENT_DATE` ของ DB ไม่ใช่ business date
- `POST /orders/sync` ยังไม่มี DTO
- ไม่มี `.env` ใน repo (มี `.env.example`)
- ประวัติ git ของไฟล์นี้เคยมีรหัสผ่าน DB ของเครื่อง dev — ถ้า repo เป็น public ให้ถือว่ารหัสนั้นรั่วแล้ว และเปลี่ยนรหัสผ่าน `pos_app` บนเครื่องที่ใช้รหัสนั้น

---

## 9. ลำดับที่แนะนำถัดไป

1. **เปิด PR `feat-aod` → `main`** — งาน void/comp + PIN lock + escalation commit แล้ว (อย่าเผลอ commit ไฟล์ที่ไม่เกี่ยว: `CategoryCard.tsx`, `MenuSidebar.tsx`, `package-lock.json` ที่ยังค้างใน working tree)
2. **P1 ที่เหลือ**: `/orders/sync` DTO + user จาก JWT, login lockout/audit, `GET /users/me`, `POST /auth/pin-login`
3. **P2**: offline data layer (Dexie + outbox) → Reports รายกะ/ตัวกรองวันที่ → Dashboard → Audit log → Menu reorder
4. ย้าย E2E 4 ตัวจาก `%TEMP%\opencode\` เข้า repo และเพิ่ม E2E ของ PIN ผ่าน UI (ตั้ง PIN → void/comp → verify กะ) + E2E escalation (ต้องต่อ DB เพื่อย้อน `closed_at`)

> ก่อนเริ่มงานทุกครั้ง: ดู `git status`, รัน `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) ให้ผ่านก่อน commit
