# PWA-POS — คู่มือติดตั้งสำหรับทีมพัฒนา

เอกสารนี้ใช้ตอนตั้งเครื่องใหม่ หรือตอนที่ต้องล้างฐานข้อมูลแล้วติดตั้งใหม่ ทำตามทีละขั้นตั้งแต่ข้อ 1 ถึงข้อ 7 ใช้เวลาประมาณ 20 นาที

**สิ่งที่ต้องมีก่อนเริ่ม** PostgreSQL 16 ขึ้นไป (ทีมใช้ 18) · pgAdmin 4 · Node.js 20 ขึ้นไป · Git

> **ข้อสำคัญ** นักพัฒนาแต่ละคนติดตั้งฐานข้อมูลบนเครื่องตัวเอง รหัสผ่านของแต่ละคนไม่ต้องตรงกัน สิ่งที่ใช้ร่วมกันคือไฟล์ `FULL_INSTALL.sql` ไม่ใช่รหัสผ่าน

---

## 1. สร้างฐานข้อมูล

เปิด pgAdmin เชื่อมต่อ PostgreSQL ของเครื่องตัวเอง

คลิกขวาที่ **Databases** เลือก **Create** แล้วตั้งชื่อว่า `pwa_pos`

> ชื่อต้องเป็น `pwa_pos` ไม่ใช่ `pos_app` เพราะ `pos_app` เป็นชื่อบัญชีผู้ใช้ฐานข้อมูลในขั้นตอนถัดไป ตั้งชื่อซ้ำกันจะสับสนตอนอ่าน connection string

---

## 2. รันไฟล์ติดตั้ง

คลิกที่ฐานข้อมูล `pwa_pos` แล้วเปิด **Query Tool** (ไอคอนรูปจอ หรือกด Alt+Shift+Q)

เปิดไฟล์ `database/FULL_INSTALL.sql` คัดลอกทั้งไฟล์มาวาง แล้วกด Execute (F5)

ใช้เวลาประมาณ 2 ถึง 5 วินาที จะเห็นข้อความ `NOTICE: policy "tenant_isolation" for relation ... does not exist, skipping` จำนวนมาก **นี่เป็นเรื่องปกติ** ไม่ใช่ข้อผิดพลาด ไฟล์เขียนให้รันซ้ำได้ จึงสั่งลบ policy เก่าก่อนสร้างใหม่เสมอ

ขอให้ดูบรรทัดสุดท้ายว่าเป็น `Query returned successfully`

---

## 3. ตรวจว่าติดตั้งครบ

รัน query นี้ในหน้าต่างเดิม

```sql
SELECT 'tables'      AS item, count(*) AS got, 28 AS expect FROM pg_tables WHERE schemaname='public'
UNION ALL SELECT 'views',       count(*), 3  FROM pg_views  WHERE schemaname='public'
UNION ALL SELECT 'triggers',    count(*), 40 FROM information_schema.triggers WHERE trigger_schema='public'
UNION ALL SELECT 'policies',    count(*), 24 FROM pg_policies WHERE schemaname='public'
UNION ALL SELECT 'permissions', count(*), 25 FROM permissions
UNION ALL SELECT 'configs',     count(*), 9  FROM config_definitions
UNION ALL SELECT 'roles',       count(*), 3  FROM roles;
```

ค่าในคอลัมน์ `got` ต้องตรงกับ `expect` ทุกแถว ถ้าไม่ตรงให้ดูหัวข้อ "ปัญหาที่พบบ่อย" ท้ายเอกสาร

### 3.1 ตรวจว่าได้ไฟล์ติดตั้งรุ่นล่าสุด

เมื่อพบข้อบกพร่องในภายหลัง การแก้จะถูกใส่กลับเข้า `FULL_INSTALL.sql` และออกเป็นไฟล์ปะ (patch) แยกไว้สำหรับคนที่ติดตั้งไปก่อนแล้ว **คนที่ติดตั้งใหม่ไม่ต้องรันไฟล์ปะ** เพราะไฟล์ติดตั้งมีการแก้อยู่ในตัวแล้ว

ตรวจว่าได้รุ่นที่แก้แล้วด้วย query นี้ ต้องได้ `true` ทุกแถว

```sql
SELECT 'PATCH_01 ปิดธง allow_purge คืน' AS "การแก้ไข",
       (prosrc LIKE '%''off'', true%')  AS "มีแล้ว"
FROM pg_proc WHERE proname = 'admin_purge_tenant';
```

ถ้าได้ `false` แปลว่าติดตั้งด้วยไฟล์รุ่นเก่า ให้รัน `PATCH_01_allow_purge.sql` หนึ่งครั้ง หรือจะลบฐานข้อมูลแล้วติดตั้งใหม่ด้วยไฟล์รุ่นล่าสุดก็ได้ ถ้ายังไม่มีข้อมูลจริง

### 3.2 รันชุดทดสอบ

เปิดไฟล์ `database/PGADMIN_TEST.sql` วางทั้งไฟล์ใน Query Tool แล้ว Execute ต้องได้

```
ทดสอบทั้งหมด | ผ่าน | ไม่ผ่าน | สรุป
          88 |   88 |       0 | ฐานข้อมูลทำงานถูกต้องทุกข้อ
```

ชุดทดสอบสร้างร้านทดสอบ 2 ร้าน ทดลองกฎทางธุรกิจทุกข้อ แล้วลบข้อมูลทดสอบทิ้งเอง ไม่กระทบข้อมูลร้านอื่น และรันซ้ำได้

ถ้ามีข้อไม่ผ่าน ตารางถัดไปจะบอกว่าข้อไหน คาดหวังอะไร และได้อะไรมาแทน

> **ห้ามรันชุดทดสอบบนฐานข้อมูลที่ให้บริการจริง** เพราะระหว่างทางมีการสร้างร้าน บิล และรายการชำระเงินจริงลงไป แม้จะลบทิ้งตอนจบ แต่เลขที่ใบเสร็จของวันนั้นจะถูกใช้ไปแล้ว

---

## 4. ตั้งรหัสผ่านบัญชีฐานข้อมูล

ไฟล์ติดตั้งสร้างบัญชีผู้ใช้ไว้ 2 บัญชี พร้อมรหัสผ่านชั่วคราวว่า `CHANGE_ME_NOW` ต้องเปลี่ยนก่อนใช้งาน

```sql
ALTER ROLE pos_app     PASSWORD 'ตั้งรหัสของตัวเองตรงนี้';
ALTER ROLE pos_readonly PASSWORD 'อีกรหัสหนึ่ง';
```

**บัญชีทั้งสองคืออะไร**

| บัญชี | ใช้ทำอะไร |
|---|---|
| `postgres` | เจ้าของฐานข้อมูล ใช้ใน pgAdmin สำหรับรันไฟล์ติดตั้งเท่านั้น |
| `pos_app` | บัญชีที่ NestJS ใช้เชื่อมต่อ ถูกบังคับด้วย Row-Level Security |
| `pos_readonly` | อ่านอย่างเดียว เผื่อใช้ทำรายงานในอนาคต ยังไม่ได้ใช้ในตอนนี้ |

> **เหตุผลที่ต้องมี `pos_app` แยก** PostgreSQL ยกเว้นให้เจ้าของฐานข้อมูลข้าม Row-Level Security ได้เสมอ หากแอปพลิเคชันเชื่อมต่อด้วย `postgres` นโยบายแยกข้อมูลระหว่างร้านทั้ง 24 ข้อจะไม่ทำงานเลย และข้อมูลของร้านหนึ่งจะมองเห็นร้านอื่นได้ทั้งหมด อันตรายกว่าการไม่มีการป้องกัน เพราะเปิดดูใน pgAdmin แล้วเห็นนโยบายครบทุกข้อ

---

## 5. ตั้งค่าฝั่ง NestJS

คัดลอกไฟล์ตัวอย่างแล้วเติมค่าจริง

```bash
cd backend
cp .env.example .env
```

แก้ `.env`

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pwa_pos
DB_USERNAME=pos_app
DB_PASSWORD=รหัสที่ตั้งไว้ในข้อ 4
JWT_SECRET=สุ่มมาเอง_ยาวอย่างน้อย_32_ตัวอักษร
```

> **ห้ามนำไฟล์ `.env` ขึ้น Git** ตรวจว่า `.gitignore` มีบรรทัด `.env` อยู่แล้ว และรัน `git status` ก่อน commit ทุกครั้ง หากเห็น `.env` อยู่ในรายการแปลว่า `.gitignore` ไม่ทำงาน หากเคยนำขึ้นไปแล้ว การลบไฟล์แล้ว commit ใหม่ไม่เพียงพอ เพราะรหัสยังอยู่ใน history ต้องเปลี่ยนรหัสใหม่ทันที

---

## 6. ตรวจค่าสำคัญ 2 ข้อก่อนรันแอป

### 6.1 ปิด synchronize ของ TypeORM

เปิดไฟล์ที่ตั้งค่า TypeORM (ปกติคือ `app.module.ts`) ต้องเป็นแบบนี้

```ts
TypeOrmModule.forRoot({
  // ...
  synchronize: false,    // ต้องเป็น false ถาวร
  migrationsRun: false,
})
```

> **อันตรายที่สุดในคู่มือนี้** `synchronize: true` ทำให้ TypeORM เทียบโครงสร้างในโค้ดกับฐานข้อมูลตอนเริ่มระบบ แล้วลบสิ่งที่ไม่มีในโค้ดทิ้ง ซึ่งได้แก่ Trigger ทั้ง 40 ตัว Policy ทั้ง 24 ข้อ ฟังก์ชันทั้ง 9 ตัว และ Constraint ต่าง ๆ การเริ่มระบบเพียงครั้งเดียวจะทำให้กฎทางธุรกิจทั้งหมดหายไปอย่างเงียบ ๆ และต้องรันไฟล์ติดตั้งใหม่ทั้งหมด
>
> ขอให้ระวังเป็นพิเศษกับรูปแบบ `synchronize: process.env.NODE_ENV !== 'production'` ที่พบได้ทั่วไปในบทความสอน เพราะจะทำให้เครื่องของนักพัฒนาพังทุกครั้งที่เริ่มระบบ ให้เขียน `false` ตรง ๆ

### 6.2 กำหนด Session Context ทุก Request

Row-Level Security ตัดสินว่าแถวไหนมองเห็นได้ จากค่า `app.current_tenant_id` ในเซสชัน หากไม่มีใครกำหนดค่านี้ ทุกคำสั่งค้นข้อมูลจะคืนผลลัพธ์ว่างเปล่า

ก่อนทุก query ต้องรันคำสั่งนี้ใน transaction เดียวกัน

```sql
SELECT set_config('app.current_tenant_id', $1, true);
```

> **พารามิเตอร์ตัวที่ 3 ต้องเป็น `true` เสมอ** ค่า `true` ผูกค่ากับ transaction และล้างเมื่อจบ ส่วน `false` ผูกกับ connection และค้างอยู่ เมื่อ NestJS ใช้ connection pool การใช้ `false` จะทำให้ connection ที่ร้าน A ใช้เสร็จถูกคืนเข้า pool พร้อมรหัสร้าน A ติดอยู่ และ request ถัดไปของร้าน B ที่หยิบ connection นั้นไปใช้จะมองเห็นข้อมูลของร้าน A

**ข้อยกเว้น 2 กรณี** ขั้นตอนเข้าสู่ระบบและสมัครร้านใหม่ยังไม่ทราบรหัสร้าน จึงกำหนดค่านี้ไม่ได้ ให้ใช้ฟังก์ชัน `resolve_tenant(slug)` และ `resolve_user_by_email(email)` ที่เตรียมไว้แทน สำหรับการสมัครร้านใหม่ ฝั่งแอปพลิเคชันต้องสร้าง UUID ของร้านเองก่อน แล้วกำหนด Session Context ด้วยค่านั้น ก่อนบันทึกลงฐานข้อมูล

---

## 7. ทดสอบว่าการแยกข้อมูลระหว่างร้านทำงานจริง

เปิดการเชื่อมต่อใหม่ใน pgAdmin โดยใช้บัญชี `pos_app` (ไม่ใช่ `postgres`) แล้วรัน

```sql
SELECT current_user;           -- ต้องได้ pos_app
SELECT count(*) FROM tenants;  -- ต้องได้ 0
SELECT count(*) FROM users;    -- ต้องได้ 0
```

**ได้ 0 คือถูกต้อง** แปลว่า Row-Level Security กำลังทำงาน เพราะยังไม่มีใครบอกว่าเป็นร้านไหน

หากได้มากกว่า 0 แปลว่ากำลังเชื่อมต่อด้วยบัญชีผิด ให้ตรวจผลของ `SELECT current_user;` อีกครั้ง

ทดสอบว่ากำหนด Context แล้วเห็นข้อมูล

```sql
BEGIN;
SELECT set_config('app.current_tenant_id','ใส่ UUID ของร้านที่มีอยู่', true);
SELECT count(*) FROM users;   -- คราวนี้ต้องเห็นข้อมูล
COMMIT;
```

---

## ปัญหาที่พบบ่อย

### รันไฟล์ติดตั้งแล้วจำนวน object ไม่ครบ

หา policy ที่หายไป

```sql
SELECT c.table_name FROM information_schema.columns c
JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id'
  AND c.table_name NOT IN (SELECT tablename FROM pg_policies
                           WHERE schemaname = 'public' AND policyname = 'tenant_isolation');
```

วิธีแก้ที่ง่ายที่สุดคือลบฐานข้อมูลแล้วติดตั้งใหม่ตั้งแต่ข้อ 1 เพราะยังไม่มีข้อมูลจริง

### `database ... is being accessed by other users` (SQL state 55006)

pgAdmin เปิด connection ค้างไว้สำหรับแสดงโครงสร้างในแถบซ้าย คลิกขวาที่ฐานข้อมูลนั้น เลือก **Disconnect from database** แล้วลองใหม่

หากยังไม่หาย ให้เปิด Query Tool บนฐานข้อมูล `postgres` แล้วรัน

```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE datname = 'pwa_pos' AND pid <> pg_backend_pid();
```

> คำสั่งนี้ตัดการเชื่อมต่อทุกตัวทันที transaction ที่ทำงานค้างอยู่จะถูกยกเลิก ใช้ได้เฉพาะบนเครื่องของนักพัฒนา ห้ามใช้บนเครื่องที่ให้บริการจริง

### `current database cannot be renamed` (SQL state 0A000)

เปลี่ยนชื่อฐานข้อมูลที่ตัวเองกำลังเชื่อมต่ออยู่ไม่ได้ ให้เปิด Query Tool บนฐานข้อมูล `postgres` แล้วสั่งจากตรงนั้น

### ทุก API คืน array ว่างเปล่า

สาเหตุที่พบบ่อยที่สุดคือยังไม่ได้กำหนด Session Context (ข้อ 6.2) หรือกำหนดคนละ transaction กับ query

ตรวจด้วยการ log ค่านี้ในคำสั่งเดียวกับ query จริง

```sql
SELECT current_setting('app.current_tenant_id', true);
```

หากได้ค่าว่าง แปลว่า Context ไม่ได้ถูกกำหนด หรือถูกล้างไปแล้วเพราะอยู่คนละ transaction

### ชุดทดสอบไม่ผ่านข้อที่เกี่ยวกับการลบ

ถ้าข้อ "ลบรายการชำระเงินไม่ได้" หรือ "ลบบันทึกการตรวจสอบไม่ได้" ไม่ผ่าน แปลว่าติดตั้งด้วยไฟล์รุ่นก่อน `PATCH_01` ให้ตรวจตามหัวข้อ 3.1 แล้วรันไฟล์ปะ

สาเหตุคือ `admin_purge_tenant()` รุ่นเก่าเปิดธง `app.allow_purge` เพื่อข้ามการป้องกันการลบ แล้วไม่ได้ปิดคืน ธงจึงค้างจนจบ transaction ทำให้การป้องกันการลบของ 5 ตารางปิดไปด้วย

> **ข้อควรระวังสำหรับโค้ดที่เขียนเอง** รูปแบบ `set_config('ชื่อธง', 'on', true)` ต้องมีบรรทัดปิดคืนเสมอ มิฉะนั้นธงจะมีผลไปจนจบ transaction ไม่ใช่แค่คำสั่งถัดไป

### จู่ ๆ กฎทางธุรกิจไม่ทำงาน ยกเลิกรายการได้โดยไม่ต้องอนุมัติ

เกือบทุกครั้งเกิดจาก `synchronize: true` ตรวจจำนวน Trigger

```sql
SELECT count(*) FROM information_schema.triggers WHERE trigger_schema='public';
```

หากได้น้อยกว่า 40 แปลว่าถูกลบไปแล้ว ต้องแก้ค่าให้เป็น `false` ก่อน แล้วรันไฟล์ติดตั้งใหม่ทั้งไฟล์

---

## สิ่งที่ยังไม่ได้ทำและจะต้องทำต่อ

รายการเต็มอยู่ในหัวข้อ 9 ของ `claude/database-design-revision.md` ส่วนที่เหลือจากคู่มือนี้คือ

- ตั้งเวลาเรียก `escalate_overdue_shifts()` ทุก 15 นาที และ `purge_old_audit_logs()` วันละครั้ง
- ขั้นตอนเข้าสู่ระบบต้องค้นหาผู้ใช้แบบไม่สนตัวพิมพ์ใหญ่เล็ก ผ่าน `resolve_user_by_email()`
- สร้าง `kitchen_ticket_id` หนึ่งค่าต่อการกดส่งครัวหนึ่งครั้ง
- การซิงค์ข้อมูลออฟไลน์ให้อุปกรณ์สร้าง UUID เอง แล้วใช้ `INSERT ... ON CONFLICT DO NOTHING`
- ตั้งค่าการสำรองข้อมูลแบบ Point-in-Time Recovery ก่อนเปิดใช้งานจริง

---

## เอกสารอ้างอิง

| ไฟล์ | เนื้อหา |
|---|---|
| `claude/data-dictionary-v2.md` | คำอธิบายทุกตาราง ทุกคอลัมน์ ทุกฟังก์ชัน |
| `business-rules-pos-updated.md` | กฎทางธุรกิจทั้งหมดพร้อมรหัสอ้างอิง |
| `claude/database-design-revision.md` | เหตุผลเบื้องหลังการออกแบบ และผลการทดสอบ |
| `user-roles-permissions.md` | ตารางสิทธิ์ของแต่ละบทบาท |
| `scope_pwa_pos_v2_2.md` | ขอบเขตของระบบและสิ่งที่ไม่รองรับ |

---

*โครงสร้างฐานข้อมูลผ่านชุดทดสอบ 88 ข้อ ทั้งบน PostgreSQL 16.13 และ PostgreSQL 18 ซึ่งเป็นรุ่นที่ทีมใช้*
