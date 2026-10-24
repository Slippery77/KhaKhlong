# Inventory Module — คู่มือ Endpoint

อัปเดต: 2026-10-22
สถานะ: **ครบทุก endpoint** — วัตถุดิบ (CRUD), ระดับสต็อก, รับของ, ของเสีย, นับสต็อกทีละตัว, นับสต็อกหลายรายการ (batch), ประวัติธุรกรรม และ UI ปรับวัตถุดิบในหน้าปิดกะ

อ้างอิง: `business-rules-pos-updated.md` (INV-01 ถึง INV-12), `database-design-revision.md` (`inventory_transactions`, view `v_ingredient_stock`), `FULL_INSTALL.sql` (`record_stock_count()`)

---

## 0. สรุปสั้น

- สต็อกวัตถุดิบเป็น **ledger แบบ append-only** (`inventory_transactions`) — ไม่มีการแก้ยอดตรง ๆ
  - `restock` → `quantity_change` เป็นบวก
  - `waste` → `quantity_change` เป็นลบ พร้อม `waste_reason`
  - `adjustment` → ผลต่างจากการนับจริง (บวกหรือลบก็ได้)
- ยอดคงเหลือ = `SUM(quantity_change)` ของวัตถุดิบนั้น อ่านผ่าน view `v_ingredient_stock`
- ระบบ **ไม่ตัดสต็อกตามสูตรอาหาร (recipe)** จึงใช้วิธี **Periodic Physical Count (INV-11)**: นับของเหลือจริงตอนจบวัน แล้วให้ DB คำนวณส่วนต่างที่ใช้ไป
- ถ้าส่วนต่างเพี้ยนเกิน `inventory_variance_alert_percent` (ค่าเริ่มต้น 20%) **และ** เกิน 1 หน่วย จะถูกบันทึก `audit_logs` อัตโนมัติ (INV-12)

---

## 1. หลักการ

1. `tenant_id` มาจาก token/`app_tenant_id()` — ห้ามส่งใน request
2. ทุก request รันใน transaction เดียว (`TenantContextInterceptor`) — หลายรายการในคำขอเดียวจึงสำเร็จทั้งชุดหรือ rollback ทั้งชุด
3. สิทธิ์ที่ใช้: `inventory:check` (ดู) และ `inventory:adjust` (แก้ยอด) — employee / manager / owner มีครบทั้งคู่
4. Response มาตรฐาน `{ "status": "success", "data": … }`; ประวัติธุรกรรมเพิ่ม `pagination`
5. `counted_quantity` ต้อง ≥ 0 และเป็นหน่วย `stock_unit` ของวัตถุดิบนั้น (กรัม / ฟอง / ชิ้น ฯลฯ)
6. ชื่อ field ใน response เป็น snake_case ตาม DTO ของโมดูลนี้

---

## 2. Endpoint

| Method | Path | สิทธิ์ | ใช้ทำอะไร |
| --- | --- | --- | --- |
| GET | `/ingredients` | `inventory:check` | รายการวัตถุดิบ (`?include_inactive=true` ได้) |
| GET | `/ingredients/:id` | `inventory:check` | วัตถุดิบรายตัว |
| POST | `/ingredients` | `inventory:adjust` | เพิ่มวัตถุดิบ (`name`, `stock_unit`, …) |
| PATCH | `/ingredients/:id` | `inventory:adjust` | แก้ชื่อ/หน่วย/เกณฑ์เตือน/`is_active` |
| DELETE | `/ingredients/:id` | `inventory:adjust` | ปิดใช้งาน (soft delete) |
| GET | `/inventory/stock` | `inventory:check` | ยอดคงเหลือทุกตัว (`?is_low=true`, `?include_inactive=true`) |
| POST | `/inventory/restock` | `inventory:adjust` | รับของเข้า |
| POST | `/inventory/waste` | `inventory:adjust` | บันทึกของเสีย |
| POST | `/inventory/count` | `inventory:adjust` | นับสต็อกทีละวัตถุดิบ |
| POST | `/inventory/count/batch` | `inventory:adjust` | **นับหลายรายการในคำขอเดียว (ใช้ตอนจบวัน)** |
| GET | `/inventory/transactions` | `inventory:check` | ประวัติ (`?type=restock|adjustment|waste&limit=&offset=`) |

### 2.1 `POST /inventory/count` — นับทีละตัว

```json
{ "ingredient_id": "uuid", "counted_quantity": 850, "note": "นับปิดร้าน" }
```

- DB คำนวณ `delta = counted - ยอดระบบ`, บันทึกแถว `adjustment` และเติม note ต่อท้ายเป็น `[counted 850, system 1000]`
- `delta = 0` → ไม่เกิดแถวใหม่ (คืน `delta: 0`)
- 404 ถ้าไม่พบวัตถุดิบ/ถูกปิดใช้งาน, 400 ถ้า `counted_quantity < 0`

### 2.2 `POST /inventory/count/batch` — นับหลายรายการ (ใหม่)

Body:

```json
{
  "items": [
    { "ingredient_id": "550e8400-e29b-41d4-a716-446655440000", "counted_quantity": 800 },
    { "ingredient_id": "550e8400-e29b-41d4-a716-446655440002", "counted_quantity": 100, "note": "เหลือจริง" }
  ]
}
```

Response `201`:

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "ingredient_id": "550e8400-e29b-41d4-a716-446655440000",
        "ingredient_name": "เนื้อหมูสันนอก",
        "stock_unit": "กรัม",
        "counted_quantity": 800,
        "delta": -200
      },
      {
        "ingredient_id": "550e8400-e29b-41d4-a716-446655440002",
        "ingredient_name": "ไข่ไก่",
        "stock_unit": "ฟอง",
        "counted_quantity": 100,
        "delta": 0
      }
    ],
    "adjusted_count": 1,
    "unchanged_count": 1
  }
}
```

กติกา:

- `items` 1–200 รายการ, `ingredient_id` ต้องเป็น UUID และ **ห้ามซ้ำในคำขอเดียวกัน** (400)
- ส่งเฉพาะวัตถุดิบที่ได้นับจริง — ไม่ต้องส่งครบทุกตัว
- ถ้ารายการใดผิดพลาด (เช่น id ปลอม / วัตถุดิบถูกปิดใช้งาน → 404) **ทั้งชุดจะไม่ถูกบันทึก** เพราะอยู่ใน transaction เดียว
- `delta` เป็นลบ = ใช้ไป/ขาด, บวก = นับได้เกิน, 0 = ตรงกัน (ไม่เกิดแถวใน ledger)

### 2.3 `GET /inventory/stock`

```json
{
  "status": "success",
  "data": [
    {
      "ingredient_id": "uuid",
      "name": "เนื้อหมูสันนอก",
      "stock_unit": "กรัม",
      "low_stock_threshold": 500,
      "current_stock": 800,
      "is_low": false
    }
  ]
}
```

`current_stock` เป็น number — ใช้เป็น "ยอดในระบบ" ให้พนักงานเห็นตอนนับ (หน้าปิดกะโชว์ค่านี้ แต่ไม่โชว์ยอดเงินที่ควรมีก่อนยืนยันปิดกะ)

---

## 3. Flow จบวัน (เชื่อมกับหน้าปิดกะ)

หน้าจอ `/:tenantSlug/siftwork` แสดงการ์ด **"ปรับวัตถุดิบคงเหลือ"** เมื่อมีกะของวันนั้น:

1. แสดงวัตถุดิบที่ใช้งานทั้งหมดพร้อมยอดในระบบ — กรอกเฉพาะช่องที่ได้นับ (เว้นว่าง = ไม่ปรับ)
2. แสดงส่วนต่างทันทีที่กรอก (`ใช้ไป …` / `เกิน +…` / `ตรงกัน`)
3. กด **บันทึกการนับ** → ยิง `POST /inventory/count/batch` ครั้งเดียว
4. สรุปผล adjusted / unchanged หลังบันทึก แล้วโหลดยอดใหม่
5. จากนั้นจึงนับเงินและปิดกะ (การ์ดนับเงินอยู่ถัดลงไป)

การตัดสินใจที่ตกลงไว้:

- **เตือนแต่ไม่บล็อก** — ถ้าวันนี้ยังไม่มีการปรับยอดวัตถุดิบ จะขึ้นกล่องเตือนสีเหลือง แต่ยังปิดกะได้ (พนักงานอาจนับไปแล้วจากหน้าสต็อก หรือของตรงทั้งหมดจนไม่มีแถว `adjustment`)
- **แสดงทุกตัว แต่บันทึกเฉพาะที่กรอก** — ไม่บังคับกรอกครบ เพื่อให้ปิดร้านเร็ว
- ปรับย้อนหลังได้แม้ปิดกะแล้ว เพราะสต็อกไม่ได้ผูกกับ `shift_id` (การ์ดจะยังแสดงอยู่ใต้สถานะกะ)

ข้อจำกัดที่ควรรู้:

- `inventory_transactions` ไม่มี `shift_id` → ตรวจย้อนหลังได้ว่า "ใครนับเมื่อไร" จาก `created_by`/`created_at` แต่ไม่ผูกกับกะตรง ๆ
- ตัวเลข "วันนี้ปรับยอดแล้ว N รายการ" นับจากธุรกรรม `adjustment` ของวันปฏิทินฝั่งเครื่องผู้ใช้ (ไม่ใช่ `business_date`) และ **ไม่นับรายการที่ตรงกัน (delta = 0)** เพราะ DB ไม่บันทึกแถว
- ยังไม่มี cron ตรวจสต็อกค้างนับ / ไม่มีการตัดสต็อกจาก recipe

---

## 4. อ้างอิงฐานข้อมูล

`record_stock_count(p_tenant, p_ingredient, p_counted, p_user, p_note)`:

1. `SELECT … FOR UPDATE` ล็อกแถววัตถุดิบ (กันนับพร้อมกันแล้วยอดเพี้ยน)
2. ตรวจสิทธิ์ `inventory:adjust` ของผู้ใช้
3. `cur = SUM(quantity_change)` ของวัตถุดิบนั้น
4. `d = p_counted - cur`
5. ถ้า `d = 0` คืน `0` (ไม่บันทึกแถว)
6. ถ้าไม่ใช่ 0 → insert `adjustment` พร้อม note `[counted X, system Y]`
7. ถ้า `abs(d) * 100 / abs(cur) > cfg(inventory_variance_alert_percent)` **และ** `abs(d) > 1` → `audit_write(..., 'inventory_adjusted', …)`

---

## 5. การทดสอบ

- Unit: `backend/src/modules/inventory/inventory.service.spec.ts`
  - batch ปรับหลายรายการและแยก adjusted/unchanged
  - batch ที่มี id ซ้ำ → `400` และไม่แตะ ledger
- E2E (`node`, ยิง API จริง): 17 เคส ผ่านทั้งหมด
  - register/login → สร้างวัตถุดิบ 2 ตัว → restock → `GET /inventory/stock`
  - batch 2 รายการ → ตรวจ `delta`, adjusted/unchanged และยอดคงเหลือใหม่
  - ตรวจ `GET /inventory/transactions` ว่ามีเฉพาะรายการที่เปลี่ยน (delta 0 ไม่มีแถว)
  - id ซ้ำ / ค่าติดลบ / รายการว่าง → `400`
  - มี id ปลอมในชุด → `404` และยอดรายการแรกไม่เปลี่ยน (rollback ทั้งชุด)
  - employee (สิทธิ์ `inventory:adjust`) นับสต็อกได้
  - นับวัตถุดิบที่ถูกปิดใช้งาน → `404`
