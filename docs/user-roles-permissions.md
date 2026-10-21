# เอกสารกำหนดบทบาทผู้ใช้งานและสิทธิ์การเข้าถึงระบบ (User Roles & Permissions)

## PWA-POS: ระบบจุดขายสำหรับธุรกิจร้านอาหารขนาดเล็ก ด้วยสถาปัตยกรรมโปรเกรสซีฟเว็บแอปพลิเคชัน

> **ปรับปรุง:** 1 ตุลาคม 2569 — ให้ตรงกับ schema จริงใน `FULL_INSTALL.sql` (ทดสอบบน PostgreSQL 16.13)
> จำนวนสิทธิ์ทั้งหมด 25 รายการ · Owner 24 · Manager 19 · Employee 8

---

## 1. บทนำและวัตถุประสงค์

เอกสารฉบับนี้กำหนดโครงสร้างสิทธิ์การเข้าถึงระบบ (Access Control) ของ PWA-POS โดยใช้สถาปัตยกรรมร่วมกัน 4 ชั้น ได้แก่

1. **Role-Based Access Control (RBAC)** — ควบคุมสิทธิ์ในระดับ Business Logic ผ่าน NestJS Guards
2. **Database Trigger Enforcement** — บังคับสิทธิ์ซ้ำในระดับฐานข้อมูลสำหรับรายการที่มีความเสี่ยงทางการเงิน ผ่านฟังก์ชัน `has_permission()` ที่ถูกเรียกใน Trigger (ดูหัวข้อ 5.3)
3. **Row-Level Security (RLS)** — ควบคุมการเข้าถึงข้อมูลในระดับแถว (Row) ของ PostgreSQL เพื่อแยกข้อมูลระหว่างผู้เช่าระบบ (Tenant Isolation)
4. **JSON Web Token (JWT)** — ใช้ยืนยันตัวตน (Authentication) และนำ Claims ไปกำหนด Session Context ของแต่ละ Request

ทั้งสี่ชั้นทำงานร่วมกันเพื่อให้มั่นใจว่าผู้ใช้งานแต่ละคนกระทำได้เฉพาะสิ่งที่ได้รับอนุญาต และเห็นได้เฉพาะข้อมูลของร้านตนเอง

---

## 2. ขอบเขตของบทบาทผู้ใช้งาน (Scope of User Roles)

### 2.1 การปรับลดขอบเขตจาก 8 บทบาทเหลือ 3 บทบาท (Scope Refinement)

ในระยะออกแบบเบื้องต้น โครงการได้พิจารณาบทบาทผู้ใช้งานไว้ทั้งหมด 8 บทบาท เพื่อให้ครอบคลุมโครงสร้างองค์กรของธุรกิจร้านอาหารในภาพกว้าง อย่างไรก็ตาม ภายหลังการวิเคราะห์ผู้ใช้งานจริง (Actual User Analysis) ของกลุ่มเป้าหมายคือ **ธุรกิจร้านอาหารขนาดเล็ก** ทีมพัฒนาพบว่า:

- ร้านอาหารขนาดเล็กมีบุคลากรที่ทำงานกับระบบ POS โดยตรงเพียง 3 กลุ่มบทบาทหลัก คือ เจ้าของร้าน ผู้จัดการ และพนักงานหน้างาน (ซึ่งครอบคลุมทั้งพนักงานเสิร์ฟ แคชเชียร์ และพนักงานครัว)
- บทบาทเฉพาะทางอื่น เช่น นักบัญชี (Accountant) หรือผู้ตรวจสอบ (Auditor) ไม่ใช่ผู้ใช้งานที่เข้าสู่ระบบ POS โดยตรงในธุรกิจขนาดเล็ก แต่เข้าถึงข้อมูลผ่านรายงานที่ Owner ส่งออกให้ (Export) แทน
- การคงบทบาทที่ไม่มีผู้ใช้งานจริงไว้ในระบบ จะเพิ่มความซับซ้อนของ Permission Matrix และ RLS Policy โดยไม่ก่อให้เกิดคุณค่าต่อผู้ใช้งาน ซึ่งขัดกับหลักการออกแบบซอฟต์แวร์ **YAGNI (You Aren't Gonna Need It)**

การตัดสินใจนี้จึงเป็นการปรับขอบเขต (Scope Refinement) บนพื้นฐานของการวิเคราะห์ผู้ใช้งานจริง มิใช่การลดทอนคุณภาพของการออกแบบ

### 2.2 การออกแบบเผื่อการขยายตัวในอนาคต (Extensibility Design)

แม้ระบบจะใช้งานจริงเพียง 3 บทบาทในเวอร์ชันปัจจุบัน แต่โครงสร้างฐานข้อมูลถูกออกแบบเป็น **Lookup Table แบบขยายได้ (Global Extensible Lookup)** แทนการกำหนดเป็นค่าคงที่ตายตัว (Hardcoded Enum) เพื่อให้สามารถเพิ่มบทบาทใหม่ในเวอร์ชันถัดไปได้โดยไม่ต้องปรับโครงสร้างฐานข้อมูลใหม่ทั้งหมด (ดูหัวข้อ 6)

> **หมายเหตุ (Future Feature):** สถาปัตยกรรมยังเผื่อรองรับแนวคิด **Per-Tenant Custom Role** ซึ่งจะอนุญาตให้แต่ละร้าน (Tenant) กำหนดบทบาทเฉพาะของตนเองได้ในอนาคต

---

## 3. นิยามบทบาทผู้ใช้งาน (Role Definitions)

### 3.1 Owner (เจ้าของร้าน)

ผู้มีอำนาจสูงสุดในระบบสำหรับร้านของตนเอง มีสิทธิ์เข้าถึงและกำหนดค่าระบบได้ทั้งหมด **ยกเว้น `payment:edit_closed`** ซึ่งไม่มอบให้บทบาทใดเลย เนื่องจากขัดต่อหลักการความถูกต้องของข้อมูลทางการเงิน (Data Integrity Invariant)

### 3.2 Manager (ผู้จัดการร้าน)

ผู้รับผิดชอบการดำเนินงานประจำวัน มีสิทธิ์อนุมัติรายการที่มีความเสี่ยงทางการเงิน (Void / Comp / ปิดบิลโดยไม่เก็บเงิน) ตรวจสอบความถูกต้องของเงินสดเมื่อสิ้นกะ และเปิดกะที่ถูกปิดผิดพลาดใหม่ได้ แต่ไม่มีสิทธิ์บริหารจัดการระดับกิจการ (จัดการบัญชีผู้ใช้ ตั้งค่าร้าน และตั้งค่าภาษี)

### 3.3 Employee (พนักงานปฏิบัติการ)

ผู้ปฏิบัติงานหน้างาน ครอบคลุมทั้งพนักงานเสิร์ฟ แคชเชียร์ และพนักงานครัว มีสิทธิ์ดำเนินธุรกรรมพื้นฐาน รวมถึงนับและปรับยอดสต็อกเมื่อสิ้นวัน แต่ไม่มีสิทธิ์อนุมัติรายการที่มีความเสี่ยงทางการเงิน และไม่มีสิทธิ์บันทึกเงินเข้า-ออกลิ้นชัก

---

## 4. ตารางสิทธิ์การเข้าถึง (Permission Matrix)

ตารางนี้สกัดโดยตรงจากฐานข้อมูลที่ติดตั้งจริง จึงตรงกับ `part3_seed.sql` เสมอ

### 4.1 User Management

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `user:manage` | จัดการบัญชีผู้ใช้งานในร้าน | ✅ | ❌ | ❌ |
| `role:assign` | มอบหมายบทบาทให้ผู้ใช้งาน | ✅ | ❌ | ❌ |

### 4.2 System Configuration

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `store:configure` | ตั้งค่าร้าน (ชื่อ ที่อยู่ เลขผู้เสียภาษี) | ✅ | ❌ | ❌ |
| `tax:configure` | ตั้งค่า VAT และ Service Charge | ✅ | ❌ | ❌ |
| `config:edit_operational` | ตั้งค่าเชิงปฏิบัติงาน (KDS, reprint, escalation) ไม่รวม VAT | ✅ | ✅ | ❌ |

### 4.3 Menu & Table Management

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `menu:edit` | เพิ่ม/แก้ไข/ลบเมนู หมวดหมู่ และ Modifier | ✅ | ✅ | ❌ |
| `table:manage` | จัดการผังโต๊ะ ไม่รวม Move Table ที่ใช้ `order:create` | ✅ | ✅ | ❌ |

### 4.4 Order Management

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `order:create` | เปิดโต๊ะ รับออเดอร์ ส่งครัว ย้ายโต๊ะ | ✅ | ✅ | ✅ |
| `void:approve` | อนุมัติ Void รวมถึง Void ตอนครัวกำลังทำ (`preparing`) | ✅ | ✅ | ❌ |
| `discount:approve` | อนุมัติส่วนลด/Comp | ✅ | ✅ | ❌ |
| `order:close_unpaid` | ปิดบิลโดยไม่เก็บเงิน (`walkout` / `empty` / `voided_all`) | ✅ | ✅ | ❌ |

### 4.5 Payment

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `payment:receive` | รับชำระเงินและพิมพ์ใบเสร็จ | ✅ | ✅ | ✅ |
| `payment:edit_closed` | แก้ไขการชำระเงินที่ปิดแล้ว | ❌ | ❌ | ❌ |

### 4.6 Inventory Management

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `inventory:check` | ดูระดับสต็อก | ✅ | ✅ | ✅ |
| `inventory:adjust` | บันทึกรับของ/ของเสีย/กรอกยอดคงเหลือ | ✅ | ✅ | ✅ |

### 4.7 Shift Management

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `shift:open` | เปิดกะการทำงาน | ✅ | ✅ | ✅ |
| `shift:close_and_count` | ปิดกะและกรอกยอดเงินสดที่นับได้ | ✅ | ✅ | ✅ |
| `shift:verify` | ตรวจสอบและรับรองยอดปิดกะ | ✅ | ✅ | ❌ |
| `shift:auto_escalated_verify` | รับรองยอดปิดกะกรณี Escalate เกินเวลา | ✅ | ❌ | ❌ |
| `shift:reopen` | เปิดกะที่ปิดไปแล้วใหม่ (กรณีกดปิดผิด) | ✅ | ✅ | ❌ |
| `cash:movement` | บันทึกเงินเข้า-ออกลิ้นชักนอกการขาย | ✅ | ✅ | ❌ |

### 4.8 Reports, KDS & Audit

| รหัสสิทธิ์ | คำอธิบาย | Owner | Manager | Employee |
|---|---|:---:|:---:|:---:|
| `report:view_all` | ดูรายงานยอดขายทั้งร้าน รวมย้อนหลัง | ✅ | ✅ | ❌ |
| `report:view_own_shift` | ดูยอดขายเฉพาะกะของตนเอง | ✅ | ✅ | ✅ |
| `kds:mark_ready` | เปลี่ยนสถานะอาหารบนจอครัว | ✅ | ✅ | ✅ |
| `audit_log:view` | เข้าถึงหน้า Audit Log (AUD-05) | ✅ | ✅ | ❌ |

---

### 4.9 หมายเหตุประกอบตารางสิทธิ์

**`payment:edit_closed` — สิทธิ์ที่ไม่มอบให้ใครเลย**

ระบบยึดหลัก **Immutable Payment** เป็น Architectural Invariant รายการชำระเงินที่ปิดสมบูรณ์แล้วไม่สามารถถูกแก้ไขได้โดยผู้ใช้งานคนใด สิทธิ์นี้คงไว้ในระบบเพื่อเป็น **documentation** ว่าระบบได้พิจารณากรณีนี้แล้วและตั้งใจไม่มอบให้ใคร มิใช่ความหลงลืม

การบังคับใช้ไม่ได้พึ่ง RBAC เพียงชั้นเดียว แต่มีอีก 2 ชั้นทับอยู่
- Trigger `immutable` บนตาราง `payments` ปฏิเสธทุก `UPDATE` และ `DELETE`
- `REVOKE UPDATE, DELETE ON payments FROM pos_app` ที่ระดับสิทธิ์ของ Database Role

**`shift:auto_escalated_verify` — สิทธิ์ที่ซ้ำซ้อนโดยตั้งใจ**

Trigger `trg_shift_flow()` ตรวจสอบอยู่แล้วว่ากะที่มีสถานะ `escalated` ต้องถูกรับรองโดยผู้ใช้ที่มี `role_name = 'owner'` เท่านั้น สิทธิ์นี้จึงไม่ได้ถูกเรียกใช้ในทางปฏิบัติ แต่คงไว้ให้ตรงกับเอกสาร Business Rules เดิม

**`inventory:adjust` มอบให้ Employee ด้วย**

ตรงตาม INV-11 ที่กำหนดให้พนักงานกรอกยอดวัตถุดิบคงเหลือได้เมื่อสิ้นวัน ซึ่งเป็นผู้ที่อยู่หน้างานจริง ความเสี่ยงที่ตามมาคือพนักงานสามารถกรอกยอดให้ตรงกับของที่เหลืออยู่จริงได้โดยไม่มีผู้อนุมัติ ระบบจึงไม่บล็อกการกระทำ แต่ชดเชยด้วยกลไกตรวจสอบย้อนหลัง (ดูหัวข้อ 5.5)

**`cash:movement` ไม่มอบให้ Employee**

การบันทึกเงินออกจากลิ้นชักส่งผลโดยตรงต่อยอดเงินสดที่ระบบคาดหวัง (`expected_closing_cash`) หากพนักงานบันทึกเองได้ จะสามารถสร้างรายการเงินออกปลอมเพื่อกลบส่วนต่างที่ตนเองทำให้เกิดขึ้นได้ สิทธิ์นี้จึงจำกัดไว้ที่ Manager ขึ้นไป

---

## 5. หลักการบังคับใช้สิทธิ์ (Enforcement Principles)

### 5.1 การบังคับใช้ในระดับ Application (RBAC)

สิทธิ์ตามตารางหัวข้อ 4 ถูกบังคับใช้ผ่าน NestJS Guards ที่ตรวจสอบ Permission ของผู้ใช้งานจาก JWT Claims ก่อนอนุญาตให้เข้าถึง Endpoint แต่ละรายการ

### 5.2 การบังคับใช้ในระดับ Database (RLS)

ทุก Request ที่เข้าสู่ระบบ NestJS Interceptor จะถอดรหัส JWT และกำหนดค่าตัวแปร Session ภายใน Transaction เดียวกัน

```sql
SELECT set_config('app.current_tenant_id', $1, true),
       set_config('app.current_user_id',   $2, true),
       set_config('app.current_user_role', $3, true),
       set_config('app.client_ip',         $4, true),
       set_config('app.device_info',       $5, true);
```

พารามิเตอร์ตัวที่สามของ `set_config` เป็น `true` หมายถึงค่ามีผลเฉพาะใน Transaction ปัจจุบัน ซึ่งจำเป็นอย่างยิ่งเมื่อใช้ Connection Pool มิฉะนั้น Context ของผู้ใช้คนหนึ่งจะรั่วไปยัง Request ของผู้ใช้อีกคนที่ได้รับ Connection เดียวกันต่อมา

RLS Policy ถูกสร้างบนทุกตารางที่มีคอลัมน์ `tenant_id` รวม 24 Policy โดยใช้เงื่อนไขเดียวกันทั้ง `USING` และ `WITH CHECK` จึงกรองทั้งการอ่านและการเขียน

แอปพลิเคชันต้องเชื่อมต่อด้วย Database Role ชื่อ `pos_app` ซึ่งไม่ใช่เจ้าของตารางและไม่มีสิทธิ์ `BYPASSRLS` หากเชื่อมต่อด้วย `postgres` RLS จะไม่ทำงานเลยแม้ Policy จะถูกสร้างไว้ครบถ้วน

### 5.3 การบังคับใช้ซ้ำในระดับ Trigger (Defense-in-Depth)

สิทธิ์ที่มีผลทางการเงินโดยตรงถูกตรวจสอบซ้ำในฐานข้อมูลผ่านฟังก์ชัน `has_permission(user_id, permission_key)` ที่เรียกภายใน Trigger ทำให้แม้ Guard ชั้น Application จะถูกข้ามไปด้วยเหตุใดก็ตาม การกระทำนั้นยังคงถูกปฏิเสธ

| การกระทำ | สิทธิ์ที่ตรวจใน Trigger | ตำแหน่ง |
|---|---|---|
| Void รายการที่สถานะ `preparing` | `void:approve` | `trg_order_item_state()` |
| Comp รายการที่เสิร์ฟแล้ว | `discount:approve` | `trg_order_item_state()` |
| ปิดบิลโดยไม่เก็บเงิน | `order:close_unpaid` | `trg_orders_before()` |
| เปิดกะ | `shift:open` | `trg_shift_before_insert()` |
| ปิดกะและนับเงิน | `shift:close_and_count` | `trg_shift_flow()` |
| รับรองยอดปิดกะ | `shift:verify` | `trg_shift_flow()` |
| เปิดกะที่ปิดแล้วใหม่ | `shift:reopen` | `reopen_shift()` |
| บันทึกเงินเข้า-ออกลิ้นชัก | `cash:movement` | `trg_cash_movement_guard()` |
| กรอกยอดสต็อกคงเหลือ | `inventory:adjust` | `record_stock_count()` |

### 5.4 การยืนยันตัวตนซ้ำสำหรับรายการที่มีความเสี่ยงสูง (Re-authentication)

การอนุมัติ Void, Comp และการปิดบิลโดยไม่เก็บเงิน กำหนดให้ผู้มีสิทธิ์อนุมัติ (Manager หรือ Owner) ต้องยืนยันตัวตนซ้ำผ่านรหัส PIN เฉพาะบุคคล ณ เวลาที่ทำรายการ มิใช่เพียงการกดปุ่มยืนยันบนอุปกรณ์ของพนักงานผู้ร้องขอ ทั้งนี้เพื่อให้กลไกการอนุมัติเป็นการควบคุมภายในที่แท้จริง มิใช่เพียงขั้นตอนเชิงพิธีการ

ฐานข้อมูลรองรับกลไกนี้ผ่านคอลัมน์ `users.pin_hash`, `users.pin_failed_attempts` และ `users.pin_locked_until` ซึ่งใช้จำกัดจำนวนครั้งที่ลองผิดเพื่อป้องกันการเดารหัส PIN แบบ Brute Force

### 5.5 หลักการแบ่งแยกหน้าที่ (Separation of Duties)

การแยกสิทธิ์ระหว่างผู้ร้องขอ (Employee) และผู้อนุมัติ (Manager/Owner) เป็นการนำหลักการแบ่งแยกหน้าที่มาประยุกต์ใช้ เพื่อลดความเสี่ยงจากการทุจริตที่เกิดขึ้น **ภายในระบบ**

อย่างไรก็ตาม หลักการนี้ไม่สามารถป้องกันความเสี่ยงที่เกิดขึ้น **นอกระบบ** ได้ ระบบจึงออกแบบกลไกชดเชย 2 ชั้น

1. **การกระทบยอดเงินสด (Cash Reconciliation)** — ระบบคำนวณ `expected_closing_cash` จากเงินสดที่รับจริงบวกเงินเข้าออกลิ้นชัก แล้วเทียบกับยอดที่พนักงานนับได้ ส่วนต่างที่ไม่เป็นศูนย์จะทำให้กะเข้าสถานะ `pending_verification` ที่ต้องมีผู้ตรวจสอบรับรอง และหากไม่มีใครรับรองภายในเวลาที่กำหนด ระบบจะ Escalate ไปหา Owner โดยอัตโนมัติ
2. **การตรวจจับส่วนต่างสต็อกผิดปกติ** — เมื่อพนักงานกรอกยอดวัตถุดิบคงเหลือ หากส่วนต่างเกินเกณฑ์ที่ตั้งไว้ (`inventory_variance_alert_percent` ค่าเริ่มต้น 20% และต้องเกิน 1 หน่วยด้วย) ระบบจะเขียน Audit Log ประเภท `inventory_adjusted` โดยอัตโนมัติ พร้อมบันทึกยอดที่ระบบคิด ยอดที่นับได้ และผู้กรอก เพื่อให้เจ้าของร้านตรวจสอบรูปแบบพฤติกรรมย้อนหลังได้

### 5.6 Audit Trail ที่ระบบเขียนเอง

Audit Log ไม่ได้พึ่งพาว่า Application จะจำเขียนหรือไม่ แต่ถูกเขียนโดย Trigger ในฐานข้อมูล จึงไม่มีทางที่การกระทำจะเกิดขึ้นโดยไม่ถูกบันทึก เหตุการณ์ที่ระบบบันทึกอัตโนมัติ ได้แก่

`user_created` · `user_deactivated` · `user_reactivated` · `role_changed` · `pin_changed` · `password_changed` · `pin_locked` · `menu_price_updated` · `config_updated` · `table_status_changed` · `order_closed_unpaid` · `shift_reopened` · `inventory_adjusted`

ส่วน `login_success` · `login_failed` · `logout` เป็นเหตุการณ์ที่เกิดนอกขอบเขตของ Transaction ที่แตะตาราง จึงเขียนจากฝั่ง NestJS

ตาราง `audit_logs` เป็นแบบ Append-only บังคับด้วย Trigger `trg_guard_audit_logs()` ซึ่งอนุญาตให้ลบได้เฉพาะแถวที่มีอายุเกิน 1 ปี ผ่านฟังก์ชัน `purge_old_audit_logs()` ที่ตั้งเวลาเรียกวันละครั้ง

---

## 6. โครงสร้างฐานข้อมูลที่รองรับ (Supporting Database Schema)

```sql
-- ตารางบทบาท (ระดับระบบ ไม่ผูกกับ Tenant ในเวอร์ชันปัจจุบัน)
CREATE TABLE roles (
    role_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name   VARCHAR(100) NOT NULL UNIQUE,   -- 'owner' | 'manager' | 'employee'
    description TEXT
);

-- ตารางรายการสิทธิ์ทั้งหมดในระบบ
CREATE TABLE permissions (
    permission_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) NOT NULL UNIQUE,  -- เช่น 'menu:edit', 'shift:verify'
    module_name    VARCHAR(50) NOT NULL,
    description    TEXT
);

-- ตารางเชื่อมโยงบทบาทกับสิทธิ์ (Many-to-Many)
-- ใช้ RESTRICT เพื่อกันการลบ role หรือ permission ที่ยังถูกอ้างถึงอยู่
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE RESTRICT,
    PRIMARY KEY (role_id, permission_id)
);

-- บทบาทของผู้ใช้เก็บเป็นคอลัมน์ใน users โดยตรง (1 คน 1 บทบาท ต่อ 1 ร้าน)
CREATE TABLE users (
    users_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    role_id        UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    username       VARCHAR(100) NOT NULL,
    email          VARCHAR(255),
    password_hash  VARCHAR(255) NOT NULL,
    pin_hash       VARCHAR(255),
    display_name   VARCHAR(100) NOT NULL,
    password_failed_attempts SMALLINT NOT NULL DEFAULT 0,
    password_locked_until    TIMESTAMPTZ,
    pin_failed_attempts      SMALLINT NOT NULL DEFAULT 0,
    pin_locked_until         TIMESTAMPTZ,
    token_version  INTEGER NOT NULL DEFAULT 0,
    last_login_at  TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT true,
    deactivated_at TIMESTAMPTZ,
    deactivated_by UUID REFERENCES users(users_id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_deactivation CHECK (is_active OR deactivated_at IS NOT NULL),
    CONSTRAINT uq_users_tenant_users UNIQUE (tenant_id, users_id)
);

-- unique แบบไม่สนตัวพิมพ์ กัน 'Admin' กับ 'admin' ถูกมองเป็นคนละบัญชี
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_users_tenant_username_lower ON users (tenant_id, lower(username));
```

**เหตุผลเชิงสถาปัตยกรรมของการออกแบบเป็น Lookup Table**

การเก็บบทบาทในรูปแบบตาราง (แทน `CHECK` Constraint หรือ `ENUM` Type ของ PostgreSQL) ทำให้ระบบเพิ่มบทบาทใหม่ในอนาคตได้ด้วยการเพิ่มแถวข้อมูล โดยไม่ต้องแก้ไขโครงสร้างตารางหรือทำ Schema Migration ที่กระทบข้อมูลเดิม

**เหตุผลที่ไม่ใช้ตาราง `user_roles` แยก**

การออกแบบเดิมกำหนดตาราง `user_roles` เป็น Junction Table แบบ Many-to-Many ซึ่งเหมาะกับระบบที่ผู้ใช้หนึ่งคนถือหลายบทบาทพร้อมกัน แต่ในบริบทของร้านอาหารขนาดเล็ก ผู้ใช้หนึ่งคนในหนึ่งร้านมีบทบาทเดียวเสมอ การคงตารางแยกไว้จึงเพิ่ม `JOIN` ในทุก Query ที่ต้องตรวจสิทธิ์ โดยไม่ได้รองรับกรณีใช้งานที่มีอยู่จริง ระบบจึงเก็บ `role_id` เป็นคอลัมน์ใน `users` โดยตรง

**ความสัมพันธ์ `users` กับ `tenants` แบบ Composite**

ทุกตารางที่อ้างถึง `users` ใช้ Composite Foreign Key `(tenant_id, users_id)` แทนการอ้าง `users_id` เพียงอย่างเดียว เพื่อให้ฐานข้อมูลรับประกันว่าผู้กระทำการต้องเป็นพนักงานของร้านเดียวกันกับข้อมูลที่ถูกกระทำเสมอ RLS กันการ **อ่าน** ข้ามร้านได้ แต่ไม่ได้กันการ **เขียน** Foreign Key ข้ามร้าน จึงต้องใช้ Composite FK ปิดช่องนี้ ซึ่งเป็นแนวทางเดียวกับที่ Citus แนะนำสำหรับ Multi-tenant Schema บน PostgreSQL

---

## 7. สรุปเหตุผลเชิงวิชาการสำหรับการนำเสนอต่อคณะกรรมการ

| ประเด็นที่อาจถูกซักถาม | คำอธิบาย |
|---|---|
| เหตุใดจึงมีเพียง 3 บทบาท ทั้งที่เป็นระบบ Multi-tenant SaaS | บทบาทสะท้อนผู้ใช้งานจริงของกลุ่มเป้าหมาย (ร้านอาหารขนาดเล็ก) ความซับซ้อนของสถาปัตยกรรม Multi-tenant อยู่ที่การแยกข้อมูล (Tenant Isolation) มิใช่จำนวนบทบาทผู้ใช้งานภายในร้าน |
| ระบบรองรับการขยายตัวในอนาคตหรือไม่ | รองรับ ผ่านโครงสร้าง Lookup Table และมีแนวทาง Per-Tenant Custom Role ที่ระบุไว้เป็น Future Scope |
| เหตุใดจึงไม่มีบทบาทสำหรับพนักงานครัวโดยเฉพาะ | พนักงานครัวจัดอยู่ในบทบาท Employee เช่นเดียวกับพนักงานเสิร์ฟ เนื่องจากมิได้ต้องการสิทธิ์การเข้าถึงข้อมูลที่แตกต่างกันในเชิง RBAC การแยกความรับผิดชอบเชิงปฏิบัติงานดำเนินการผ่านกลไก Station Routing ของโมดูล KDS ซึ่งเป็นคนละชั้นกับการควบคุมสิทธิ์ |
| เหตุใดจึงตรวจสิทธิ์ซ้ำในฐานข้อมูล ทั้งที่มี Guard อยู่แล้ว | เป็นการใช้หลัก Defense-in-Depth ชั้น Application ป้องกันการเข้าถึงผ่าน API ตามปกติ แต่ไม่ครอบคลุมกรณีที่มีการเชื่อมต่อฐานข้อมูลโดยตรง หรือกรณีที่ Guard ถูกกำหนดผิดพลาดใน Endpoint ใด Endpoint หนึ่ง การตรวจซ้ำที่ Trigger ทำให้ Invariant ทางการเงินไม่ถูกละเมิดไม่ว่าจะเข้าถึงผ่านช่องทางใด |
| เหตุใด Employee จึงปรับสต็อกได้ ทั้งที่เป็นรายการที่มีมูลค่า | เพราะเป็นผู้ที่อยู่หน้างานและเป็นผู้นับจริง การบังคับให้ Manager มานับเองจะทำให้ระบบไม่ถูกใช้งาน ซึ่งอันตรายกว่า ระบบจึงเลือกออกแบบให้ "ทำได้แต่ตรวจสอบย้อนหลังได้" แทนการบล็อก โดยบันทึกทั้งยอดที่ระบบคิด ยอดที่นับได้ และผู้กรอกลงใน Ledger พร้อมยิง Audit Log อัตโนมัติเมื่อส่วนต่างผิดปกติ |
| หากพนักงานกดปิดกะผิดระหว่างวัน ระบบจะทำอย่างไร | Manager หรือ Owner ใช้ฟังก์ชัน `reopen_shift()` เปิดกะเดิมใหม่ได้ โดยระบบจะล้างยอดปิดกะเดิมทิ้งแต่คงยอดเงินเปิดกะไว้ และบันทึก Audit Log พร้อมเหตุผลที่ต้องระบุเสมอ ทั้งนี้กะที่ผ่านการรับรองแล้ว (`verified`) หรือถูก Escalate แล้ว (`escalated`) จะเปิดใหม่ไม่ได้ เนื่องจากถือเป็นหลักฐานทางบัญชีที่ปิดแล้ว |

---

*เอกสารนี้เป็นส่วนหนึ่งของชุดเอกสารออกแบบระบบ PWA-POS จัดทำขึ้นเพื่อการทบทวนโดยคณะกรรมการโครงงานพิเศษ*
