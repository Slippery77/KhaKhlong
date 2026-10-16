# PWA-POS Backend — มาตรฐานการเขียนโค้ด

อัปเดต: 2026-10-09 (เพิ่มข้อ 8.1 ชนิดข้อมูล · ข้อ 10 ข้อ 16 · checklist)

เอกสารนี้ตอบคำถาม "เขียนยังไง"

| เรื่องอื่น | อ่านที่ |
|---|---|
| เครื่องมือ — `query` / `referenceQuery` / Interceptor / RLS | `claude/backend-dev-guide.md` |
| เหตุผลที่ใส่ helmet, throttler, validation | `claude/security-hardening-rationale.md` |
| Swagger — เอกสาร API | `claude/swagger-guide.md` |
| logout, cookie, refresh token, deploy | `claude/auth-session-decisions.md` |
| แผนงานและรายการค้าง | `claude/backend-todo.md` |

> **ตัวอย่างอ้างอิงของโปรเจกต์นี้คือ `src/modules/menu/`** โมดูลใหม่ก๊อปจากตรงนั้นแล้วแก้ชื่อ
> ถ้าโค้ดใน `menu/` ขัดกับเอกสารนี้ แปลว่าอย่างใดอย่างหนึ่งผิด — ถามก่อนก๊อป

---

## 1. กฎ 8 ข้อที่ต้องจำ

1. **Controller ไม่มี logic** รับ HTTP แปลง DTO เรียก service จบ
2. **SQL อยู่ใน repository เท่านั้น** service ไม่เขียน SQL controller ไม่รู้จักฐานข้อมูล
3. **ตารางมี `tenant_id` ใช้ `this.db.query()`** ไม่มีใช้ `referenceQuery()` (มี 4 ตาราง)
4. **route ที่ล็อกอินแล้ว ไม่แตะ `req.user.tenantID` เลย** `SELECT`/`UPDATE`/`DELETE` ให้ RLS กรอง · `INSERT` ใช้ `app_tenant_id()` ใน SQL
5. **ถ้าจำเป็นต้องใช้ `tenant_id` ใน TypeScript จริง ๆ** เอาจาก `req.user.tenantID` เท่านั้น ห้ามรับจาก body
6. **catch เฉพาะ error ที่แปลงเป็น HTTP status ได้** และต้องมี `throw err` ปิดท้าย
7. **ใช้ `id` เป็นตัวระบุ ไม่ใช่ `name`** ชื่อเป็นข้อมูลที่แก้ได้
8. **parameter ของ controller ทุกตัวต้องมี decorator** ไม่มีแปลว่าได้ `undefined`

---

## 2. แบ่งหน้าที่ 3 ชั้น

### 2.0 ทำไม 3 ชั้น ไม่ใช่ 4

นับ "ชั้น" จากสิ่งที่**ข้อมูลไหลผ่าน** ไม่ใช่จำนวนไฟล์ในโฟลเดอร์

```
HTTP request
   ↓
Controller      ← ชั้นที่ 1   แปลง HTTP เป็นค่าธรรมดา
   ↓
Service         ← ชั้นที่ 2   ตัดสินใจ
   ↓
Repository      ← ชั้นที่ 3   คุยกับ PostgreSQL
   ↓
PostgreSQL
```

`Module` **ไม่ได้อยู่ในเส้นทางนี้** มันไม่รับข้อมูลและไม่ส่งข้อมูลต่อ — มันคือ **ใบแจ้งรายการ** บอก NestJS ว่า module นี้มี class อะไร ใครได้อะไรไป ใครเอาไปใช้ต่อได้

เทียบกับร้านอาหาร: พนักงานรับออเดอร์ → เชฟ → คนหยิบวัตถุดิบ คือ 3 ขั้น ส่วน `Module` คือ **ผังองค์กร** ที่บอกว่าใครทำตำแหน่งไหน ผังองค์กรไม่ใช่ขั้นตอนหนึ่งในการทำอาหาร

ไฟล์ใน 1 โมดูลมี 6 ชนิด แต่เป็นชั้นแค่ 3

| ไฟล์ | เป็นชั้นไหม | หน้าที่ |
|---|---|---|
| `*.controller.ts` | **ชั้นที่ 1** | ข้อมูลไหลผ่าน |
| `*.service.ts` | **ชั้นที่ 2** | ข้อมูลไหลผ่าน |
| `*.repository.ts` | **ชั้นที่ 3** | ข้อมูลไหลผ่าน |
| `*.module.ts` | ไม่ใช่ | ประกาศว่ามีอะไร (wiring) |
| `dto/*.ts` | ไม่ใช่ | รูปร่างข้อมูลขาเข้า |
| `*.mapper.ts` | ไม่ใช่ | รูปร่างข้อมูลขาออก |

**วิธีพิสูจน์** ลบ `menu.module.ts` ออกแล้วไปลงทะเบียน provider ที่ `app.module.ts` แทน โค้ดทำงานเหมือนเดิมเป๊ะ เพราะมันไม่ได้ประมวลผลอะไร — ส่วนถ้าลบ `menu.service.ts` ออก logic หายไปจริง

### 2.0.1 สถาปัตยกรรมอื่นมี 4 ชั้นจริง

| สถาปัตยกรรม | ชั้น | ทำไมเขาต้องมีเพิ่ม |
|---|---|---|
| **โปรเจกต์นี้** | Controller → Service → Repository | 3 |
| Clean Architecture | Controller → Use Case → **Domain/Entity** → Repository | business rule อยู่ใน object ที่มีพฤติกรรม เช่น `order.canBeVoided()` |
| DDD | + Domain Service, Aggregate, Value Object | ระบบใหญ่ กฎธุรกิจซับซ้อนและเปลี่ยนบ่อย |
| NestJS + TypeORM ทั่วไป | Controller → Service → **Entity** → ORM | `Entity` ทำหน้าที่ทั้ง schema และ domain object |

**ทำไมเราไม่ต้องมีชั้นที่ 4**

เพราะ **business rule ส่วนใหญ่ของระบบนี้อยู่ใน PostgreSQL ไม่ใช่ใน TypeScript**

ตัวอย่างจริง — กฎ "void รายการที่ครัวกำลังทำต้องมีสิทธิ์ `void:approve`"

- Clean Architecture เขียนไว้ใน `Order` entity เป็น method `canVoid(user)`
- ระบบนี้เขียนไว้เป็น **trigger ใน DB** ที่เรียก `has_permission()`

| | ข้อดี | ข้อเสีย |
|---|---|---|
| **ทางที่เลือก (กฎใน DB)** | กฎบังคับทุกทางเข้า — API, SQL ตรง, cron job | กฎกระจาย 2 ที่ (DB + service) · ต้องอ่าน SQL เป็น |
| Clean Architecture (กฎใน TypeScript) | กฎอยู่ที่เดียว อ่านง่าย · test ง่ายโดยไม่ต้องมี DB | บังคับเฉพาะทางที่ผ่าน TypeScript |

และเพราะ **เราไม่ใช้ ORM** repository คืน plain object ตรงจาก PostgreSQL การเพิ่มชั้น Domain เข้ามาจะได้แค่ class ที่ก๊อปค่าจาก row ไปใส่ตัวเองแล้วไม่ทำอะไรต่อ — เพิ่มไฟล์ เพิ่มการแปลง แต่ไม่ได้ป้องกันอะไร

สำหรับทีม 2 คน 3 เดือน 10 โมดูล ชั้นที่ไม่ได้ป้องกันอะไรคือต้นทุนล้วน

**เมื่อไหร่ควรเพิ่มชั้นที่ 4** — ถ้าวันหนึ่ง service ตัวหนึ่งยาวเกิน 300 บรรทัดและมี `if` ซ้อนกัน 4 ชั้นเพราะกฎธุรกิจ แปลว่าถึงเวลาแยก domain object ออกมา โมดูลที่เสี่ยงสุดคือ Payment กับ Order ถ้าถึงตอนนั้นค่อยแยกเฉพาะโมดูลนั้น **ไม่ต้องแยกทั้งระบบ**

### 2.1 Controller

**ทำ** รับ HTTP · ตรวจรูปแบบด้วย DTO และ pipe · เรียก service · กำหนด permission · เอกสาร Swagger

**ไม่ทำ** business logic · เขียน SQL · แปลง error · คำนวณอะไรเลย · **อ่าน `req.user.tenantID`** (ดูข้อ 3)

```ts
@RequirePermissions('menu:edit')
@Post('category')
async createCategory(@Body() dto: CategoryDTO) {
    return this.menuService.createCategory(dto);
}
```

ถ้า controller ยาวเกิน 5 บรรทัดต่อ method (ไม่นับ decorator) มีอะไรผิด

### 2.2 Service

**ทำ** business logic · ตรวจกฎธุรกิจที่ DB ตรวจไม่ได้ · แปลง error ของ PostgreSQL เป็น HTTP exception · ประกอบข้อมูลจากหลาย repository · เรียก mapper แปลงรูปร่าง response

**ไม่ทำ** เขียน SQL · รู้จัก `req` หรือ `res` · รู้จัก HTTP header

### 2.3 Repository

**ทำ** SQL เท่านั้น · คืน row ดิบ หรือ `null`

**ไม่ทำ** throw HTTP exception · ตัดสินใจทางธุรกิจ · แปลงรูปร่างข้อมูล

```ts
@Injectable()
export class MenuRepository {
    constructor(private readonly db: DbContextService) {}

    async setCategoryActive(categoryId: string, isActive: boolean) {
        const sql = `
            UPDATE categories
            SET is_active = $2
            WHERE category_id = $1
            RETURNING category_id, name, sort_order, is_active, created_at, updated_at
        `;
        const result = await this.db.query(sql, [categoryId, isActive]);
        return result.rows[0] ?? null;
    }
}
```

### 2.4 โค้ดนี้ควรอยู่ชั้นไหน

| โค้ด | ชั้น |
|---|---|
| `@RequirePermissions()` | Controller |
| `ParseUUIDPipe` | Controller |
| `@ApiOperation()` และ Swagger ทั้งหมด | Controller |
| `if (!row) throw new NotFoundException()` | Service |
| `if (err.code === '23505')` | Service |
| `toCategoryResponse(row)` | Service (เรียก) / Mapper (นิยาม) |
| คำนวณยอดรวม ประกอบข้อมูลหลายแหล่ง | Service |
| `INSERT`, `SELECT`, `UPDATE` | Repository |
| `app_tenant_id()` | Repository (ใน SQL) |
| `ON CONFLICT DO NOTHING` | Repository |

**กฎง่าย** ถ้าลบ HTTP ออกจากระบบแล้วเอา service ไปใช้กับ cron job ได้ แปลว่าแบ่งถูก

### 2.5 ไฟล์ที่ไม่ใช่ชั้น ทำอะไร

**`*.module.ts`** — ประกาศว่า module นี้มีอะไร ใครใช้อะไรได้ (ดูข้อ 5)

**`dto/*.ts`** — รูปร่างข้อมูลขาเข้า พร้อม validation ให้ตรง schema (ดูข้อ 8)

**`*.mapper.ts`** — รูปร่างข้อมูลขาออก แปลง row ของ PostgreSQL เป็น response (ดูข้อ 7.5)

ทั้งสามไม่ใช่ชั้นเพราะไม่ตัดสินใจอะไร เป็นแค่โครงสร้างข้อมูลหรือการประกาศ

---

## 3. tenant_id — ไม่ต้องเอามาจาก req แล้ว

### 3.1 ปัญหาเดิม

```ts
// controller
return this.service.listCategories(req.user.tenantID);
// service
listCategories(tenantId: string) { return this.repo.findAll(tenantId); }
// repository
findAll(tenantId: string) {
    return this.db.query(`SELECT * FROM categories WHERE tenant_id = $1`, [tenantId]);
}
```

`tenantId` ต้องวิ่งผ่าน 3 ชั้นทุกครั้ง ทุกฟังก์ชัน ระบบนี้มี 28 ตาราง ร้อยกว่าฟังก์ชัน — ลืมใส่ `WHERE tenant_id` ที่เดียวคือรูรั่ว และ **ไม่มี error ให้สังเกต** มันทำงานได้ แค่ร้าน A เห็นข้อมูลร้าน B

### 3.2 ทางที่ใช้ตอนนี้

```ts
// controller — ไม่มี @Req()
return this.service.listCategories();
// service
listCategories() { return this.repo.findAll(); }
// repository — ไม่มี WHERE tenant_id
findAll() {
    return this.db.query(`SELECT category_id, name FROM categories WHERE is_active`);
}
```

### 3.3 เกิดอะไรขึ้นระหว่างบรรทัด

```
request มาพร้อม JWT { tenantID: 'aaa-111' }
     ↓
JwtAuthGuard ถอด token ใส่ req.user.tenantID = 'aaa-111'
     ↓
TenantContextInterceptor
  BEGIN
  SELECT set_config('app.current_tenant_id', 'aaa-111', true), ...
     ↓
controller + service + repository ทำงาน
  ทุก query ถูก PostgreSQL เติม AND tenant_id = app_tenant_id() ให้เองด้วย RLS
     ↓
  COMMIT
```

query ที่เขียน

```sql
SELECT category_id, name FROM categories WHERE is_active
```

PostgreSQL รันจริงเป็น

```sql
SELECT category_id, name FROM categories
WHERE is_active AND tenant_id = app_tenant_id()
```

**ลืมไม่ได้เพราะไม่มีอะไรให้ลืม**

### 3.4 INSERT ใช้ `app_tenant_id()` ไม่ใช่ `$n`

RLS **ไม่เติมค่าให้ตอน INSERT** มันแค่ตรวจว่าค่าที่ใส่ตรงกับ context และ `tenant_id` เป็น `NOT NULL` จึงต้องใส่ค่าเอง

**แต่ไม่ต้องเอาค่ามาจาก `req`** ให้ PostgreSQL หยิบจาก context เอง

```ts
async createCategory(name: string) {
    const sql = `
        INSERT INTO categories (tenant_id, name, sort_order)
        VALUES (
            app_tenant_id(),
            $1,
            COALESCE((SELECT MAX(sort_order) + 1 FROM categories), 0)
        )
        RETURNING category_id, name, sort_order, is_active, created_at, updated_at
    `;
    return (await this.db.query(sql, [name])).rows[0];
}
```

`app_tenant_id()` คือฟังก์ชันใน DB ที่อ่าน `app.current_tenant_id` ซึ่ง interceptor ตั้งไว้

```sql
CREATE FUNCTION app_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid $$;
```

⚠ **`()` ห้ามลืม** — `app_tenant_id` เฉย ๆ ไม่ใช่การเรียกฟังก์ชัน PostgreSQL จะอ่านเป็น**ชื่อคอลัมน์** แล้วตอบ `42703 column "app_tenant_id" does not exist` (ดูข้อ 4.8)

subquery `SELECT MAX(sort_order) FROM categories` ก็ **ไม่มี** `WHERE tenant_id` เพราะ RLS กรองให้ — มันนับแค่หมวดหมู่ของร้านนี้

### 3.5 ทำไมใช้ `app_tenant_id()` แทนการรับจาก req

ทั้งสองทางได้ค่าเดียวกัน เพราะมาจาก JWT ตัวเดียวกัน ต่างกันแค่ **ใครไปหยิบ**

```
JWT { tenantID: 'aaa-111' }
      ↓
JwtAuthGuard ใส่ req.user.tenantID = 'aaa-111'
      ↓
TenantContextInterceptor ตั้ง app.current_tenant_id = 'aaa-111'
      ↓
      ├─ ทาง A: controller อ่าน req.user.tenantID ส่งผ่าน 3 ชั้นลง SQL
      └─ ทาง B: SQL เรียก app_tenant_id() อ่านค่าเดียวกันนั้น
```

| | ทาง A (ผ่าน `req`) | ทาง B (`app_tenant_id()`) |
|---|---|---|
| ส่งค่าผิดได้ไหม | ได้ — เผลอส่งจาก body หรือสลับตำแหน่ง parameter | **ไม่ได้ เพราะไม่มีค่าให้ส่ง** |
| จำนวน parameter | ทุกฟังก์ชันมี `tenantId` เกินมา 1 ตัว | ไม่มี |
| `INSERT` ต่างจาก `SELECT` ไหม | ต่าง — ต้องจำว่า `INSERT` เป็นข้อยกเว้นที่ต้องส่ง | **ไม่ต่าง ไม่มีข้อยกเว้นให้จำ** |
| เรียกนอก request | ได้ค่าที่ส่งมา ซึ่งอาจมั่ว | `NULL` แล้วชน `NOT NULL` — **พังเสียงดัง** |
| อ่านโค้ดแล้วเห็น tenant | เห็นใน TypeScript | ต้องรู้ว่า `app_tenant_id()` คืออะไร (เอกสารนี้) |

**ข้อสำคัญที่สุดคือแถวสุดท้ายของคอลัมน์ขวา** — ยิ่งเขียน `tenant_id` น้อย ยิ่งผิดยาก

ตัวอย่างความผิดที่ทาง B ป้องกันได้ — bug จริงที่เคยเกิดในโมดูลเมนู

```sql
-- ผิด: $1 คือ name (varchar) แต่เอาไปเทียบกับ tenant_id (uuid)
INSERT INTO categories(tenant_id, name, sort_order)
VALUES(
    app_tenant_id(),
    $1,
    COALESCE((SELECT MAX(sort_order)+1 FROM categories WHERE tenant_id=$1), 0)
)
```

```
inconsistent types deduced for parameter $1    (42P08)
```

สาเหตุคือยังเผลอเขียน `WHERE tenant_id=` ติดมาจากความเคยชินแบบทาง A ทั้งที่ไม่จำเป็น — ถ้าลบออก bug หายไปเอง

### 3.6 ตารางตัดสินใจ

| สถานการณ์ | เอา `tenant_id` จาก `req` ไหม | SQL เขียนยังไง |
|---|---|---|
| `SELECT` ใน route ที่ล็อกอินแล้ว | **ไม่** | ไม่ต้องเขียน `tenant_id` เลย RLS กรอง |
| `UPDATE` ใน route ที่ล็อกอินแล้ว | **ไม่** | ไม่ต้องเขียน RLS กรอง |
| `DELETE` ใน route ที่ล็อกอินแล้ว | **ไม่** | ไม่ต้องเขียน RLS กรอง |
| `INSERT` ใน route ที่ล็อกอินแล้ว | **ไม่** | `VALUES (app_tenant_id(), $1, ...)` |
| เรียก `audit_write()` | **ไม่** | `SELECT audit_write(app_tenant_id(), $1, $2)` |
| ต้องใช้ `users_id` ของคนที่ล็อกอิน | **ไม่** | `app_user_id()` |
| **`@Public()` — register** | **ไม่มีให้เอา** | `randomUUID()` ใน Node ส่งเข้า `runInTransaction` แล้ว `VALUES ($1, ...)` ลงตาราง `tenants` |
| **`@Public()` — login** | **ไม่มีให้เอา** | `resolve_tenant()` หาจาก slug ก่อน แล้วเปิด `runInTransaction` |

**ข้อยกเว้นมีแค่ 2 ข้อ และทั้งคู่เป็น `@Public()` route** ที่ยังไม่มี JWT

### 3.7 ตัวอย่างครบทุกแบบ

**`SELECT` — ไม่มี `tenant_id` ที่ไหนเลย**

```ts
async listCategories() {
    const sql = `
        SELECT category_id, name, sort_order, is_active
        FROM categories
        WHERE is_active
        ORDER BY sort_order
    `;
    return (await this.db.query(sql)).rows;
}
```

**`UPDATE` — ไม่มี `tenant_id` ใน `WHERE`**

```ts
async setCategoryActive(categoryId: string, isActive: boolean) {
    const sql = `
        UPDATE categories
        SET is_active = $2
        WHERE category_id = $1
        RETURNING category_id, name, sort_order, is_active, created_at, updated_at
    `;
    return (await this.db.query(sql, [categoryId, isActive])).rows[0] ?? null;
}
```

ถ้า `categoryId` เป็นของร้านอื่น RLS กรองออก ได้ `null` แล้ว service ตอบ 404

**`INSERT` ที่มี FK ไปตารางอื่น — ก็ไม่ต่าง**

```ts
async createMenuItem(categoryId: string, name: string, description: string | null, price: number) {
    const sql = `
        INSERT INTO menu_items (tenant_id, category_id, name, description, price)
        VALUES (app_tenant_id(), $1, $2, $3, $4)
        RETURNING menu_item_id, category_id, name, description, price, is_available, is_active
    `;
    return (await this.db.query(sql, [categoryId, name, description, price])).rows[0];
}
```

ถ้า `categoryId` เป็นของร้านอื่น composite FK `(tenant_id, category_id)` ปฏิเสธด้วย `23503` — **RLS กันการอ่าน FK กันการเขียน** ทำงานคนละหน้าที่

**audit log ที่ต้องเขียนเอง**

```ts
await this.db.query(
    `SELECT audit_write(app_tenant_id(), $1, $2)`,
    ['tenant_updated', JSON.stringify({ field: 'restaurant_name' })],
);
```

**`@Public()` — register (ข้อยกเว้นที่ 1)**

```ts
async registrationOwner(dto: RegisterOwnerDto, clientIp = 'unknown', deviceInfo = 'unknown') {
    const tenantID = randomUUID();   // ← สร้างเอง เพราะยังไม่มีร้าน

    return this.db.runInTransaction(
        { tenantId: tenantID, userId: null, role: 'owner', clientIp, deviceInfo },
        async () => {
            // ตาราง tenants เป็นตารางเดียวที่ INSERT ส่งค่าตรง
            // เพราะแถวนี้ "คือ" ร้าน ไม่ใช่แถวที่ "อยู่ใน" ร้าน
            await this.tenantsService.createTenant(tenantID, dto.restaurant_name, ...);

            // ส่วน users ใช้ app_tenant_id() ได้ เพราะ context ถูกตั้งแล้ว
            await this.userService.createOwner(roleOwner.role_id, dto.username, ...);
        },
    );
}
```

**`@Public()` — login (ข้อยกเว้นที่ 2)**

```ts
// ขั้น 1 — นอก transaction ยังไม่มี context
const tenant = await this.tenantService.findTenantSlug(dto.tenantSlug);  // resolve_tenant()

// ขั้น 2 — เปิด transaction ด้วยค่าที่หาได้
return this.db.runInTransaction(
    { tenantId: tenant.tenant_id, userId: null, role: null, clientIp, deviceInfo },
    async () => {
        // ข้างในนี้ใช้ this.db.query() ได้ตามปกติ
    },
);
```

### 3.8 วิธีจำ

ถามตัวเอง 1 คำถาม

> **route นี้มี `@Public()` ไหม**

| คำตอบ | ทำ |
|---|---|
| **ไม่มี** (ต้องล็อกอิน) | ไม่แตะ `req.user.tenantID` เลย · `INSERT` ใช้ `app_tenant_id()` |
| **มี** (login, register) | ต้องหา `tenant_id` เอง แล้วเปิด `runInTransaction` ด้วยค่านั้น |

ปัจจุบันมี `@Public()` แค่ 2 route — นั่นคือจำนวนข้อยกเว้นทั้งหมดในระบบ

### 3.9 ถ้าทำผิดจะเห็นอะไร

| ทำผิดแบบ | อาการ |
|---|---|
| ใช้ `app_tenant_id()` ในโค้ดที่ไม่มี context | `null value in column "tenant_id" violates not-null constraint` (23502) — **พังทันที เห็นเลย** |
| เขียน `app_tenant_id` ลืม `()` | `column "app_tenant_id" does not exist` (42703) — **พังทันที เห็นเลย** |
| รับ `tenant_id` จาก body แล้วส่งเข้า `INSERT` | `new row violates row-level security policy` — RLS กัน แต่**อย่าทำ** เพราะพึ่ง RLS ชั้นเดียว |
| เผลอใส่ `WHERE tenant_id=$1` ทั้งที่ `$1` เป็นค่าอื่น | `inconsistent types deduced for parameter $1` (42P08) |
| ส่ง `tenant_id` ของร้านอื่นผ่าน `req` | ทำไม่ได้ เพราะมาจาก JWT ที่เซ็นด้วย `JWT_SECRET` ปลอมไม่ได้ |

**ไม่มีกรณีที่ผิดแล้วเงียบ** — เป็นเหตุผลหลักที่เลือกทางนี้

### 3.10 จะใส่ `WHERE tenant_id` ด้วยได้ไหม

ได้ ไม่ผิด เป็นชั้นสำรองตาม defense in depth แต่ต้องเข้าใจว่า **RLS เป็นชั้นหลัก** ไม่ใช่ชั้นสำรอง

**มาตรฐานของโปรเจกต์นี้: ไม่ใส่** เพราะโค้ดที่ใส่ครึ่ง ๆ อันตรายกว่าโค้ดที่พึ่งกลไกเดียวอย่างสม่ำเสมอ — คนอ่านจะไม่รู้ว่าที่ไม่มีนั้นลืมหรือตั้งใจ

### 3.11 เช็คว่าทำงานจริง

อย่าเชื่อว่าทำงาน ทดสอบด้วย 2 ร้าน

1. สมัครร้าน A และ B
2. ล็อกอินร้าน A สร้างหมวดหมู่ "ของทอด"
3. ล็อกอินร้าน B เรียก `GET /api/menu/category` — **ต้องไม่เห็น "ของทอด"**
4. ล็อกอินร้าน B ยิง `PATCH /api/menu/category/<id ของ "ของทอด">/disable` — ต้องได้ **404**

ข้อ 3-4 ผ่านแค่เมื่อ `.env` เป็น `DB_USER=pos_app` ถ้าเป็น `postgres` จะผ่านแบบปลอม เพราะเป็นเจ้าของตารางจึงข้าม RLS

---

## 4. try/catch เขียนตอนไหน

### 4.1 กฎข้อเดียว

**catch เฉพาะเมื่อแปลง error นั้นเป็น HTTP status ที่มีความหมายได้ นอกนั้นปล่อยให้ throw**

NestJS มี exception filter ของตัวเองที่เปลี่ยน error ที่ไม่ถูก catch เป็น 500 พร้อม log ให้แล้ว การ catch แล้ว throw ต่อโดยไม่ทำอะไรคือ code ที่ไม่มีประโยชน์

### 4.2 PostgreSQL error code ต่อ HTTP status

| code | ความหมาย | ตอบ | ตัวอย่างในระบบนี้ |
|---|---|---|---|
| `23505` | unique violation | **409** `ConflictException` | ชื่อหมวดหมู่ซ้ำ, slug ซ้ำ, username ซ้ำ |
| `23503` | foreign key violation | **404** ถ้า FK มาจาก path · **400** ถ้ามาจาก body | `POST /menu/category/:category_id/items` ด้วย id ที่ไม่มี ตอบ 404 · ส่ง `category_id` มาใน body ตอบ 400 |
| `23514` | check violation | **400** `BadRequestException` | `price` ติดลบ, สถานะนอก enum |
| `P0001` | `RAISE EXCEPTION` จาก trigger | **400** หรือ **409** ดูข้อความ | กฎธุรกิจ เช่น ปิดบิลที่ยังไม่จ่าย |
| `23502` | not-null violation | **ห้าม catch** | เป็น bug ของเรา ปล่อยเป็น 500 ให้เห็น |
| `42601` | syntax error | **ห้าม catch** | SQL ผิด เป็น bug |
| `42703` | undefined column | **ห้าม catch** | ชื่อคอลัมน์ผิด หรือเรียกฟังก์ชันลืม `()` เป็น bug |
| `42P08` | inconsistent parameter type | **ห้าม catch** | ใช้ `$n` ตัวเดียวกันกับชนิดคนละแบบ เป็น bug |
| `22P02` | invalid input syntax | **ห้าม catch** | ป้องกันด้วย `ParseUUIDPipe` ที่ controller |

5 ตัวล่างห้าม catch เพราะถ้าเกิด แปลว่าโค้ดเราผิด ถ้า catch แล้วตอบ 400 จะดูเหมือนผู้ใช้ส่งข้อมูลผิด ทำให้หา bug ไม่เจอ

**ทำไม `23503` แยกเป็น 2 กรณี** — `POST /menu/category/<uuid ที่ไม่มี>/items` ถ้าตอบ 400 แปลว่า "ข้อมูลที่ส่งมาผิดรูป" ซึ่งไม่จริง เพราะ body ถูกทุกอย่าง สิ่งที่ไม่มีคือหมวดหมู่ที่ URL ชี้ไป ตรงกับความหมายของ 404 และตรงกับข้อ 7.6 ที่ให้ตอบ 404 ทั้งกรณีไม่มีจริงและกรณีเป็นของร้านอื่น

ส่วน FK ที่ผู้ใช้ส่งมาใน body (เช่น `{"category_id": "..."}`) เป็นข้อมูลขาเข้าที่ผิด จึงตอบ 400

### 4.3 pattern ที่ถูก

```ts
async createCategory(dto: CategoryDTO) {
    try {
        const row = await this.menuRepository.createCategory(dto.name);
        return { status: 'success', data: toCategoryResponse(row) };
    } catch (err: any) {
        if (err.code === '23505') {
            throw new ConflictException(`มีหมวดหมู่ชื่อ "${dto.name}" ที่ใช้งานอยู่แล้ว`);
        }
        throw err;   // ← บรรทัดนี้ห้ามลืม
    }
}
```

`throw err` ตัวสุดท้ายสำคัญ ถ้าลืม error อื่นทั้งหมดจะหายเงียบ ฟังก์ชันคืน `undefined` แล้ว response เป็น 200 ว่าง ๆ

### 4.4 3 pattern ที่ผิดบ่อย

**ผิดแบบที่ 1 — กลืน error**

```ts
try {
    return await this.repo.create(name);
} catch (err) {
    console.log(err);          // ← log แล้วจบ
}
```

ผู้เรียกได้ 200 กับ body ว่าง ไม่มีใครรู้ว่าพัง bug ประเภทนี้หายากที่สุด

**ผิดแบบที่ 2 — catch แล้วแปลงเป็น 500 เอง**

```ts
} catch (err) {
    throw new InternalServerErrorException('Database error');
}
```

ทำให้ 23505 (ควรเป็น 409) กลายเป็น 500 ด้วย ผู้ใช้ไม่รู้ว่าแค่ชื่อซ้ำ และ log เสีย stack trace เดิม

**ผิดแบบที่ 3 — catch ใน repository**

```ts
// menu.repository.ts
try {
    await this.db.query(sql, [name]);
} catch (err) {
    throw new ConflictException('ซ้ำ');   // ← repository ไม่ควรรู้เรื่อง HTTP
}
```

repository รู้แต่เรื่องฐานข้อมูล ไม่ควรรู้ว่าตัวเองถูกเรียกจาก HTTP API หรือ cron job

**ที่ถูก: catch อยู่ที่ service เท่านั้น**

### 4.5 ไม่ต้อง try/catch เพื่อ rollback

`runInTransaction` ทำให้แล้ว

```ts
// ข้างใน DbContextService
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
}
```

ใน service แค่ `throw` ก็พอ ของทั้ง request จะถูก rollback เอง

ตัวอย่าง: สร้างเมนู 3 รายการในครั้งเดียว ถ้ารายการที่ 3 ชื่อซ้ำแล้ว service throw `ConflictException` รายการที่ 1 กับ 2 จะถูก rollback ด้วย ไม่มีข้อมูลครึ่ง ๆ ค้าง

### 4.6 ที่ไม่ต้อง try/catch เลย

```ts
async listCategories() {
    const sql = `
        SELECT category_id, name, sort_order
        FROM categories WHERE is_active ORDER BY sort_order
    `;
    return (await this.db.query(sql)).rows;
}
```

`SELECT` ไม่ชน unique ไม่ชน FK ไม่ชน check ถ้าพังคือ bug ปล่อยเป็น 500

### 4.7 `try` ครอบแค่ `await` ที่ยิง DB

`try` ครอบเท่าที่จำเป็น **ไม่ครอบ `throw` ที่เราเขียนเอง**

```ts
// ผิด — NotFoundException อยู่ใน try
try {
    const row = await this.repo.renameCategory(id, name);
    if (!row) throw new NotFoundException('ไม่พบหมวดหมู่นี้');
    return { status: 'success', data: toCategoryResponse(row) };
} catch (err: any) {
    if (err.code === '23505') throw new ConflictException('ชื่อซ้ำ');
    throw err;
}
```

```ts
// ถูก — try ครอบแค่บรรทัดที่ยิง DB
let row: any;
try {
    row = await this.repo.renameCategory(id, name);
} catch (err: any) {
    if (err.code === '23505') throw new ConflictException('ชื่อซ้ำ');
    throw err;
}
if (!row) throw new NotFoundException('ไม่พบหมวดหมู่นี้');
return { status: 'success', data: toCategoryResponse(row) };
```

**แบบผิดยังทำงานถูกอยู่** เพราะ `NotFoundException` ไม่มี `.code` จึงไหลไป `throw err` แล้วออกไปเป็น 404 ตามเดิม

แต่มันถูกโดยบังเอิญ วันที่เพิ่ม `catch` ที่กว้างกว่านี้ — เช่น `if (err.code?.startsWith('23'))` หรือ `catch` แล้ว log แล้วแปลงเป็นข้อความกลาง — **404 จะถูกกลืนกลายเป็นอย่างอื่น** แล้วหาสาเหตุไม่เจอ เพราะคนที่แก้ไม่ได้แตะบรรทัด `NotFoundException` เลย

**กฎ: ถ้า `throw` นั้นเราเขียนเอง มันไม่ควรอยู่ใน `try` ที่ดัก error จาก DB**

ข้อ 6.3 และ 7.6 ไม่มี `try` เลยจึงไม่ติดปัญหานี้ — ปัญหาเกิดเมื่อฟังก์ชันหนึ่งต้องทำทั้งสองอย่าง คือ ดัก `23505` **และ** ตรวจ `null`

### 4.8 นับ 3 อย่างก่อนรัน SQL

TypeScript ตรวจ SQL ให้ไม่ได้เลย เพราะในสายตา compiler มันเป็นแค่ string — รู้ว่าผิดตอน runtime เท่านั้น

เขียน `INSERT` หรือ `UPDATE` เสร็จ นับก่อนรัน

| นับอะไร | ผิดแล้วได้ |
|---|---|
| 1. จำนวนคอลัมน์ใน `(...)` เท่ากับจำนวนค่าใน `VALUES(...)` | `42601 INSERT has more target columns than expressions` |
| 2. `$n` ตัวสูงสุด เท่ากับความยาว params array | ค่าหายเงียบ หรือ `bind message supplies N parameters` |
| 3. ทุกฟังก์ชันมี `()` | `42703 column "..." does not exist` |

ทั้ง 3 ข้อเกิดขึ้นจริงในโมดูล menu ภายในคืนเดียว

```sql
-- ผิดทั้ง 3 ข้อในบรรทัดเดียว
INSERT INTO menu_items(tenant_id, category_id, name, description, price)
VALUES(app_tenant_id,$1,$2,$3)
--     ^^^^^^^^^^^^^ ลืม ()      ^^^^^^^^^^^ 5 คอลัมน์ แต่ 4 ค่า และ price ไม่ได้ส่ง
```

```sql
-- ถูก
INSERT INTO menu_items(tenant_id, category_id, name, description, price)
VALUES(app_tenant_id(), $1, $2, $3, $4)
```

---

## 5. @Injectable / @Module / DI

### 5.1 `@Injectable()` ใส่ตอนไหน

ใส่ที่ class ที่ **ต้องการรับของจาก constructor** หรือ **ถูก inject เข้าที่อื่น**

| class | `@Injectable()` | เหตุผล |
|---|---|---|
| `MenuService` | ✓ | รับ `MenuRepository` และถูก inject เข้า controller |
| `MenuRepository` | ✓ | รับ `DbContextService` |
| `MenuController` | ✗ | ใช้ `@Controller()` แทน (เป็น `@Injectable` อยู่ในตัว) |
| `TenantContextInterceptor` | ✓ | รับ `DbContextService` |
| `PermissionsGuard` | ✓ | รับ `Reflector` และ `PermissionCacheService` |
| `CategoryDTO` | ✗ | เป็นแค่โครงข้อมูล ไม่รับอะไร |
| `toCategoryResponse()` | ✗ | เป็นฟังก์ชันธรรมดา ไม่ใช่ class |

ลืมใส่ `@Injectable()` จะได้

```
Nest can't resolve dependencies of the MenuService (?)
```

### 5.2 imports / providers / exports / controllers

```ts
@Module({
    imports: [],                              // module อื่นที่ต้องใช้ของจากมัน
    controllers: [MenuController],            // controller ของ module นี้
    providers: [MenuRepository, MenuService], // class ที่ module นี้สร้างและใช้
    exports: [MenuService],                   // ของที่ให้ module อื่นเอาไปใช้
})
export class MenuModule {}
```

| ช่อง | ความหมาย | ลืมแล้วเกิดอะไร |
|---|---|---|
| `imports` | ต้องใช้ของจาก module อื่น | `can't resolve dependencies` |
| `controllers` | route ของ module นี้ | route ไม่มีอยู่ ได้ 404 |
| `providers` | class ที่สร้างในนี้ | `can't resolve dependencies` |
| `exports` | เปิดให้ module อื่นใช้ | module อื่น import แล้วยังใช้ไม่ได้ |

`mapper` ไม่ต้องใส่ใน `providers` เพราะเป็นฟังก์ชันธรรมดา ไม่ใช่ class ที่ DI จัดการ — `import` ตรง ๆ จาก service

### 5.3 ทำไม `MenuModule` มี `imports: []` ว่างได้

`MenuRepository` ต้องใช้ `DbContextService` ซึ่งอยู่ใน `DatabaseModule` ตามปกติต้อง `imports: [DatabaseModule]`

แต่ `DatabaseModule` ประกาศเป็น `@Global()`

```ts
@Global()
@Module({ ... })
export class DatabaseModule {}
```

`@Global()` ทำให้ของที่ `exports` ใช้ได้ทุก module โดยไม่ต้อง import ซ้ำ — เหมาะกับของที่ทุก module ต้องใช้ เช่น connection pool

`AuthModule` ก็เป็น `@Global()` เช่นกัน จึงใช้ `PermissionCacheService` ได้ทั่วระบบ

**ใช้ `@Global()` ให้น้อย** มีแค่ 2 module พอ ถ้าทุก module เป็น global จะอ่านไม่ออกว่าอะไรพึ่งอะไร

### 5.4 error DI ที่เจอบ่อย

| error | สาเหตุ | แก้ |
|---|---|---|
| `Nest can't resolve dependencies of X (?)` | class ที่จะ inject ไม่อยู่ใน `providers` หรือลืม `@Injectable()` | เติมให้ครบ |
| `argument at index [0] is undefined at runtime` | **circular import** | ย้าย token หรือ constant ไปไฟล์แยกที่ไม่ import ใครเลย (เหตุที่มี `database.constants.ts`) |
| `UnknownElementException` | `app.get('SomeService')` ใช้ string ไม่ใช่ class | ส่ง class ไปตรง ๆ |
| `Nest could not find X element` | ลืมใส่ใน `controllers` | เติม |

---

## 6. เช็คก่อนเขียน หรือให้ DB เช็ค

### 6.1 ทำไมเช็คก่อน INSERT มักผิด

```ts
// ผิด — มี race condition
const existing = await this.repo.findByName(dto.name);
if (existing) throw new ConflictException('ซ้ำ');
await this.repo.create(dto.name);
```

สองคนกดพร้อมกัน ทั้งคู่เช็คไม่เจอ ทั้งคู่ INSERT คนที่สองได้ 23505 ที่ไม่มีใคร catch กลายเป็น **500**

```
เวลา   คนที่ 1              คนที่ 2
t1     เช็ค — ไม่เจอ
t2                          เช็ค — ไม่เจอ
t3     INSERT — สำเร็จ
t4                          INSERT — 23505 → 500
```

### 6.2 ที่ถูก: ให้ unique index เช็ค แล้ว catch 23505

```ts
async createCategory(dto: CategoryDTO) {
    try {
        const row = await this.menuRepository.createCategory(dto.name);
        return { status: 'success', data: toCategoryResponse(row) };
    } catch (err: any) {
        if (err.code === '23505') {
            throw new ConflictException(`มีหมวดหมู่ชื่อ "${dto.name}" ที่ใช้งานอยู่แล้ว`);
        }
        throw err;
    }
}
```

atomic เพราะ index เช็คตอน INSERT ในคำสั่งเดียว และประหยัด round trip ไป 1 ครั้ง

### 6.3 เรื่องเดียวกันกับ UPDATE

```ts
// ผิด — query 2 รอบ
const existing = await this.repo.findCategoryById(categoryId);
if (!existing) throw new NotFoundException(...);
const row = await this.repo.setCategoryActive(categoryId, isActive);

// ถูก — UPDATE ... RETURNING คืน null เองถ้าไม่มีแถว
const row = await this.repo.setCategoryActive(categoryId, isActive);
if (!row) throw new NotFoundException('ไม่พบหมวดหมู่นี้');
```

`null` ครอบทั้งกรณี id ไม่มีจริง และกรณีเป็นของร้านอื่นที่ RLS กรองออก — ตอบ 404 เหมือนกันทั้งคู่ (ดูข้อ 7.6)

ไม่มี `try` ที่นี่เพราะ `UPDATE is_active` ไม่แตะคอลัมน์ที่มี unique index จึงไม่มีทางชน `23505` — ถ้า `UPDATE` นั้นแก้ `name` ด้วย ต้องมี `try` และวางตามข้อ 4.7

### 6.4 เมื่อไหร่ที่ควรเช็คก่อน

เมื่อต้องตรวจกฎธุรกิจที่ไม่มี constraint รองรับ

```ts
const shift = await this.shiftRepo.findOpen();
if (!shift) throw new BadRequestException('ต้องเปิดกะก่อนรับออเดอร์');
```

### 6.5 ถ้ามีหลาย constraint ให้แยกด้วย `err.constraint`

```ts
if (err.code === '23505') {
    if (err.constraint === 'uq_users_email_lower')            throw new ConflictException('อีเมลนี้ถูกใช้แล้ว');
    if (err.constraint === 'uq_users_tenant_username_lower')  throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
    throw new ConflictException('ข้อมูลซ้ำกับที่มีอยู่แล้ว');
}
```

ดูชื่อ constraint จริงด้วย

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'users'::regclass;
```

---

## 7. ออกแบบ endpoint

### 7.1 HTTP method กับ status code

| การกระทำ | method | status สำเร็จ |
|---|---|---|
| สร้าง | `POST` | **201** (ไม่ต้องใส่ `@HttpCode` NestJS ให้เอง) |
| อ่าน | `GET` | 200 |
| แก้บางส่วน | `PATCH` | 200 |
| แทนที่ทั้งก้อน | `PUT` | 200 |
| ล็อกอิน | `POST` | **200** (ไม่ได้สร้างทรัพยากร ต้องใส่ `@HttpCode(HttpStatus.OK)`) |
| ซิงค์ของที่มีอยู่แล้ว | `POST` | **200** (`ON CONFLICT DO NOTHING` แล้วไม่มีแถวใหม่) |

### 7.2 ใช้ id ไม่ใช่ name

```
PATCH /api/menu/category/:category_id/disable       ← ถูก
PATCH /api/menu/category/disable  { "name": "..." }  ← ผิด
```

เหตุผล: `name` แก้ได้ `id` แก้ไม่ได้ ถ้าใช้ชื่อเป็นตัวระบุ การเปลี่ยนชื่อจะทำไม่ได้เลย

และในระบบนี้มีเหตุผลเฉพาะอีกข้อ — unique index เป็น partial

```sql
CREATE UNIQUE INDEX uq_categories_name
  ON categories (tenant_id, lower(name)) WHERE is_active;
```

ชื่อซ้ำได้ถ้าแถวเก่า `is_active = false` ฉะนั้น `WHERE name = $1` อาจเจอหลายแถว แล้ว `UPDATE` จะแก้ทั้งหมด

Shopify, Stripe, Square ใช้ opaque id ทั้งหมด Stripe แยกชัด: `in_1A2b3C` คือ id ส่วน `invoice_number` คือเลขที่คนอ่านและแก้ได้

### 7.3 ใส่ค่าใน path ไม่ใช่ body

```ts
// ถูก — path บอกว่าทำอะไร ไม่ต้องรับค่าซ้ำ
@Patch('category/:category_id/disable')
disable(@Param('category_id', ParseUUIDPipe) id: string) {
    return this.service.setCategoryActive(id, false);
}

// ผิด — ยิง /disable แต่ส่ง is_active: true ได้ ไร้เหตุผล
@Patch('category/:category_id/disable')
disable(@Param('category_id') id: string, @Body('is_active') isActive: boolean) {
```

### 7.4 รูปแบบ response

```ts
// สำเร็จ
{ "status": "success", "data": { ... } }

// error — NestJS จัดรูปแบบให้เอง
{ "statusCode": 409, "message": "มีหมวดหมู่ชื่อ \"ของทอด\" ที่ใช้งานอยู่แล้ว", "error": "Conflict" }
```

**ห้ามใช้ `RETURNING *`** ระบุคอลัมน์ให้ชัดเสมอ ไม่งั้นวันที่เพิ่มคอลัมน์ใหม่มันจะหลุดออกไปโดยไม่มีใครตั้งใจ

### 7.5 Mapper — แปลง row เป็น response

**Mapper คืออะไร** ฟังก์ชันธรรมดาที่รับ row จาก PostgreSQL แล้วคืน object ที่จะส่งให้ client

ไม่ใช่ class ไม่ใช่ provider ไม่ต้อง `@Injectable()` ไม่ต้องใส่ใน `providers` — `import` ตรง ๆ จาก service

**ทำไมต้องมี — 3 เหตุผล**

**1. ไม่ให้ `tenant_id` หลุดไปหา client**

`RETURNING ...` คืนทุกคอลัมน์ที่ระบุ รวมถึงที่ client ไม่ควรเห็น client รู้ `tenant_id` ของตัวเองจาก token อยู่แล้ว การส่งซ้ำไม่ได้ประโยชน์ และเป็นการเผย internal id ที่ไม่จำเป็น

**2. response ไม่เปลี่ยนเองเมื่อ schema เปลี่ยน**

ถ้า service ส่ง row ดิบออกไป วันที่เพิ่มคอลัมน์ `image_url` หรือ `cost_price` เข้าตาราง คอลัมน์นั้นจะหลุดออก API ทันทีโดยไม่มีใครตั้งใจ — `cost_price` คือต้นทุนอาหาร ซึ่งไม่ควรให้พนักงานเห็น

mapper เป็นประตูเดียวที่ข้อมูลออกไป เพิ่มคอลัมน์ใน DB ไม่กระทบ API จนกว่าจะแก้ mapper

**3. ลด code ซ้ำ**

ถ้าก๊อป field เดียวกันเกิน 2 ที่ แปลว่าต้องมี mapper — `create`, `update`, `enable`, `disable`, `list`, `getById` ของหมวดหมู่คืนรูปร่างเดียวกันทั้งหมด 6 ที่

**ไฟล์**

```ts
// menu/menu.mapper.ts

export interface CategoryResponse {
    category_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export function toCategoryResponse(row: any): CategoryResponse {
    return {
        category_id: row.category_id,
        name: row.name,
        sort_order: row.sort_order,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
```

**ใช้ใน service**

```ts
import { toCategoryResponse } from './menu.mapper';

const row = await this.menuRepository.createCategory(dto.name);
return { status: 'success', data: toCategoryResponse(row) };
```

**หลายแถว — ต้อง `.map()`**

```ts
const rows = await this.menuRepository.listCategories();
return { status: 'success', data: rows.map(toCategoryResponse) };
```

⚠ **กับดักที่เกิดขึ้นจริง** ส่ง array เข้า mapper ตรง ๆ

```ts
// ผิด — rows เป็น array แต่ mapper รับ 1 row
return { status: 'success', data: toCategoryResponse(rows) };
```

**ไม่มี error ไม่มี log** `rows.category_id` เป็น `undefined` ทุก field API ตอบ **200** พร้อม

```json
{ "status": "success", "data": { "category_id": null, "name": null, "sort_order": null } }
```

frontend จะงงว่าทำไมข้อมูลว่างทั้งที่ DB มี แล้วไล่หาสาเหตุฝั่งตัวเอง — **ของที่ตอบ 200 แต่ข้อมูลผิด หายากกว่าของที่ crash**

ที่กันได้คือใส่ return type ให้ service

```ts
async listCategories(): Promise<{ status: string; data: CategoryResponse[] }> {
```

แล้ว TypeScript จะปฏิเสธ `toCategoryResponse(rows)` ตอน compile เพราะคืน `CategoryResponse` ตัวเดียว ไม่ใช่ array

**mapper ที่ซ้อนกัน** — เช่น `GET /menu/full` ที่คืนหมวดหมู่พร้อมเมนูข้างใน

```ts
export interface MenuItemResponse {
    menu_item_id: string;
    name: string;
    description: string | null;
    price: number;
    is_available: boolean;
}

export function toMenuItemResponse(row: any): MenuItemResponse {
    return {
        menu_item_id: row.menu_item_id,
        name: row.name,
        description: row.description,
        price: Number(row.price),   // ← DECIMAL มาเป็น string ต้องแปลง
        is_available: row.is_available,
    };
}

export function toCategoryWithItems(category: any, items: any[]) {
    return {
        ...toCategoryResponse(category),
        items: items.map(toMenuItemResponse),
    };
}
```

**`Number(row.price)` สำคัญ** — `pg` คืน `DECIMAL` มาเป็น string เพื่อไม่ให้เสียความแม่นยำ ถ้าไม่แปลง frontend จะได้ `"120.00"` แทน `120` แล้ว `price * qty` จะกลายเป็น string concatenation

ถ้าต้องคำนวณด้วยเงินใน TypeScript ให้แปลงเป็นสตางค์ (integer) ก่อน แต่ **ระบบนี้ไม่คำนวณเงินใน TypeScript เลย** DB ทำให้หมด (ดูข้อ 10 ข้อ 12) จึงแปลงเป็น `Number` เพื่อส่งออกอย่างเดียวพอ

**ตั้งชื่อ** `to<ชื่อ>Response` เสมอ — `toCategoryResponse`, `toOrderResponse`, `toPaymentResponse` อ่านปุ๊บรู้ว่าเป็นขาออก

**1 ตารางมี 1 mapper** ห้ามใช้ mapper ของตารางอื่นเพราะ field คล้ายกัน — `toCategoryResponse(menuItemRow)` จะได้ `category_id: undefined` แล้วตอบ 200 เงียบ ๆ แบบเดียวกับกับดักข้างบน

**ไม่ควรใส่ logic ใน mapper** ถ้าต้องคำนวณหรือตัดสินใจ นั่นเป็นงานของ service — mapper แค่เลือกและแปลงชนิด

### 7.6 ตอบ 404 เหมือนกันทั้ง "ไม่มี" และ "เป็นของร้านอื่น"

```ts
const row = await this.repo.setCategoryActive(categoryId, isActive);
if (!row) {
    // RLS กรองแถวของร้านอื่นออกไปแล้ว จึงไม่มีแถว
    // ตอบ 404 เหมือนกันทั้งกรณี id ไม่มีจริง และ id เป็นของร้านอื่น
    throw new NotFoundException('ไม่พบหมวดหมู่นี้');
}
```

ถ้าตอบ 403 สำหรับกรณีหลัง จะบอกผู้โจมตีว่า UUID นี้มีอยู่จริงในระบบ เป็นชนิดเดียวกับการรั่ว username

### 7.7 ห้ามลืม `@RequirePermissions()`

route ที่เปลี่ยนข้อมูลทุกเส้นต้องมี ไม่มีข้อยกเว้น

```ts
// ผิด — Swagger บอกว่า 403 แต่ไม่มี guard ตรวจ
@ApiResponse({ status: 403, description: 'ไม่มีสิทธิ์ในการแก้ไขหมวดหมู่เมนู' })
@Patch('category/:category_id')
async renameCategory(...) {}
```

เกิดขึ้นจริงในโมดูล menu — `disable` และ `enable` มี แต่ `renameCategory` ตกไป ผลคือพนักงานทุกคนที่ล็อกอินได้เปลี่ยนชื่อหมวดหมู่ของร้านได้

**และ Swagger บอกว่าเป็น 403 ซึ่งไม่จริง** เอกสารที่โกหกแย่กว่าไม่มีเอกสาร เพราะคนอ่านจะเชื่อว่ากันไว้แล้วจึงไม่ไปตรวจอีก

**ทดสอบที่พิสูจน์ว่าทำงาน** ยิง route นั้นด้วย token ของ employee ต้องได้ **403** — การทดสอบด้วย owner แล้วผ่าน ไม่พิสูจน์อะไรเลย

---

## 8. DTO เขียนยังไงให้ตรงกับ schema

**ดูชนิดและข้อจำกัดจาก `claude/data-dictionary-v2.md` หรือ `FULL_INSTALL.sql` แล้วใส่ให้ตรง**

| คอลัมน์ใน DB | decorator ที่ต้องใส่ |
|---|---|
| `VARCHAR(100) NOT NULL` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| `VARCHAR(150)` nullable | `@IsOptional() @IsString() @MaxLength(150)` |
| `UUID NOT NULL` | `@IsUUID()` |
| `DECIMAL(10,2) CHECK (>= 0)` | `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999.99)` |
| `BOOLEAN` | `@IsBoolean()` |
| `SMALLINT` | `@IsInt() @Min(-32768) @Max(32767)` |
| `TEXT` | `@IsString() @MaxLength(1000)` (ตั้งเพดานเองกัน payload ใหญ่) |
| `CHECK (x IN ('a','b'))` | `@IsIn(['a','b'])` |
| password | `@MinLength(8) @MaxLength(72)` — **72 เพราะ bcrypt ตัดที่ 72 bytes** |

```ts
export class CreateMenuItemDto {
    @ApiProperty({ format: 'uuid', example: 'a3f1c8e2-4b7d-4e91-8c2a-1f5e9d3b7a60' })
    @IsUUID()
    category_id!: string;

    @ApiProperty({ example: 'ข้าวผัดกุ้ง', maxLength: 150 })
    @IsString() @IsNotEmpty() @MaxLength(150)
    name!: string;

    @ApiPropertyOptional({ example: 'ใส่กุ้งแม่น้ำ 3 ตัว', maxLength: 1000 })
    @IsOptional() @IsString() @MaxLength(1000)
    description?: string;

    @ApiProperty({ example: 120.00, minimum: 0, maximum: 99999999.99 })
    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999.99)
    price!: number;
}
```

**DTO ไม่มี `tenant_id`** ไม่ว่ากรณีใด — ถ้าเห็น `tenant_id` ใน DTO แปลว่าผิด

**ห้ามใช้ `@IsInt()` กับราคา** `price` เป็น `DECIMAL(10,2)` ร้านอาหารตั้งราคาลงท้าย `.50` เป็นเรื่องปกติ `@IsInt()` จะปฏิเสธ `59.50` ด้วย 400 ซึ่งเป็น bug ที่ผู้ใช้เจอวันแรก

**ทุก field ต้องมี `@ApiProperty`** ไม่ใช่เรื่องความสวยของเอกสาร — DTO ที่ไม่มี `@ApiProperty` เลยจะทำให้หน้า Swagger **ไม่โชว์ช่องกรอก body** แล้วทดสอบไม่เจอว่า controller ลืม `@Body()`

**`example` ต้องเป็นชนิดเดียวกับ field** — `example: false` ไม่ใช่ `example: 'false'` ถ้าเป็น string ปุ่ม Try it out ใน Swagger จะส่ง string ไปแล้วได้ 400 คนทำ frontend จะเข้าใจผิดว่า field นี้รับ string

**ทำไมต้องใส่ validation ให้ตรง** ถ้า DTO ไม่ดัก PostgreSQL จะดักแทน แล้วได้ **500** พร้อมข้อความภาษาอังกฤษของ PostgreSQL แทน **400** พร้อมข้อความที่บอกว่า field ไหนผิด

`!` หลังชื่อ field บอก TypeScript ว่าค่าจะมีแน่ (`definite assignment`) เพราะ `ValidationPipe` รับประกันให้แล้ว


### 8.1 ชนิดข้อมูล — ระบบไม่แปลงให้อัตโนมัติ

`ValidationPipe` **ไม่เปิด** `enableImplicitConversion` (เหตุผลใน `security-hardening-rationale.md` ข้อ 5) ผลคือค่าที่เข้ามาเป็นชนิดไหน ก็ถูก validate ด้วยชนิดนั้นตรง ๆ

| ค่ามาจาก | ชนิดที่เข้ามา | ต้องทำอะไร |
|---|---|---|
| JSON body | ถูกต้องอยู่แล้ว (`false`, `60`, `"abc"`) | **ไม่ต้องทำอะไร** — ส่ง `"60"` มาที่ `price` จะได้ 400 ซึ่งถูกแล้ว |
| path param uuid | string | `ParseUUIDPipe` เหมือนเดิม |
| path param ตัวเลข | string | `ParseIntPipe` |
| query ตัวเลข `?page=2` | `"2"` | `@Type(() => Number)` ที่ field |
| query วันที่ `?from=2026-10-01` | string | `@IsISO8601()` แล้ว**เก็บเป็น string** ส่งให้ PostgreSQL แปลง |
| query boolean `?include_inactive=true` | `"true"` | `@ToBoolean()` (ด้านล่าง) — **ห้ามใช้ `@Type(() => Boolean)`** |

**⚠ `@Type(() => Boolean)` ใช้กับ query ไม่ได้** มันเรียก `Boolean("false")` ซึ่งได้ `true` — เป็นบั๊กเดียวกับที่ทำให้ต้องเอา `enableImplicitConversion` ออก ต้องใช้ตัวแปลงที่อ่านความหมายของข้อความ

```ts
// src/common/transformers/to-boolean.ts
import { Transform } from 'class-transformer';

export const ToBoolean = () =>
    Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;   // ค่าอื่นส่งต่อให้ @IsBoolean() ปฏิเสธเป็น 400
    });
```

```ts
// query DTO
export class SalesReportQueryDTO {
    @IsISO8601()
    from!: string;

    @IsISO8601()
    to!: string;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    page?: number;
}

export class AdminMenuQueryDTO {
    @IsOptional() @ToBoolean() @IsBoolean()
    include_inactive?: boolean;
}
```

`@Type(() => Number)` กับ `"abc"` ได้ `NaN` แล้ว `@IsInt()` ปฏิเสธเป็น 400 — ถูกต้อง

**ใช้ `@ToBoolean()` และ `@Type()` กับ query เท่านั้น ห้ามใส่ใน body DTO** body ต้องส่งชนิดจริงมา ถ้าใส่ตัวแปลงใน body จะกลับไปยอมรับ `"false"` อีก

**PIN ต้องเป็น `string` เสมอ** — `@IsString() @Matches(/^\d{4,6}$/)` ถ้าประกาศเป็น `number` PIN `0123` จะกลายเป็น `123` และ PIN ที่ขึ้นต้นด้วย 0 ใช้ไม่ได้ทั้งหมด

**บอกทีม frontend** ทุกค่าที่เป็นตัวเลขหรือ boolean ต้องส่งเป็นชนิดจริง ค่าจาก `<input>` เป็น string เสมอ ต้อง `Number(value)` ก่อนส่ง ไม่งั้นได้ 400

**ทดสอบชนิดผิดทุก endpoint ที่มี boolean หรือ number** ส่ง `"false"` แทน `false` และ `"60"` แทน `60` ต้องได้ 400 — ทดสอบแค่ค่าผิด (`-1`, `"many"`) ไม่พอ

---

## 9. Audit Log ทำงานยังไง

### 9.1 ทำไมต้องมี

ร้านอาหารมีเงินสดและมีพนักงานหลายคน เมื่อเงินขาดหรือบิลหาย คำถามคือ "ใครทำ ทำเมื่อไหร่ จากเครื่องไหน"

`audit_logs` ตอบคำถามนั้น และถูกออกแบบให้ **แก้ไม่ได้ ลบไม่ได้** เพราะหลักฐานที่แก้ได้ไม่ใช่หลักฐาน

### 9.2 โครงสร้างตาราง

```sql
CREATE TABLE audit_logs (
    log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id     UUID,                      -- nullable: ตอน register ยังไม่มี user
    action_type VARCHAR(30) NOT NULL CHECK (action_type IN (...17 ประเภท...)),
    ip_address  VARCHAR(45) NOT NULL,
    device_info TEXT NOT NULL,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, users_id)
);
```

`action_type` มี `CHECK` คุมไว้ 17 ค่า — พิมพ์ชื่อ action ผิดจะ insert ไม่ได้ ไม่ใช่ได้ค่าแปลกเข้าไปเงียบ ๆ

`metadata` เป็น JSONB เก็บรายละเอียดที่ต่างกันตามประเภท เช่น ราคาเก่า-ใหม่, role เก่า-ใหม่, เหตุผลการเปิดกะใหม่

composite FK `(tenant_id, user_id)` กันการอ้าง user ของร้านอื่น และเป็น `MATCH SIMPLE` จึงไม่เช็คเมื่อ `user_id` เป็น `NULL`

### 9.3 หัวใจ: ฟังก์ชัน `audit_write()`

```sql
CREATE FUNCTION audit_write(p_tenant uuid, p_action text, p_meta jsonb) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO audit_logs(tenant_id, user_id, action_type, ip_address, device_info, metadata)
  VALUES (p_tenant, app_user_id(), p_action,
          COALESCE(NULLIF(current_setting('app.client_ip', true), ''), 'unknown'),
          COALESCE(NULLIF(current_setting('app.device_info', true), ''), 'unknown'), p_meta)
$$;
```

**ไม่ต้องส่ง `user_id`, `ip_address`, `device_info`** ฟังก์ชันอ่านจาก context ที่ `TenantContextInterceptor` ตั้งไว้ — หลักการเดียวกับ `app_tenant_id()` ในข้อ 3

นี่คือเหตุผลที่ interceptor ตั้ง 5 ค่า ไม่ใช่แค่ `tenant_id` — ถ้า context ไม่ครบ audit จะบันทึก `unknown` แล้วตามรอยไม่ได้

```ts
// ใน TenantContextInterceptor
clientIp: request.ip ?? 'unknown',
deviceInfo: request.headers['user-agent'] ?? 'unknown',
```

**และนี่คือเหตุผลที่ `app.set('trust proxy', 1)` สำคัญ** — ถ้าไม่เปิด `request.ip` จะเป็น IP ของ nginx ทุกแถว แล้ว audit log ทั้งหมดจะไร้ประโยชน์ ข้อมูลที่บันทึกผิดไปแล้วกู้ไม่ได้

### 9.4 13 ประเภทที่ DB เขียนเอง — ไม่ต้องทำอะไร

มี trigger อยู่บน 4 ตาราง และอีก 3 ประเภทเขียนจากฟังก์ชัน

| ตาราง / ฟังก์ชัน | เมื่อ | เขียน action |
|---|---|---|
| `users` (INSERT) | สร้าง user | `user_created` |
| `users` (UPDATE) | เปลี่ยน `role_id` | `role_changed` |
| `users` (UPDATE) | `is_active` true→false | `user_deactivated` |
| `users` (UPDATE) | `is_active` false→true | `user_reactivated` |
| `users` (UPDATE) | เปลี่ยน `pin_hash` | `pin_changed` |
| `users` (UPDATE) | เปลี่ยน `password_hash` | `password_changed` |
| `users` (UPDATE) | ตั้ง `pin_locked_until` | `pin_locked` |
| `menu_items` (UPDATE) | เปลี่ยน `price` | `menu_price_updated` |
| `dining_tables` (UPDATE) | เปลี่ยนสถานะ | `table_status_changed` |
| `system_config` (UPDATE) | เปลี่ยนค่า | `config_updated` |
| `orders` (UPDATE) | ปิดบิลโดยไม่เก็บเงิน | `order_closed_unpaid` |
| `record_stock_count()` | นับสต็อก | `inventory_adjusted` |
| `reopen_shift()` | เปิดกะที่ปิดแล้วใหม่ | `shift_reopened` |

**ตัวอย่าง: แก้ราคาเมนู**

```ts
await this.db.query(
    `UPDATE menu_items SET price = $2 WHERE menu_item_id = $1
     RETURNING menu_item_id, name, price`,
    [menuItemId, price],
);
```

ได้ audit log ฟรี 1 แถว พร้อม `user_id`, IP, user-agent, ราคาเก่า-ใหม่ใน metadata — **ไม่ต้องเขียน code เพิ่มเลย**

### 9.5 4 ประเภทที่ NestJS ต้องเขียนเอง

| action | ทำไม trigger เขียนไม่ได้ |
|---|---|
| `login_success` | ไม่มีการ INSERT หรือ UPDATE ตารางใดเกิดขึ้นตอนล็อกอิน |
| `login_failed` | เหมือนกัน และยังไม่รู้ว่าใคร |
| `logout` | ไม่มีการเปลี่ยนข้อมูล |
| `tenant_updated` | ไม่มี trigger บน `tenants` |

```ts
// route ที่ล็อกอินแล้ว
await this.db.query(
    `SELECT audit_write(app_tenant_id(), $1, $2)`,
    ['tenant_updated', JSON.stringify({ field: 'restaurant_name' })],
);

// ตอน login — ยังไม่มี context จากนั้น ต้องส่ง tenant_id ตรง
await this.db.query(
    `SELECT audit_write($1, $2, $3)`,
    [tenant.tenant_id, 'login_success', JSON.stringify({ username: user.username })],
);
```

**ข้อควรรู้เรื่อง `login_failed`** ถ้า slug ไม่มีในระบบ จะยังไม่รู้ `tenant_id` และคอลัมน์เป็น `NOT NULL` จึงเขียน audit ไม่ได้เลย — เขียนได้เฉพาะกรณีที่หาร้านเจอแล้วแต่รหัสผิด

### 9.6 ทำไมแก้และลบไม่ได้

**ชั้นที่ 1 — trigger**

```
ERROR: audit_logs is append-only (retention 1 year)
```

**ชั้นที่ 2 — permission**

```sql
REVOKE UPDATE, DELETE ON payments, inventory_transactions, receipt_print_logs,
                          audit_logs, cash_movements FROM pos_app;
```

สองชั้นเพราะชั้นเดียวพลาดได้ — ถ้ามีใคร `DROP TRIGGER` ชั้น permission ยังกันอยู่ ถ้ามีใคร `GRANT` คืน trigger ยังกันอยู่

**ทางเดียวที่ลบได้** คือ `purge_old_audit_logs()` ซึ่งลบเฉพาะแถวที่เกิน 1 ปี และ `admin_purge_tenant()` สำหรับลบร้านทั้งร้าน

> **คำเตือน** `admin_purge_tenant()` ลบข้อมูลทั้งหมดของร้านแบบย้อนกลับไม่ได้ ใช้กับข้อมูลทดสอบเท่านั้น
> ร้านจริงใช้ soft delete: `UPDATE tenants SET is_active = false`
> หลังเรียกต้องปิดธงคืนทุกครั้ง: `SELECT set_config('app.allow_purge', 'off', false);`

### 9.7 เวลาเขียนโมดูลใหม่ ต้องทำอะไรกับ audit

**ถามตัวเอง: การกระทำนี้อยู่ใน 17 ประเภทไหม**

| คำตอบ | ทำ |
|---|---|
| อยู่ และมี trigger แล้ว (13 ประเภท) | **ไม่ต้องทำอะไร** แค่ให้ context ครบ ซึ่ง interceptor ทำให้แล้ว |
| อยู่ แต่ไม่มี trigger (4 ประเภท) | เรียก `audit_write()` จาก service |
| ไม่อยู่ในรายการ | **ไม่ต้องบันทึก** — 17 ประเภทนี้ผ่านการตัดสินใจแล้วว่าพอ การเพิ่มต้องแก้ `CHECK` constraint ซึ่งเป็น migration |

**ห้ามเขียน audit log ลงตารางอื่นหรือลง log file แยก** ถ้าเขียนสองที่ สองที่จะไม่ตรงกัน แล้วไม่มีใครรู้ว่าอันไหนจริง

### 9.8 อ่าน audit log

```sql
SELECT a.created_at, u.username, a.ip_address,
       a.metadata->>'menu_item_name' AS เมนู,
       a.metadata->>'old_price' AS ราคาเก่า,
       a.metadata->>'new_price' AS ราคาใหม่
FROM audit_logs a
LEFT JOIN users u ON u.users_id = a.user_id
WHERE a.action_type = 'menu_price_updated'
ORDER BY a.created_at DESC;
```

`LEFT JOIN` เพราะ `user_id` เป็น nullable

มี index 3 ตัวรองรับ: `(tenant_id, created_at)`, `(tenant_id, user_id)`, `(tenant_id, action_type)`

endpoint `GET /api/audit-logs` ต้องใช้ permission `audit_log:view` ซึ่งมีแค่ Owner และ Manager

---

## 10. ห้ามทำ 16 ข้อ

1. **ห้าม inject `PG_POOL` เข้า repository** ใช้ `DbContextService` เท่านั้น
2. **ห้ามรับ `tenant_id` จาก request body** และ DTO ห้ามมี field นี้
3. **ห้ามอ่าน `req.user.tenantID` ใน route ที่ล็อกอินแล้ว** ใช้ `app_tenant_id()` ใน SQL
4. **ห้ามเขียน `app_tenant_id` โดยไม่มี `()`** จะได้ `42703` เพราะถูกอ่านเป็นชื่อคอลัมน์
5. **ห้ามใช้ `referenceQuery` กับตารางที่มี `tenant_id`** จะได้ `[]` เงียบ ๆ
6. **ห้ามใส่ `;` กลาง SQL** `pg` ส่งได้คำสั่งเดียว (ท้ายสุดไม่เป็นปัญหา)
7. **ห้ามต่อ string เข้า SQL** ใช้ `$1 $2` เสมอ
8. **ห้ามใช้ `$n` ตัวเดียวกันกับชนิดคนละแบบ** จะได้ `42P08`
9. **ห้ามใช้ `RETURNING *`** ระบุคอลัมน์
10. **ห้ามส่ง row ดิบออก API** ผ่าน mapper เสมอ
11. **ห้ามส่ง array เข้า mapper ตรง ๆ** ใช้ `.map()` ไม่งั้นได้ 200 พร้อมข้อมูลว่างแบบเงียบ ๆ
12. **ห้าม catch แล้วไม่ `throw err` ปิดท้าย**
13. **ห้าม throw HTTP exception ใน repository**
14. **ห้ามคำนวณ VAT หรือ service charge ใน NestJS** DB ทำแล้วด้วย trigger คำนวณซ้ำจะได้ตัวเลขไม่ตรงแล้ว trigger ปฏิเสธ
15. **ห้ามเขียน audit log เองสำหรับ 13 ประเภทที่ trigger ทำให้แล้ว** จะได้ 2 แถวต่อการกระทำเดียว
16. **ห้ามเปิด `enableImplicitConversion` และห้ามใช้ `@Type(() => Boolean)` กับ query** มันแปลง `"false"` เป็น `true` ใช้ `@ToBoolean()` แทน (ข้อ 8.1)

---

## 11. Checklist ก่อน commit

- [ ] repository ทุกตัว inject `DbContextService` ไม่มีใคร inject `PG_POOL`
- [ ] ไม่มี `req.user.tenantID` ใน route ที่ล็อกอินแล้ว
- [ ] `INSERT` ใช้ `app_tenant_id()` **มีวงเล็บ**
- [ ] ไม่มี `WHERE tenant_id` ใน `SELECT`/`UPDATE`/`DELETE`
- [ ] **นับคอลัมน์ใน `(...)` เท่ากับค่าใน `VALUES(...)` และ `$n` สูงสุดเท่ากับความยาว params** (ข้อ 4.8)
- [ ] DTO ไม่มี field `tenant_id`
- [ ] `referenceQuery` ใช้แค่กับ 4 ตารางที่ไม่มี RLS หรือฟังก์ชัน `SECURITY DEFINER`
- [ ] ไม่มี `;` คั่นกลาง SQL และไม่มี `RETURNING *`
- [ ] response ผ่าน mapper ทุกเส้น ไม่มี row ดิบ
- [ ] **หลายแถวใช้ `rows.map(mapper)` ไม่ใช่ `mapper(rows)`**
- [ ] **mapper ที่ใช้ตรงกับตารางที่ query** ไม่เอา mapper ของตารางอื่นมาใช้
- [ ] ทุก parameter ของ controller มี decorator
- [ ] `:id` ใน path ผ่าน `ParseUUIDPipe`
- [ ] DTO มี `@MaxLength` ตรงกับ `VARCHAR(n)` ใน schema
- [ ] ทุก field ใน DTO มี `@ApiProperty` หรือ `@ApiPropertyOptional`
- [ ] ราคาใช้ `@IsNumber({ maxDecimalPlaces: 2 })` ไม่ใช่ `@IsInt()`
- [ ] query param ตัวเลขมี `@Type(() => Number)` · boolean ใช้ `@ToBoolean()` (ข้อ 8.1)
- [ ] `example` ใน `@ApiProperty` เป็นชนิดเดียวกับ field
- [ ] `POST` ที่สร้างของ ไม่มี `@HttpCode` (ให้เป็น 201)
- [ ] ทุก try/catch มี `throw err` ปิดท้าย
- [ ] `try` ครอบแค่ `await` ที่ยิง DB ไม่ครอบ `throw` ของเราเอง (ข้อ 4.7)
- [ ] **route ที่เปลี่ยนข้อมูลทุกเส้นมี `@RequirePermissions()`** ด้วย key ที่มีใน `permissions` จริง
- [ ] route ใหม่ที่ไม่ใช่สาธารณะ **ไม่ได้** แปะ `@Public()`
- [ ] Swagger ครบตาม checklist ใน `claude/swagger-guide.md` §10
- [ ] ลบ code ที่คอมเมนต์ไว้ออก (git เก็บให้แล้ว)
- [ ] ลบ import ที่ไม่ใช้
- [ ] ทดสอบด้วย **2 ร้าน** ไม่ใช่ร้านเดียว
- [ ] ทดสอบ route ที่มี permission ด้วย token ของ **employee** ต้องได้ 403
- [ ] ทดสอบส่งชนิดผิด (`"false"`, `"60"`) ต้องได้ 400
- [ ] `.env` เป็น `DB_USER=pos_app`

---

## 12. ตัวอย่างสมบูรณ์

อ่าน `src/modules/menu/` ทั้งโฟลเดอร์ เป็นโมดูลอ้างอิงของโปรเจกต์นี้

```
src/modules/menu/
├── menu.controller.ts    ← รับ HTTP, permission, ParseUUIDPipe, Swagger
├── menu.service.ts       ← business logic, แปลง error เป็น HTTP, เรียก mapper
├── menu.repository.ts    ← SQL เท่านั้น, app_tenant_id()
├── menu.mapper.ts        ← แปลง row เป็น response
├── menu.module.ts        ← ประกาศ provider
└── dto/
    ├── category.dto.ts
    └── menu-item.dto.ts
```

โมดูลใหม่ก๊อปโครงนี้แล้วแก้ชื่อ

ถ้าโค้ดใน `menu/` ขัดกับเอกสารนี้ แปลว่าอย่างใดอย่างหนึ่งผิด — ถามก่อนก๊อป
