# Void / Comp — PIN อนุมัติโดยผู้จัดการ/เจ้าของร้าน

> ขอบเขต: รายการอาหารในบิล (`order_items`) ที่ยังไม่ชำระเงิน — ใช้กับหน้า MainPOS
> อัปเดต: 2026-10-30 (branch `feat-aod`)

## 1. กฎธุรกิจ

| การกระทำ | สถานะที่ทำได้ | สิทธิ์ของผู้อนุมัติ | คอลัมน์ที่บันทึก |
|---|---|---|---|
| Void (ยกเลิกรายการ) | `queued`, `preparing` | `void:approve` | `status='voided'`, `voided_by`, `void_reason` |
| Comp (ให้ฟรี 100%) | `served` | `discount:approve` | `is_comped=true`, `comped_by`, `comp_reason` |

- **ทุกครั้งต้องมี PIN 6 หลักของผู้จัดการ/เจ้าของร้าน** — PIN ของใครก็ได้ในร้าน ไม่ต้องสลับ login
- `voided_by` / `comped_by` เก็บ **ผู้อนุมัติ (เจ้าของ PIN)** เพราะ DB trigger `trg_order_item_state` ใช้ `has_permission()` ตรวจสิทธิ์จากคอลัมน์นี้
- ระบบ **ไม่บันทึกผู้กด** (requester) แยกจากผู้อนุมัติ — ถ้าต้องการ audit ครบต้องเพิ่มคอลัมน์ `void_requested_by` / `comp_requested_by`
- Void แล้วรายการจะถูกตัดออกจาก `GET /orders/:id` (`oi.status <> 'voided'`) → หายจากตะกร้า/ยอดบิล
- Comp แล้วรายการยังอยู่ในบิล แต่ `total_amount` ของบิลคิดเป็น 0 (`CASE WHEN oi.is_comped THEN 0`)

## 2. API

### `POST /api/orders/items/void`

```json
{
  "orderItemIds": ["<uuid>", "<uuid>"],
  "reason": "ลูกค้ายกเลิก",
  "approverPin": "246810"
}
```

### `POST /api/orders/items/comp`

```json
{
  "orderItemIds": ["<uuid>"],
  "reason": "ลูกค้าไม่พอใจ",
  "approverPin": "246810"
}
```

Response (201):

```json
{
  "status": "success",
  "data": {
    "items": [{ "order_item_id": "...", "order_id": "...", "status": "voided", "voided_by": "..." }],
    "approvedBy": { "usersId": "...", "displayName": "เจ้าของร้าน" }
  }
}
```

- Guard: `@RequirePermissions('order:create')` + PIN เป็นชั้นอนุมัติ (employee ไม่มี PIN จึงกดเองไม่ได้)
- ส่งได้หลาย `orderItemIds` ต่อครั้ง แต่ **ต้องอยู่บิลเดียวกัน**, บิลต้องยังไม่ปิด/ยังไม่จ่าย
- route เดี่ยวเดิม `POST /orders/items/:id/void|comp` ถูกถอดออกแล้ว (404)

### Error

| Status | ความหมาย |
|---|---|
| 400 | `approverPin` ไม่ใช่ตัวเลข 6 หลัก / ไม่ได้ระบุรายการ |
| 403 | PIN ไม่ถูกต้อง หรือ PIN ถูกแต่เจ้าของ PIN ไม่มีสิทธิ์อนุมัติ |
| 404 | route เก่า / ไม่พบรายการ |
| 409 | สถานะรายการไม่เข้าเงื่อนไข, บิลปิด/จ่ายแล้ว, ถูก void/comp ไปแล้ว, หรือไม่มีผู้อนุมัติที่พร้อม |
| 429 | ผู้กดกรอก PIN ผิดครบ 5 ครั้ง → ล็อก 5 นาที |

## 3. การนับ PIN ผิด (สำคัญ)

- นับที่ **บัญชีที่กดขอ (requester)** ไม่ใช่เจ้าของ PIN — กันการเดา PIN จากบัญชีเดียว
- ผิด 5 ครั้ง → `pin_locked_until = now() + 5 นาที` และตอบ 429 ตั้งแต่ครั้งที่ 5
- ผู้ใช้ที่ถูกล็อกจะถูกตัดออกจากรายชื่อผู้อนุมัติด้วย (`findPinApprovers`) → ร้านที่มีผู้จัดการคนเดียวจะอนุมัติไม่ได้จนหมดเวลา
- ตัวนับเขียนด้วย `DbContextService.durableQuery()` คือ commit **นอก transaction ของ request**
  - เหตุผล: ถ้าเขียนใน transaction แล้วโยน 403 ตัวนับจะถูก rollback หายทั้งหมด (บั๊กเดิม)
  - ห้ามใช้ `durableQuery()` กับงานธุรกิจปกติ (void/comp/ชำระเงิน) — งานพวกนั้นต้อง rollback ได้
- `POST /shifts/:id/verify` ใช้วิธีเดียวกันแล้ว (นับที่ผู้ขอ + `recordPinFailureDurable`) — ดู `docs/HANDOFF.md` หัวข้อ 3.10

## 4. Frontend

- `frontend/src/features/mainpos/components/ItemActionModal.tsx` — modal กลางที่ใช้ทั้ง void และ comp
  - ฟอร์ม: เหตุผล (บังคับ) + `PinInput` 6 หลัก (บังคับ)
  - a11y: `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, error เป็น `role="alert"` + `aria-live`
  - ปิดด้วย Esc / คลิก backdrop / ปุ่มปิด (ปิดไม่ได้ระหว่างส่งคำขอ)
- `VoidItemModal.tsx` / `CompItemModal.tsx` เป็น wrapper บาง ๆ ของ `ItemActionModal`
- `OrderSidebar.tsx`
  - ปุ่ม void/comp แสดงเมื่อมีรายการที่เข้าเงื่อนไข (นับรายชิ้น) — ทุก role เห็นได้ เพราะอนุมัติด้วย PIN
  - badge `ให้ฟรี (COMP) n`, ยอดบรรทัดและยอดรวมหักรายการที่ comp แล้ว, มีบรรทัด `ให้ฟรี (COMP) −฿…`
  - tooltip/aria-label บอกให้ชัดว่าต้องมี PIN ผู้จัดการ
- หลังทำสำเร็จ → toast (aria-live) + `refreshCartFromServer(orderId)` ดึงบิลใหม่จาก server

## 5. การทดสอบ

```powershell
# ต้องมี backend (port 3000) + PostgreSQL รันอยู่
node backend/test/e2e/e2e-void-comp.mjs
```

สคริปต์สมัครร้านใหม่ทุกครั้ง (tenant `vc-<stamp>`) แล้วตรวจ 31 ข้อ: PIN ผิด/รูปแบบผิด, void/comp สำเร็จแบบกลุ่ม, `voided_by`/`comped_by` = ผู้อนุมัติ, void ซ้ำ 409, comp ก่อนเสิร์ฟ 409,
พนักงาน (ไม่มี PIN) ต้องขอ PIN ผู้จัดการ, ล็อกหลังผิด 5 ครั้ง (429), และ route เก่า 404

## 6. บั๊กที่แก้ไปพร้อมกัน

`UsersRepository.createOwner()` เดิมรับพารามิเตอร์สลับลำดับ (`display_name`, `pin`) แต่ผู้เรียกส่ง `(pin, display_name)`
→ hash PIN ไปลงคอลัมน์ `display_name` และชื่อจริงไปลง `pin_hash`
ผลคือร้านที่สมัครก่อนแก้: ชื่อผู้ใช้แสดงเป็น bcrypt hash และ PIN ใช้ไม่ได้
**ข้อมูลเก่าซ่อมไม่ได้ด้วยสคริปต์** (ไม่รู้ชื่อจริง) — ต้องให้เจ้าของร้านแก้ผ่านหน้า Users
