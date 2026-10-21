# Orders Module — คู่มือ Endpoint

อัปเดต: 2026-10-17
สถานะ: **พักไว้** รอทำ Shift module ก่อน แล้วกลับมาทำต่อ

เอกสารนี้สรุปว่าแต่ละ endpoint ของโมดูล Order ทำอะไร รับอะไร ส่งอะไร และต้องระวังอะไร อ้างอิง `backend-todo.md` (โมดูล 5), `business-rules-pos-updated.md` (ORD-*, KDS-04, COMP-*, TBL-*) และโค้ดใน `backend/src/modules/orders` ณ วันที่เขียน

---

## 1. หลักการที่ใช้กับทุก endpoint ในโมดูลนี้

1. **client สร้าง `order_id` และ `order_item_id` เอง** (`crypto.randomUUID()`) เพื่อให้เปิดบิลตอนออฟไลน์ได้ (scope 3.2.11, ORD-10)
2. **ส่งซ้ำต้องปลอดภัย** ใช้ `INSERT ... ON CONFLICT (...) DO NOTHING RETURNING ...` ถ้าไม่คืนแถวแปลว่ามีอยู่แล้ว ให้ตอบ **200 พร้อมข้อมูลเดิม** ไม่ใช่ 409 แนวเดียวกับ idempotency key ของ Stripe และ Square Orders API
3. **server เป็นเจ้าของค่าที่คำนวณ** `tenant_id`, `order_number`, `business_date`, `created_by`, ราคา snapshot, ยอดรวม ห้ามรับจาก client
4. **1 จาน = 1 แถว** ไม่มี `quantity` (ORD-08)
5. **สิทธิ์ตรวจสองชั้น** `@RequirePermissions` ที่ API และ trigger ที่ DB (void ตอน `preparing`, comp)
6. **ตัวเลขเงินอ่านจาก view** `v_order_item_totals` ห้ามคำนวณใน NestJS

---

## 2. Endpoint

### 2.1 `POST /orders` — เปิดบิล
- สิทธิ์: `order:create`
- Body: `{ orderId: uuid, tableId: uuid }`
- DB เติมเอง: `tenant_id`, `order_number` (จาก `order_sequences`), `business_date`, `created_by`
- เงื่อนไขที่ trigger `trg_orders_before` บังคับ: มีกะ `open` ของวันทำการนั้น, โต๊ะไม่ `out_of_service`, โต๊ะมีบิลค้างได้ไม่เกิน 1 ใบ (`uq_orders_one_active_per_table`)
- Response: `201` บิลใหม่ / **`200` บิลเดิมเมื่อ `orderId` ซ้ำ**
- Error: `409` ไม่มีกะเปิด / โต๊ะปิดใช้งาน / โต๊ะมีบิลค้าง, `400` ไม่พบโต๊ะ (23503)
- **ต้องแก้ในโค้ดปัจจุบัน:** `OrdersService.createOrder` โยน `ConflictException` เมื่อ `orderId` ซ้ำ ให้เปลี่ยนเป็นอ่านบิลเดิมแล้วตอบ 200 และ `items?` ใน `CreateOrderDto` ถูก repository เมิน ให้ลบออกหรือ insert ใน transaction เดียวกัน (แนะนำลบ เพราะมี `POST /orders/:id/items`)

### 2.2 `POST /orders/:id/items` — เพิ่มจาน
- สิทธิ์: `order:create`
- Body: `{ items: [{ orderItemId, menuItemId, modifierIds?: uuid[], specialRequest?: string }] }`
- server snapshot `item_name_snapshot`, `unit_price_snapshot`, ชื่อและราคา modifier (`order_item_modifiers`) **ไม่รับราคาจาก client**
- insert `order_items` กับ `order_item_modifiers` ใน transaction เดียว (`pg` client)
- idempotent ที่ `order_item_id`
- เมนูที่ `is_available = false` หรือ `is_active = false` ถูกปฏิเสธโดย trigger (MENU-05) ให้แปลง error เป็นข้อความไทย
- บิลที่ปิดแล้วต้องเพิ่มไม่ได้
- สถานะเริ่มต้นของจานคือ `draft`

### 2.3 `GET /orders/:id` — รายละเอียดบิล
- สิทธิ์: `order:create`
- คืน: ข้อมูลบิล + รายการจาน + modifier + ยอดต่อจาน (จาก `v_order_item_totals`)
- ไม่พบต้องตอบ **404** (ตอนนี้คืน `null` พร้อม 200)

### 2.4 `GET /orders?status=open` — รายการบิลที่ค้าง
- สิทธิ์: `order:create`
- คืนแบบสรุป: `order_id`, `order_number`, `table_id`, จำนวนจาน, เวลาเปิด ไม่ใช่ detail เต็ม
- เงื่อนไข: `closed_at IS NULL`
- ตอนนี้ controller ไม่ได้อ่านค่า `status` (if/else สองทางเหมือนกัน) และ repository ยังเป็น stub

### 2.5 ส่งเข้าครัว (draft → queued) — **ยังไม่มีในแผน**
- เสนอ: `POST /orders/:id/send-to-kitchen`
- server สร้าง `kitchen_ticket_id` 1 ค่าต่อการกด 1 ครั้ง (KDS-04) แล้วเปลี่ยนจาน `draft` ทั้งหมดของบิลเป็น `queued`
- constraint `chk_ticket_after_draft` บังคับว่ารายการที่พ้น `draft` ต้องมี ticket
- ถ้าไม่มี endpoint นี้ KDS จะไม่เห็นรายการเลย

### 2.6 `PATCH /orders/:id/items/:itemId/void` — ยกเลิกจาน
- Body: `{ reason: string }` (บังคับ)
- ใช้ได้ที่ `queued` และ `preparing` เท่านั้น (ORD-04) ที่ `served` ใช้ comp
- `queued`: ไม่ต้องมี `void:approve` / `preparing`: ต้องมี `void:approve`
- **ขัดกับ `backend-todo.md`** ที่ใส่ `void:approve` ทั้ง endpoint ต้องตัดสินใจ: ใช้ `order:create` ที่ decorator แล้วให้ trigger ตรวจ `void:approve` เฉพาะ `preparing`
- service ต้องตั้ง `voided_by` เป็นผู้ใช้ปัจจุบัน เพราะ trigger ตรวจสิทธิ์จากคอลัมน์นี้

### 2.7 `PATCH /orders/:id/items/:itemId/comp` — ยกเว้นราคา
- สิทธิ์: `discount:approve` (ของ **ผู้อนุมัติ**)
- Body: `{ reason, approver PIN }` (COMP-02 บังคับ re-auth ด้วย PIN)
- ใช้ได้เฉพาะจานที่ `served` ปรับราคาทั้งจานรวม modifier เป็น 0 ย้อนกลับไม่ได้ (COMP-03)
- `comped_by` ต้องเป็นผู้อนุมัติ ไม่ใช่พนักงานที่ล็อกอิน
- **พึ่ง `verifyPin` ใน Auth module** (โมดูล 10) ซึ่งยังไม่ทำ

### 2.8 `PATCH /orders/:id/move-table` — ย้ายโต๊ะ
- สิทธิ์: `order:create`
- Body: `{ newTableId }`
- โต๊ะปลายทางต้อง `available` (TBL-06) ย้ายแบบ atomic (TBL-07)
- สถานะโต๊ะทั้งสองใบเปลี่ยนเองผ่าน `sync_table_status()`

### 2.9 `POST /orders/:id/close-unpaid` — ปิดบิลโดยไม่เก็บเงิน
- สิทธิ์: `order:close_unpaid`
- Body: `{ closeReason: 'voided_all' | 'empty' | 'walkout' }` (`paid` เป็นของ Payment)
- DB เขียน `closed_at`, `closed_by`, `close_reason` และ audit `order_closed_unpaid` เอง
- `note?` ใน DTO ไม่เห็นคอลัมน์รองรับใน `ORDERS_COL` ต้องเช็ค schema ถ้าไม่มีให้ตัดออก

### 2.10 `POST /orders/sync` — ซิงค์บิลออฟไลน์
- สิทธิ์: `order:create`
- Body: array ของ `{ order, items[] }` ต้องมี DTO จริง (ตอนนี้ `@Body() dto: any` ข้าม validation) และจำกัดขนาด batch
- ตอบ **รายตัว**: `[{ orderId, result: 'created' | 'exists' | 'rejected', reason? }]`
- แต่ละบิลเป็น transaction ของตัวเอง บิลเดียวพังต้องไม่ล้มทั้งชุด
- `order_number` ออกตอน sync ถึง server ไม่ใช่ตอนสร้างบนเครื่อง
- ทำเป็น endpoint สุดท้ายของโมดูล เพราะใช้ logic ของตัวอื่นซ้ำ

---

## 3. ความเสี่ยงและประเด็นที่ยังไม่ปิด

1. **`business_date` ของบิลออฟไลน์:** `trg_orders_before` คำนวณจาก `now()` ตอน INSERT บิลที่สร้างก่อนปิดกะแต่ sync หลังปิดกะจะถูกปฏิเสธ (`no open shift`) หรือได้วันผิด ต้องตัดสินใจ (ก) ปฏิเสธ (ข) รับแล้วลงวันตามเวลาที่สร้างจริง (ต้องส่ง `created_at` จาก client และแก้ trigger) (ค) รับเข้ากะวันใหม่ ผู้เขียนเอนไปทาง (ข) ตรงกับประเด็นค้างใน business-rules 15.2
2. **ชนกันตอน sync:** เครื่องออฟไลน์เปิดโต๊ะที่เครื่องออนไลน์เปิดไปแล้ว จะชน `uq_orders_one_active_per_table` (23505 คนละตัวกับ conflict ของ `order_id`) `/sync` ต้องตอบเป็น `rejected` ไม่ใช่ error ทั้งชุด
3. **`orderId` ซ้ำแต่ `tableId` ต่างกัน:** `DO NOTHING` คืนบิลเดิมโดยไม่แจ้งความต่าง client ควรเทียบเอง
4. **comp และ void ตอน `preparing`** พึ่ง `pin-login` / `verifyPin` ที่ยังไม่มี
5. **ทดสอบ happy path ผ่าน API ไม่ได้** ถ้าไม่มี Shift module

## 4. ลำดับการทำ (เมื่อกลับมา)

`POST /orders` (แก้ 200) → `POST items` → `GET :id` → `GET list` → send-to-kitchen → move-table → close-unpaid → void/comp (หลังมี verifyPin) → sync
