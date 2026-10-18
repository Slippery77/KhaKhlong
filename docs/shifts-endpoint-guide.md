# Shift Module — คู่มือ Endpoint

อัปเดต: 2026-10-18
สถานะ: **ทำเสร็จแล้ว 4 endpoint** (`open`, `current`, `close`, `cash-movements`) กำลังทำ `GET /cashbook` ที่เหลือคือ `reopen`, `verify`, `GET /shifts`

ทำก่อน Orders เพราะ `POST /orders` ต้องมีกะเปิด (trigger `trg_orders_before`, กฎ ORD-12)

อ้างอิง: `backend-todo.md` (โมดูล 4), `business-rules-pos-updated.md` (SHIFT-01 ถึง SHIFT-14, PAY-12, ORD-12), `FULL_INSTALL.sql` (`trg_shift_flow`, `reopen_shift()`, `trg_cash_movement_guard`)

---

## 0. สรุปสั้นสำหรับเพื่อน (อ่านส่วนนี้พอ)

**กำลังทำอะไร:** ทำโมดูล Shift (กะ) ก่อน Orders เพราะเปิดบิลไม่ได้ถ้ายังไม่เปิดกะ ส่วนที่ทำค้างไว้ของ Orders มีเอกสารเก็บไว้แล้วที่ `orders-endpoint-guide.md`

**กะคืออะไร:** 1 วัน = 1 กะ ใช้ลิ้นชักเงินร่วมกันทั้งร้าน เปิดกะ = ใส่เงินตั้งต้น ปิดกะ = นับเงินจริงแล้วระบบเทียบกับยอดที่ควรมี

**เลือกแบบไหน (และทำไม):**
1. **ปิดกะไม่ได้ถ้ายังมีบิลค้าง** เพราะหลังปิดกะระบบห้ามรับเงิน (PAY-12) ลูกค้าที่ยังไม่จ่ายจะจ่ายไม่ได้
2. **ทุกคนเห็นรายการเงินของทั้งวัน** ลิ้นชักใช้ร่วมกัน คนเข้ากะต่อต้องเห็นว่าคนก่อนทำอะไรไว้ ไม่งั้นนับเงินไม่ถูก
3. **พนักงานบันทึกเงินเข้า-ออกลิ้นชักได้เอง** (เลือกแบบง่ายสุด) ต้องเพิ่มสิทธิ์ `cash:movement` ให้ employee หนึ่งบรรทัด ความเสี่ยงที่เหลือ: ทุกรายการเห็นชื่อคนทำและแก้ไม่ได้ จึงตรวจย้อนหลังได้
4. **server หากะที่เปิดอยู่เอง** frontend ไม่ต้องส่งรหัสกะ กันส่งรหัสกะเก่าที่แคชไว้ในแอป
5. **กดซ้ำไม่เกิดรายการซ้ำ** ใช้ `movementId` ที่ frontend สร้าง (แนวเดียวกับ `order_id`)

**หน้าจอ:** เลือกแบบ **A** (โครงเดิมจาก Figma + เพิ่มคอลัมน์ "ประเภท" กับ "รายละเอียด") ใช้ข้อมูลจาก `GET /cashbook`

**หลัง login:** เรียก `GET /shifts/current` แล้วเลือกหน้า: `data` เป็น `null` ไปหน้าเปิดกะ / `status: "open"` เข้าหน้าขาย / สถานะอื่น แสดงว่าปิดกะแล้ว

---

## 1. หลักการ

1. DB บังคับ flow สถานะและสิทธิ์ให้แล้ว (trigger) NestJS ส่งค่าขั้นต่ำเท่านั้น
2. **client ห้ามส่ง** `status`, `expected_closing_cash`, `business_date`, `opened_by`, `closed_by` server ใส่เอง
3. ยอดที่ควรมี = `opening_cash + ยอดขายเงินสด + เงินเข้าลิ้นชัก − เงินออกจากลิ้นชัก` คำนวณที่ DB ตอนปิดกะ
4. กะที่ `verified` และ `escalated` ปิดตาย เปิดใหม่ไม่ได้
5. ไม่ใส่ `tenant_id` ใน request/response
6. ชื่อ field ใน response เป็น camelCase ทั้งหมด ตัวเลขเงินเป็น number ไม่ใช่ string ค่าที่ยังไม่มีเป็น `null` ไม่ใช่ `0`

Shape ของ shift ที่ตอบกลับ (ตามโค้ดปัจจุบัน):
```json
{
  "shiftId": "uuid", "businessDate": "2026-10-18", "status": "open",
  "openingCash": 1000, "expectedClosingCash": null,
  "actualClosingCash": null, "variance": null,
  "openedBy": "uuid", "openedAt": "…",
  "closedBy": null, "closedAt": null,
  "reopenCount": 0
}
```
`businessDate` ดึงจาก DB เป็น text (`business_date::text`) เพื่อไม่ให้วันเพี้ยนจาก timezone

---

## 2. Endpoint

### 2.1 `POST /shifts/open` — เปิดกะ ✅
- สิทธิ์: `shift:open` (Employee, Manager, Owner)
- Body: `{ openingCash }` (≥ 0)
- DB เติม: `business_date` (จาก `compute_business_date`), `opened_by`, `opened_at`
- Response: `201` + shift
- Error: วันนี้มีกะแล้ว (`uq_shifts_tenant_business_date`, 23505) ตอบ `409` ถ้ากะนั้นปิดแล้วต้องให้ผู้จัดการ reopen ไม่ใช่เปิดใหม่

### 2.2 `GET /shifts/current` — กะของวันนี้ ✅
- สิทธิ์: ทุก role (`@AnyAuthenticated()`)
- ไม่มี body server หา `business_date` ปัจจุบันเอง
- Response: `200` + `data` เป็น shift หรือ `null` (ยังไม่เปิดกะเป็นสถานะปกติ ไม่ใช่ error)
- ระหว่างกะเปิด `expectedClosingCash` เป็น `null` เสมอ ระบบคำนวณตอนปิดกะ

### 2.3 `POST /shifts/:id/close` — ปิดกะ ✅
- สิทธิ์: `shift:close_and_count` (Employee, Manager, Owner)
- Body: `{ actualClosingCash }` (≥ 0)
- ลำดับใน transaction เดียว: `SELECT ... FOR UPDATE` กะ → ไม่พบ `404` / ไม่ใช่ `open` `409` → ตรวจบิลค้าง → `UPDATE shifts SET actual_closing_cash, closed_by` → trigger คำนวณ `expected`, `closed_at`, `status`
- Response: `200` + shift ที่ `status` = `closed_auto` (ยอดตรง) หรือ `pending_verification` (ไม่ตรง) พร้อม `expectedClosingCash` และ `variance`
- **ถ้ามีบิลค้าง (`orders.closed_at IS NULL`) ตอบ `409` ไม่ปิด:**
```json
{
  "code": "OPEN_ORDERS_BLOCK_CLOSE",
  "message": "ปิดกะไม่ได้ ยังมีบิลค้าง 2 ใบ",
  "orders": [
    { "orderId": "…", "orderNumber": 14, "tableNumber": "A3", "activeItemCount": 3, "suggestedAction": "pay" },
    { "orderId": "…", "orderNumber": 17, "tableNumber": "B1", "activeItemCount": 0, "suggestedAction": "close_unpaid" }
  ]
}
```
  `suggestedAction`: `pay` (มีจานและเสิร์ฟครบ) / `close_unpaid` (ไม่มีจานที่ยังไม่ถูก void) / `in_progress` (ยังมีจานค้างในครัว)
- ข้อสังเกต: Employee ไม่มี `order:close_unpaid` ถ้ามีบิลว่างที่เปิดผิดไว้ ต้องให้ Manager ปิดบิลนั้นก่อน
- **การเช็ค `status !== 'open'` ใน service ห้ามเอาออก:** trigger `trg_shift_flow` ไม่กันการ UPDATE กะที่ปิดแล้ว ถ้าไม่เช็คจะเขียนทับยอดนับเงินและคนปิดเดิมได้
- หน้าปิดกะ: ให้กรอกยอดนับก่อน แล้วค่อยแสดง expected/variance

### 2.4 `POST /cash-movements` — นำเงินเข้า/ออกลิ้นชัก ✅
- สิทธิ์: `cash:movement` (**ให้ Employee ด้วย** ดูหัวข้อ 3)
- Body: `{ movementId (uuid จาก client), direction: 'in' | 'out', amount (> 0), reason (≤ 200 ตัวอักษร) }`
- server หากะที่เปิดอยู่ของวันนี้เอง (ไม่รับ `shiftId`) ไม่มีกะเปิดตอบ `409`
- `INSERT ... ON CONFLICT (movement_id) DO NOTHING RETURNING ...` ถ้าไม่คืนแถว อ่านรายการเดิมแล้วคืนไป
- Response: `201` ทั้งครั้งแรกและครั้งที่ส่ง `movementId` ซ้ำ (ได้รายการเดิม ไม่เกิดแถวใหม่)
- ตารางเป็น append-only แก้ลบไม่ได้ ถ้าบันทึกผิดให้บันทึกรายการกลับทาง
- อยู่ใน controller แยก (`CashMovementsController`) ภายในโมดูล shifts

### 2.5 `GET /cashbook?date=YYYY-MM-DD` — สมุดเงินสดรายวัน (กำลังทำ)
- สิทธิ์: ทุก role เห็นของทั้งวัน (ลิ้นชักใช้ร่วมกัน)
- ไม่ส่ง `date` = วันทำการปัจจุบัน
- server รวม `payments` (กรองด้วย `business_date`) กับ `cash_movements` (กรองด้วย `shift_id`) เรียงตามเวลา **ต้องกรองแบบเดียวกับ trigger ปิดกะ** ไม่งั้นการ์ดเงินสดคงเหลือไม่เท่ากับยอดที่ควรมีตอนปิด
- การ์ดสรุปคำนวณใน SQL ไม่ใช่ใน JS
- วันที่ไม่มีกะ: `shift: null`, `entries: []`
```json
{
  "businessDate": "2026-10-18",
  "shift": { "shiftId": "…", "status": "open" },
  "summary": { "cashOnHand": 1420, "cashSales": 0, "transferSales": 0 },
  "entries": [
    { "at": "2026-10-18T09:05:00+07:00", "type": "cash_out",
      "cashAmount": -80, "transferAmount": 0, "detail": "ซื้อน้ำแข็ง",
      "by": { "id": "…", "name": "สมศรี มีสุข" } }
  ]
}
```
- `type`: `sale` / `cash_in` / `cash_out`
- รายการขาย (`sale`) จะเริ่มมีเมื่อโมดูล Payment เสร็จ ตอนนี้เห็นเฉพาะเงินเข้า-ออก
- ชื่อ "cashbook" มาจากสมุดเงินสดในทางบัญชี ซึ่งบันทึกทั้งเงินสดและเงินฝาก/โอน จึงครอบคลุมรายการเงินโอนด้วย

### 2.6 `POST /shifts/:id/reopen` — เปิดกะที่ปิดผิด
- สิทธิ์: `shift:reopen` (Manager, Owner)
- Body: `{ reason }` (บังคับ validate ที่ DTO)
- เรียก `SELECT reopen_shift($1, <me>, $2)` ตรง ๆ ไม่เขียน logic เอง (ล้างยอดปิด เก็บ `opening_cash` เดิม เพิ่ม `reopen_count` เขียน audit `shift_reopened`)
- เปิดได้เฉพาะ `closed_auto` และ `pending_verification` ส่วน `verified`/`escalated` ได้ `cannot reopen a verified shift` ตอบ `409`
- ฟังก์ชันใช้ `set_config(..., true)` ซึ่งอยู่ได้แค่ใน transaction (`TenantContextInterceptor` ห่อ request ไว้ใน transaction เดียวอยู่แล้ว)

### 2.7 `POST /shifts/:id/verify` — รับรองยอด
- สิทธิ์: `shift:verify` (Manager, Owner)
- ไม่มี body: `UPDATE ... SET status = 'verified', verified_by = <me>`
- ทำได้จาก `pending_verification` หรือ `escalated` ถ้า `escalated` ต้องเป็น Owner (trigger บังคับ)
- `closed_auto` verify ไม่ได้ (`invalid shift transition`) ตอบ `409`

### 2.8 `GET /shifts` — ประวัติกะ
- สิทธิ์: `report:view_all` (Manager, Owner) **เฉพาะ Manager/Owner ในรอบนี้** ฝั่ง Employee เลื่อนออกไป (ไม่มีหน้าจอรองรับ)
- Query: `?from=&to=&status=` + pagination
- Response: list ของ shift เรียงวันล่าสุดก่อน
- ต่างจาก `/cashbook`: อันนี้ 1 แถวต่อวัน (ตัวเลขสรุป) ใช้ตรวจย้อนหลัง ส่วน `/cashbook` คือทีละรายการของวันเดียว ใช้ระหว่างวัน

### 2.9 ไม่ใช่ endpoint แต่เป็นงานของโมดูล
- `escalate_overdue_shifts()` ต้องมีตัวเรียกทุก 15 นาที (SHIFT-06) **เลื่อนไว้ก่อน** เพื่อไม่เพิ่มงาน ความเสี่ยง: กะที่ไม่มีใครรับรองจะไม่ถูกส่งต่อ Owner ต้องกลับมาทำก่อนขึ้นใช้งานจริง

---

## 3. สิ่งที่ตัดสินใจแล้ว

| เรื่อง | ตัดสินใจ | เหตุผล / ผลที่ตามมา |
|---|---|---|
| ปิดกะตอนมีบิลค้าง | บล็อก (409 + รายการบิล) | PAY-12 ห้ามรับเงินหลังปิดกะ ตรวจที่ชั้น service เท่านั้น (ไม่เพิ่ม trigger ใน DB ตอนนี้) ช่องว่างเล็ก ๆ: เปิดบิลพอดีวินาทีที่กดปิดกะ |
| ใครเห็นสมุดเงินสดรายวัน | ทุก role เห็นทั้งวัน | ลิ้นชักใช้ร่วมกัน (SHIFT-08) คนต่อกะต้องเห็นรายการของคนก่อน |
| Employee บันทึกเงินเข้า-ออก | **ได้** (ตัวเลือก ค: ไม่ต้อง PIN) | เลือกแบบง่ายสุดเพื่อลดงาน ต้องแก้ seed (ดูหัวข้อ 4) ความเสี่ยง: สร้างรายการเงินออกเพื่อกลบเงินขาด ลดความเสี่ยงด้วยการที่ทุกรายการเห็นชื่อ ทุกคนเห็น และแก้ไม่ได้ **ทบทวนใหม่เมื่อมี `verifyPin`** (เปลี่ยนเป็นต้องใส่ PIN ผู้จัดการ) |
| Blind count ระหว่างวัน | เลิก | การ์ดเงินสดคงเหลือและรายการทั้งวันทำให้ทุกคนคำนวณเองได้ ยอมรับเพราะกลุ่มเป้าหมายเป็นร้านเล็กที่ไว้ใจกัน (SHIFT-08) เก็บไว้เฉพาะลำดับหน้าปิดกะ: กรอกยอดนับก่อนแล้วค่อยโชว์ expected |
| `cash-movements` ส่ง `shiftId` ไหม | ไม่ส่ง server หากะเอง | กันส่งรหัสกะเก่าที่แคชไว้ในแอป (PWA) ข้อยกเว้นที่ยอมรับ: กะเมื่อวานถูก reopen พร้อมกะวันนี้ จะลงกะวันนี้เสมอ |
| ส่ง `movementId` ซ้ำ | ตอบ `201` + รายการเดิม | แนวเดียวกับ idempotency key ของ Stripe ที่ส่งคำตอบเดิมกลับ frontend ไม่ต้องแยก 200/201 |
| ชื่อ endpoint รายการเงินรายวัน | `/cashbook` | เดิมชื่อ `/cash-ledger` เปลี่ยนเพราะ "ledger" ต้องอธิบาย ส่วน cashbook (สมุดเงินสด) เข้าใจทันที |
| หน้าจอรายการเงินประจำวัน | แบบ A | แก้จาก Figma เดิมน้อยสุด |
| `GET /shifts` ของ Employee | ไม่ทำในรอบนี้ | ไม่มีหน้าจอรองรับ (YAGNI) |
| หลัง login ไปหน้าไหน | ใช้ `GET /shifts/current` | ไม่นับ "login ครั้งแรกของวัน" เพราะหลายคนหลายเครื่อง login หลายรอบ คำถามจริงคือ "วันนี้มีกะเปิดไหม" |

---

## 4. งานนอกโค้ด Shift ที่ต้องทำตามการตัดสินใจ

1. **เพิ่มสิทธิ์ `cash:movement` ให้ Employee** (ฐานข้อมูลที่ติดตั้งแล้วต้องรันเอง และแก้ seed ใน `FULL_INSTALL.sql` ด้วย)
```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.role_name = 'employee' AND p.permission_key = 'cash:movement'
ON CONFLICT DO NOTHING;
```
2. **รีสตาร์ท backend** หลังรัน SQL เพราะ `PermissionCacheService` โหลดสิทธิ์ครั้งเดียวตอนบูต ไม่มี TTL
3. **แก้เอกสารให้ตรงกัน** (หลัก Documentation-First): `user-roles-permissions.md` (Employee จาก 8 เป็น 9 สิทธิ์), `business-rules-pos-updated.md` ข้อ SHIFT-13 (ตัดประโยค "ไม่มอบให้พนักงาน"), `scope_pwa_pos_v2_2.md` หัวข้อ 3.2.10, `backend-todo.md` โมดูล 4 (เพิ่ม `GET /cashbook`)
4. ตัวเลขสรุปของ `GET /cashbook` ต้องใช้สูตรเดียวกับ trigger ปิดกะ ทดสอบด้วยการเปิดกะ บันทึกเงินเข้า-ออก แล้วปิดกะด้วยยอด `cashOnHand` ต้องได้ `closed_auto`

---

## 5. หน้าจอ "รายการเงินประจำวัน"

**เลือกแบบ A** จาก 3 แบบใน Artifact "Cash Ledger 3 แบบ" (ข้อมูลตัวอย่าง เงินเปิดกะ 1,000 คงเหลือ 1,975)

| แบบ | หน้าตา | ข้อดี | ข้อเสีย |
|---|---|---|---|
| **A** (เลือก) | โครงเดิมจาก Figma + คอลัมน์ "ประเภท" และ "รายละเอียด" | แก้จาก Figma น้อยสุด งาน frontend น้อยสุด | ตารางกว้าง บนจอเล็กต้องเลื่อนแนวนอน |
| B | ไทม์ไลน์ + ฟอร์มแถวเดียวด้านบน | อ่านง่ายบนแท็บเล็ต ไม่มีแถบข้าง | ต้องออกแบบใหม่ทั้งหน้า |
| C | การ์ดตัวเลขใหญ่ + แท็บกรอง + ป๊อปอัปฟอร์ม | เห็นยอดเงินสดชัดสุด กรองรายการได้ | ต้องทำป๊อปอัปและแท็บเพิ่ม |

ข้อสังเกตจาก Figma เดิม: ตารางไม่มีที่แสดงเงินเข้า/ออก (ไม่มีคอลัมน์ประเภท/รายละเอียด) แบบ A แก้ให้แล้ว

---

## 6. ลำดับการทำ

~~`POST /shifts/open`~~ → ~~`GET /shifts/current`~~ → ~~`POST /shifts/:id/close`~~ → ~~`POST /cash-movements`~~ → `GET /cashbook` → `reopen` → `verify` → `GET /shifts`
