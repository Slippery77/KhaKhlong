# HANDOFF — PWA-POS (ค้าคล่อง / KhaKhlong)

> ไฟล์นี้คือสรุปสถานะล่าสุดสำหรับ **เปิดแชทใหม่แล้วทำงานต่อ** โดยไม่ต้องเล่าบริบทใหม่
> อัปเดต: 2026-10-27 (ตรวจกับ `origin/main` = `78d3c8e` แล้ว) · ใช้แทน `docs/backend-todo.md` (ไฟล์นั้นล้าสมัยแล้ว)

## วิธีใช้ในแชทใหม่

พิมพ์ประโยคนี้เป็นข้อความแรก:

```text
อ่าน docs/HANDOFF.md ก่อน แล้วทำงานต่อจากหัวข้อ "9. ลำดับที่แนะนำถัดไป"
```

ถ้าอยากให้ทุกแชทใหม่รู้บริบทอัตโนมัติ ให้คัดสรุปย่อใส่ `AGENTS.md` ที่ root โปรเจกต์ (อัปเดตไว้แล้ว)

---

## 1. ข้อมูลโปรเจกต์

| รายการ | ค่า |
|---|---|
| Path | แต่ละเครื่องไม่เหมือนกัน (เครื่องเบนซ์ `D:\PWA-POS\`) |
| Branch | `main` (branch `feat-aod`, `feat-benz` ยังอยู่ และ ณ วันที่อัปเดตมีโค้ดเท่ากับ `main`) |
| HEAD | `origin/main` = `78d3c8e` — Merge pull request #15 from Slippery77/feat-benz (2026-10-27) |
| Remote | `https://github.com/Slippery77/PWA-POS.git` |
| Working tree | ณ `78d3c8e` งานทุกชิ้นในไฟล์นี้ถูก commit และ merge เข้า `main` แล้ว — ก่อนเริ่มงานให้รัน `git status` เช็คเครื่องตัวเองอีกครั้ง |
| Frontend | React + TypeScript + Vite + Tailwind v4 · dev port **5173** · proxy `/api` → `http://localhost:3000` |
| Backend | NestJS 11 · port **3000** · prefix `/api` · Swagger เปิด |
| Database | PostgreSQL 18 · db `pwa_pos` · user `pos_app` · รหัสผ่านอยู่ใน `.env` ของแต่ละเครื่อง (ห้ามเขียนรหัสจริงลงไฟล์นี้) |
| เอกสารคู่มือ | `docs/setup-guide.md`, `docs/backend-dev-guide.md`, `docs/backend-coding-standard.md`, `docs/payment-module-guide.md`, `docs/system-config-guide.md`, `docs/edit-vat-frontend-guide.md`, `docs/inventory-endpoint-guide.md`, `docs/shifts-endpoint-guide.md`, `docs/orders-endpoint-guide.md`, `docs/user-roles-permissions.md` |

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

# test
cd backend; npx jest              # ปัจจุบันยังแดง (ดูหัวข้อ 6)
cd backend; npx jest src/modules/inventory src/modules/shifts   # ชุดที่ผ่าน

# E2E (ต้องมี backend รันอยู่)
node backend/test/e2e/e2e-reports.mjs

# psql (ใส่รหัสผ่านของเครื่องตัวเองจาก .env)
$env:PGPASSWORD='<รหัสผ่าน pos_app จาก .env>'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U pos_app -d pwa_pos -c "SELECT 1;"
```

---

## 2. สถานะโมดูล

### เสร็จและใช้งานได้

- **Auth** — login/logout/refresh token, JWT guard, permission guard, RLS + tenant isolation · **store finder ที่ `/`** (จำรหัสร้านใน `localStorage`, ตรวจ slug กับ server ก่อนพาไป login)
- **Register** — สมัครร้านใหม่ (throttle 3 ครั้ง / 5 นาที / IP) · ตั้ง PIN เจ้าของร้านได้ตอนสมัคร (`PinInput`)
- **Menu** — หมวด/เมนู/ modifiers ครบ endpoint · หน้า Edit Menu ผูกเมนูกับกลุ่มตัวเลือกได้แล้ว (`linkModifier.tsx`)
- **Floors / Tables** — พื้นที่ โต๊ะ ผังร้าน
- **Orders** — create, list (open), get by id, add items (+kitchen ticket), move table, close-unpaid, sync (sync ยังรับ `any` — ดู P1)
- **Inventory** — stock view, movements (รับเข้า/ปรับ/ของเสีย), **count batch** (รอบล่าสุด)
- **Shifts** — open, current, close, verify (PIN ผู้จัดการ/เจ้าของ), reopen, cashbook, list
- **KDS** — คิวครัว + mark ready
- **System Config** — GET/PATCH (หน้า UI ใช้เฉพาะ VAT; ค่าอื่นยังไม่มีหน้าจอ)
- **Tenants / Store** — GET/PATCH + หน้า `setting/store` แล้ว
- **Users** — list, create, update, deactivate, reactivate · **ตั้ง PIN ได้ทั้งตอนสร้างและแก้ไข** (`UpdateUserDTO.pin` ตรวจ `/^\d{6}$/` + bcrypt) · `UserTable` แสดง badge `has_pin` (ไม่ส่ง `pin_hash` ออก API)
- **Roles / Permissions** — seed ครบ, employee 9 สิทธิ์
- **Payment** — `attempts` (จองบิล) → `pay` (เงินสด/QR) → `cancel`; ออกเลขใบเสร็จ, ดูใบเสร็จ, บันทึกการพิมพ์/พิมพ์ซ้ำ; UI `PaymentModal` 3 ขั้น ใช้ยอดจาก server เท่านั้น
- **Receipt (FE)** — `features/receipt/` พรีวิวกระดาษ 80mm + พิมพ์จริงผ่าน `window.print()`, ป้าย "สำเนา" ตาม `isCopy`, เคารพ `max_reprints` (409); เปิดได้จาก `PaymentModal` (หลังจ่าย) และ `BillDetailModal` (พิมพ์ซ้ำในรายงาน)
- **Reports** — `sales/summary`, `sales/by-period`, `sales/top-items`, `sales/transactions`, `sales/receipt/:id`; หน้า Sale Report ต่อ API จริงแล้ว
- **Store / VAT UI** — `StoreSettingPage` (GET/PATCH tenants) และหน้าแก้ VAT/service charge ผ่าน `/system-config`

### ยังไม่เริ่ม / ยังไม่ครบ

- **Audit Logs** — ไม่มี endpoint/UI (DB trigger เขียน audit บางเหตุการณ์ เช่น `trg_audit_users`, logout แต่ยังไม่มีหน้าดู)
- **PWA/Offline** — ไม่มี manifest, service worker, Workbox, Dexie (`frontend/package.json` ยังไม่มี dependency เหล่านี้)
- **Dashboard** — `/:tenantSlug/homepage` ยังเป็น `<div>Dashboard (TODO)</div>`
- **Reports เพิ่มเติม** — ยังไม่มีหน้ารายงานรายกะ/ประวัติกะ, ตัวกรองช่วงวันที่ และ export

---

## 3. งานรอบล่าสุด (2026-10-25 ถึง 2026-10-27)

### 3.1 Payment จริง + ปิดบิล (commit แล้ว)

- Commit หลัก: `4bd4ad4` (feat payment backend+frontend) → merge `76da899`, `92ac97f`
- Backend `backend/src/modules/payment/`:
  - `POST /payments/attempts` — สร้าง attempt, คำนวณยอดจาก server, ล็อกบิลกันเครื่องอื่นชำระซ้ำ
  - `GET /payments/attempts/:payment_attempt_id`
  - `POST /payments/attempts/:id/pay` — เงินสดต้องส่ง `cashReceived` และต้อง ≥ ยอด; QR ส่ง `{}`
  - `POST /payments/attempts/:id/cancel`
  - `GET /payments/:id/receipt`, `POST /payments/:id/print`
  - DB trigger เป็นผู้คำนวณยอด/ออกเลขใบเสร็จ/ปิดออเดอร์/คืนโต๊ะ
- Frontend: `hooks/usePayment.ts`, `components/PaymentModal.tsx`, `MainPOS.tsx` เปิด modal จากปุ่มชำระเงิน
- PromptPay QR: `014f434`, `4c9f8cc` (ช่องกรอก PromptPay ในหน้าตั้งค่าร้าน), `33a86f2` (แผง QR ใน payment modal)

### 3.2 Reports module (commit แล้วใน `da56495`)

- Backend ใหม่ทั้งโฟลเดอร์ `backend/src/modules/reports/` (controller/service/repository/dto) + ลงทะเบียนใน `app.module.ts`
- สิทธิ์: `@RequireAnyPermission('report:view_all', 'report:view_own_shift')` (เพิ่ม `RequireAnyPermission` ใน guard แล้ว)
- Frontend ใหม่ `frontend/src/features/saleReport/api/reports.api.ts`
- `SalesContext.tsx` เปลี่ยนจาก mock/localStorage → เรียก Reports API จริง; `BillDetailModal.tsx` และ `CashMovementForm.tsx` ต่อ API
- E2E `backend/test/e2e/e2e-reports.mjs` (ทดสอบ register → เปิดกะ → cash movement → ขาย → จ่ายเงิน → reports ครบ) อยู่ใน repo แล้ว

### 3.3 UI อื่นในรอบเดียวกัน (commit แล้ว)

- `29eac7e` — หน้า Store settings, helper ที่เกี่ยวข้อง, ปรับ UI หลายจุด
- `27a7e35` — เปิด popup เปิดกะอัตโนมัติเมื่อ login ครั้งแรกของวัน (หน้า Tables)
- Login/Register/Table page redesign จาก `feat-benz`

### 3.4 สถานะ commit ณ วันที่อัปเดต

งานที่หัวข้อเดิมเคยระบุว่า "ค้างใน working tree" ถูก commit และ merge เข้า `main` ครบแล้ว:

| Commit | เนื้อหา |
|---|---|
| `69ffbb2` | feat(receipt): พรีวิว 80mm, พิมพ์, พิมพ์ซ้ำ (รวม backend receipt fields + `e2e-receipt.mjs`) |
| `50657d4` | feat(auth): store finder + จำรหัสร้านล่าสุด (รวม `e2e-public-tenant.mjs`) |
| `8c8b867` | docs: บันทึกงานใบเสร็จและ store finder |
| `bd022fe` | feat(menu): ผูก modifier กับเมนู · feat(pin): ตั้ง/แก้ PIN ผู้ใช้ (ดู 3.7) |
| `78d3c8e` | Merge PR #15 (`feat-benz` → `main`) |

### 3.5 ใบเสร็จ + พิมพ์ซ้ำ (FE) — 2026-10-26

- Backend: `payment_cols` เพิ่ม `vat_rate_snapshot`, `service_charge_rate_snapshot`, `rounding_adjustment`; `toPaymentResponse` คืน `vatRate`, `serviceChargeRate`, `roundingAdjustment` (ใช้เป็น **ป้ายกำกับ** บนใบเสร็จเท่านั้น ไม่คำนวณซ้ำ) — คอลัมน์มีในสคีมาอยู่แล้ว **ไม่ต้อง ALTER TABLE**
- Frontend ใหม่ `frontend/src/features/receipt/`:
  - `ReceiptPaper` — กระดาษ 80mm (พื้นที่พิมพ์ 72mm) ใช้ตัวเดียวทั้งพรีวิวและแผ่นพิมพ์
  - `ReceiptModal` — พรีวิว + ปุ่มพิมพ์, ป้าย "สำเนา" ตาม `isCopy`, จัดการ 409 (`max_reprints`)
  - `useReceipt` / `receipt.api` — `GET /payments/:id/receipt` + `POST /payments/:id/print`
  - `receipt.print.css` — `@page { size: 80mm auto; margin: 4mm 2mm }` + ซ่อนทุกอย่างที่ไม่ใช่ `.receipt-print-area` (portal ใต้ `<body>`)
- ลำดับการพิมพ์: กดพิมพ์ → `POST /print` → `flushSync` ให้ป้าย "สำเนา" ลงกระดาษ → `window.print()`
- จุดเรียกใช้: `PaymentModal` step `done` (พิมพ์หลังจ่าย) และ `BillDetailModal` (พิมพ์ซ้ำจากรายงานยอดขาย)
- ทดสอบ: `npx tsc --noEmit` (backend) / `npx tsc -b` + `vite build` (frontend) ผ่าน; `node backend/test/e2e/e2e-receipt.mjs` ผ่านทุกข้อ (ใบเสร็จ, printCount/isCopy, max_reprints=2 → พิมพ์ได้ 3 ครั้ง ครั้งที่ 4 = 409, 404, 401, จ่ายซ้ำได้ใบเดิม)
- รายละเอียดเชิงออกแบบ: `docs/payment-module-guide.md` หัวข้อ 7.5

### 3.6 ทางเข้าเว็บ: store finder + จำรหัสร้านในเครื่อง (Phase 1) — 2026-10-27

ปัญหาเดิม: ต้องพิมพ์ URL `/{slug}/login` เอง, path `/` เป็นจอขาว, ปิดแท็บแล้วต้องจำ URL ใหม่, ฟอร์ม login แก้รหัสร้านไม่ได้

- Backend: `GET /api/public/tenants/:slug` (`modules/tenants/public-tenants.controller.ts`)
  - `@Public()` + throttle 20 ครั้ง/นาที · ตอบ `200 { status, data:{ slug, exists, active } }` เสมอ (ไม่ 404)
  - ไม่คืนชื่อร้าน/ข้อมูลอื่น → ลดการไล่เดารายชื่อร้าน; ตัวกันจริงยังเป็น RLS + `tenant_id` ใน token
  - ตรวจรูปแบบ slug ด้วย regex เดียวกับ `chk_tenant_slug_format` ก่อนยิง DB
- Frontend:
  - `features/auth/pages/store_finder_page.tsx` — route `/` (และ `/login`): ถ้าเครื่องเคยล็อกอิน → เด้ง `/{slug}/login` ทันที; ถ้าไม่เคย/กด "เปลี่ยนร้าน" (`?switch=1`) → หน้ากรอกรหัสร้าน + การ์ด "ร้านที่ใช้ล่าสุด" + ปุ่ม "ลืมร้านนี้"
  - `features/auth/tenantStorage.ts` — `saveLastTenantSlug` / `getLastTenantSlug` / `clearLastTenantSlug` (เก็บใน `localStorage` ไม่ใช่ session)
  - `features/auth/api/publicTenant.api.ts` — เรียก endpoint ข้างบน
  - `useLogin.ts` — บันทึก slug หลัง login สำเร็จ; logout กลับ `/` (ไม่พึ่ง `useParams`)
  - `login_form.tsx` — แถบ "รหัสร้าน" พับเก็บ/แก้ไขได้ + ลิงก์ "ไม่ใช่ร้านนี้? เปลี่ยนร้าน"
  - `AuthContext` — session หมดอายุแล้วไม่มี slug → กลับ `/` (เดิมเด้ง `/register` ซึ่งทำให้คนมีบัญชีแล้วหลง)
  - `AppRouter` — เพิ่ม `/`, `/login`, และ catch-all `*` → store finder
- ทดสอบ: `npx tsc --noEmit` / `npx tsc -b` + `vite build` ผ่าน · `node backend/test/e2e/e2e-public-tenant.mjs` ผ่านทุกข้อ (ร้านจริง = exists/active, ร้านมั่ว = false, slug ผิดรูปแบบ = false, ตัวพิมพ์ใหญ่ normalize ได้, ไม่ต้องมี token)
- **Phase 2/3 ที่ยังไม่ทำ:** login ด้วยอีเมล (`resolve_user_by_email` + DTO พร้อมแล้ว), device pairing + PIN

### 3.7 PIN ผู้ใช้ + ผูก modifier กับเมนู — 2026-10-27 (`bd022fe`)

- Backend:
  - `users/dto/updateUser.dto.ts` — เพิ่ม `pin?` ตรวจ `@Matches(/^\d{6}$/)`
  - `users.service.ts` — hash PIN ด้วย bcrypt ทั้งตอน create และ update; audit เขียนโดย trigger `trg_audit_users`
  - `users.repository.ts` / `user-response.dto.ts` — คืน `has_pin` (boolean) แทนการส่ง `pin_hash`
  - `register/dto/registerOwner.dto.ts` + `register.service.ts` — รับ PIN เจ้าของร้านตอนสมัคร
- Frontend:
  - `features/users/components/UserFormPopup.tsx` — ช่อง PIN ทั้งสร้างและแก้ไข · `UserTable.tsx` แสดง badge `has_pin`
  - `features/registerOwner/components/PinInput.tsx` — ช่องกรอก PIN ตอนสมัครร้าน
  - `features/editMenu/components/linkModifier.tsx` + `useAdminMenu.ts` + `menu_edit.tsx` — ผูกกลุ่มตัวเลือกกับเมนู · `mainpos/components/ModifierPopup.tsx` ปรับตาม
- ยังไม่มี: E2E ของการตั้ง/แก้ PIN และการรับรองกะด้วย PIN ที่ตั้งผ่าน UI

---

## 4. งานค้าง P0 — ต้องทำก่อนเดโม

**ไม่มีงาน P0 ค้าง** — ทั้ง 3 ข้อเสร็จและอยู่ใน `main` แล้ว (คงไว้เป็นบันทึก)

### P0-1. ✅ เสร็จแล้ว — Commit งาน Reports + Payment
- reports ทั้งชุดถูก commit ใน `da56495` (backend + FE + `e2e-reports.mjs`)
- ชุดใบเสร็จถูก commit ใน `69ffbb2` และ merge เข้า `main` แล้ว

### P0-2. ✅ เสร็จแล้ว — ช่อง PIN ผู้จัดการในหน้าผู้ใช้
- ทำใน `bd022fe` (ดูหัวข้อ 3.7): `UpdateUserDTO.pin` + bcrypt ใน `updateUser()` + ช่อง PIN ใน `UserFormPopup` + audit ผ่าน trigger
- เหลือ (ไม่บล็อกเดโม): ทดสอบผ่าน UI จริง — สร้าง manager → ตั้ง PIN → ปิดกะยอดไม่ตรง → รับรองด้วย PIN นั้น

### P0-3. ✅ เสร็จแล้ว — หน้าพิมพ์ใบเสร็จ / พิมพ์ซ้ำ (FE)
- ทำเสร็จตามหัวข้อ 3.5: `features/receipt/` + ปุ่มใน `PaymentModal` / `BillDetailModal`, พรีวิว 80mm, ป้าย "สำเนา", เคารพ `max_reprints`
- เหลือเป็น P1 (ไม่บล็อกเดโม): route `/receipt/:id` เปิดในแท็บใหม่, พิมพ์อัตโนมัติหลังจ่าย, โลโก้/ข้อความหัว-ท้ายใบเสร็จ (ต้อง `ALTER TABLE tenants` เพิ่ม `receipt_logo_url` / `receipt_header` / `receipt_footer`)

---

## 5. งานค้าง P1 / P2

### P1 — ความถูกต้องและความปลอดภัย

ทุกข้อด้านล่างตรวจกับโค้ดใน `78d3c8e` แล้ว (2026-10-27) ยังเป็นจริงอยู่

- **`GET /shifts` ใช้ `report:view_all`** (`shifts.controller.ts`) → employee ดูประวัติกะตัวเองไม่ได้ทั้งที่มี `report:view_own_shift` (ยืนยันจาก DB: employee มี 9 สิทธิ์ รวมตัวนี้)
- **PIN lock ไม่คงทน** — `findPinVerifiers()` อ่าน `pin_locked_until` แล้ว แต่ไม่มีโค้ดเขียนค่า `pin_failed_attempts` / `pin_locked_until`; ตอนนี้กันด้วย `Map` ใน memory (`shifts.service.ts` `pinAttempts`) → restart แล้วปลดล็อก, หลาย instance ไม่แชร์
- **ไม่มี cron `escalate_overdue_shifts()`** — ไม่มี `@nestjs/schedule`; สถานะ `escalated` ไม่เกิดอัตโนมัติ
- **`token_version` ไม่ถูกตรวจใน JWT guard** (`backend/src/modules/auth/guards/jwtAuth.guard.ts`) — users repository เพิ่ม `token_version` เมื่อเปลี่ยนรหัสผ่านแล้ว แต่ session เก่ายังใช้ได้
- **`POST /orders/sync` รับ `@Body() dto: any`** → ValidationPipe ไม่ตรวจ และ `createdBy` มาจาก body (client ปลอมผู้สร้างบิลได้ — ควรใช้ user จาก JWT เหมือน `POST /orders`); ควรเพิ่ม DTO + จำกัด batch หรือเลิกใช้ endpoint นี้ถ้า PWA ส่งคิวผ่าน `POST /orders` + add items (ตัดสินร่วมกับคนทำ PWA)
- **ไม่มี login lockout / audit login** — `password_locked_until` ไม่ถูกใช้, `login_success` / `login_failed` ไม่ถูกเขียน (มีแค่ `logout`)
- **ไม่มี `GET /users/me`, `POST /auth/pin-login`**
- **`/:tenantSlug/homepage` ยังเป็น TODO** — catch-all มีแล้ว (path แปลกกลับไปหน้า store finder)

### P2 — ฟีเจอร์ตาม scope

- **PWA/Offline**: manifest + service worker (Workbox) + IndexedDB (Dexie) + คิว sync ออเดอร์ — scope 3.2.11 กำหนด offline เฉพาะ Menu + Order
  - ตกลงแล้ว (2026-10-27): ออเดอร์ที่สั่งตอนออฟไลน์เข้าคิว **outbox** ในเครื่อง แล้วส่งเป็น `queued` (ส่งครัว) ตอน sync — ไม่ใช้สถานะ `draft`
  - ข้อมูลที่ต้องแคชแบบอ่านอย่างเดียว: `GET /menu/full`, รายการโต๊ะ, กะปัจจุบัน
  - ก่อนเริ่ม: ล็อก URL deploy ให้เสร็จก่อนทำ `manifest.json` (`start_url` ผูกกับ origin)
- **Reports ต่อยอด**: หน้ารายงานรายกะ/ประวัติกะ, ตัวกรอง `from`/`to`/`shiftId` บน UI (API รองรับแล้ว แต่ FE ส่งแค่ `period`), export
- **System Config UI ที่เหลือ** — หน้า VAT กับ Store ทำแล้ว; ค่าตั้งระบบอื่นยังไม่มีหน้าจอ
- **Dashboard homepage**
- **Orders**: void/comp รายการ (`void:approve`, `discount:approve`), sync DTO
- **Menu reorder endpoint** (ยังไม่มี)
- **Audit Log endpoint/UI**
- **Inventory polish**: ช่องค้นหาในการ์ดนับวัตถุดิบ, ใช้ business date แทน local date, แก้ note ใน `record_stock_count()` ที่มีช่องว่างนำหน้า + ทศนิยม 4 ตำแหน่ง

---

## 6. คุณภาพ / เทสต์ / เอกสาร

| รายการ | สถานะล่าสุด (2026-10-27, รันบน `78d3c8e` หลัง `npm ci` ที่ root) |
|---|---|
| Backend `npx tsc --noEmit` | **ผ่าน** |
| Frontend `npx tsc -b` | **ผ่าน** |
| Frontend `npx vite build` | **ผ่าน** (มีแค่คำเตือน chunk size) |
| Backend `npx jest` | **9 suites failed / 6 passed (9 tests failed / 16 passed / 25 total)** — `app.controller`, `permission-cache.service`, `menu.service`, `menu.controller`, `system-config.service`, `system-config.controller`, `tenants.controller`, `payment.service`, `payment.controller`; สาเหตุหลักคือ spec boilerplate ขาด DI mock และ `app.controller.spec` คาด `"Hello World!"` แต่ได้ `"Hello POS!"` |
| Backend `npx eslint "src/**/*.ts"` | **4,782 problems (4,718 errors, 64 warnings)** — ส่วนใหญ่ prettier formatting; ควรทำ commit แยก |
| Frontend `npx eslint src` | **40 problems (39 errors, 1 warning)** — หลัก ๆ `react-hooks/set-state-in-effect` ใน hooks หลายตัว + `@typescript-eslint/no-explicit-any` ใน `libs/appClient.ts` |
| Backend e2e | `backend/test/app.e2e-spec.ts` ยังเป็น boilerplate (ยิง `/` คาด `"Hello World!"`) → ใช้ไม่ได้ |
| E2E ที่อยู่ใน repo | `backend/test/e2e/`: `e2e-reports.mjs`, `e2e-receipt.mjs`, `e2e-public-tenant.mjs` |
| E2E ที่ยังไม่อยู่ใน repo | สคริปต์ใน `%TEMP%\opencode\` บนเครื่องที่เขียน: `e2e-shift.mjs`, `e2e-stock-count-batch.mjs`, `e2e-floors.mjs`, `e2e-kds-badge.mjs` — ควรย้ายเข้า `backend/test/e2e/` |

**ข้อควรระวังเวลาเทสต์**
- repo เป็น npm workspaces — `npm ci` ต้องรันที่ root ถ้ารันในโฟลเดอร์ `backend`/`frontend` อย่างเดียว dependency จะไม่ครบและ `tsc` จะแดง
- E2E ต้องเขียนเป็น Node `.mjs` เท่านั้น (PowerShell ทำ UTF-8 เพี้ยน)
- เทสต์จะสร้าง tenant ใหม่ (`inv-<stamp>`, `shift-<stamp>`, `rep-<stamp>`) ค้างใน DB → ล้างด้วย `admin_purge_tenant` เมื่อจำเป็น
- `POST /register` จำกัด 3 ครั้ง / 5 นาที / IP → รัน E2E ซ้ำถี่ ๆ จะโดน 429 (สคริปต์ reports มี fallback ใช้ tenant ล่าสุด)
- E2E reports ต้องรัน backend ที่ต่อ DB จริง และต้องมี KDS ส่งอาหารจน `served` ก่อนจ่ายเงิน (PAY-03)

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
- Transaction: batch ใดพังให้ rollback ทั้งชุด (ใช้ request เดียว) — `DbContextService` เปิด `BEGIN` ต่อ request และ `COMMIT`/`ROLLBACK` ตอนจบ (`tenant-context.interceptor.ts`)
- ต้องการสิทธิ์แบบ "อย่างใดอย่างหนึ่ง" ใช้ `@RequireAnyPermission(...)` (อย่าใช้ `@RequirePermissions` หลายตัวเพราะหมายถึงต้องมีครบ)

### Payment
- **ยอดเงิน/ภาษี/ส่วนลดมาจาก DB ทั้งหมด** — client และ NestJS ห้ามคำนวณยอดสุทธิเอง; `PaymentModal` แสดง `attempt.amount` จาก server
- Flow: `POST /payments/attempts` (จอง + ล็อกบิล) → `POST .../pay` (สำเร็จ + ออกใบเสร็จ + ปิดบิล + คืนโต๊ะ) หรือ `.../cancel`
- เงินสด: `cashReceived` ต้อง ≥ ยอด และทศนิยมไม่เกิน 2 ตำแหน่ง; QR: ห้ามส่ง `cashReceived`
- `pay` ซ้ำบน attempt ที่สำเร็จแล้ว = คืนใบเสร็จเดิม (idempotent) ไม่สร้าง payment ใหม่
- ต้องมีกะเปิดอยู่ทั้งตอนสร้าง attempt และตอนจ่าย; ถ้ารายการยังไม่ `served` → 409 (PAY-03)
- มี attempt ค้างอยู่ → 409 `PAYMENT_ATTEMPT_PENDING` พร้อม `paymentAttemptId`; UI ต้องเสนอปุ่มยกเลิกแล้วเริ่มใหม่
- ปิด modal ระหว่าง confirm ต้อง `cancel` attempt เสมอ ไม่งั้นบิลถูกล็อกและปิดกะไม่ได้
- พิมพ์ซ้ำจำกัดตาม `max_reprints` ของร้าน (0 = ไม่จำกัด); ใบที่ 2 เป็นต้นไป `isCopy = true`

### Reports
- ทุก query กรอง `tenant_id = app_tenant_id()` และอ่านจาก `payments` / `cash_movements` / `shifts` (ไม่คำนวณยอดใหม่)
- `period`: `TODAY` | `WEEK` | `MONTH`; รายงานตามกะใช้ `shiftId` → เทียบ `business_date`
- `cashOnHand = opening_cash + cash_sales + cash_in − cash_out`
- ถ้าไม่ส่ง `shiftId`/`from`/`to` จะอิง `CURRENT_DATE` ของ DB ไม่ใช่ business date — ระวังเวลาเทสต์ข้ามวัน
- `top-items` และ `transactions` ต้อง join ผ่าน `payment_attempt_orders` (บิลเดียวหลายโต๊ะได้)

### Shift / PIN
- Blind count: ไม่โชว์ยอดคาดหวังก่อนกดยืนยัน
- PIN ผู้จัดการ/เจ้าของร้าน **คนใดก็ได้ในร้าน**; `verified_by` = เจ้าของ PIN; DB trigger ตรวจ `has_permission(NEW.verified_by, 'shift:verify')`
- `POST /shifts/:id/verify` รับ `{ pin }`, guard `@AnyAuthenticated()`; ผิด 5 ครั้งต่อ `shift_id` → 429 ล็อก 5 นาที (in-memory)
- ปิดกะตอนยอดตรง = ปิดได้เลย; ยอดไม่ตรง = รอ manager/owner verify
- เปิดกะวันถัดไปได้แม้กะก่อนยังค้างตรวจสอบ (ไม่ block การขาย)
- ปิดกะไม่ได้ถ้ายังมีบิลเปิดค้างใน DB — **ออเดอร์ออฟไลน์ที่ยังไม่ sync มองไม่เห็นจาก server** (ต้องกันฝั่ง PWA)

### Inventory
- Periodic Physical Count (INV-11): นับของเหลือจริงสิ้นวัน, `record_stock_count()` คำนวณ delta จาก ledger
- Audit อัตโนมัติเมื่อเพี้ยน > `inventory_variance_alert_percent` (20%) และ > 1 หน่วย (INV-12)
- หน้าปรับวัตถุดิบแสดงวัตถุดิบ active ทั้งหมด แต่บันทึกเฉพาะช่องที่กรอก
- เตือนแต่ไม่บล็อกการปิดกะ

---

## 8. ข้อจำกัดที่รู้อยู่

- `inventory_transactions` ไม่มี `shift_id` → ผูกการปรับวัตถุดิบกับกะไม่ได้ตรง ๆ
- `record_stock_count()` ไม่บันทึกแถวเมื่อ delta = 0
- ตัวเลข "วันนี้ปรับยอดแล้ว N รายการ" อิงวันปฏิทินเครื่อง + นับเฉพาะ adjustment
- `GET /shifts` ยังใช้ `report:view_all` ทำให้ employee ดูกะตัวเองไม่ได้ (P1)
- PIN lock ยังเป็น memory Map; ฟิลด์ `pin_failed_attempts` / `pin_locked_until` ใน DB ยังไม่มีคนเขียน
- Reports ที่ไม่ระบุ `shiftId` ใช้ `CURRENT_DATE` ของ DB ไม่ใช่ business date
- `docs/backend-todo.md` และ `docs/daily-update-2026-10-21.md` ล้าสมัย — ใช้ไฟล์นี้แทน
- ไม่มี `.env` ใน repo (มี `.env.example`); ต้องคัดลอกและตั้งค่าเอง
- ประวัติ git ของไฟล์นี้เคยมีรหัสผ่าน DB ของเครื่อง dev อยู่ — ถ้า repo เป็น public ให้ถือว่ารหัสนั้นรั่วแล้ว และเปลี่ยนรหัสผ่าน `pos_app` บนเครื่องที่ใช้รหัสนั้น

---

## 9. ลำดับที่แนะนำถัดไป

1. **ทุกคน: sync เครื่องกับ `main`** — `git checkout main && git pull` (branch `main` ในเครื่องอาจตามหลัง `origin/main`)
2. **P1** แก้ backend tests ให้เขียว + frontend lint + สิทธิ์ `GET /shifts` + PIN lock ลง DB + `token_version` ใน JWT guard + `/orders/sync`
3. **P2** PWA offline → Reports รายกะ/ตัวกรองวันที่ → Dashboard → Orders void/comp → Audit log
4. ย้าย E2E 4 ตัวจาก `%TEMP%\opencode\` เข้า repo และเพิ่ม E2E ของ PIN (หัวข้อ 3.7)

> ก่อนเริ่มงานทุกครั้ง: `git status` ต้องรู้ว่ามีงานค้างอะไร, รัน `npx tsc --noEmit` (backend) และ `npx tsc -b` (frontend) ให้ผ่านก่อน commit
