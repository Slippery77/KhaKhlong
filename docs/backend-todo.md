# PWA-POS Backend — แผนงานและรายการค้าง

อัปเดต: 2026-10-21

---

## สถานะรวม

**Infrastructure เสร็จและทดสอบแล้ว** — Database (28 ตาราง 3 view, 88/88 tests), RLS + tenant isolation (ทดสอบ 2 ร้านด้วย `pos_app`), Authentication, Authorization (401/403 ยืนยันแล้ว), Input validation, Security hardening

**เสร็จแล้ว** Menu (ครบทุก endpoint รวม modifier), Inventory, Shift, Dining Tables, KDS, System Config (PATCH), Store/Tenant (GET+PATCH), Auth (login/logout), Register, Users (POST)

**ค้างหลัก** Order (repository stubs), Payment (ยังไม่เริ่ม), Report (ยังไม่เริ่ม), Auth เพิ่มเติม (refresh, pin-login, users CRUD)

**เอกสารที่มี**

| ไฟล์ | เนื้อหา |
|---|---|
| `docs/setup-guide.md` | ติดตั้งเครื่องใหม่ |
| `docs/backend-dev-guide.md` | เครื่องมือ — `query` / `referenceQuery` / Interceptor / RLS |
| `docs/backend-coding-standard.md` | วิธีเขียน — 3 ชั้น, try/catch, DI, audit log |
| `docs/security-hardening-rationale.md` | ของที่ใส่ใน `main.ts` และเหตุผล |
| `docs/database-design-revision.md` | การตัดสินใจเรื่อง schema |
| `docs/data-dictionary-v2.md` | ทุกคอลัมน์ ทุกข้อจำกัด |
| `docs/business-rules-pos-updated.md` | กฎธุรกิจ |
| `docs/user-roles-permissions.md` | 25 permission, Owner 24 / Manager 19 / Employee 8 |
| `docs/scope_pwa_pos_v2_2.md` | ขอบเขตโครงงาน |

---

## แผนโมดูล 10 ตัว

```
1. Menu ──────────────┐
2. Config/Store ──────┤
3. Dining Tables ─────┼──→ 5. Order ──→ 6. KDS
4. Shift ─────────────┘        │
                               ↓
                          7. Payment ──→ 9. Report
8. Inventory (ขนานได้)
10. Auth เพิ่มเติม (ขนานได้)
```

---

### 1. Menu ✅ เสร็จแล้ว

ตาราง `categories`, `menu_items`, `modifier_groups`, `modifiers`, `menu_item_modifier_groups`

- [x] `POST /menu/category` — `menu:edit`
- [x] `PATCH /menu/category/:id` (แก้ชื่อ) — `menu:edit`
- [x] `PATCH /menu/category/:id/disable` · `/enable` — `menu:edit`
- [x] `GET /menu/category` — อ่านได้ทุก role
- [x] `POST /menu/items` — `menu:edit`
- [x] `PATCH /menu/items/:id` — `menu:edit`
- [x] `PATCH /menu/items/:id/availability` (หมดวันนี้) — `menu:edit`
- [x] `PATCH /menu/items/:id/disable` · `/enable` — `menu:edit`
- [x] `POST /menu/modifier-groups` + CRUD (PATCH, disable, enable) — `menu:edit`
- [x] `POST /menu/modifiers` + CRUD (PATCH, disable, enable) — `menu:edit`
- [x] `PUT /menu/items/:id/modifier-groups` — `menu:edit`
- [x] `GET /menu/full` — ทุกอย่างในก้อนเดียว สำหรับ cache ออฟไลน์
- [x] `GET /menu/admin` — สำหรับหน้าจัดการเมนู

**ค้างเล็กน้อย (cleanup)**
- [ ] `PATCH /menu/category/reorder` — `menu:edit` *(ยังไม่มี)*
- [ ] ระบุคอลัมน์แทน `RETURNING *` 2 จุด
- [ ] เอา `tenant_id` ออกจาก response 2 จุด
- [ ] เพิ่ม `menu.mapper.ts`
- [ ] ลบ import ที่ไม่ใช้ และ code ที่คอมเมนต์ไว้

---

### 2. Config / Store settings ✅ เสร็จแล้ว (บางส่วน)

ตาราง `system_config`, `config_definitions`, `tenants`

- [x] `PATCH /system-config/:key` — permission ตาม `owner_only` *(benz)*
- [x] `GET /system-config` — 9 รายการ *(benz — ต้องตรวจสอบว่า implement แล้ว)*
- [x] `GET /store` — ข้อมูลร้าน *(benz)*
- [x] `PATCH /store` — `store:configure` *(benz)*

**ค้าง**
- [ ] `tenant_updated` audit — ต้องเขียนเอง (1 ใน 4 ที่ trigger ทำไม่ได้)

---

### 3. Dining Tables ✅ เสร็จแล้ว + ขยายเพิ่ม

ตาราง `dining_tables`

- [x] `POST /tables` — `table:manage`
- [x] `GET /tables` — ผังโต๊ะ + สถานะ + **open_order_id, item_count, total_amount** · อ่านได้ทุก role
- [x] `GET /tables/:id` — อ่านได้ทุก role
- [x] `PATCH /tables/:id` — เลขโต๊ะ ความจุ ชั้น · `table:manage`
- [x] `PATCH /tables/:id/disable` · `/enable` — `table:manage`

**หมายเหตุ**
- `GET /tables` ทำ LEFT JOIN กับ `orders` + `order_items` เพื่อคืน order summary ไปพร้อมกัน
- สถานะโต๊ะเปลี่ยนอัตโนมัติผ่าน trigger `sync_table_status()` — ไม่มี endpoint เปลี่ยนมือ

---

### 4. Shift ✅ เสร็จแล้ว (benz)

ตาราง `shifts`, `cash_movements`

- [x] `POST /shifts/open` — `shift:open`
- [x] `GET /shifts/current` — อ่านได้ทุก role
- [x] `POST /shifts/:id/close` — `shift:close_and_count`
- [x] `POST /shifts/:id/verify` — `shift:verify`
- [x] `POST /shifts/:id/reopen` — `shift:reopen`
- [x] `POST /cash-movements` — `cash:movement`
- [x] `GET /cashbook` — ประวัติเงินเข้า-ออกประจำวัน

**ค้าง**
- [ ] `GET /shifts` — ประวัติกะทั้งหมด · `report:view_all` / `report:view_own_shift` *(ยังไม่มี)*

---

### 5. Order ⚠️ Controller มีแล้ว แต่ Repository ยัง stub

ตาราง `orders`, `order_items`, `order_item_modifiers`, `order_sequences`

- [x] `POST /orders` — เปิดบิล (`createOrder` ใน repository implement แล้ว)
- [x] `GET /orders/:id` — (`findOrderById` implement แล้ว)
- [x] `GET /orders?status=open` — controller มีแล้ว
- [x] `POST /orders/:id/items` — controller มีแล้ว
- [x] `PATCH /orders/:id/move-table` — controller มีแล้ว
- [x] `POST /orders/:id/close-unpaid` — controller มีแล้ว
- [x] `POST /orders/sync` — controller มีแล้ว

**Repository ที่ยังเป็น TODO stub — ต้องเขียน SQL**
- [ ] `findOpenOrders()` — `SELECT ... WHERE closed_at IS NULL` *(คืน `[]` ตลอด)*
- [ ] `addOrderItems()` — INSERT เข้า `order_items` + `order_item_modifiers`
- [ ] `moveTable()` — UPDATE `table_id`
- [ ] `closeUnpaid()` — UPDATE `closed_at`, `closed_by`, `close_reason`
- [ ] `syncOrders()` — Batch INSERT ... ON CONFLICT DO NOTHING

**3 ข้อที่ห้ามพลาด**
1. `order_id` และ `order_item_id` **มาจาก client** — อุปกรณ์สร้างด้วย `crypto.randomUUID()`
2. `INSERT ... ON CONFLICT DO NOTHING RETURNING ...` — ถ้าไม่คืนแถว ตอบ **200** พร้อมข้อมูลเดิม ไม่ใช่ 409
3. `order_number` มาจาก `order_sequences` (atomic counter) ออกตอนซิงค์ถึงเซิร์ฟเวอร์

**ยังไม่มี**
- [ ] `PATCH /orders/:id/items/:itemId/void` — `void:approve`
- [ ] `PATCH /orders/:id/items/:itemId/comp` — `discount:approve`

---

### 6. KDS ✅ เสร็จแล้ว

ตาราง `order_items` (partial index `idx_order_items_kds`)

- [x] `GET /kds/queue` — รายการที่ต้องทำ · `kds:mark_ready`
- [x] `PATCH /kds/items/:id/status` — 5 สถานะ · `kds:mark_ready`

**หมายเหตุ** ใช้ polling ไม่ใช่ SSE — วัดได้ 0.27 ms บน 28,800 รายการ

---

### 7. Payment ❌ ยังไม่เริ่ม

ตาราง `payment_attempts`, `payment_attempt_orders`, `payments`, `receipt_sequences`, `receipt_print_logs`

- [ ] `POST /payments/attempts` — เปิดความพยายามชำระ รวมหลายโต๊ะได้ · `payment:receive`
- [ ] `GET /payments/attempts/:id` — ยอดที่ต้องจ่าย + VAT + service · `payment:receive`
- [ ] `POST /payments/attempts/:id/pay` — บันทึกการจ่าย · `payment:receive`
- [ ] `GET /payments/:id/receipt` — จาก view `v_receipt_lines` · `payment:receive`
- [ ] `POST /payments/:id/reprint` — นับจำนวนครั้ง · `payment:receive`

**ห้ามพลาด**
- **ห้ามคำนวณ VAT, service charge, หรือยอดรวมใน NestJS** — DB ทำด้วย trigger ถ้าคำนวณซ้ำ trigger ปฏิเสธ
- `payments` append-only — `pos_app` แก้/ลบไม่ได้
- เลขใบเสร็จมาจาก `receipt_sequences` (atomic counter)
- `payment:edit_closed` ไม่มอบให้ role ใดเลย (INV-01)

---

### 8. Inventory ✅ เสร็จแล้ว

ตาราง `ingredients`, `inventory_transactions` + view `v_ingredient_stock`

- [x] `POST /ingredients` — สร้างวัตถุดิบ · `inventory:adjust`
- [x] `GET /ingredients` — รายการวัตถุดิบทั้งหมด
- [x] `GET /ingredients/:id` — รายละเอียดวัตถุดิบ
- [x] `PATCH /ingredients/:id` — แก้ไขวัตถุดิบ
- [x] `DELETE /ingredients/:id` — ลบ (soft delete) · `inventory:adjust`
- [x] `GET /inventory/stock` — ยอดคงเหลือจาก view · `inventory:check`
- [x] `GET /inventory/transactions` — ประวัติการเคลื่อนไหว
- [x] `POST /inventory/restock` — รับของ · `inventory:adjust`
- [x] `POST /inventory/waste` — ของเสีย · `inventory:adjust`
- [x] `POST /inventory/count` — นับยอดคงเหลือ (เรียก `record_stock_count()`) · `inventory:adjust`

---

### 9. Report ❌ ยังไม่เริ่ม

- [ ] `GET /reports/sales?from=&to=` — `report:view_all`
- [ ] `GET /reports/best-sellers` — `report:view_all`
- [ ] `GET /reports/shift/:id` — `report:view_own_shift`
- [ ] `GET /reports/payment-methods` — `report:view_all`

**หมายเหตุ** `report:view_own_shift` ต้องเขียน `WHERE` เองเพราะ RLS ไม่กรองให้ — เป็นที่เดียวในระบบที่ต้องกรองด้วยมือ

---

### 10. Auth เพิ่มเติม ⚠️ บางส่วนเสร็จแล้ว

ตาราง `refresh_tokens`, `users`, `audit_logs`

- [x] `POST /auth/login` — ใช้งานได้ ทดสอบ 2 ร้านผ่าน
- [x] `POST /auth/login-with-email` — *(benz)*
- [x] `POST /auth/logout` — เขียน audit `logout` *(benz)*
- [x] `POST /register` — สมัครร้านใหม่พร้อม owner
- [x] `POST /users` — สร้าง employee · `user:manage`
- [x] `GET /users/me` — commented out *(ต้องเปิดใช้)*

**ค้าง**
- [ ] `GET /users/me` — เปิด comment ออก (มีโค้ดแล้วแค่ comment ไว้)
- [ ] `POST /auth/refresh` — `refresh_tokens` table พร้อมแต่ยังไม่มีโค้ด
- [ ] `POST /auth/pin-login` — สลับผู้ใช้หน้าร้าน + ล็อกชั่วคราว
- [ ] `GET /users` · `PATCH /users/:id` — `user:manage`
- [ ] `PATCH /users/:id/role` — `role:assign`
- [ ] `GET /audit-logs` — `audit_log:view`
- [ ] `token_version` ใน JWT + เช็คใน guard + cache
- [ ] audit `login_success` / `login_failed`
- [ ] `@Controller('user')` → `'users'` (พหูพจน์ตาม REST)

---

## งานค้างที่ไม่ใช่โมดูล

### ต้องทำก่อนใช้งานจริง

| งาน | ไฟล์ | สถานะ |
|---|---|---|
| `ThrottlerGuard` ลงทะเบียนเป็น `APP_GUARD` | `app.module.ts` | ✅ ทำแล้ว |
| แก้วงเล็บ CORS | `main.ts` | ✅ ทำแล้ว |
| ลบ `express.json` ที่ไม่มีผล | `main.ts` | ✅ ทำแล้ว |
| `compression()` | `main.ts` | ✅ ทำแล้ว |
| `trust proxy` | `main.ts` | ✅ ทำแล้ว |
| `@Throttle` บน register | `register.controller.ts` | ❌ ยังไม่ทำ |
| `@MaxLength(72)` บน password | DTO files | ❌ ยังไม่ตรวจ |
| ข้อความ login ให้เหมือนกันทุกกรณี | `auth.service.ts` | ❌ ยังแยกอยู่ |
| `validationSchema` (Joi) ใน ConfigModule | `app.module.ts` | ❌ ยังไม่ทำ |
| `token_version` ใน JWT | `auth.service.ts`, `jwtAuth.guard.ts` | ❌ ยังไม่ทำ |
| ลด `expiresIn` จาก `1d` + refresh token | `auth.module.ts` | ❌ รอ refresh token ก่อน |

### เอกสารและเครื่องมือ

| งาน | สถานะ |
|---|---|
| ย้ายเอกสารจาก Claude project เข้า `docs/` | ✅ ทำแล้ว (2026-10-21) |
| Swagger setup + decorator ทุกโมดูล | ✅ ทำแล้ว (มี Swagger ครบทุก endpoint) |
| `.env.example` | ✅ มีอยู่แล้ว |
| `README.md` ที่ root | ❌ ยังไม่มี |
| Postman collection ลง repo | ❌ ยังไม่ทำ |
| ESLint + Prettier config | ❌ ยังไม่ทำ |
| Error catalog สำหรับ frontend | ❌ ยังไม่ทำ |

### e2e test — 8 ข้อที่คุ้มที่สุด

ยังไม่มี test เลย — `@nestjs/testing` + `supertest` มีใน `package.json` แล้ว

- [ ] ร้าน A ไม่เห็นข้อมูลร้าน B
- [ ] ร้าน A แก้ข้อมูลร้าน B ไม่ได้ (404)
- [ ] ไม่มี token ได้ 401
- [ ] employee ทำงานของ owner ได้ 403
- [ ] login ผิด 6 ครั้งได้ 429
- [ ] ส่ง field แปลกได้ 400
- [ ] สมัคร slug ซ้ำได้ 409 และไม่มีข้อมูลค้าง
- [ ] สร้างหมวดหมู่ชื่อซ้ำได้ 409

---

## PWA Frontend — สถานะ

| Feature | Backend | Frontend |
|---|---|---|
| Register | ✅ | ✅ |
| Login / Logout | ✅ | ✅ |
| หน้าโต๊ะ (Table Grid) | ✅ GET /tables + order summary | ✅ TablesPage, TableCard, useTables |
| POS หน้าหลัก + เมนู | ✅ GET /menu/full | ✅ MainPOS, MenuCard, OrderSidebar |
| Modifier popup | ✅ | ✅ |
| ส่งครัว (KDS) | ✅ GET /kds/queue, PATCH status | ✅ KDSPage (localStorage sync) |
| เปิด/ปิดกะ | ✅ | ✅ SiftworkPage |
| Inventory | ✅ | ✅ StockPage |
| Sale Report | ❌ ยังไม่มี backend | ✅ SaleReportPage (UI เท่านั้น) |
| Payment | ❌ ยังไม่เริ่ม | ⚠️ PaymentModal (mock เท่านั้น) |
| Order sync จริง | ⚠️ repository stubs | ⚠️ localStorage เท่านั้น |
| จัดการเมนู | ✅ | ✅ MenuEdit, ModifierEditor |
| ตั้งค่าร้าน | ✅ | ❌ ยังไม่มีหน้า |
| User management | ⚠️ POST only | ❌ ยังไม่มีหน้า |

---

## ลำดับที่แนะนำต่อจากนี้

1. **Order repository** — implement SQL stubs ใน `orders.repository.ts` (5 method) เพื่อให้ order ทำงานจริงบน DB
2. **Payment** — เริ่มหลัง order พร้อม เพราะต้องการ open order อยู่ก่อน
3. **Auth cleanup** — เปิด `GET /users/me`, เพิ่ม `GET/PATCH /users`, `token_version`
4. **Report** — ทำหลังสุด รอให้มีข้อมูลจริงจาก order + payment

---

## ล้างข้อมูลทดสอบ

> **คำเตือน** ลบร้านและข้อมูลทั้งหมดแบบย้อนกลับไม่ได้

```sql
SELECT admin_purge_tenant((SELECT tenant_id FROM tenants WHERE tenant_slug = 'test-a'));
SELECT set_config('app.allow_purge', 'off', false);
```

บรรทัดที่ 2 ห้ามลืม ร้านจริงใช้ `UPDATE tenants SET is_active = false` เท่านั้น
