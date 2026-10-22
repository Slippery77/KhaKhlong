# Edit VAT / Service Charge: คู่มือ module ฝั่ง frontend

> folder: `frontend/src/features/editVat/`
> route: `/:tenantSlug/setting/vat` (แท็บ "อัตราค่าบริการ")
> endpoint ที่ใช้: `GET /system-config` · `PATCH /system-config/:key`
> คู่มือฝั่ง backend: `docs/system-config-guide.md`
> ขอบเขต V1: VAT มีแค่เปิด (`inclusive`) / ปิด (`none`) ส่วน `exclusive` เลื่อนไป V2 (scope หัวข้อ 3.2.1)

---

## 1. module นี้ทำอะไร

หน้าให้เจ้าของร้านตั้ง 3 อย่าง

| ตั้งอะไร | config key | ค่าที่ส่ง |
|---|---|---|
| เปิด/ปิด VAT | `vat_mode` | `'inclusive'` หรือ `'none'` |
| อัตรา VAT | `vat_rate` | ตัวเลข 0–100 |
| ค่าบริการ (ปิด = 0) | `service_charge_rate` | ตัวเลข 0–100 |

ทั้ง 3 key เป็น `ownerOnly` แก้ได้เฉพาะ owner ส่วน manager และ employee เปิดหน้าดูได้ แต่ทุกช่อง disable

---

## 2. แผนที่ไฟล์

```
features/editVat/
├── types/
│   └── vatEdit.types.ts      หน้าตาข้อมูลจาก backend (ConfigItem, response)
├── hook/
│   └── useVatEdit.ts         คุยกับ API: ดึง config, แก้ config, แปลง error
├── components/
│   ├── RateCard.tsx          card toggle + ช่อง % (ใช้ 2 ครั้ง: VAT, ค่าบริการ)
│   └── ExampleCard.tsx       ตัวอย่างยอดเงินจากค่าที่ตั้งอยู่
└── pages/
    └── editVat.tsx           ประกอบทุกชิ้น ตัดสินใจว่ากดอะไรแล้วส่ง key ไหน
```

ไฟล์นอก folder ที่เกี่ยวข้อง

| ไฟล์ | เกี่ยวยังไง |
|---|---|
| `routes/AppRouter.tsx` | ผูก URL `/setting/vat` กับ `EditVat` |
| `components/settingNavBar.tsx` | แท็บ "อัตราค่าบริการ" ลิงก์มาหน้านี้ |
| `libs/appClient.ts` | `apiFetch` ยิง request ใส่ token, refresh token, โยน `ApiError` |
| `features/auth/context/AuthContext.tsx` | ให้ `accessToken` และ `user.role` |

---

## 3. โค้ดแบ่งเป็น 3 ชั้น

```
┌──────────────────────────────────────────────────────────┐
│  pages/editVat.tsx               ชั้นต่อสาย                 │
│  - รู้ว่า toggle VAT = PATCH vat_mode                       │
│  - รู้ว่า toggle ค่าบริการ = PATCH service_charge_rate       │
│  - เช็คสิทธิ์ (canEdit)                                     │
└───────────────┬───────────────────────────┬──────────────┘
                │ ส่ง props ลง                 │ เรียกฟังก์ชัน
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│  components/              │   │  hook/useVatEdit.ts      │
│  RateCard, ExampleCard    │   │  useSystemConfig         │
│  ชั้นแสดงผล                 │   │  useUpdateConfig         │
│  - ไม่รู้จัก API            │   │  ชั้นข้อมูล                 │
│  - แค่บอกว่าผู้ใช้ทำอะไร     │   │  - ไม่รู้ว่าหน้าตาเป็นยังไง   │
└───────────────────────────┘   └────────────┬─────────────┘
                                             │ apiFetch
                                             ▼
                                ┌──────────────────────────┐
                                │  backend /system-config  │
                                └──────────────────────────┘
```

**ทำไมแยกแบบนี้:** แต่ละชั้นเปลี่ยนได้โดยไม่กระทบชั้นอื่น เช่น เปลี่ยนสี toggle แก้แค่ `RateCard` · backend เปลี่ยน URL แก้แค่ hook · อยากให้ card ค่าบริการส่ง key อื่น แก้แค่ page

---

## 4. Flow ที่ 1: เปิดหน้า

```
ผู้ใช้กดแท็บ "อัตราค่าบริการ"
  │
  ▼
AppRouter เจอ /:tenantSlug/setting/vat  ──►  render <EditVat />
  │
  ▼
EditVat เรียก useSystemConfig()
  │   isLoading = true  ──►  จอแสดง "กำลังโหลด..."
  │
  ▼
useEffect ใน hook สั่ง load()
  │
  ▼
apiFetch('/system-config', accessToken)          GET + Bearer token
  │
  ▼
backend ตอบ { data: [ ...9 config ] }
  │
  ▼
load() แปลง array เป็น object
  │   [ {key:'vat_rate',...}, {key:'vat_mode',...} ]
  │   เป็น { vat_rate: {...}, vat_mode: {...} }
  │
  ▼
setConfigs(map) · setIsLoading(false)
  │
  ▼
EditVat render ใหม่ อ่านค่าจาก configs
  │   vatMode     = configs.vat_mode.value          'none'
  │   vatRate     = asNumber(configs.vat_rate, 7)   7
  │   serviceRate = asNumber(configs.service_charge_rate, 0)
  │   canEdit     = role เป็น owner ?
  │
  ▼
ส่ง props ลง RateCard 2 ใบ และ ExampleCard  ──►  จอแสดงผล
```

**ถ้า token หมดอายุ:** `apiFetch` ได้ 401 เรียก `refreshOnce()` ได้ token ใหม่แล้วยิงซ้ำ 1 ครั้งเอง hook ไม่ต้องรู้เรื่องนี้ ถ้า refresh ไม่ได้ `onSessionExpired` พาไปหน้า login

---

## 5. Flow ที่ 2: กดเปิด VAT

### กรณีสำเร็จ (ร้านมี `tax_id` แล้ว)

```
ผู้ใช้กด toggle ใน RateCard (VAT)
  │
  ▼
RateCard เรียก onToggle(true)          card ไม่รู้ว่าจะส่ง key อะไร
  │
  ▼
EditVat: onToggle={next => save('vat_mode', next ? 'inclusive' : 'none')}
  │
  ▼
save('vat_mode', 'inclusive')
  │
  ▼
updateConfig('vat_mode', 'inclusive')
  │   savingKey = 'vat_mode'  ──►  disabled = true ทุก card (กันกดซ้ำ)
  │
  ▼
apiFetch PATCH /system-config/vat_mode   body { value: 'inclusive' }
  │
  ▼
backend: เช็คสิทธิ์ tax:configure · trigger เช็ค tax_id · บันทึก · เขียน audit
  │
  ▼
ตอบ { data: { key:'vat_mode', value:'inclusive', ... } }
  │
  ▼
updateConfig คืน item · savingKey = null
  │
  ▼
save เรียก replaceItem(item)
  │   setConfigs(prev => ({ ...prev, vat_mode: item }))   แทนเฉพาะตัวนี้ ไม่ GET ใหม่
  │
  ▼
EditVat render ใหม่
  │   toggle VAT เปิด · ช่อง % กดได้
  │   ข้อความ "ประมาณ 6.54% ของยอดขายเป็นภาษี..."
  │   ExampleCard แสดงส่วน "ในยอดนี้มี VAT"
```

### กรณีไม่สำเร็จ (ร้านยังไม่มี `tax_id`)

```
... เหมือนด้านบนจนถึง apiFetch
  │
  ▼
backend trigger reject  ──►  400 "ต้องกรอกเลขประจำตัวผู้เสียภาษี..."
  │
  ▼
apiFetch โยน ApiError(400, message)
  │
  ▼
updateConfig catch  ──►  toThaiMessage(err)
  │   400 + มีคำว่า tax_id  ──►  ใช้ข้อความ backend ตรง ๆ
  │   setError(...) · คืน null
  │
  ▼
save ได้ null  ──►  ไม่เรียก replaceItem
  │
  ▼
configs ไม่เปลี่ยน toggle ยังปิด · saveError แสดงใต้ card
```

**ทำไม toggle ไม่ขยับก่อน server ตอบ:** ไม่ใช้ optimistic update เพราะเป็นค่าที่กระทบเงิน toggle จะเปลี่ยนก็ต่อเมื่อ backend ยืนยันแล้วเท่านั้น จอจึงตรงกับ DB เสมอ

---

## 6. Flow ที่ 3: แก้ตัวเลข % (draft state)

`RateCard` แยก "ค่าที่กำลังพิมพ์" (`draft`) ออกจาก "ค่าจริงจาก server" (`rate`)

```
draft = null                    แสดง rate จาก server ("7")
  │
ผู้ใช้พิมพ์ "8"
  │
  ▼
onChange  ──►  setDraft("8")    แสดง draft ("8")  ยังไม่ยิง API
  │
ผู้ใช้กด Enter หรือคลิกที่อื่น
  │   Enter สั่ง blur() · onBlur เรียก commit()   (commit ถูกเรียกที่เดียว ไม่ยิงซ้ำ)
  │
  ▼
commit()
  ├─ draft === null ?              ──► จบ (ไม่ได้แก้)
  ├─ ไม่ตรง RATE_PATTERN ?          ──► "กรอกเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง" จบ
  ├─ น้อยกว่า min / มากกว่า max ?     ──► "กรอกได้ระหว่าง 0–100" จบ
  ├─ เท่ากับ rate เดิม ?              ──► setDraft(null) จบ (ไม่ยิง)
  └─ ผ่านหมด
        │
        ▼
     onRateSave(8)  ──►  EditVat: save('vat_rate', 8)  ──►  PATCH
        │
        ├─ สำเร็จ  ──►  setDraft(null)  แสดง rate ใหม่จาก server
        └─ ไม่สำเร็จ ──►  เก็บ draft ไว้  ผู้ใช้แก้ต่อได้ ไม่หาย
```

**3 กรณีแรกไม่ยิง API เลย:** validate ฝั่ง frontend เป็นด่านแรก ผู้ใช้เห็นข้อความไทยทันที `min`/`max` มาจาก response ของ GET (`config_definitions`) ไม่ได้ hardcode

---

## 7. Flow ที่ 4: ปิด/เปิดค่าบริการ

ค่าบริการไม่มี key เปิด/ปิด ใช้ rate = 0 แทนการปิด (ตัดสินใจไว้แล้วว่าไม่ใช้ boolean flag)

```
ค่าบริการ 12%  ──  ผู้ใช้กดปิด
  │
  ▼
toggleService(false)
  │   setLastServiceRate(12)               จำไว้ใน state ของหน้า
  │   save('service_charge_rate', 0)
  │
  ▼
serviceRate = 0  ──►  enabled = false  ──►  ช่อง % disable

ผู้ใช้กดเปิดกลับ (ยังไม่รีเฟรช)
  │
  ▼
toggleService(true)
  │   save('service_charge_rate', lastServiceRate)   ส่ง 12
  │
  ▼
ได้ 12% คืน
```

**ข้อจำกัด:** `lastServiceRate` อยู่ใน state ถ้ารีเฟรชหน้าจะหาย เปิดกลับได้ค่าเริ่มต้นแทน

---

## 8. Flow ที่ 5: manager เปิดหน้า

```
user.role = 'manager'
  │
  ▼
canEdit = role === 'owner' || !configs.vat_mode.ownerOnly
        = false || !true
        = false
  │
  ▼
disabled = true  ──►  ทุก toggle และช่อง % กดไม่ได้
แสดงกล่อง "เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขหน้านี้ได้"
```

**`canEdit` เป็นแค่ UX:** ถ้าแก้โค้ดใน browser ให้กดได้ backend ยังตอบ 403 เพราะเช็ค `tax:configure` จาก JWT ความปลอดภัยจริงอยู่ที่ backend

---

## 9. แต่ละไฟล์ทำอะไร

### `types/vatEdit.types.ts`

| ชื่อ | คืออะไร |
|---|---|
| `ConfigValue` | `string \| number \| boolean` ชนิดของ `value` (key ต่างกัน ชนิดต่างกัน) |
| `ConfigItem` | 1 config ตรงกับ `toConfigResponse()` ใน backend mapper |
| `ConfigListResponse` | response ของ GET `{ data: ConfigItem[] }` |
| `ConfigOneResponse` | response ของ PATCH `{ data: ConfigItem }` |

### `hook/useVatEdit.ts`

| ชื่อ | หน้าที่ | คืนอะไร |
|---|---|---|
| `useSystemConfig()` | GET config ตอนเปิดหน้า เก็บเป็น object | `configs`, `isLoading`, `error`, `reload`, `replaceItem` |
| `useUpdateConfig()` | PATCH ทีละ key | `updateConfig(key, value)`, `savingKey`, `error` |
| `asNumber(item, fallback)` | ดึง `value` เป็นตัวเลข (narrowing จาก union) | `number` |
| `toThaiMessage(err)` | แปลง `ApiError` เป็นข้อความไทย (ไม่ export) | `string` |

`useSystemConfig` ดึงครบ 9 key ไม่ได้เฉพาะ VAT หน้าอื่นที่ต้องอ่าน `kds_enabled` ในอนาคตใช้ซ้ำได้

### `components/RateCard.tsx`

| props | ใช้ทำอะไร |
|---|---|
| `title`, `subtitle` | ข้อความหัว card |
| `enabled` | สถานะ toggle · ถ้า `false` ช่อง % disable |
| `rate`, `min`, `max` | ค่าจริงและช่วงที่ validate |
| `disabled` | กดอะไรไม่ได้ทั้ง card (ไม่มีสิทธิ์ หรือกำลังบันทึก) |
| `onToggle(next)` | บอกหน้าว่าผู้ใช้กด toggle |
| `onRateSave(rate)` | บอกหน้าว่าผู้ใช้พิมพ์เสร็จ คืน `true` ถ้าบันทึกสำเร็จ |

state ภายใน: `draft` (ค่าที่กำลังพิมพ์) และ `inputError`

### `components/ExampleCard.tsx`

| ชื่อ | หน้าที่ |
|---|---|
| `calcExample()` | pure function คำนวณตัวอย่างเป็นสตางค์ (จำนวนเต็ม กันปัญหา floating point) |
| `baht()` | สตางค์เป็นข้อความ `1,100.00` |
| `Row` | แถว "ชื่อซ้าย ตัวเลขขวา" ใช้ในไฟล์นี้เท่านั้น |

สูตรตรงกับ `trg_payments_before()` โหมด `inclusive`

```
ค่าบริการ      = ยอดอาหาร × rate ค่าบริการ / 100
ลูกค้าจ่าย      = ยอดอาหาร + ค่าบริการ
VAT           = ลูกค้าจ่าย − ลูกค้าจ่าย × 100 / (100 + rate VAT)
มูลค่าก่อน VAT  = ลูกค้าจ่าย − VAT − ค่าบริการ
```

ตัวอย่าง: อาหาร 1,000 · ค่าบริการ 10% · VAT 7% ได้ลูกค้าจ่าย 1,100.00 · VAT 71.96 · มูลค่าก่อน VAT 928.04

### `pages/editVat.tsx`

| ส่วน | หน้าที่ |
|---|---|
| `save(key, value)` | PATCH แล้ว `replaceItem` ใช้ร่วมทุกปุ่ม คืน `boolean` |
| `canEdit` / `disabled` | สิทธิ์ และกันกดซ้ำระหว่างบันทึก |
| `toggleService()` | ปิด = ส่ง 0 และจำค่าเดิม · เปิด = ส่งค่าที่จำไว้ |
| ข้อความใต้ card VAT | `inclusive`: บอก % ที่เป็นภาษี · `exclusive`: เตือนว่ายังไม่รองรับ |

---

## 10. state อยู่ที่ไหน

| state | อยู่ที่ | ทำไมอยู่ตรงนั้น |
|---|---|---|
| `configs` | `useSystemConfig` | ข้อมูลจาก server ทุก card ใช้ร่วม |
| `isLoading`, `error` (โหลด) | `useSystemConfig` | ผูกกับการ GET |
| `savingKey`, `error` (บันทึก) | `useUpdateConfig` | ผูกกับการ PATCH |
| `lastServiceRate` | `EditVat` | เป็นกฎของหน้า ไม่ใช่ข้อมูล server |
| `draft`, `inputError` | `RateCard` | เป็นเรื่องของช่องกรอกช่องเดียว card อื่นไม่ต้องรู้ |
| ตัวเลขตัวอย่าง | ไม่มี state | คำนวณจาก props ทุก render (derived) |

หลัก: วาง state ไว้ต่ำที่สุดที่ทุกคนที่ต้องใช้ยังเข้าถึงได้

---

## 11. ด่านป้องกัน 3 ชั้น

```
ผู้ใช้กรอก 150
  │
  ▼
[frontend] RateCard.commit()   min/max จาก GET      ──► ไม่ยิง API · ข้อความไทย
  │  (ถ้าหลุด เช่นแก้โค้ดใน browser)
  ▼
[backend service]               สิทธิ์ · ชนิดของ value ──► 403 / 400
  │
  ▼
[DB trigger]                    ช่วงค่า · allowed_values · tax_id ──► 400
```

frontend มีไว้ให้ UX ดี ส่วน backend กับ DB คือตัวกันจริง

---

## 12. error ที่ผู้ใช้จะเห็น

| เกิดจาก | status | ข้อความบนจอ | ใครแปลง |
|---|---|---|---|
| พิมพ์ไม่ใช่ตัวเลข | – | กรอกเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง | `RateCard` |
| เกินช่วง | – | กรอกได้ระหว่าง 0–100 | `RateCard` |
| ไม่ใช่ owner | 403 | เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขได้ | `toThaiMessage` |
| เปิด VAT ไม่มี `tax_id` | 400 | ข้อความไทยจาก backend | `toThaiMessage` (ส่งต่อ) |
| 400 อื่น | 400 | ค่าที่กรอกไม่ถูกต้อง | `toThaiMessage` |
| key ผิด | 404 | ไม่พบการตั้งค่านี้ | `toThaiMessage` |
| เน็ตหลุด / server ล่ม | อื่น ๆ | บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง | `toThaiMessage` |
| โหลดหน้าไม่ได้ | – | ข้อความจาก error หรือ "โหลดการตั้งค่าไม่สำเร็จ" | `useSystemConfig` |

---

## 13. จุดที่ควรแก้ในโค้ดตอนนี้

| ไฟล์ | บรรทัด | ปัญหา | แก้ |
|---|---|---|---|
| `editVat.tsx` | 10, 16 | `const vat_rate = 7` ใช้เป็นค่าเริ่มต้นของ `lastServiceRate` ชื่อผิดความหมาย และค่าบริการเปิดกลับหลังรีเฟรชได้ 7% แทน 10% | เปลี่ยนเป็น `const DEFAULT_SERVICE_RATE = 10` |
| `editVat.tsx` | 19–20 | ยัง `return` ตอนโหลดก่อนถึง layout Header/NavBar จึงไม่แสดงตอนโหลด และ `{isLoading && ...}` บรรทัด 54–55 กลายเป็นโค้ดที่ไม่มีวันทำงาน | ลบ 2 บรรทัด `if (...) return` ด้านบน |

---

## 14. งานที่ค้าง (นอก module นี้)

| งาน | ทำไม |
|---|---|
| PATCH_03 ตรวจค่าบริการใน `trg_payments_before()` | client ส่งค่าบริการเท่าไรก็ได้ (ดู `system-config-guide.md` ข้อ 9) |
| `Header.tsx` hardcode ผู้ใช้ | ทุกหน้าโชว์ "วิชัย ใจดี" |
| `ProtectedRoute` | employee พิมพ์ URL เข้าหน้าตั้งค่าได้ (backend ยังกัน PATCH) |
| แท็บ KDS หรือ การเงิน | โค้ดกับ Figma ไม่ตรงกัน |
| Figma card ตัวอย่าง | layout เดิมเป็นแบบ `exclusive` (VAT บวกเพิ่ม) |
| `exclusive` ใน V2 | เพิ่มตัวเลือกบนจอ + confirm dialog ตาม CFG-08 · สูตร ExampleCard ต้องแยกตามโหมด |
