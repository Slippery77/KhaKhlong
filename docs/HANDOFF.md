# HANDOFF — PWA-POS (ค้าคล่อง / KhaKhlong)

> ไฟล์นี้คือสรุปสถานะล่าสุดสำหรับ **เปิดแชทใหม่แล้วทำงานต่อ** โดยไม่ต้องเล่าบริบทใหม่
> อัปเดต: **2026-11-01** · branch `feat-aod` · `origin/main` = `b352de6` (2026-10-28) · ดู `git log` สำหรับ hash ล่าสุด
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
| เอกสารคู่มือ | `docs/setup-guide.md`, `docs/backend-dev-guide.md`, `docs/backend-coding-standard.md`, `docs/payment-module-guide.md`, `docs/void-comp-approval-guide.md`, `docs/cancel-order-guide.md`, `docs/system-config-guide.md`, `docs/edit-vat-frontend-guide.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/user-roles-permissions.md` |

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
node backend/test/e2e/e2e-cancel-order.mjs
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
- **Menu** — หมวด/เมนู/ modifiers ครบ endpoint · ผูกเมนูกับกลุ่มตัวเลือกได้ (`linkModifier.tsx`) · **รองรับรูปภาพเมนู (`menu_items.image_url`) ทั้งอัปโหลดไฟล์บีบอัด/URL พร้อมแสดงบนการ์ด POS และตารางตั้งค่าเมนู** (ดู 3.15)
- **Floors / Tables** — พื้นที่ โต๊ะ ผังร้าน
- **Orders** — create, list (open), get by id, add items (+kitchen ticket), move table, close-unpaid, sync · **void / comp รายการพร้อม PIN ผู้อนุมัติ** (ดู 3.8) · **ยกเลิกทั้งบิล + ปิดบิลลูกค้าหนี (walkout) พร้อม PIN และคืนโต๊ะได้จริง** (ดู 3.13 / `docs/cancel-order-guide.md`)
- **Inventory** — stock view, movements (รับเข้า/ปรับ/ของเสีย), **count batch** (รอบล่าสุด)
- **Shifts** — open, current, close, verify (PIN ผู้จัดการ/เจ้าของ), reopen, cashbook, list · **`GET /shifts` ใช้ `report:view_all` หรือ `report:view_own_shift` แล้ว** (employee เห็นกะตัวเอง) · **PIN lock เก็บใน DB** (คงทนข้าม restart) · **กะค้างรับรองเกิน `shift_escalation_hours` (default 4 ชม.) ถูก escalate หา owner อัตโนมัติ**
- **KDS** — คิวครัว + mark ready
- **System Config** — GET/PATCH (VAT, ตั้งค่าเครื่องพิมพ์ และการตั้งค่าการทำงานร้าน/กะ/สต็อก ครบถ้วนบน UI)
- **Tenants / Store** — GET/PATCH + หน้า `setting/store` พร้อมการ์ดตั้งค่าการทำงานร้านและกะ
- **Users** — **`GET /users/me` (`@AnyAuthenticated` คืนโปรไฟล์ + `permissions: string[]` + ข้อมูลร้าน `store`)** · list, create, update, deactivate, reactivate · ตั้ง PIN ได้ทั้งสร้างและแก้ไข (`UpdateUserDTO.pin` ตรวจ `/^\d{6}$/` + bcrypt) · `UserTable` แสดง badge `has_pin` (ไม่ส่ง `pin_hash` ออก API)
- **Roles / Permissions** — seed ครบ, employee 9 สิทธิ์
- **Payment** — `attempts` → `pay` → `cancel`; ออกเลขใบเสร็จ, ดู/พิมพ์ใบเสร็จ; UI `PaymentModal` 3 ขั้น ใช้ยอดจาก server เท่านั้น
- **Receipt (FE)** — `features/receipt/` พรีวิว 80mm + พิมพ์จริง, ป้าย "สำเนา" ตาม `isCopy`, เคารพ `max_reprints` (409)
- **Reports** — `sales/summary`, `sales/by-period`, `sales/top-items`, `sales/transactions`, `sales/receipt/:id` · **หน้ารายงานรอบด้านบน UI: ตัวกรองช่วงวันที่ (From - To), โหมดดูตามกะ (Shift Selector Dropdown), ส่งออกตารางธุรกรรมเป็น CSV (UTF-8 BOM ภาษาไทยไม่เพี้ยน)** (ดู 3.18)
- **Audit Logs (2026-11-01)** — `GET /api/audit-logs` สิทธิ์ `audit_log:view` (Owner, Manager ตาม AUD-05) + Pagination + Filter ตาม action_type, user_id, วันที่ (timezone Asia/Bangkok) + หน้า UI แยกใน Header MenuDropdown พร้อม Detail Modal คัดลอก JSON และ AuditRouteGuard สกัดพนักงาน (ดู 3.19)
- **Void / Comp (2026-10-30)** — batch endpoint + PIN ผู้อนุมัติ + audit ผ่าน trigger + FE modal + E2E 31 ข้อผ่าน
- **PWA shell** — `vite-plugin-pwa` + manifest + precache ทุกไฟล์ build + `navigateFallback '/index.html'` (deny `/api`) + แจ้งอัปเดตด้วย `UpdatePrompt` (`registerType: 'prompt'`, ไม่ reload เองกลางการสั่งอาหาร) + ไอคอน 64/192/512/maskable

### ยังไม่เริ่ม / ยังไม่ครบ

- **Offline data layer** — PWA shell พร้อมแล้ว แต่ยังไม่มี Dexie/IndexedDB แคชเมนู/โต๊ะ/กะ และยังไม่มี outbox คิวออเดอร์ (service worker ไม่แคช `/api` โดยตั้งใจ)
- **Reports เพิ่มเติม** — หน้ารายงานรายกะ, ตัวกรองช่วงวันที่บน UI, export
- *(หน้า Dashboard / Homepage `/:tenantSlug/homepage` ตัดออกจากขอบเขตแล้ว)*

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

### 3.13 ยกเลิกออเดอร์แล้วคืนโต๊ะ (Cancel Order / Walkout) — 2026-10-31

- **อาการ**: กด "ยกเลิก" รายการอาหารแล้วโต๊ะยังขึ้น "มีลูกค้า" ตลอดไป — FE เรียกแค่ `POST /orders/items/void` ไม่เคยปิดบิล (`orders.closed_at` ยัง NULL)
- **แนวทาง**: ไม่เปลี่ยน invariant "โต๊ะว่าง = ไม่มีบิลเปิด" (ไม่ให้สถานะโต๊ะอ้างอิง `order_items` เพราะเปิดช่อง double-booking) — เพิ่มเส้นทางปิดบิลที่ atomic + บังคับ PIN ผู้อนุมัติ
- **DB**: `PATCH_08_cancel_order.sql` — `orders.close_note`, บล็อก void รายการของบิลปิด (`order is closed`), audit `order_closed_unpaid` เก็บ note (apply ด้วย user `postgres` แล้ว + mirror `FULL_INSTALL.sql`)
- **Backend**:
  - `POST /orders/:id/cancel` — void ทุกรายการที่ยังไม่เสิร์ฟ + ปิดบิลใน transaction เดียว (`voided_all` / `empty`); served → `409 ORDER_HAS_SERVED_ITEMS`; attempt เปิด → `409 PAYMENT_ATTEMPT_OPEN`; ผู้อนุมัติต้องมี `void:approve`
  - `POST /orders/:id/close-unpaid` — route เปลี่ยนเป็น `order:create` และตรวจสิทธิ์ `order:close_unpaid` ที่ PIN ผู้อนุมัติ; `note` บังคับเมื่อ walkout และมีรายการ
  - `closed_by` = **ผู้อนุมัติ** (คนกดอยู่ใน `audit_logs.user_id`) — ใช้ convention เดียวกับ void/comp
  - `POST /tables/:id/sync-status` — เรียก `sync_table_status()` ตรง ๆ (`table:manage`)
  - `syncOrders` — `SAVEPOINT` ต่อใบ + ตอบ conflict รายใบ, `createdBy` ใช้จาก token; `moveTable` map `23505` → 409
- **Frontend**: `CancelBillModal` (โหมด cancel / closeUnpaid), ปุ่ม "ยกเลิกทั้งบิล" ใน `OrderSidebar`, เมนูจัดการโต๊ะใน `TableCard` (ยกเลิกทั้งบิล / walkout / sync), การ์ดโต๊ะแสดงจำนวนรายการ + ยอดค้าง, เอา KDS `cancelOrder` แบบ local-only ออก
- **ทดสอบ**: unit `backend/src/modules/orders/orders-cancel.spec.ts` (11 tests) · E2E `backend/test/e2e/e2e-cancel-order.mjs`
- **เอกสาร**: `docs/cancel-order-guide.md`

### 3.14 Login Lockout + Audit `login_success` / `login_failed` — 2026-10-31

- **Backend**:
  - `UsersRepository.recordPasswordFailureDurable` — นับรหัสผ่านผิดด้วย `durableQuery` ครบ 5 ครั้งติดกัน → ตั้ง `password_locked_until = now() + 5 mins` (หากล็อกเดิมหมดเวลาแล้วเริ่มนับรอบใหม่ที่ 1)
  - `UsersRepository.recordLoginSuccess` — ล้าง `password_failed_attempts = 0, password_locked_until = NULL` และอัปเดต `last_login_at = now()`
  - `UsersRepository.updateUser` — รีเซ็ตตัวนับและปลดล็อกรหัสผ่าน/PIN ทันทีเมื่อผู้จัดการ/เจ้าของร้านตั้งรหัสใหม่ให้พนักงาน
  - `AuthRepository.writeLoginSuccessAudit` / `writeLoginFailedAuditDurable` — บันทึก `login_success` และ `login_failed` (`user_not_found`, `account_deactivated`, `account_locked`, `invalid_password`) พร้อม IP และ User-Agent จริงจาก `AuthController`
  - `DbContextService.durableQuery` — คัดลอก context ทั้ง 5 ค่า (`tenant_id`, `user_id`, `role`, `client_ip`, `device_info`) ไปยัง durable connection
  - ขณะติดล็อก (`password_locked_until > now()`): ตอบ `429 Too Many Requests` (`code: 'ACCOUNT_LOCKED'`, `lockedUntil`, `remainingSeconds`)
- **Frontend**:
  - `useLogin.ts` + `login_form.tsx` — รองรับ `429 ACCOUNT_LOCKED` พร้อมตัวนับเวลาถอยหลังแบบเรียลไทม์ (`mm:ss`), ปิดปุ่มชั่วคราวจนกว่าจะครบกำหนดหรือเปลี่ยนชื่อผู้ใช้, แจ้งเตือนเมื่อเหลือโอกาสลอง ≤ 2 ครั้ง, และโฟกัสกล่องแจ้งเตือนอัตโนมัติตามหลัก Accessibility
- **ทดสอบ**: unit `backend/src/modules/auth/auth.service.spec.ts` (6 tests) · E2E `backend/test/e2e/e2e-login-lockout.mjs` (15/15 ผ่าน)

### 3.15 รูปภาพเมนูอาหาร (`menu_items.image_url`) + ปรับปรุง UX/UI POS & ตั้งค่าเมนู — 2026-10-31

- **DB**: `PATCH_09_menu_image.sql` (`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;`) + อัปเดต `FULL_INSTALL.sql`
- **Backend**:
  - `main.ts`: ตั้ง `app.useBodyParser('json', { limit: '2mb' })` เพื่อรองรับรูปบีบอัดแบบ Data URL
  - `CreateMenuItemDto` / `UpdateMenuItemDto` / `MenuItemResponse` / `MenuRepository` / `MenuService`: รองรับ `image_url?: string | null` ทั้งสร้าง แก้ไข ลบรูป (`null`) และส่งออกใน `GET /menu/full` กับ `GET /menu/admin`
- **Frontend**:
  - **หน้า POS (`MenuCard.tsx`, `MainPOS.tsx`, `ModifierPopup.tsx`)**: การ์ดเมนูแนวตั้งสัดส่วนรูป `4:3`, placeholder โทนอุ่นเมื่อไม่มีรูปหรือลิงก์เสีย, badge จำนวนในตะกร้า (`×N`), badge "ตัวเลือกเสริม", สถานะ "หมดวันนี้" (`!menu.isAvailable`) พร้อม overlay, และรูป thumbnail ใน `ModifierPopup`
  - **หน้าตั้งค่าเมนู (`menuFormPopup.tsx`, `listMenu.tsx`, `menu_edit.tsx`, `useAdminMenu.ts`)**: อัปโหลดไฟล์/ลากวางพร้อมย่อขนาดด้วย HTML5 Canvas (`<= 600x450px`, WebP/JPEG `0.82`) หรือวาง URL, live preview 4:3 + ปุ่มลบรูป, เลือกเปลี่ยนหมวดหมู่เมนูได้ตอนแก้ไข, รูป thumbnail `52x52px` หน้าชื่อเมนูในตาราง, และปุ่มกรองสถานะด่วน (`ทั้งหมด`, `พร้อมขาย`, `หมดวันนี้`, `เลิกขาย`)

### 3.16 Endpoint `GET /users/me` + Sync โปรไฟล์และสิทธิ์ใน `AuthContext` — 2026-10-31

- **Backend**:
  - `UsersController.getMe` (`GET /api/users/me` พร้อม `@AnyAuthenticated()`)
  - `UsersRepository.findMeById` + `UsersService.getMe`: คืนข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน (`user_id`, `username`, `display_name`, `role_name`, `has_pin`, `is_active`, `created_at`, `last_login_at`), รายการสิทธิ์ทั้งหมด (`permissions: string[]`), และข้อมูลร้าน (`store: { tenant_id, restaurant_name, tenant_slug }`) ภายใต้ RLS `app_tenant_id()`
- **Frontend**:
  - `AuthContext.tsx` + `authStorage.ts` + `auth.types.ts`: ดึงข้อมูลสดจาก `/users/me` อัตโนมัติทั้งตอน restore session และหลัง login พร้อมเพิ่มฟังก์ชัน `hasPermission(permissionKey)` และ `refreshUser()` ใน `useAuth()`
- **ทดสอบ**: unit `backend/src/modules/users/users.service.spec.ts` (3 tests) · E2E `backend/test/e2e/e2e-users-me.mjs` (20/20 ผ่าน)

### 3.17 ฟีเจอร์รวมโต๊ะคิดเงิน (Combined Table Payment) — 2026-10-31

- **ความต้องการ**: ลูกค้ามากลุ่มใหญ่ต้องแยกโต๊ะนั่ง สั่งอาหารแยกแต่ละโต๊ะ แต่ต้องการคิดเงินรวมเป็นบิลเดียว
- **Backend**:
  - `OrdersSummaryDTO` + `POST /payments/orders/summary`: ดึงยอดรวมและจำนวนรายการของหลายบิล (`orderIds: string[]`) จาก server ผ่าน `v_order_item_totals` ก่อนเริ่มชำระเงิน
  - `POST /payments/attempts` + `POST /payments/attempts/:id/pay`: รองรับหลายบิลอยู่แล้ว เมื่อจ่ายสำเร็จ trigger `trg_payments_after` จะปิดทุกบิล และ `sync_table_status` จะคืนทุกโต๊ะที่รวมบิลกลับเป็น `available` พร้อมกัน
  - `GET /payments/:id/receipt`: คืนข้อมูลโต๊ะทั้งหมด `tables: [{ orderNumber, tableNumber }]` บนใบเสร็จ
- **Frontend** (ออกแบบตาม `ui-ux-pro-max`):
  - **`TablesPage.tsx`**: ปุ่ม Toggle "รวมโต๊ะคิดเงิน" / "ยกเลิกรวมโต๊ะ", แถบลอยล่างจอ (Floating Action Bar) สรุปโต๊ะที่เลือก ดึงยอดรวมจาก server และปุ่ม "ชำระเงินรวม (N โต๊ะ)"
  - **`TableCard.tsx`**: โหมด `selectionMode` แสดง Checkbox มุมการ์ดโต๊ะที่มีลูกค้า (`occupied`), ไฮไลท์การ์ดที่ถูกเลือกด้วยกรอบและเงาสีกาแฟ `#8C6D58`, โต๊ะว่างจะถูกหรี่แสงลงและกดไม่ได้
  - **`PaymentModal.tsx`**: รองรับ prop `orderIds: string[]` และชื่อโต๊ะรวม เช่น "โต๊ะ 01 + 02", คำนวณยอดและชำระรวมได้โดยตรงบนหน้าผังโต๊ะ
  - **`usePayment.ts`**: เพิ่มฟังก์ชัน `getOrdersSummary(orderIds: string[])`
- **ทดสอบ**: E2E `backend/test/e2e/e2e-merge-tables-payment.mjs, e2e-audit-logs.mjs` (22/22 ผ่าน)

### 3.18 รายงานยอดขาย: ตัวกรองช่วงวันที่ (Date Range), โหมดดูตามกะ (Shift Selector), และส่งออก CSV (2026-11-01)

- **Backend**:
  - `ReportsRepository.getSalesByPeriod`: รองรับ `params.shiftId` โดยให้จัดกลุ่มเวลาเป็นรายชั่วโมง (`to_char(date_trunc('hour', p.paid_at), 'HH24:00')`) สอดคล้องกับพฤติกรรมยอดขายตลอดกะ
- **Frontend**:
  - `reports.api.ts`: รองรับพารามิเตอร์ `ReportQueryParams` (`period`, `from`, `to`, `shiftId`)
  - `shifts.api.ts`: เพิ่ม method `shiftsApi.list()` รองรับ pagination และการส่งออกข้อมูลกะ
  - `SalesContext.tsx`: จัดการ state `viewMode` (`PERIOD` vs `SHIFT`), `startDate`, `endDate`, `selectedShiftId`, `availableShifts` (ดึงจาก `res.data.items` อย่างปลอดภัยป้องกัน runtime error) พร้อม sync query parameter ไปยัง backend ครบทุก endpoint
  - `SalesHeader.tsx`: ปรับปรุงตามหลัก `ui-ux-pro-max`:
    - สวิตช์เลือกโหมด `ช่วงเวลา` หรือ `ตามกะ`
    - Date Range Picker แบบ Popover เลือกวันที่เริ่มต้น - สิ้นสุด พร้อมปุ่มล้าง/รีเซ็ต
    - Dropdown เลือกลิสต์กะ แสดง วันที่, ช่วงเวลาเปิด-ปิด, และชื่อพนักงาน
  - `SalesTransactionTable.tsx`: เพิ่มปุ่ม "ส่งออก CSV" มุมบนขวาของตาราง
  - `exportCsv.ts`: แปลงข้อมูลตารางประวัติธุรกรรมเป็นไฟล์ CSV พร้อมใส่ **UTF-8 BOM (`\uFEFF`)** เปิดใน Microsoft Excel ภาษาไทยไม่เป็นตัวต่างดาว
- **Doubt-Driven Fix**: แก้บั๊กหน้าจอขาว (White screen) จากการที่ response ของ `GET /shifts` คืน `{ items: [...] }` แต่ frontend คาดหวัง array โดยตรง และปรับปรุง type safety ของตัวเลขก่อน export CSV

---

### 3.19 บันทึกประวัติความปลอดภัย (Audit Logs) — Endpoint, UI ใน Header MenuDropdown, และ Route Guard (2026-11-01)

- **Backend**:
  - สร้างโมดูลใหม่ `backend/src/modules/audit-logs/`:
    - `AuditQueryDto`: รองรับ `page`, `limit` (max 100), `action_type`, `user_id`, `from`, `to`
    - `AuditLogsRepository.findAuditLogs`: กรอง `tenant_id = app_tenant_id()` เสมอ, แปลงเขตเวลา `(a.created_at AT TIME ZONE 'Asia/Bangkok')::date` ป้องกันปัญหา timezone หลุดช่วงเวลา, และ JOIN `users` เพื่อเอา `username` กับ `display_name`
    - `AuditLogsService` + `AuditLogsController`: กำกับด้วย `@RequirePermissions('audit_log:view')` ตามข้อกำหนด **AUD-05** อนุญาตเฉพาะ Owner และ Manager
- **Frontend** (ออกแบบตาม `ui-ux-pro-max`):
  - `Header.tsx`: เพิ่มเมนู **"ประวัติความปลอดภัย"** พร้อมไอคอน `ShieldCheck` ใน MenuDropdown แสดงเฉพาะบทบาท Owner และ Manager (พนักงานไม่เห็นเมนูนี้)
  - `AuditRouteGuard.tsx`: คุ้มครองเส้นทาง `/:tenantSlug/audit-logs` หากพนักงานพยายามเข้า URL ตรงๆ จะถูกสกัดด้วย `AccessDeniedPage` อย่างสุภาพและปลอดภัย
  - `AuditLogsPage.tsx`: ตารางข้อมูล Responsive (`overflow-x-auto`), ป้ายสถานะ Action Types สีสันตามหมวดหมู่, ตัวกรอง (Action Type, ผู้ใช้, วันที่เริ่มต้น-สิ้นสุด), ระบบป้องกัน Race condition จากการส่ง Request ถี่, และ `AuditDetailModal` แสดง JSON Metadata พร้อมปุ่ม "คัดลอก JSON"
  - `AppRouter.tsx`: แก้ไขบั๊ก Infinite redirect loop ใน `SettingIndexRedirect` ให้ใช้ Absolute path
- **ทดสอบ**:
  - E2E `backend/test/e2e/e2e-audit-logs.mjs` (14/14 ผ่าน) ตรวจสอบ Token, 403 Forbidden สำหรับ Employee, Pagination และการกรองข้อมูล
  - Typecheck (`tsc --noEmit`, `tsc -b`) และ Vite build ผ่าน 100%

---

### 3.20 ระบบตั้งค่าเครื่องพิมพ์และใบเสร็จ (Printer & Receipt Settings) + รองรับกระดาษ 80mm/58mm และ Auto-Print — 2026-11-01

- **สถาปัตยกรรมแบบผสม (Hybrid Storage)**:
  - **Store Policy (DB ผ่าน `system_config` & `config_definitions`)**:
    - `receipt_footer`: ข้อความส่วนท้ายใบเสร็จ (รองรับหลายบรรทัด)
    - `receipt_show_tax_id`: เปิด/ปิด แสดงเลขประจำตัวผู้เสียภาษี
    - `receipt_show_cashier`: เปิด/ปิด แสดงชื่อพนักงานแคชเชียร์
    - `receipt_show_address`: เปิด/ปิด แสดงที่อยู่และเบอร์โทรร้าน
    - `max_reprints`: โควตาพิมพ์ซ้ำสูงสุด (0 = ไม่จำกัด)
  - **Device Hardware Settings (`localStorage` ประจำเครื่อง)**:
    - `paper_size`: ขนาดกระดาษความร้อน (`80mm` พื้นที่พิมพ์ 72mm หรือ `58mm` พื้นที่พิมพ์ 48mm ย่อขนาดฟอนต์และระยะบรรทัดอัตโนมัติ)
    - `auto_print`: สวิตช์เปิด/ปิด สั่งพิมพ์ใบเสร็จอัตโนมัติทันทีเมื่อชำระเงินสำเร็จ
- **Backend**:
  - `PATCH_10_receipt_printer_config.sql` + อัปเดต `FULL_INSTALL.sql`
  - `SystemConfigRepository.updateValue`: ปรับเป็น UPSERT (`ON CONFLICT (tenant_id, config_key) DO UPDATE`) รองรับการอัปเดต key ใหม่ได้ทันทีโดยไม่ติด NotFound
  - `PaymentRepository.findStore`: ดึง `receipt_footer` และตัวเลือกการแสดงผลผ่าน `cfg()` ฟังก์ชันตรงจาก DB
  - `toReceiptResponse`: ส่งฟิลด์ `footer`, `showTaxId`, `showCashier`, `showAddress` ออก API `GET /payments/:id/receipt`
- **Frontend** (ออกแบบตามหลัก `ui-ux-pro-max` โทนคาเฟ่อบอุ่น `#FAF7F2` / `#8C6D58`):
  - `SettingNavBar.tsx`: เพิ่มแท็บ **"เครื่องพิมพ์"** ให้ทั้ง Owner และ Manager เข้าถึงได้
  - `PrinterSettingPage.tsx` (`/:tenantSlug/setting/printer`):
    - ฝั่งซ้าย: ฟอร์มเลือกขนาดกระดาษแบบการ์ด Visual Radio, สวิตช์ Auto-Print, ช่องโควตาพิมพ์ซ้ำ, กล่องข้อความท้ายใบเสร็จ, สวิตช์แสดงผลข้อมูลร้าน, และปุ่มบันทึก/พิมพ์ทดสอบ
    - ฝั่งขวา: **Live Receipt Preview** แสดงกระดาษใบเสร็จจำลองขนาด 80mm/58mm ที่ตอบสนองการเปลี่ยนแปลงการตั้งค่าแบบเรียลไทม์
  - `ReceiptPaper.tsx` & `receipt.print.css`: รองรับทั้ง 80mm (`w-[72mm]`) และ 58mm (`w-[48mm]` + ฟอนต์กะทัดรัด) และเคารพการเปิด/ปิดแสดงข้อมูล
  - `PaymentModal.tsx`: ผูกพฤติกรรม Auto-Print หากเปิดใช้งานจะเปิด `ReceiptModal` และสั่งพิมพ์ทันทีหลังชำระเงินสำเร็จ
- **Doubt-Driven Development Audit & Hardening (2026-11-01)**:
  - แก้ Auto-print Re-trigger Loop: แยก `autoPrintTriggered` state ทำงานแบบ One-shot เฉพาะหลังชำระเงินสำเร็จทันที ป้องกันการสั่งพิมพ์ซ้ำเมื่อกดดูใบเสร็จด้วยตนเอง
  - Print CSS Scope Isolation: กำกับ `body.is-printing-receipt` ตอนสั่งพิมพ์ ป้องกัน CSS print ทั่วไปซ่อนหน้าจอเว็บทั้งแอพเวลาผู้ใช้เผลอกด Ctrl+P
  - Multi-Tenant Web Storage Isolation: เติม namespace `khakhlong_${tenantSlug}_printer_*` ใน `localStorage` ป้องกันการตั้งค่าเครื่องพิมพ์ปนกันเมื่อล็อกอินสลับร้าน
  - ป้องกัน 58mm Horizontal Overflow: เติม `min-w-0 flex-1 break-words` ให้ชื่อรายการอาหารและ TotalRow ย่อข้อความยาวลงบรรทัดใหม่อย่างเรียบร้อย
  - Server Boundary Validation: เพิ่มตรวจสอบความยาว `receipt_footer` (จำกัด ≤ 500 อักขระ) และ `max_reprints` (ต้องเป็นจำนวนเต็มไม่ติดลบ) ปฏิเสธด้วย `400 Bad Request`
  - ป้องกันข้อความท้ายบิลกลับเป็นค่า Default: ตรวจสอบ empty string (`footer !== undefined ? footer : DEFAULT`) เพื่อให้เจ้าของร้านเคลียร์ข้อความท้ายบิลว่างเปล่าได้จริง
  - React State Sync & Race Condition: ย้ายการ sync server config ใน `PrinterSettingPage` เข้า `useEffect` พร้อม flag เช็คว่ามีการพิมพ์อยู่หรือไม่ และใช้ `flushSync` เพื่อให้ DOM ใบเสร็จจำลอง render ทันก่อนสั่ง `window.print()`
- **ทดสอบ**:
  - E2E `backend/test/e2e/e2e-printer-config.mjs` ผ่านครบทุกข้อ (ตรวจ GET/PATCH system-config, Boundary validation 400, เปิดบิล, เสิร์ฟ, จ่ายเงิน และ assert ใบเสร็จ)
  - E2E `backend/test/e2e/e2e-receipt.mjs` ผ่าน 12/12 ข้อ
  - Typecheck (`tsc --noEmit`, `tsc -b`) และ Vite build ผ่าน 100%

### 3.21 การตั้งค่าการทำงานของร้านและกะ (Store Operations & Shifts Config) — 2026-11-01

- **Frontend** (`ui-ux-pro-max`):
  - สร้างโมดูล `features/store/components/StoreOperationsConfigCard.tsx` และ Type `storeOperations.types.ts`
  - รวมเข้ากับการ์ดในหน้า `/:tenantSlug/setting/store` (`StoreSettingPage.tsx`) โดยแยกปุ่มบันทึกเฉพาะสำหรับการทำงานร้านเพื่อไม่ให้ปนกับข้อมูลทั่วไปของร้าน
  - ค่าที่รองรับ:
    - `business_day_start_hour`: ตัวเลือกชั่วโมงเริ่มวันขาย 00:00–23:00 น. (Default 05:00 น.) พร้อมคำอธิบายสำหรับร้านที่เปิดดึก/ข้ามคืน
    - `shift_escalation_hours`: ระยะเวลาส่งต่อกะค้างตรวจให้เจ้าของร้าน 1–168 ชม. (Default 4 ชม.) พร้อมปุ่มเลือกด่วน (2, 4, 8, 24 ชม.)
    - `inventory_variance_alert_percent`: เกณฑ์ส่วนต่างสต็อกแจ้งเตือน 0–1,000% (Default 20%) พร้อมปุ่มเลือกด่วน (10, 20, 30, 50%)
  - รองรับ Input Validation ทั้งฝั่ง Client และเชื่อมต่อ `PATCH /api/system-config/:key` พร้อมระบบตรวจจับการเปลี่ยนแปลง (`hasChanges`)
- **Doubt-Driven Development Audit & Hardening (2026-11-02)**:
  - **ป้องกัน POS ล่มกลางคัน (Mid-day Cutoff Paralysis)**: เพิ่ม Confirmation Modal แจ้งเตือนความเสี่ยงเรื่องกะค้างเมื่อมีการเปลี่ยน `business_day_start_hour` เพื่อให้เจ้าของร้านมั่นใจว่าปิดกะรอบวันแล้วเท่านั้นก่อนเปลี่ยน
  - **แก้ไข Controlled Input State (Backspace & Decimal Stripping)**: ปรับ State เป็น String input อนุญาตให้ลบจนว่างเปล่าได้ ไม่เด้งกลับเป็น 0 และรองรับการพิมพ์จุดทศนิยม `12.` โดยไม่ถูกตัดจุดออก
  - **แก้ไข Browser Decimal Constraint**: เติม `noValidate` ในฟอร์ม และรองรับ input `decimal` ไม่ให้เบราว์เซอร์บล็อกการส่งค่าทศนิยม
  - **แก้ไข State Desynchronization ผ่าน `Promise.allSettled`**: แยกบันทึกและอัปเดต `initialConfig` ทีละฟิลด์ที่สำเร็จจริง หากมีตัวใดล้มเหลวจะแจ้งเตือนรายตัวและสั่ง re-sync จากเซิร์ฟเวอร์ทันที
  - **ป้องกัน Auth Lifecycle Freeze & Silent Default Overwrite**: แก้บั๊ก loading ค้างเมื่อกู้คืน session และเพิ่มปุ่ม "โหลดใหม่ (Retry)" ป้องกันการบันทึกค่า default ทับข้อมูลจริงใน DB เมื่อเน็ตหลุด
  - **UI/UX & Accessibility Polish**: เพิ่มสถานะ disabled และ focus rings ให้ปุ่มเลือกด่วนครบถ้วน, แสดง badge เจ้าของร้านบนทุกขนาดหน้าจอ และมี Auto-dismiss timer 4 วินาทีสำหรับป้ายบันทึกสำเร็จ
- **ทดสอบ**:
  - Typecheck (`tsc --noEmit`, `tsc -b`) และ Vite build ผ่าน 100%
  - E2E `backend/test/e2e/e2e-printer-config.mjs` ยืนยันการทำงานของ System Config ครบถ้วน

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

**ไม่มีงาน P1 ค้าง** — เคลียร์ครบทุกข้อแล้ว (ดูรายการด้านล่าง)

### P2 — ฟีเจอร์ตาม scope

- **PWA shell**: manifest + service worker precache + update prompt + icons ทำแล้ว (`a992417`)
  - **ยังเหลือ**: IndexedDB (Dexie) แคช `GET /menu/full` / โต๊ะ / กะปัจจุบัน + outbox คิวออเดอร์ออฟไลน์
- **Reports ต่อยอด**: หน้ารายงานรายกะ/ตัวกรองวันที่/ส่งออก CSV เสร็จแล้ว (`3.18`); ยังเหลือ export สรุปภาพรวมแบบ PDF (ถ้าต้องการเพิ่ม)
- **System Config UI**: หน้า VAT, Store และ **หน้าตั้งค่าเครื่องพิมพ์และใบเสร็จ (Printer & Receipt Settings)** เสร็จสมบูรณ์แล้ว (ดู 3.20)
- **Menu reorder endpoint**
- **Inventory polish**: ช่องค้นหาในการ์ดนับวัตถุดิบ, ใช้ business date แทน local date, note ใน `record_stock_count()` มีช่องว่างนำหน้า + ทศนิยม 4 ตำแหน่ง

### ปิดแล้ว (เคยอยู่ใน P1 — อย่าเปิดซ้ำ)

- `GET /shifts` สิทธิ์ผิด → แก้ใน `6b5c7d3`
- PIN lock เป็น memory Map / ไม่คงทน → เขียนลง DB ใน `6b5c7d3` (shifts) และ 2026-10-30 (orders + นับที่ผู้ขอ)
- `token_version` ไม่ถูกตรวจใน JWT guard → `6b5c7d3`
- ไม่มี cron `escalate_overdue_shifts()` → มี service แล้ว และ**ทำงานจริงแล้ว** 2026-10-30 (ดู 3.12)
- ไม่มี void/comp → 2026-10-30 (`dc0bf7a`)
- ยกเลิกออเดอร์แล้วโต๊ะค้าง occupied → 2026-10-31 (cancel/close-unpaid + PIN, ดู 3.13)
- ไม่มี login lockout / audit login → 2026-10-31 (5 ครั้งล็อก 5 นาที + `login_success`/`login_failed` durable audit, ดู 3.14)
- `POST /orders/sync` ขาด DTO → เพื่อนร่วมทีมทำให้เสร็จแล้ว (2026-10-31)
- ไม่มี `GET /users/me` → 2026-10-31 (`@AnyAuthenticated` + `permissions: string[]` + `store` + sync เข้า `AuthContext`, ดู 3.16)
- `/:tenantSlug/homepage` และ `POST /auth/pin-login` → ตัดออกจากขอบเขตแล้ว

---

## 6. คุณภาพ / เทสต์ / เอกสาร

| รายการ | สถานะล่าสุด (2026-11-01, branch `feat-aod`) |
|---|---|
| Backend `npx tsc --noEmit` | **ผ่าน** |
| Frontend `npx tsc -b` | **ผ่าน** |
| Frontend `npx vite build` | **ผ่าน** (มีคำเตือน chunk size) |
| Backend `npx jest` | **9 suites failed / 7 passed (9 tests failed / 22 passed / 31 total)** — ทั้งหมดที่แดงเป็น spec boilerplate เดิม (`app.controller` คาด `"Hello World!"`, `menu.*`, `payment.*`, `system-config.*`, `tenants.controller`, `permission-cache.*` ขาด DI mock) · ชุดที่แก้ต้องเขียว: `npx jest src/modules/shifts`, `npx jest src/common`, `npx jest src/modules/auth`, `npx jest src/modules/users` |
| Backend `npx eslint "src/**/*.ts"` | ยังแดงหลายพัน problems (ส่วนใหญ่ prettier) — **อย่า auto-fix ปนกับ feature commit** |
| Frontend `npx eslint src` | ~40 problems เดิม (`react-hooks/set-state-in-effect`, `no-explicit-any` ใน `libs/appClient.ts`) — ไฟล์ที่แตะในงาน void/comp สะอาด |
| Backend e2e spec | `backend/test/app.e2e-spec.ts` ยังเป็น boilerplate (`"Hello World!"`) → ใช้ไม่ได้ |
| E2E ใน repo | `backend/test/e2e/`: `e2e-reports.mjs`, `e2e-receipt.mjs`, `e2e-public-tenant.mjs`, `e2e-token-version.mjs`, `e2e-void-comp.mjs`, `e2e-cancel-order.mjs`, `e2e-login-lockout.mjs`, `e2e-users-me.mjs`, `e2e-merge-tables-payment.mjs`, `e2e-audit-logs.mjs`, `e2e-printer-config.mjs` |
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
- ไม่มี `.env` ใน repo (มี `.env.example`)
- ประวัติ git ของไฟล์นี้เคยมีรหัสผ่าน DB ของเครื่อง dev — ถ้า repo เป็น public ให้ถือว่ารหัสนั้นรั่วแล้ว และเปลี่ยนรหัสผ่าน `pos_app` บนเครื่องที่ใช้รหัสนั้น

---

## 9. ลำดับที่แนะนำถัดไป

1. **เปิด PR `feat-aod` → `main`** — งาน P0 และ P1 ทั้งหมด (`void/comp`, `PIN lock`, `escalation`, `cancel/walkout`, `login lockout`, `menu image`, `GET /users/me`) เสร็จครบแล้ว
2. **P2 ที่เหลือ**: offline data layer (Dexie + outbox) → Menu reorder → Inventory polish (Audit logs 3.19 และ Printer & Receipt Settings 3.20 เสร็จเรียบร้อยแล้ว)
4. ย้าย E2E 4 ตัวจาก `%TEMP%\opencode\` เข้า repo และเพิ่ม E2E ของ PIN ผ่าน UI (ตั้ง PIN → void/comp → verify กะ) + E2E escalation (ต้องต่อ DB เพื่อย้อน `closed_at`)

> ก่อนเริ่มงานทุกครั้ง: ดู `git status`, รัน `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) ให้ผ่านก่อน commit
