# Daily Update — 21 ตุลาคม 2569

**Branch:** `feat-aod`
**Commit:** [`b5659aa`](https://github.com/Slippery77/PWA-POS/commit/b5659aa)
**ผู้รับผิดชอบ:** Aod

---

## สิ่งที่ทำวันนี้

### 1. Merge กับ `feat-benz`

รวม branch `feat-benz` ซึ่งมี shift module เสร็จแล้วเข้ากับ `feat-aod`

**แก้ conflict ใน `Header.tsx` 2 จุด:**
- โลโก้ชี้ไปหน้า `/tables` (ของเรา)
- ใช้ `useParams` + `useLogin().logout()` จาก benz แทน `useAuth` + `useNavigate`

**ได้จาก benz:**
- `POST /shifts/open`, `/close`, `/verify`, `/reopen`
- `POST /cash-movements`
- `GET /cashbook`

---

### 2. Orders Module — implement repository stubs

ไฟล์: `backend/src/modules/orders/orders.repository.ts`

| Method | รายละเอียด |
|---|---|
| `findOpenOrders()` | SELECT orders ที่ยังไม่ปิด + JOIN dining_tables + aggregate item_count, total_amount |
| `addOrderItems()` | อ่าน price/name snapshot จาก DB → INSERT order_items + order_item_modifiers, รองรับ `kitchenTicketId` ให้ insert เป็น `status='queued'` ทันที |
| `moveTable()` | UPDATE table_id (trigger จัดการสถานะโต๊ะอัตโนมัติ) |
| `closeUnpaid()` | UPDATE close_reason + closed_at + closed_by |
| `syncOrders()` | Batch INSERT ON CONFLICT DO NOTHING (idempotent สำหรับ offline sync) |

แก้ `orders.service.ts`:
- forward `kitchenTicketId` ไปยัง repository
- `createOrder()` retry ตอบ 200 + ข้อมูลเดิมแทน throw error
- เพิ่ม error handling และ `NotFoundException` ครบทุก method

---

### 3. หน้าผังโต๊ะ (Tables Page)

**ไฟล์ใหม่:**

```
frontend/src/features/tables/
├── types/table.types.ts       — DiningTable type รวม open_order_id, item_count, total_amount
├── hooks/useTables.ts         — hook ดึง GET /tables
├── components/TableCard.tsx   — การ์ดโต๊ะ 3 สถานะ (ว่าง / มีลูกค้า / ปิดใช้งาน)
└── pages/TablesPage.tsx       — หน้าผังโต๊ะ grid จัดกลุ่มตามชั้น
```

**ปรับ Backend:**
- `tables.repository.ts` — `findAll()` เพิ่ม LEFT JOIN กับ orders + order_items เพื่อคืน `open_order_id`, `item_count`, `total_amount`
- `tables.service.ts` — ห่อ response + cast ตัวเลข

**ปรับ Frontend:**
- `AppRouter.tsx` — เพิ่ม route `/:tenantSlug/tables`
- `Header.tsx` — โลโก้ชี้ `/tables`, เพิ่ม link "โต๊ะ" ในเมนู, **ลบ link "POS"** (ต้องเข้าผ่านหน้าโต๊ะเท่านั้น)

**Flow:** กดการ์ดโต๊ะ → navigate ไปหน้า POS พร้อม `tableId`, `tableName`, `orderId` ใน URL

---

### 4. MainPOS — ส่งครัวเชื่อม Backend จริง

ไฟล์: `frontend/src/features/mainpos/pages/MainPOS.tsx`

`handleSendToKitchen()` เดิมทำงานกับ localStorage เท่านั้น แก้ให้ call API จริง:

1. หา `orderId` — จาก URL → `GET /tables` หา `open_order_id` → `POST /orders` ถ้าโต๊ะว่าง
2. แปลง cartMenu → items (1 จาน = 1 item, `quantity > 1` = หลาย item)
3. `POST /orders/:id/items` พร้อม `kitchenTicketId` → backend insert เป็น `status='queued'` ทันที
4. ลบ dropdown เลือกโต๊ะออก เหลือแค่แสดงชื่อโต๊ะ + ปุ่มกลับหน้าโต๊ะ

---

### 5. Modifier ใน POS — เชื่อมข้อมูลจาก API จริง

**Types:**
- `pos.types.ts` — `ModifierOption.id` / `ModifierGroup.id` เปลี่ยนจาก `number` → `string` (UUID), เพิ่ม `isRequired`
- `item.types.ts` — เพิ่ม `modifier_group_ids`, `ApiModifierGroup`, `FullMenuData`

**`useFullMenu.ts`** — implement ครบ:
- Map `modifier_groups` จาก API → `ModifierGroup[]`
- `selection_type: 'single'` → `type: 'radio'`, `'multi'` → `'checkbox'`
- คืน `menu[]` พร้อม `modifiers[]` ที่ผูกแล้ว

**`ModifierPopup.tsx`** — เขียนใหม่:
- รองรับหลาย radio group พร้อมกัน (เก็บ `Record<groupId, option>`)
- แสดง badge "จำเป็น" / "ไม่บังคับ" บนทุก group
- Required validation — แสดง error ถ้ายังไม่เลือก group ที่บังคับ
- คำนวณราคารวม radio + checkbox ทั้งหมดถูกต้อง

**Seed ข้อมูลทดสอบลง DB:**
- 4 หมวดหมู่: อาหารจานหลัก, ของทานเล่น, ของหวาน, เครื่องดื่ม
- 31 เมนู
- 7 Modifier groups ผูกกับเมนูที่เหมาะสม

---

### 6. KDS — เชื่อม Backend จริง

**ไฟล์ใหม่: `frontend/src/features/kds/hooks/useKDSQueue.ts`**
- Polling `GET /kds/queue` ทุก **3 วินาที**
- `updateItemStatus()` → `PATCH /kds/items/:id/status`
- ใช้ `tokenRef` ป้องกัน stale closure ใน `setInterval`

**`kds/types/kds.types.ts`** — เพิ่ม:
- `ApiKDSItem`, `KDSTicket`, `BackendKDSStatus`
- `groupItemsToTickets()` — จัด flat item list ตาม `kitchen_ticket_id` เป็น ticket card
- `toUIStatus()`, `toBackendStatus()` — map ไทย ↔ EN

**`kds/components/KDSCard.tsx`** — เขียนใหม่:
- รับ `KDSTicket` แทน `KDSOrder`
- แสดง modifier และ special_request จาก backend
- ปุ่มมี loading state ระหว่าง API call
- ปุ่มยกเลิกส่ง `voided` + void reason

**`kds/pages/KDSPage.tsx`** — ใช้ `useKDSQueue` แทน `useKDS`, มี loading/error state

**`kds/context/KDSContext.tsx`** — คง `sendOrderToKitchen()` ไว้สำหรับนับ badge บน Header เท่านั้น

---

## Bug ที่แก้

### 🔴 `AuthContext` — token หายทุกครั้งที่ navigate

**ไฟล์:** `frontend/src/features/auth/context/AuthContext.tsx`

**ปัญหา:** Token เก็บใน React state เท่านั้น → หายทุกครั้งที่ navigate ข้ามหน้าหรือ refresh ทำให้ทุก hook ที่ call API ได้ `accessToken = null` แล้วไม่ทำงาน (KDS ไม่แสดงออเดอร์, menu โหลดไม่ขึ้น)

**วิธีแก้:** `setAuth()` เขียนลง `sessionStorage` ด้วย, `useState` อ่านจาก `sessionStorage` ตอน mount

> ⚠️ **ทีมควร pull branch นี้มาก่อน** ถ้าเจอ 401 แปลกๆ จาก API

### 🔴 `kds.repository.ts` — SQL error `42P08`

**ปัญหา:** `$2` ถูกใช้ใน `SET status = $2` (varchar) และ `CASE WHEN $2 = 'voided'` (text comparison) พร้อมกัน — PostgreSQL infer ชนิดไม่ได้

**วิธีแก้:** เพิ่ม explicit cast `$2::varchar` และ `$3::text`

---

## สถานะโมดูลหลังวันนี้

| โมดูล | Backend | Frontend |
|---|---|---|
| Register / Login | ✅ | ✅ |
| หน้าโต๊ะ | ✅ | ✅ |
| เมนู + Modifier | ✅ | ✅ ต่อ API จริงแล้ว |
| Order (ส่งครัว) | ✅ | ✅ ต่อ backend แล้ว |
| KDS | ✅ | ✅ polling + state machine |
| Shift / Cash | ✅ (benz) | ✅ SiftworkPage |
| Inventory | ✅ | ✅ |
| **Payment** | ❌ ยังไม่เริ่ม | ⚠️ mock UI เท่านั้น |
| **Report** | ❌ ยังไม่เริ่ม | ⚠️ mock UI เท่านั้น |

**งานหลักที่เหลือ:** Payment module — VAT 3 โหมด, service charge, receipt number, multi-table merge

---

## ดูรายละเอียดเพิ่มเติม

- **Commit diff:** https://github.com/Slippery77/PWA-POS/commit/b5659aa
- **Branch:** https://github.com/Slippery77/PWA-POS/tree/feat-aod
- **Backend todo อัปเดต:** `docs/backend-todo.md`
