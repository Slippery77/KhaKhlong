# ยกเลิกทั้งบิล / ปิดบิลลูกค้าหนี — คู่มือ (Cancel Order & Walkout)

อัปเดต: **2026-10-31** · branch `feat-aod`

เอกสารนี้อธิบายวิธี "ปิดบิล" ที่ทำให้โต๊ะกลับเป็นว่างจริง โดยไม่เปิดช่องให้จองโต๊ะซ้อน
ใช้คู่กับ `docs/void-comp-approval-guide.md` (PIN ผู้อนุมัติ) และ `docs/orders-endpoint-guide.md`

---

## 1. ปัญหาเดิมและหลักการแก้

**อาการ:** กด "ยกเลิก" รายการอาหารแล้ว โต๊ะยังขึ้นว่า "มีลูกค้า" ตลอดไป

**สาเหตุ:** หน้าจอเดิมเรียกแค่ `POST /orders/items/void` (void รายการ) แต่ไม่เคยปิดบิล
→ `orders.closed_at` ยังเป็น `NULL` → `sync_table_status()` ยังเห็นว่ามีบิลเปิด → โต๊ะค้าง `occupied`

**หลักการที่ยึด (ไม่เปลี่ยน):**

> โต๊ะว่าง = ไม่มีบิลที่ `closed_at IS NULL` ของโต๊ะนั้น

สถานะโต๊ะเป็นค่าที่ **derive จากบิล** ผ่าน `sync_table_status()` เท่านั้น
ห้าม `UPDATE dining_tables.status` ตรง ๆ เพื่อปลดโต๊ะ และห้ามให้สถานะโต๊ะอ้างอิง `order_items`
เพราะจะเปิดช่อง double-booking (โต๊ะว่างทั้งที่ยังมีบิลเปิด)

การกันจองซ้อนยังทำงานที่ DB สองชั้น:

- `uq_orders_one_active_per_table` (`FULL_INSTALL.sql`) — บิลเปิดได้โต๊ะละ 1 ใบ
- `trg_tables_status_guard` — `occupied` ต้องมีบิลเปิดจริง และห้ามตั้ง `available` ถ้ายังมีบิลเปิด

---

## 2. เส้นทางปิดบิลทั้งหมด

| การกระทำ | Endpoint | ใช้เมื่อ | สถานะรายการ |
|---|---|---|---|
| ยกเลิกทั้งบิล | `POST /orders/:id/cancel` | ลูกค้าเปลี่ยนใจ / เปิดผิดโต๊ะ ยังไม่มีอะไรเสิร์ฟ | void ทุกใบ (`draft/queued/preparing`) → ปิดเป็น `voided_all` |
| ยกเลิกบิลว่าง | `POST /orders/:id/cancel` | เปิดโต๊ะแล้วยังไม่สั่งอะไร | ไม่มีอะไรให้ void → ปิดเป็น `empty` |
| ปิดบิลลูกค้าหนี | `POST /orders/:id/close-unpaid` (`closeReason: 'walkout'`) | มีรายการเสิร์ฟ/พร้อมเสิร์ฟแล้ว และลูกค้าออกไป | ไม่แตะรายการ → ปิดเป็น `walkout` + **ต้องมี `note`** |
| ปิดบิลหลัง void ครบเอง | `POST /orders/:id/close-unpaid` (`voided_all`) | void ทีละรายการจนหมดแล้ว | ปิดเป็น `voided_all` |
| ชำระเงิน | `POST /payments/attempts` → `.../pay` | ลูกค้าจ่ายเงิน | ปิดเป็น `paid` (trigger ของ Payment) |

ทั้ง `cancel` และ `close-unpaid` อยู่ใน transaction เดียวของ request (`TenantContextInterceptor`)
→ void กับปิดบิลสำเร็จหรือล้มพร้อมกัน ไม่มีสภาพ "void หมดแล้วแต่โต๊ะยังไม่ว่าง"

---

## 3. `POST /orders/:id/cancel` — ยกเลิกทั้งบิล

**สิทธิ์ที่ route:** `order:create` (พนักงานกดได้)

**Body**

```json
{
  "approverPin": "246810",
  "reason": "ลูกค้าเปลี่ยนใจไม่กิน",
  "note": "ยังไม่เสิร์ฟเลย"
}
```

- `approverPin` — PIN 6 หลักของผู้ใช้ที่มีสิทธิ์ `order:close_unpaid` (และ `void:approve` ถ้าต้อง void)
- `reason` — บังคับ, ≤ 200 ตัวอักษร, เก็บเป็น `void_reason` ของทุกรายการ
- `note` — ไม่บังคับ, ≤ 500 ตัวอักษร, เก็บเป็น `orders.close_note`

**ขั้นตอนใน service**

1. ตรวจ PIN → ได้ `approver` (ผู้อนุมัติ)
2. `SELECT ... FOR UPDATE` ล็อกบิล (กันสองเครื่องกดพร้อมกัน)
3. ถ้าบิลปิดแล้ว → **404**
4. ถ้ามี payment attempt เปิดอยู่ → **409 `PAYMENT_ATTEMPT_OPEN`**
5. นับรายการที่ไม่ถูก void
   - มีรายการ `ready`/`served` → **409 `ORDER_HAS_SERVED_ITEMS`** (ให้ไปใช้ walkout)
6. ถ้ามีรายการต้อง void ตรวจว่าผู้อนุมัติมี `void:approve` → ไม่มี = **409 `APPROVER_LACKS_VOID`**
7. `UPDATE order_items SET status='voided'` ทุกใบ (เฉพาะ `draft/queued/preparing`)
8. ถ้าจำนวนที่ void ไม่เท่าที่นับไว้ (เครื่องอื่นแทรกรายการใหม่) → **409 `ORDER_CHANGED`** แล้ว rollback ทั้งหมด
9. ปิดบิล: `close_reason = 'voided_all'` (หรือ `'empty'`), `closed_by = ผู้อนุมัติ`
10. trigger `trg_orders_after` → `sync_table_status()` → โต๊ะกลับเป็น `available`

**Response**

```json
{
  "status": "success",
  "data": {
    "order": { "...orders row..." },
    "voidedCount": 2,
    "closeReason": "voided_all",
    "approvedBy": { "usersId": "uuid", "displayName": "ผู้จัดการ" }
  }
}
```

**Error codes ที่ FE ต้องจัดการ**

| code | HTTP | ความหมาย / ทางออก |
|---|---|---|
| `ORDER_HAS_SERVED_ITEMS` | 409 | มีรายการเสิร์ฟแล้ว → ใช้ "ปิดบิลลูกค้าหนี (walkout)" |
| `PAYMENT_ATTEMPT_OPEN` | 409 | มีรายการชำระเงินค้าง → ยกเลิก attempt ก่อน |
| `ORDER_CHANGED` | 409 | มีรายการใหม่แทรก → รีเฟรชแล้วกดใหม่ |
| `ORDER_CLOSED` | 409 | บิลปิดไปแล้วจากเครื่องอื่น |
| `APPROVER_LACKS_VOID` | 409 | ผู้อนุมัติไม่มีสิทธิ์ void |

---

## 4. `POST /orders/:id/close-unpaid` — ปิดบิลโดยไม่เก็บเงิน

**สิทธิ์ที่ route:** `order:create` — สิทธิ์จริง (`order:close_unpaid`) ตรวจที่ **PIN ของผู้อนุมัติ**
(เดิม route บังคับ `order:close_unpaid` ทำให้พนักงานกดไม่ได้)

**Body**

```json
{
  "closeReason": "walkout",
  "note": "ลูกค้าออกไปโดยไม่จ่ายเงิน",
  "approverPin": "246810"
}
```

- `closeReason`: `walkout` | `voided_all` | `empty`
- `note` **บังคับ** เมื่อ `walkout` และบิลยังมีรายการ (เก็บใน `orders.close_note` + audit)
- ต้องไม่มี payment attempt เปิดอยู่ (409 `PAYMENT_ATTEMPT_OPEN`)

**Response:** `{ status: 'success', data: { order, approvedBy } }`

---

## 5. `POST /tables/:id/sync-status` — ซ่อมสถานะโต๊ะ

**สิทธิ์:** `table:manage`

เรียก `sync_table_status($1)` ของ DB ตรง ๆ (ไม่ใช่การแก้สถานะมือ):

- มีบิลเปิด → `occupied`
- ไม่มีบิลเปิด → `available`
- `out_of_service` → ไม่ถูกแตะ

ใช้เมื่อข้อมูลในหน้าจอไม่ตรง (เช่น เพิ่ง deploy หรือมีคนแก้ DB) — **ไม่ใช่ทางลัดปลดโต๊ะที่ยังมีบิล**

---

## 6. กติกาที่ห้ามพลาด

1. **`closed_by` = ผู้อนุมัติ ไม่ใช่คนกด** (ตาม convention void/comp) — คนกดอยู่ใน `audit_logs.user_id` (จาก `app_user_id()`)
2. **ห้าม UPDATE `dining_tables.status` เพื่อปลดโต๊ะ** — ต้องปิดบิลหรือเรียก `sync_table_status()`
3. **ห้ามคำนวณยอดเงินใน NestJS/client** — modal แสดงยอดจาก `GET /tables` (`total_amount`) หรือ `attempt.amount`
4. **PIN ผิด 5 ครั้ง/บัญชีผู้ขอ → ล็อก 5 นาที (429)** — ตัวนับเขียนด้วย `DbContextService.durableQuery` เท่านั้น (ไม่งั้น 403 จะ rollback ตัวนับทิ้ง)
5. **void รายการของบิลปิดแล้วทำไม่ได้** — trigger `trg_order_item_state` โยน `order is closed` (patch 08)

---

## 7. Patch ฐานข้อมูล

`backend/src/database/PATCH_08_cancel_order.sql` (mirror ลง `FULL_INSTALL.sql` แล้ว):

- `orders.close_note TEXT` — หมายเหตุการปิดบิลโดยไม่เก็บเงิน
- `trg_order_item_state()` — บล็อก void รายการของบิลปิด (`order is closed`)
- `trg_orders_after()` — audit `order_closed_unpaid` เก็บ `note` ด้วย

**apply ต้องใช้ user `postgres`** (เจ้าของตาราง) — `pos_app` ไม่มีสิทธิ์ `ALTER TABLE orders`

```powershell
# ตัวอย่าง (รหัสผ่านอ่านจาก backend/.env)
psql -U postgres -d pwa_pos -f backend/src/database/PATCH_08_cancel_order.sql
```

---

## 8. ฝั่งหน้าจอ (FE)

- `frontend/src/features/mainpos/components/CancelBillModal.tsx` — modal ใช้ร่วมสองโหมด (`cancel` / `closeUnpaid`) มีช่อง PIN + เหตุผล/หมายเหตุ
- `OrderSidebar` — ปุ่ม **"ยกเลิกทั้งบิล"** ท้าย sidebar (ใต้ปุ่มชำระเงิน)
- `TablesPage` / `TableCard` — เมนูจัดการโต๊ะ: เปิดบิล · ยกเลิกทั้งบิล · ปิดบิลลูกค้าหนี · ซิงค์สถานะ; การ์ดแสดงจำนวนรายการ + ยอดค้าง
- สำเร็จ → ล้างตะกร้า, toast แจ้งผู้อนุมัติ, กลับหน้าโต๊ะ (โต๊ะว่างแล้วจาก trigger)

---

## 9. การทดสอบ

```powershell
# unit (mock repo/users)
cd backend; npx jest src/modules/orders/orders-cancel.spec.ts

# E2E (ต้องมี backend + DB จริง)
node backend/test/e2e/e2e-cancel-order.mjs
```

E2E ครอบคลุม: พนักงานกด + PIN เจ้าของ, `closed_by` = ผู้อนุมัติ, โต๊ะกลับว่าง,
เปิดบิลซ้อน → 409, served item → 409, walkout ไม่มี note → 400, walkout สำเร็จ,
void หลังปิดบิล → 409, payment attempt เปิด → 409, `sync-status`, PIN ผิด → 403,
PIN ผิด 5 ครั้ง → 429
