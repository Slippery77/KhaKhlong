# PWA-POS Backend — แผนงานและรายการค้าง

อัปเดต: 2026-10-04

---

## สถานะรวม

**Infrastructure เสร็จและทดสอบแล้ว** — Database (28 ตาราง 3 view, 88/88 tests), RLS + tenant isolation (ทดสอบ 2 ร้านด้วย `pos_app`), Authentication, Authorization (401/403 ยืนยันแล้ว), Input validation, Security hardening

**กำลังทำ** Menu module

**เอกสารที่มี**

| ไฟล์ | เนื้อหา |
|---|---|
| `claude/setup-guide.md` | ติดตั้งเครื่องใหม่ |
| `claude/backend-dev-guide.md` | เครื่องมือ — `query` / `referenceQuery` / Interceptor / RLS |
| `claude/backend-coding-standard.md` | วิธีเขียน — 3 ชั้น, try/catch, DI, audit log |
| `claude/security-hardening-rationale.md` | ของที่ใส่ใน `main.ts` และเหตุผล |
| `claude/database-design-revision.md` | การตัดสินใจเรื่อง schema |
| `claude/data-dictionary-v2.md` | ทุกคอลัมน์ ทุกข้อจำกัด |
| `business-rules-pos-updated.md` | กฎธุรกิจ |
| `user-roles-permissions.md` | 25 permission, Owner 24 / Manager 19 / Employee 8 |
| `scope_pwa_pos_v2_2.md` | ขอบเขตโครงงาน |

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

### 1. Menu — กำลังทำ · ประมาณ 2 วัน

ตาราง `categories`, `menu_items`, `modifier_groups`, `modifiers`, `menu_item_modifier_groups`

- [/] `POST /menu/category` — `menu:edit`
- [/] `PATCH /menu/category/:id` (แก้ชื่อ) — `menu:edit`
- [/] `PATCH /menu/category/:id/disable` · `/enable` — `menu:edit`
- [ ] `PATCH /menu/category/reorder` — `menu:edit`
- [/] `GET /menu/category` — อ่านได้ทุก role
- [/] `POST /menu/items` — `menu:edit`
- [/] `PATCH /menu/items/:id` — `menu:edit`
- [ ] `PATCH /menu/items/:id/availability` (หมดวันนี้) — `menu:edit`
- [ ] `PATCH /menu/items/:id/disable` · `/enable` (เลิกขายถาวร) — `menu:edit`
- [ ] `POST /menu/modifier-groups` + CRUD — `menu:edit`
- [ ] `POST /menu/modifiers` + CRUD — `menu:edit`
- [ ] `PUT /menu/items/:id/modifier-groups` — `menu:edit`
- [ ] **`GET /menu/full`** — ทุกอย่างในก้อนเดียว สำหรับ cache ออฟไลน์

**หมายเหตุ**
- `is_available` (หมดวันนี้) กับ `is_active` (เลิกขายถาวร) แยก endpoint — ความหมายต่างกัน
- `menu_price_updated` เข้า audit อัตโนมัติด้วย trigger ไม่ต้องเขียนเพิ่ม
- `uq_categories_name` และ `uq_menu_items_name` เป็น partial index (`WHERE is_active`) — ชื่อที่เลิกใช้แล้วเอากลับมาใช้ได้
- `GET /menu/full` ควรคืน `updated_at` สูงสุดด้วย เพื่อให้ frontend ทำ cache invalidation

**ค้างให้แก้ในโมดูลนี้**
- [/] `createMenu()` ใน repository — SQL ไม่สมบูรณ์ **ลบทิ้ง** แล้วเขียนใหม่
- [/] `createCategory` — ตัดการเช็คก่อน INSERT ออก ใช้ catch `23505`
- [/] `setCategoryActive` — ตัด `findCategoryById` ออก ใช้ `UPDATE ... RETURNING` ตรวจ null
- [ ] `RETURNING *` 2 ที่ — ระบุคอลัมน์
- [ ] `tenant_id` ใน response 2 ที่ — เอาออก
- [ ] เพิ่ม `menu.mapper.ts`
- [ ] `CategoryDTO` เพิ่ม `@MaxLength(100)`
- [ ] ลบ import ที่ไม่ใช้ (`Pool`, `Inject`, `MenuDto`)
- [ ] ลบ code ที่คอมเมนต์ไว้ 3 ที่

### 2. Config / Store settings — ประมาณ 1 วัน

ตาราง `system_config`, `config_definitions`, `tenants`

- [ ] `GET /config` — 9 รายการพร้อม definition (ชนิด ช่วงค่า ใครแก้ได้)
- [ ] `PATCH /config/:key` — permission ตาม `owner_only`
- [ ] `GET /store` · `PATCH /store` — `store:configure`

**หมายเหตุ**
- permission ของ `PATCH /config/:key` ขึ้นกับ `owner_only` ใน `config_definitions` **ไม่ใช่ hardcode** — อ่านค่ามาตัดสินใน service ไม่ใช่แปะ decorator ตายตัว
- trigger ใน DB เช็คสิทธิ์ซ้ำอยู่แล้ว (CFG-04)
- `config_updated` เข้า audit อัตโนมัติ
- `tenant_updated` **ต้องเขียน audit เอง** (1 ใน 4 ประเภทที่ trigger ทำไม่ได้)
- ระบบทำงานได้โดยยังไม่มีหน้าตั้งค่า เพราะ trigger อ่าน config เองผ่าน `cfg()` — เลื่อนได้ถ้าจำเป็น

### 3. Dining Tables — ประมาณ 1 วัน (Aod)

ตาราง `dining_tables` (ชื่อตารางคือ `dining_tables` ไม่ใช่ `tables`)

- [ ] `POST /tables` — `table:manage`
- [ ] `GET /tables` — ผังโต๊ะ + สถานะ · อ่านได้ทุก role
- [ ] `PATCH /tables/:id` — เลขโต๊ะ ความจุ ชั้น · `table:manage`
- [ ] `PATCH /tables/:id/disable` · `/enable` — `table:manage`

**หมายเหตุ**
- **ไม่มี endpoint เปลี่ยนสถานะโต๊ะโดยตรง** สถานะเปลี่ยนเองจากการเปิด/ปิดบิล ถ้าทำให้กดเปลี่ยนมือได้จะขัดกับ state machine
- รองรับการแบ่ง "ชั้น" (`floor`) ไม่รองรับ "โซน" ในเวอร์ชันนี้ (TBL-08/09/10)
- `table_status_changed` เข้า audit อัตโนมัติ

### 4. Shift — ประมาณ 2 วัน

ตาราง `shifts`, `cash_movements`

- [ ] `POST /shifts/open` — `shift:open`
- [ ] `GET /shifts/current` — อ่านได้ทุก role
- [ ] `POST /shifts/:id/close` — กรอกยอดนับได้ · `shift:close_and_count`
- [ ] `POST /shifts/:id/verify` — `shift:verify`
- [ ] `POST /shifts/:id/reopen` — ต้องระบุเหตุผล · `shift:reopen`
- [ ] `POST /cash-movements` — `cash:movement`
- [ ] `GET /shifts` — ประวัติ · `report:view_all` / `report:view_own_shift`

**หมายเหตุ**
- `reopen_shift(shift, user, reason)` เป็นฟังก์ชันใน DB **เรียกตรง** ไม่ต้องเขียน logic เอง
- มี partial unique index (`WHERE is_open`) กันเปิดกะซ้อน
- ยอดตรงปิดกะอัตโนมัติ ยอดไม่ตรงต้องรอ verify
- เปิดกะวันถัดไปได้แม้กะก่อนยังค้าง verify (ไม่ block การขาย)
- **เปิดกะใหม่ไม่ได้ถ้าผ่าน verify แล้ว** — ถือเป็นหลักฐานทางบัญชีที่ปิดแล้ว
- `shift_reopened` เข้า audit อัตโนมัติ

### 5. Order — ประมาณ 4-5 วัน · ยากและสำคัญสุด

ตาราง `orders`, `order_items`, `order_item_modifiers`, `order_sequences`

- [ ] `POST /orders` — เปิดบิล · **รับ `order_id` จาก client** · `order:create`
- [ ] `GET /orders/:id` — `order:create`
- [ ] `GET /orders?status=open` — `order:create`
- [ ] `POST /orders/:id/items` — **รับ `order_item_id` จาก client** · `order:create`
- [ ] `PATCH /orders/:id/items/:itemId/void` — `void:approve`
- [ ] `PATCH /orders/:id/items/:itemId/comp` — `discount:approve`
- [ ] `PATCH /orders/:id/move-table` — `order:create`
- [ ] `POST /orders/:id/close-unpaid` — `order:close_unpaid`
- [ ] **`POST /orders/sync`** — รับ array สำหรับซิงค์ออฟไลน์ · `order:create`

**3 ข้อที่ห้ามพลาด — กระทบ offline โดยตรง**

1. `order_id` และ `order_item_id` **มาจาก client** ไม่ใช่ DB default — อุปกรณ์สร้างด้วย `crypto.randomUUID()` ตอนออฟไลน์ (scope §3.2.11)
2. `INSERT ... ON CONFLICT (order_id) DO NOTHING RETURNING ...` — ถ้าไม่คืนแถว แปลว่ามีอยู่แล้ว ตอบ **200** พร้อมข้อมูลเดิม **ไม่ใช่ 409** เพราะการซิงค์ซ้ำเป็นเรื่องปกติที่คาดไว้
3. `order_number` มาจาก `order_sequences` (atomic counter) ออกตอน**ซิงค์ถึงเซิร์ฟเวอร์** ไม่ใช่ตอนสร้างบิลที่อุปกรณ์

**ถ้าออกแบบให้ server สร้าง `order_id` แล้วคืนมา จะทำออฟไลน์ไม่ได้เลย และต้องรื้อ API ทั้งโมดูล**

**หมายเหตุอื่น**
- `order_closed_unpaid` เข้า audit อัตโนมัติ
- void ตอนครัวกำลังทำ (`preparing`) ต้องมี `void:approve` และ trigger เช็คซ้ำที่ DB
- Comp = ปรับราคาเป็น 0 ไม่ใช่ลบรายการ รายการยังอยู่ใน audit trail
- ไม่รองรับ Split Bill ในเวอร์ชันนี้

### 6. KDS (จอครัว) — ประมาณ 1-2 วัน

ตาราง `order_items` (มี partial index `idx_order_items_kds` เตรียมไว้แล้ว)

- [ ] `GET /kds/queue` — รายการที่ต้องทำ · `kds:mark_ready`
- [ ] `PATCH /kds/items/:id/status` — 5 สถานะ · `kds:mark_ready`

**หมายเหตุ**
- ใช้ **polling** ไม่ใช่ SSE/WebSocket — วัดไว้ 0.27 ms ต่อครั้ง
- ถ้าวันหลังเปลี่ยนไป SSE ต้องยกเว้น route จาก `TenantContextInterceptor` เพราะ `firstValueFrom` รอค่าตัวแรกแล้วปิด (ดู `backend-dev-guide.md` §4.6)
- ออฟไลน์ของ KDS **อยู่นอกขอบเขต** (scope §3.3)

### 7. Payment — ประมาณ 3-4 วัน · ซับซ้อนสุด

ตาราง `payment_attempts`, `payment_attempt_orders`, `payments`, `receipt_sequences`, `receipt_print_logs`

- [ ] `POST /payments/attempts` — เปิดความพยายามชำระ รวมหลายโต๊ะได้ · `payment:receive`
- [ ] `GET /payments/attempts/:id` — ยอดที่ต้องจ่าย + VAT + service · `payment:receive`
- [ ] `POST /payments/attempts/:id/pay` — บันทึกการจ่าย · `payment:receive`
- [ ] `GET /payments/:id/receipt` — จาก view `v_receipt_lines` · `payment:receive`
- [ ] `POST /payments/:id/reprint` — นับจำนวนครั้ง · `payment:receive`

**ห้ามพลาด**
- **ห้ามคำนวณ VAT, service charge, หรือยอดรวมใน NestJS** DB ทำแล้วด้วย trigger ถ้าคำนวณซ้ำจะได้ตัวเลขไม่ตรงแล้ว trigger ปฏิเสธ
- `payments` เป็น append-only — `pos_app` แก้และลบไม่ได้ทั้ง trigger และ permission
- เลขใบเสร็จมาจาก `receipt_sequences` (atomic counter ต่อวันทำการ)
- `rounding_adjustment` ถูกบังคับเป็น 0 ไว้ — ยังไม่มีตรรกะปัดเศษ (เลื่อนไปเวอร์ชันถัดไป)
- `payment:edit_closed` **ไม่มอบให้ role ใดเลย** โดยเจตนา (INV-01)
- ออฟไลน์ของ Payment **อยู่นอกขอบเขต** — ป้องกันการยืนยันจ่ายซ้ำ

### 8. Inventory — ประมาณ 2 วัน · ขนานได้

ตาราง `ingredients`, `inventory_transactions` + view `v_ingredient_stock`

- [x] `POST /ingredients` + CRUD — `inventory:adjust`
- [x] `GET /inventory/stock` — จาก view · `inventory:check`
- [x] `POST /inventory/restock` — รับของ · `inventory:adjust`
- [x] `POST /inventory/waste` — ของเสีย · `inventory:adjust`
- [x] `POST /inventory/count` — นับยอดคงเหลือ · `inventory:adjust`

**หมายเหตุ**
- ใช้ `record_stock_count()` ที่ DB เตรียมไว้
- `inventory_transactions` append-only · คอลัมน์คือ `quantity_change` ไม่ใช่ `quantity` · หน่วยคือ `stock_unit` ไม่ใช่ `unit`
- **ไม่มีการตัดสต็อกอัตโนมัติตอนสั่งอาหาร** — Periodic Physical Count (INV-11) ไม่มี Recipe
- `inventory_adjusted` เข้า audit อัตโนมัติ
- **โมดูลนี้เหมาะให้คนที่สองในทีมทำ** เพราะแยกจากทุกอย่าง ไม่มี state machine และใช้ฟังก์ชัน DB ที่มีอยู่แล้ว

### 9. Report — ประมาณ 2-3 วัน

อ่านจาก `orders`, `payments`, `shifts` + view

- [ ] `GET /reports/sales?from=&to=` — `report:view_all`
- [ ] `GET /reports/best-sellers` — `report:view_all`
- [ ] `GET /reports/shift/:id` — `report:view_own_shift`
- [ ] `GET /reports/payment-methods` — `report:view_all`

**หมายเหตุ**
- วัดไว้ 9.1 ms บน 90 วัน / 7,200 บิล / 28,800 รายการ
- `report:view_own_shift` ต้องกรองให้เห็นแค่กะของตัวเอง ซึ่ง **RLS ไม่ได้ทำให้** ต้องเขียน `WHERE` เอง — **เป็นที่เดียวในระบบที่ต้องกรองด้วยมือ**
- Export CSV อยู่นอกขอบเขต (nice-to-have)

### 10. Auth เพิ่มเติม — ประมาณ 2-3 วัน · ขนานได้

ตาราง `refresh_tokens`, `users`, `audit_logs`

- [ ] `POST /auth/refresh` — ตาราง `refresh_tokens` เตรียมไว้แล้วแต่ยังไม่ใช้
- [ ] `POST /auth/logout` — เขียน audit `logout` + เพิกถอน refresh token
- [ ] `POST /auth/pin-login` — สลับผู้ใช้หน้าร้าน + นับผิด + ล็อกชั่วคราว
- [ ] `GET /users/me` — frontend ต้องใช้ตอนโหลดหน้าแรก
- [ ] `GET /users` · `PATCH /users/:id` — `user:manage`
- [ ] `PATCH /users/:id/role` — `role:assign`
- [ ] `GET /audit-logs` — `audit_log:view` (Owner/Manager)
- [ ] `token_version` ใน JWT + เช็คใน guard
- [ ] audit `login_success` / `login_failed`

---

## งานค้างที่ไม่ใช่โมดูล

### ต้องทำก่อนใช้งานจริง

| งาน | ไฟล์ | เหตุผล |
|---|---|---|
| ลงทะเบียน `ThrottlerGuard` เป็น `APP_GUARD` | `app.module.ts` | **rate limit ปิดอยู่** `@Throttle()` เป็น decorator เปล่าถ้าไม่มี guard |
| แก้วงเล็บ CORS | `main.ts` | `(config.get(...) ?? '...').split(',')` |
| ลบ `express.json` ที่ไม่มีผล | `main.ts` | Nest parse body ก่อนแล้ว ลิมิตจริงคือ 100 kB |
| `@Throttle` บน register | `register.controller.ts` | 3 ครั้ง/ชั่วโมง กันสร้างร้านเปล่าเป็นหมื่น |
| `@MaxLength(72)` บน password | `registerOwner.dto.ts`, `createUser.dto.ts` | bcrypt ตัดที่ 72 bytes เงียบ ๆ |
| ข้อความ login ให้เหมือนกันทุกกรณี | `auth.service.ts` | กัน username enumeration |
| `validationSchema` (Joi) | `app.module.ts` | `JWT_SECRET` สั้นหรือหายต้องพังตอนบูต · `min(32)` |
| `config.get('PORT')` แทน `process.env` | `main.ts` | ให้สม่ำเสมอ |
| `token_version` ใน JWT | `auth.service.ts`, `jwtAuth.guard.ts` | ไล่พนักงานออกแล้วเขายังเข้าได้อีก 1 วัน |
| ลด `expiresIn` จาก `1d` + refresh token | `auth.module.ts` | 1 วันนานเกินสำหรับ access token |
| `@Controller('user')` เป็น `'users'` | `users.controller.ts` | พหูพจน์ทั้งหมดตาม REST |

### เครื่องมือและเอกสาร

| งาน | เวลา | สถานะ |
|---|---|---|
| **Swagger setup** | 5 นาที | ถัดไป |
| Swagger decorator | 10 นาที/โมดูล | พร้อมแต่ละโมดูล |
| `.env.example` | 5 นาที | ค้างมาหลายวัน |
| `README.md` ที่ root | 30 นาที | ยังไม่มี |
| ย้ายเอกสารจาก Claude project เข้า `docs/` ใน repo | 15 นาที | ยังไม่ทำ |
| commit Postman collection ลง repo | 5 นาที | ยังไม่ทำ |
| อัปเดต Postman ให้มี `/api` | 10 นาที | ยังไม่ทำ |
| ESLint + Prettier | 15 นาที | ยังไม่ทำ |
| แนวทาง branch + commit message | 10 นาที | ยังไม่ทำ |
| Glossary ท้าย README | 15 นาที | ยังไม่ทำ |
| Error catalog สำหรับ frontend | 20 นาที | ยังไม่ทำ |

### e2e test — 8 ข้อที่คุ้มที่สุด

ยังไม่มี test เลยแม้แต่ไฟล์เดียว `@nestjs/testing` + `supertest` มีมาให้แล้วใน `package.json`

- [ ] ร้าน A ไม่เห็นข้อมูลร้าน B
- [ ] ร้าน A แก้ข้อมูลร้าน B ไม่ได้ (404)
- [ ] ไม่มี token ได้ 401
- [ ] employee ทำงานของ owner ได้ 403
- [ ] login ผิด 6 ครั้งได้ 429
- [ ] ส่ง field แปลกได้ 400
- [ ] สมัคร slug ซ้ำได้ 409 และไม่มีข้อมูลค้าง
- [ ] สร้างหมวดหมู่ชื่อซ้ำได้ 409

ทุกข้อคือการทดสอบที่ทำให้กลไกความปลอดภัย**ปฏิเสธ**ให้เห็น ไม่ใช่ทดสอบว่ากรณีปกติผ่าน

---

## PWA — แยกเป็น 3 เรื่อง ตารางเวลาต่างกัน

| เรื่อง | ทำเมื่อ | เหตุผล |
|---|---|---|
| `manifest.json`, icon, install prompt, splash | **สัปดาห์สุดท้ายได้** | frontend config ล้วน ไม่กระทบ backend `vite-plugin-pwa` ทำให้แทบทั้งหมด |
| Workbox cache ไฟล์ static | **สัปดาห์สุดท้ายได้** | เหมือนกัน |
| **Offline sync (Order + Menu)** | **ออกแบบตอนเขียน Order module** | ถ้าออกแบบ API ผิดจะแก้ทีหลังไม่ได้โดยไม่รื้อ |

**กฎที่ใช้ตัดสิน** เลื่อนได้ถ้าแก้ทีหลังไม่ต้องรื้อของเดิม เลื่อนไม่ได้ถ้าการเลือกตอนนี้ปิดทางเลือกในอนาคต

สิ่งที่กระทบงานตอนนี้ (Menu): ต้องมี `GET /menu/full` คืนทุกอย่างในก้อนเดียว ไม่ใช่ให้ frontend loop เรียกทีละหมวด

---

## ประมาณเวลารวม

| กลุ่ม | วัน |
|---|---|
| Backend 10 โมดูล | 20-25 |
| งานค้างที่ไม่ใช่โมดูล | 2-3 |
| e2e test | 0.5 |
| PWA เปลือก + offline sync | 3-4 |

**ตัวเลขเป็นประมาณการจากขนาดงาน ไม่ใช่จากการวัดความเร็วจริง** — Menu จะเป็นตัวแรกที่บอกว่าแม่นแค่ไหน เสร็จแล้วบันทึกเวลาที่ใช้จริงไว้แล้วปรับตัวเลขที่เหลือ

**ถ้าตารางตึง สิ่งที่ตัดได้คือ Report เชิงลึกกับ Inventory ไม่ใช่ Payment**

---

## ล้างข้อมูลทดสอบ

> **คำเตือน** ลบร้านและข้อมูลทั้งหมดของร้านนั้นแบบย้อนกลับไม่ได้ ตรวจ slug ให้ตรงก่อน Execute

```sql
SELECT admin_purge_tenant((SELECT tenant_id FROM tenants WHERE tenant_slug = 'test-a'));
SELECT set_config('app.allow_purge', 'off', false);
```

บรรทัดที่ 2 ห้ามลืม ถ้าไม่ปิดธงคืน session นั้นจะลบตาราง append-only ได้ทั้งหมดจนปิด Query Tool

ร้านจริงใช้ soft delete: `UPDATE tenants SET is_active = false`

ครั้งหน้าใช้ slug ที่มี `test-` นำหน้าทุกครั้ง จะกรองและล้างง่ายกว่าจำ uuid
