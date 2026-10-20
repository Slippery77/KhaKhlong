# System Config — คู่มือ module ตั้งค่าการทำงานของร้าน

> module: `backend/src/modules/system-config/`
> endpoint: `GET /system-config` · `PATCH /system-config/:key`
> ตาราง: `config_definitions` · `system_config`
> Business Rules อ้างอิง: หัวข้อ 12 (CFG-01 ถึง CFG-09)

---

## 1. module นี้คืออะไร

ลองนึกถึงเครื่อง POS จริงที่มี "ปุ่มปรับ" อยู่ด้านหลัง เช่น สวิตช์เปิดปิดจอครัว ปุ่มหมุนตั้ง VAT หรือตัวตั้งเวลาว่าวันขายใหม่เริ่มกี่โมง

**System Config คือปุ่มปรับพวกนั้น** ไม่ใช่ข้อมูลที่เอาไว้โชว์ แต่เป็น **กฎที่ส่วนอื่นของระบบอ่านไปตัดสินใจ** ว่าจะทำงานแบบไหน

ระบบเราเป็น multi-tenant คือหลายร้านใช้ระบบเดียวกัน แต่แต่ละร้านทำงานไม่เหมือนกัน

| ร้าน A (ร้านอาหารนั่งทาน) | ร้าน B (ร้านก๋วยเตี๋ยว) |
|---|---|
| จด VAT แล้ว ราคาเมนูรวม VAT | ไม่ได้จด VAT |
| มีจอครัว | ไม่มีจอครัว ตะโกนสั่งเอา |
| กินก่อน จ่ายทีหลัง | จ่ายก่อนกิน |
| ปิดร้านตี 2 | ปิดร้าน 2 ทุ่ม |

ถ้า hardcode ค่าเหล่านี้ไว้ในโค้ด ระบบจะถูกใจได้แค่ร้านเดียว config จึงทำให้ **โค้ดชุดเดียวทำงานถูกต้องกับทุกร้าน**

> **อย่าสับสนกับ `/store`**
> `/store` (ตาราง `tenants`) = ข้อมูลร้าน เช่น ชื่อ ที่อยู่ เบอร์โทร ใช้แสดงผลเป็นหลัก เช่น หัวใบเสร็จ
> `/system-config` = กฎการทำงาน module อื่นอ่านไปตัดสินใจ
> สองอย่างนี้คนละ endpoint คนละตาราง

---

## 2. โครงสร้างข้อมูล: ทำไมมี 2 ตาราง

### `config_definitions` — "แบบฟอร์มกลาง" ใช้ร่วมกันทุกร้าน

บอกว่า config แต่ละตัว **คืออะไร รับค่าอะไรได้ ใครแก้ได้** มี 9 แถวตายตัว แอปแก้ไม่ได้ (REVOKE ไว้แล้ว)

| คอลัมน์ | ความหมาย |
|---|---|
| `config_key` | ชื่อ config เช่น `vat_rate` |
| `value_type` | ชนิด: `int` · `decimal` · `bool` · `text` |
| `default_value` | ค่าเริ่มต้นที่ร้านใหม่ได้ |
| `min_value` / `max_value` | ช่วงค่าที่ยอมรับ (เฉพาะตัวเลข) |
| `allowed_values` | ตัวเลือกที่อนุญาต (เฉพาะ text) |
| `owner_only` | `true` = แก้ได้เฉพาะ Owner |
| `description` | คำอธิบาย |

### `system_config` — "ค่าที่แต่ละร้านกรอก"

ร้านละ 9 แถว เก็บค่าจริงของร้านนั้น

| คอลัมน์ | ความหมาย |
|---|---|
| `tenant_id` + `config_key` | PK คู่ — ร้านหนึ่งมี key ละ 1 ค่า |
| `config_value` | ค่าที่ตั้ง (เก็บเป็น text เสมอ) |
| `updated_by` / `updated_at` | ใครแก้ล่าสุด เมื่อไหร่ (trigger เติมให้) |

### ทำไมไม่ทำเป็นคอลัมน์ในตาราง `tenants` ตรง ๆ

แบบ key-value (CFG-02) เพิ่ม config ใหม่ได้แค่ INSERT 1 แถวใน `config_definitions` ไม่ต้อง migrate schema ข้อเสียคือเสีย type safety เพราะทุกค่าเป็น text — **ตาราง `config_definitions` + trigger มีไว้ชดเชยจุดนี้** (CFG-06) ทำให้ใส่ค่าผิดชนิดหรือเกินช่วงไม่ได้ตั้งแต่ระดับ DB

### ร้านใหม่ได้ config ตอนไหน

trigger `seed_config` ทำงานทันทีหลัง INSERT ร้านใหม่ลง `tenants` คัดลอก `default_value` ทั้ง 9 ตัวเข้า `system_config` ให้อัตโนมัติ (CFG-07) — **จึงไม่มี endpoint POST หรือ DELETE** เพราะร้านมี config ครบตั้งแต่เกิด และลบไม่ได้

---

## 3. config ทั้ง 9 ตัว: ทำอะไร ใครแก้ ถ้าไม่มีจะเป็นยังไง

### กลุ่มภาษี — แก้ได้เฉพาะ Owner (`owner_only = true`)

| key | ค่าเริ่มต้น | ช่วง | ใช้ทำอะไร | ใครอ่านไปใช้ |
|---|---|---|---|---|
| `vat_mode` | `none` | `none` / `inclusive` / `exclusive` | โหมด VAT — ร้านเล็กส่วนใหญ่ไม่ได้จด VAT จึงตั้ง `none` | trigger `trg_payments_before` |
| `vat_rate` | `7` | 0–100 | อัตรา VAT (%) | trigger `trg_payments_before` |
| `service_charge_rate` | `0` | 0–100 | ค่าบริการ (%) | trigger `trg_payments_before` |

**ทำไมเฉพาะ Owner:** กระทบยอดเงินและความถูกต้องทางบัญชีทั้งร้าน (CFG-04)

**ถ้าแก้ VAT แล้วบิลเก่าจะเพี้ยนไหม:** ไม่เพี้ยน — ตอนสร้าง payment ระบบ snapshot อัตราที่ใช้ลงคอลัมน์ของ `payments` ไว้ (CFG-01, PAY-10) และ payment เป็น immutable บิลเก่าจึงพิมพ์ซ้ำได้ถูกต้องเสมอ

**กฎพิเศษ:** จะเปลี่ยน `vat_mode` เป็นค่าอื่นที่ไม่ใช่ `none` ได้ ร้านต้องมี `tenants.tax_id` ก่อน (ใบกำกับภาษีต้องมีเลขผู้เสียภาษี) — trigger จะ reject พร้อมข้อความภาษาไทย

### กลุ่มการทำงาน — Owner และ Manager แก้ได้ (`owner_only = false`)

| key | ค่าเริ่มต้น | ช่วง | ใช้ทำอะไร | ใครอ่านไปใช้ |
|---|---|---|---|---|
| `business_day_start_hour` | `5` | 0–23 | ชั่วโมงที่ถือว่าเริ่มวันขายใหม่ | `compute_business_date()` → Shift, Report |
| `shift_escalation_hours` | `4` | 1–168 | กะค้าง verify นานเกินกี่ชั่วโมงถึงแจ้ง Owner | `escalate_overdue_shifts()` |
| `max_reprints` | `0` | 0–1000 | พิมพ์ใบเสร็จซ้ำได้กี่ครั้ง (`0` = ไม่จำกัด) | trigger `trg_reprint_limit` |
| `kds_enabled` | `true` | true/false | ร้านมีจอครัวไหม | **ยังไม่มีที่ไหนอ่าน** — ดูข้อ 9 |
| `require_all_served_before_payment` | `true` | true/false | ต้องเสิร์ฟครบก่อนจ่ายไหม (PAY-03) | trigger `trg_pao_guard` |
| `inventory_variance_alert_percent` | `20` | 0–1000 | สต็อกนับจริงต่างจากระบบเกินกี่ % ถึงแจ้งเตือน | ฟังก์ชันตรวจสต็อก (INV-12) |

### ตัวอย่างให้เห็นภาพ

- **`business_day_start_hour`** — ร้านปิดตี 2 ถ้าตั้งเป็น `0` ยอดขายหลังเที่ยงคืนจะถูกนับเป็น "วันพรุ่งนี้" กะจะถูกแบ่งเป็น 2 วันทั้งที่ร้านเปิดรอบเดียว ตั้งเป็น `5` ยอดถึงตี 4:59 ยังนับเป็นวันเดิม
- **`require_all_served_before_payment`** — ร้านนั่งทานตั้ง `true` กันพนักงานเก็บเงินทั้งที่อาหารยังไม่ออก ร้านก๋วยเตี๋ยวจ่ายก่อนกินต้องตั้ง `false` ไม่งั้นรับเงินไม่ได้เลย
- **`max_reprints`** — ตั้งเป็น `2` กันพนักงานพิมพ์ใบเสร็จซ้ำไปใช้ทุจริต (เช่น พิมพ์ใบเดิมให้ลูกค้าคนใหม่แล้วเก็บเงินเข้ากระเป๋า)

---

## 4. ถ้าไม่มี module นี้จะเป็นอะไร

**สิ่งสำคัญที่ต้องเข้าใจ:** ต่อให้ไม่มี endpoint นี้ ระบบ**ยังทำงานได้** เพราะ trigger อ่านค่าผ่าน `cfg()` โดยตรงจาก DB และทุกร้านได้ค่าเริ่มต้นตั้งแต่ตอนสร้าง

สิ่งที่หายไปคือ **ร้านปรับค่าเองไม่ได้** ทุกร้านถูกบังคับให้ใช้ค่าเริ่มต้นเหมือนกันหมด:

| ถ้าไม่มี | ผลกระทบกับร้านจริง |
|---|---|
| แก้ `vat_mode` ไม่ได้ | ร้านที่จด VAT ออกบิลไม่มี VAT ผิดกฎหมายภาษี |
| แก้ `require_all_served_before_payment` ไม่ได้ | ร้านจ่ายก่อนกินรับเงินไม่ได้ เพราะ trigger block |
| แก้ `business_day_start_hour` ไม่ได้ | ร้านเปิดดึกเกินตี 5 ยอดขายแตกเป็น 2 วัน รายงานผิด |
| แก้ `max_reprints` ไม่ได้ | ร้านที่อยากคุมการพิมพ์ซ้ำทำไม่ได้ |
| ไม่มี `GET` | frontend ไม่รู้ว่าต้องซ่อนหน้าจอครัว หรือปุ่มจ่ายเงินควรกดได้เมื่อไร |

และถ้าไม่มีทั้ง module รวมถึงตาราง (hardcode ค่าในโค้ดแทน): ทุกการเปลี่ยนค่าต้องแก้โค้ดแล้ว deploy ใหม่ และค่าเดียวใช้กับทุกร้าน ซึ่งขัดกับการเป็น SaaS multi-tenant ตั้งแต่ต้น

ระบบ POS จริงก็ทำแบบนี้ เช่น **Loyverse** (ใช้เยอะในไทย) ให้ร้านตั้งค่า tax และเปิดปิด kitchen display เอง **Square** ให้ตั้ง tax, service charge และเวลาปิดวันขาย (close of day) เอง

---

## 5. `GET /system-config` — อ่าน config ทั้งหมดของร้าน

### ใครเรียกได้

**ทุก role ที่ login แล้ว** (`@AnyAuthenticated`) — Employee ก็ต้องอ่านได้ เพราะหน้าจอที่พนักงานใช้ต้องรู้ว่าร้านมีจอครัวไหม ต้องเสิร์ฟครบก่อนจ่ายไหม

### Request

```http
GET /system-config
Authorization: Bearer <JWT>
```

ไม่ต้องส่ง tenant — ระบบรู้จาก JWT อยู่แล้ว (ห้ามรับ tenant จาก client เพื่อกันการดูข้อมูลข้ามร้าน)

### Response

```json
{
  "status": "success",
  "data": [
    {
      "key": "kds_enabled",
      "value": true,
      "valueType": "bool",
      "min": null,
      "max": null,
      "allowedValues": null,
      "ownerOnly": false,
      "description": "เปิดจอครัว",
      "updatedAt": "2026-10-19T09:12:00.000Z"
    },
    {
      "key": "vat_mode",
      "value": "none",
      "valueType": "text",
      "min": null,
      "max": null,
      "allowedValues": ["none", "inclusive", "exclusive"],
      "ownerOnly": true,
      "description": "none=ไม่จด VAT (default), inclusive=...",
      "updatedAt": null
    }
    // ... ครบ 9 ตัว เรียงตาม key
  ]
}
```

### ข้างในทำงานยังไง

1. SQL ใช้ `config_definitions LEFT JOIN system_config` — **definitions เป็นตัวหลัก** จึงได้ครบ 9 แถวเสมอ ถ้าร้านไหนไม่มีแถวใน `system_config` (เช่น ร้านเก่าที่สร้างก่อนมี trigger) จะใช้ `default_value` แทนผ่าน `COALESCE`
2. กรองร้านด้วย `app_tenant_id()` ซึ่งอ่านจาก session context ที่ interceptor ตั้งไว้ + RLS เป็นด่านที่สอง
3. ผ่าน mapper (`mapper/system-config.mapper.ts`) แปลงชนิดก่อนส่ง

### ทำไมต้องมี mapper

DB เก็บทุกค่าเป็น text และ driver `pg` คืน `NUMERIC` เป็น string ถ้าไม่แปลง frontend จะได้:

```js
{ kds_enabled: "false" }
if (config.kds_enabled) { ... }   // "false" เป็น truthy → เข้า if ทั้งที่ปิดอยู่!
```

บั๊กแบบนี้เงียบมาก หาไม่เจอ mapper จึงแปลงตาม `value_type` ให้ที่จุดเดียว:

| `value_type` | DB เก็บ | mapper แปลงเป็น |
|---|---|---|
| `bool` | `"false"` | `false` |
| `int` / `decimal` | `"7"` | `7` |
| `text` | `"none"` | `"none"` |

`min` / `max` ก็แปลงจาก string เป็น number ด้วย

---

## 6. `PATCH /system-config/:key` — แก้ค่าทีละตัว

### Request

```http
PATCH /system-config/kds_enabled
Authorization: Bearer <JWT>
Content-Type: application/json

{ "value": false }
```

`value` รับได้ 3 ชนิด: string · number · boolean ส่ง field อื่นนอกจาก `value` จะได้ 400 (`forbidNonWhitelisted`)

### Response (สำเร็จ)

หน้าตาเดียวกับ 1 รายการใน GET — frontend ใช้โค้ดชุดเดียวกันอ่านได้เลย

```json
{
  "status": "success",
  "data": {
    "key": "kds_enabled",
    "value": false,
    "valueType": "bool",
    "ownerOnly": false,
    "updatedAt": "2026-10-19T10:30:00.000Z"
    // ...
  }
}
```

### ขั้นตอนข้างใน (ตามลำดับ)

```
1. หา key ใน config_definitions
     ไม่เจอ ─────────────────────────────────► 404
2. เลือก permission จาก owner_only ของ key นั้น
     owner_only = true  → ต้องมี tax:configure
     owner_only = false → ต้องมี config:edit_operational
     ไม่มีสิทธิ์ ──────────────────────────────► 403
3. เช็คว่า value เป็น string / number / boolean
     เป็น array หรือ object ──────────────────► 400
4. UPDATE system_config  (แปลง value เป็น text)
     trigger ตรวจ: ชนิด · ช่วงค่า · allowed_values · owner-only ซ้ำ · tax_id
     ไม่ผ่าน (P0001) ─────────────────────────► 400 หรือ 403
     trigger เติม updated_by + เขียน audit_logs ให้เอง
5. UPDATE ได้ 0 แถว ───────────────────────────► 404
6. ส่งผลผ่าน mapper ตัวเดียวกับ GET ────────────► 200
```

### ใครแก้อะไรได้

| | 3 key ภาษี | 6 key การทำงาน |
|---|---|---|
| **Owner** | ✅ | ✅ |
| **Manager** | ❌ 403 | ✅ |
| **Employee** | ❌ 403 | ❌ 403 |

permission มาจาก seed: Owner ได้ทุก permission (ยกเว้น `payment:edit_closed`) · Manager ได้ `config:edit_operational` · Employee ไม่ได้ทั้งสองตัว

### ทำไมใช้ `@AnyAuthenticated` แทน `@RequirePermissions(...)`

permission ที่ต้องใช้ **ขึ้นกับว่าแก้ key ไหน** ซึ่งรู้ได้ตอนอ่าน `owner_only` จาก DB เท่านั้น decorator ตายตัวทำไม่ได้:

- แปะ `@RequirePermissions('tax:configure')` → Manager แก้ `kds_enabled` ไม่ได้ ทั้งที่ควรได้
- แปะทั้งสองตัว → guard ใช้ `hasAllPermissions` ต้องมีครบทุกตัว Manager โดน 403 ทุก key

จึงให้ guard ปล่อยผ่านแค่ "login แล้ว" แล้วไปตัดสินจริงใน service

> ⚠️ **ข้อควรระวัง:** ถ้าวันหนึ่งมีคนลบการเช็ค permission ใน service ทิ้ง endpoint นี้จะเปิดให้ทุก role แก้ได้ทันที — ห้ามลบบรรทัดนั้น (trigger ยังกันเฉพาะ key owner-only ไว้ให้อีกชั้น แต่ 6 key การทำงานจะหลุด)

### Error ทั้งหมด

| status | เกิดเมื่อ | ตัวอย่างข้อความ |
|---|---|---|
| 400 | `value` เป็น array / object | `value ต้องเป็น string, number หรือ boolean` |
| 400 | ค่าเกินช่วง | `config vat_rate above maximum 100` |
| 400 | ชนิดผิด | `config kds_enabled must be true/false` |
| 400 | ไม่อยู่ใน allowed_values | `config vat_mode has invalid value "abc"` |
| 400 | เปิด VAT แต่ร้านยังไม่มี `tax_id` | `ต้องกรอกเลขประจำตัวผู้เสียภาษี (tenants.tax_id) ก่อนเปิดใช้ VAT` |
| 400 | ส่ง field อื่นมาด้วย | (จาก ValidationPipe) |
| 403 | ไม่มี permission | `Missing permission: tax:configure` |
| 403 | trigger จับ owner-only ได้ (ด่านสอง) | `config vat_rate is owner-only (CFG-04)` |
| 404 | ไม่มี key นี้ | `ไม่พบ config abc` |
| 404 | ร้านไม่มีแถวนี้ใน `system_config` | `ร้านนี้ยังไม่มีค่า ... ใน system_config` |

**ข้อสังเกต:** error จาก trigger เป็นภาษาอังกฤษ (ยกเว้นเรื่อง `tax_id`) frontend ควร validate จาก `min` / `max` / `allowedValues` ที่ได้จาก GET ก่อนส่ง ผู้ใช้จะเห็นข้อความที่เข้าใจง่ายกว่า และ error จาก backend จะเหลือไว้เป็นด่านสุดท้ายเท่านั้น

---

## 7. ระบบป้องกัน 3 ชั้น

```
Request
  │
  ▼
[ชั้น 1] Guard ────────── login แล้วหรือยัง (JwtAuthGuard + @AnyAuthenticated)
  │
  ▼
[ชั้น 2] Service ──────── key มีจริงไหม · role มี permission ตาม owner_only ไหม · value ชนิดถูกไหม
  │
  ▼
[ชั้น 3] DB trigger ───── ชนิด · ช่วงค่า · owner-only ซ้ำ · tax_id · เติม updated_by · เขียน audit
  │                        + RLS กันข้ามร้าน
  ▼
บันทึก (หรือ ROLLBACK ทั้งหมดถ้าชั้นไหน throw)
```

ทำไมเช็คซ้ำทั้ง service และ trigger: service ให้ error ที่อ่านรู้เรื่องและเร็ว (ไม่ต้องยิง DB) trigger กันกรณีที่โค้ด service มีบั๊กหรือมีคนเขียน SQL ตรงเข้า DB — ตรงกับหลักของโปรเจกต์ที่ให้ DB เป็นด่านที่สอง (RLS เป็น Layer 2 ใต้ RBAC)

**Transaction:** ทุก request ที่ login แล้วอยู่ใน transaction ที่ `TenantContextInterceptor` เปิดให้ ถ้า throw ตรงไหน = ROLLBACK ทั้งหมด ไม่มีข้อมูลค้างครึ่ง ๆ repository จึงไม่ต้อง BEGIN / COMMIT เอง

---

## 8. เอาไปใช้ยังไง

### ฝั่ง frontend

**(ก) โหลดครั้งเดียวตอนเข้าแอป แล้วเก็บไว้ใน context**

```ts
const { data } = await api.get('/system-config');
const config = Object.fromEntries(data.map(c => [c.key, c.value]));
// config.kds_enabled === false   (boolean จริง ไม่ใช่ string)
```

**(ข) เปิดปิด feature ตามค่า**

```tsx
// ซ่อนเมนูจอครัวถ้าร้านไม่มีจอ
{config.kds_enabled && <NavLink to="kds">จอครัว</NavLink>}

// ปุ่มจ่ายเงิน: กดได้เมื่อเสิร์ฟครบ (ถ้าร้านบังคับ)
const canPay = !config.require_all_served_before_payment || allItemsServed;
<button disabled={!canPay}>ชำระเงิน</button>
```

ปุ่มที่ disable ไว้เป็นแค่ UX — ต่อให้ frontend พลาด trigger `trg_pao_guard` ก็ block ให้อยู่ดี

**(ค) สร้างหน้าตั้งค่าจาก definition อัตโนมัติ**

ไม่ต้อง hardcode ฟอร์มทีละช่อง ใช้ข้อมูลจาก GET เลือก input ให้:

| `valueType` | ใช้ input |
|---|---|
| `bool` | toggle switch |
| `int` / `decimal` | number input ใส่ `min` / `max` จาก response |
| `text` + มี `allowedValues` | dropdown |

ช่องที่ `ownerOnly = true` และผู้ใช้ไม่ใช่ Owner → แสดงแต่ disable ไว้ พร้อมข้อความ "เฉพาะเจ้าของร้าน"

**(ง) หลังแก้ค่าสำเร็จ** ให้อัปเดต context ด้วย response ของ PATCH (หน้าตาเดียวกับ GET) ไม่ต้อง GET ใหม่ทั้งหมด

### ฝั่ง backend (module อื่น)

**วิธีที่แนะนำ: อ่านใน SQL ผ่าน `cfg()`**

```sql
SELECT cfg(app_tenant_id(), 'max_reprints')::int;
```

`cfg()` คืน text และ fallback ไป `default_value` ให้เองถ้าไม่มีแถว ต้อง cast ชนิดเอง (`::int`, `::numeric`, `= 'true'`)

**ห้ามทำ:**
- hardcode ค่า เช่น `const VAT = 7` — ร้านแก้ config แล้วไม่มีผล
- คำนวณเงินด้วย `Number()` ใน TypeScript — float คลาดเคลื่อน ให้คำนวณใน SQL (`NUMERIC`) เหมือน `trg_payments_before`

`SystemConfigModule` export `SystemConfigService` ไว้แล้ว แต่ตอนนี้มีแค่ `getAll()` ถ้า module อื่นต้องการอ่านทีละ key จากฝั่ง TS ค่อยเพิ่มเมธอดตอนนั้น (YAGNI)

---

## 9. เรื่องที่ต้องรู้ / ยังค้าง

### ⚠️ `kds_enabled` ยังไม่มีผลกับระบบ

ค้นทั้ง `FULL_INSTALL.sql` และ backend แล้ว **ไม่มีที่ไหนอ่าน `kds_enabled` เลย** ตอนนี้เป็นแค่ค่าที่เก็บไว้

ที่น่ากังวลคือมันชนกับ `require_all_served_before_payment`:

```
ร้านไม่มีจอครัว → ตั้ง kds_enabled = false
แต่ require_all_served_before_payment = true (ค่าเริ่มต้น)
→ item ค้างสถานะ queued ตลอด เพราะไม่มีจอครัวให้กด "เสิร์ฟแล้ว"
→ trigger trg_pao_guard block การจ่ายเงิน
→ ร้านรับเงินไม่ได้
```

ต้องตัดสินใจก่อนทำ Order / KDS ให้เสร็จ ทางเลือก:
- ถ้า `kds_enabled = false` ให้ item ข้ามไปเป็น `served` ทันทีตอนสั่ง
- หรือมีปุ่ม "เสิร์ฟแล้ว" ให้พนักงานหน้าร้านกดแทน
- หรือบังคับในหน้าตั้งค่า: ปิด KDS ได้ต่อเมื่อปิด `require_all_served_before_payment` ด้วย

### `shift_escalation_hours` ต้องมีตัวเรียก

ฟังก์ชัน `escalate_overdue_shifts()` ไม่ได้ทำงานเอง ต้องมี scheduled job (เช่น `@nestjs/schedule` cron) เรียกเป็นระยะ ถ้าไม่มี config ตัวนี้ก็ไม่มีผล

### TODO ของ module นี้

- [ ] รันทดสอบ 8 เคสในข้อ 10 ให้ผ่าน
- [ ] ใส่ `summary` ใน `@ApiOperation({})` ที่ยังว่าง และ `@ApiProperty` ใน `UpdateConfigDto`
- [ ] ใส่ `this.db.query<ConfigRow>(sql)` ใน repository ให้ TypeScript จับบั๊กชื่อคอลัมน์ได้
- [ ] แก้ `backend-todo.md` จาก `/config` เป็น `/system-config`

---

## 10. วิธีทดสอบ

| # | เคส | ผลที่ต้องได้ |
|---|---|---|
| 1 | Manager `PATCH /system-config/kds_enabled` `{"value": false}` แล้ว **GET ซ้ำ** | 200 · GET ได้ `false` (ยืนยันว่าบันทึกจริง ไม่โดน rollback) |
| 2 | Manager PATCH `vat_rate` | 403 `tax:configure` |
| 3 | Employee PATCH key ใดก็ได้ | 403 |
| 4 | Owner PATCH `vat_rate` `{"value": 150}` | 400 `above maximum` |
| 5 | Owner PATCH `vat_mode` `{"value": "inclusive"}` ตอนร้านยังไม่มี `tax_id` | 400 ข้อความภาษาไทย |
| 6 | PATCH `/system-config/abc` | 404 |
| 7 | `{"value": [true]}` | 400 |
| 8 | `{"value": 1, "x": 2}` | 400 |

หลังเคส 1 เช็คใน DB เพิ่ม:

```sql
SELECT updated_by, updated_at FROM system_config WHERE config_key = 'kds_enabled';
SELECT * FROM audit_logs WHERE action_type = 'config_updated' ORDER BY created_at DESC LIMIT 1;
```

`updated_by` ต้องเป็น user ที่แก้ และต้องมี audit 1 แถวพร้อม `old_value` / `new_value`

---

## 11. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `system-config.controller.ts` | รับ request · `@AnyAuthenticated` ทั้ง 2 route |
| `system-config.service.ts` | เช็ค key · เลือก permission · map error |
| `system-config.repository.ts` | SQL 3 ตัว: อ่านทั้งหมด · อ่าน definition · update |
| `mapper/system-config.mapper.ts` | แปลง text เป็นชนิดจริง · แปลงชื่อเป็น camelCase |
| `dto/updateConfig.dto.ts` | `{ value }` |
| `database/FULL_INSTALL.sql` | ตาราง · seed 9 ตัว · `cfg()` · trigger validate / seed / audit |
