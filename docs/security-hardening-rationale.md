# PWA-POS Backend — ของที่เพิ่มเข้าไป และเพิ่มทำไม

อัปเดต: 2026-10-09 (ข้อ 5 — เอา `enableImplicitConversion` ออก)

เอกสารนี้ตอบคำถามเดียว: **ของแต่ละอย่างที่อยู่ใน `main.ts` และ `app.module.ts` ใส่ไว้ทำไม**

เขียนไว้เพราะโค้ดบอกได้แค่ว่า *ทำอะไร* ไม่ได้บอกว่า *ทำไม* คนที่มาอ่านทีหลังจะเห็น `app.use(helmet())` แล้วไม่รู้ว่าลบได้ไหม เอกสารนี้ตอบให้

แต่ละข้อมี 5 หัวข้อ: คืออะไร / ถ้าไม่มีจะเกิดอะไร / มีแล้วช่วยอะไร / ทดสอบยังไง / สถานะ

เรื่องการแยกข้อมูลระหว่างร้าน (RLS, DbContextService, Interceptor) อยู่ใน `claude/backend-dev-guide.md` ไม่ซ้ำที่นี่

---

## สารบัญ

| ข้อ | เรื่อง | ความสำคัญ |
|---|---|---|
| 1 | Rate limiting (`@nestjs/throttler`) | สูง |
| 2 | `@MaxLength(72)` บน password | สูง |
| 3 | ข้อความ error ของ login ต้องเหมือนกัน | สูง |
| 4 | `validationSchema` ใน ConfigModule | สูง |
| 5 | `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) — **ไม่เปิด** `enableImplicitConversion` | สูง |
| 6 | Guard เป็น global + `@Public()` | สูง |
| 7 | ต่อ DB ด้วย `pos_app` ไม่ใช่ `postgres` | สูง |
| 8 | `helmet()` | กลาง |
| 9 | `app.set('trust proxy', 1)` | กลาง |
| 10 | `setGlobalPrefix('api')` | กลาง |
| 11 | `enableCors()` | กลาง |
| 12 | `enableShutdownHooks()` | กลาง |
| 13 | `compression()` | ต่ำ |
| 14 | จำกัดขนาด body | ต่ำ |

---

## 1. Rate limiting — `@nestjs/throttler`

### คืออะไร

จำกัดจำนวน request ต่อ IP ต่อช่วงเวลา ตั้งค่าไว้ 2 ระดับ

```ts
// app.module.ts — ค่าทั่วไปทุก endpoint
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),   // 100 ครั้ง/นาที

providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },    // บรรทัดนี้คือตัวเปิดใช้งาน
    ...
]
```

```ts
// auth.controller.ts — login เข้มกว่าปกติ
@Throttle({ default: { ttl: 60000, limit: 5 } })         // 5 ครั้ง/นาที
```

```ts
// register.controller.ts — สร้างร้านใหม่ ต้องเข้มที่สุด
@Throttle({ default: { ttl: 3600000, limit: 3 } })       // 3 ครั้ง/ชั่วโมง
```

### ถ้าไม่มีจะเกิดอะไร

**บน login** — ยิงเดารหัสผ่านได้ไม่จำกัดรอบ

คำนวณจริง: bcrypt cost 10 ใช้เวลาประมาณ 100 ms ต่อครั้ง เครื่องเดียวยิงได้ราว 10 ครั้ง/วินาที รหัส 8 ตัวเลขล้วนมี 10 ล้านชุด ใช้เวลาประมาณ 12 วัน ถ้ายิงขนาน 10 เส้นเหลือวันกว่า พนักงานร้านอาหารส่วนใหญ่ตั้งรหัสง่ายกว่านั้น ในทางปฏิบัติใช้เวลาเป็นชั่วโมง

**บน register** — คนเดียวยิงสร้างร้านเปล่าได้เป็นหมื่นร้าน แต่ละร้านมี 9 แถวใน `system_config` ตามมาด้วย ฐานข้อมูลบวมและหาร้านจริงไม่เจอ

### มีแล้วช่วยอะไร

เดารหัสได้ 5 ครั้ง/นาที = 7,200 ครั้ง/วัน การเดารหัส 8 ตัวเลขจาก 12 วันกลายเป็น 3.8 ปี เปลี่ยนจาก "ทำได้" เป็น "ไม่คุ้ม"

### ⚠ กับดักที่เจอมาแล้วในโปรเจกต์นี้

`ThrottlerModule.forRoot()` **ไม่ได้เปิด guard ให้** มันแค่ตั้งค่ากับเตรียมที่เก็บตัวนับ

ถ้าไม่ลงทะเบียน `{ provide: APP_GUARD, useClass: ThrottlerGuard }` ด้วย `@Throttle()` จะเป็น decorator เปล่า ๆ ที่ไม่มีใครอ่าน และ **ไม่มี error ไม่มีคำเตือนอะไรเลย** ดูเหมือนเปิดอยู่แต่ปิดสนิท

เรื่องนี้เกิดขึ้นจริงในโปรเจกต์นี้ และเป็นแบบเดียวกับที่เคยเกิดกับ RLS ตอนที่ยังต่อ DB ด้วย `postgres` (ข้อ 7)

**บทเรียน: ทุกกลไกความปลอดภัยที่เพิ่มเข้าไป ต้องมีการทดสอบที่ทำให้มันปฏิเสธให้เห็น ไม่ใช่แค่ทดสอบว่ากรณีปกติผ่าน**

### ⚠ ตอนรัน Postman collection แล้วเจอ 429

login 5 ครั้ง/นาที collection หนึ่ง login 3 ครั้ง (owner A, employee A, owner B) ถ้ารัน 2 collection ติดกันภายใน 1 นาที จะได้ 429 ที่ login ตัวท้าย แล้ว request ที่ใช้ token ตัวนั้นทั้งหมดจะได้ 401 ตาม

**ห้ามเพิ่ม limit เพื่อให้ test ผ่าน** — รอ 1 นาที หรือตั้ง Delay ใน Runner ถ้าจำเป็นจริงให้อ่าน limit จาก env แล้วตั้งค่าสูงเฉพาะ `.env` ของเครื่อง dev

### ลำดับ guard

ปัจจุบันมี 3 guard: `ThrottlerGuard`, `JwtAuthGuard`, `PermissionsGuard`

`ThrottlerGuard` ต้องรันก่อน เพราะการนับ request ควรเกิดก่อนการตรวจ token ไม่งั้นคนยิงรหัสผิดรัว ๆ จะโดนนับหลัง bcrypt ทำงานไปแล้วหลายสิบรอบ ซึ่งเสีย CPU ฟรี

NestJS รัน `APP_GUARD` ตามลำดับที่ module ถูก resolve ซึ่งไม่ได้รับประกันไว้เป็นสัญญา **ถ้าอยากแน่นอน ให้ย้าย `ThrottlerGuard` ไปอยู่ใน `providers` array เดียวกับอีกสองตัวใน `auth.module.ts` และวางเป็นตัวแรก**

### ทดสอบยังไง

ยิง `POST /api/auth/login` ด้วยรหัสผิด 6 ครั้งติดใน 1 นาที

- ครั้งที่ 1-5: **401**
- ครั้งที่ 6: **429 Too Many Requests**

ถ้าครั้งที่ 6 ยังได้ 401 แปลว่า guard ไม่ทำงาน

### สถานะ

ติดตั้งแล้ว เห็น 429 จริงตอนรัน Postman 2 collection ติดกัน (2026-10-09)

### ของจริงในอุตสาหกรรม

GitHub จำกัด 5,000 request/ชั่วโมงต่อ token Stripe จำกัด 100 request/วินาที Cloudflare มี rate limiting เป็นบริการแยก ทุกเจ้ามี ไม่มีใครปล่อย login ไม่จำกัด

---

## 2. `@MaxLength(72)` บน password

### คืออะไร

จำกัดความยาวรหัสผ่านที่ 72 ตัวอักษร ใน `registerOwner.dto.ts`

```ts
@IsString()
@MinLength(8)
@MaxLength(72)
password: string;
```

### ถ้าไม่มีจะเกิดอะไร

bcrypt มีข้อจำกัดทางเทคนิค: **อ่านแค่ 72 bytes แรก ที่เหลือทิ้งเงียบ ๆ ไม่มี error**

ผลคือรหัสสองตัวนี้

```
AAAAAAAA...(72 ตัว)...AAAA + "รหัสจริงของผม"
AAAAAAAA...(72 ตัว)...AAAA + "อะไรก็ได้ต่อท้าย"
```

**ล็อกอินแทนกันได้** เพราะ bcrypt เห็นทั้งสองเป็นค่าเดียวกัน

ไม่ใช่เรื่องทฤษฎี — ถ้าผู้ใช้ใช้ password manager ที่สร้างรหัสยาว 100 ตัว แล้วจำได้แค่ 72 ตัวแรก เขาล็อกอินผ่านโดยที่ 28 ตัวหลังพิมพ์อะไรก็ได้

อีกเรื่อง: รหัสยาว 10,000 ตัวทำให้ bcrypt ทำงานนาน เป็นช่องให้โจมตีแบบ DoS ด้วย request เบา ๆ

### มีแล้วช่วยอะไร

ปฏิเสธที่ชั้น DTO ด้วย 400 ก่อนถึง bcrypt ผู้ใช้รู้ทันทีว่ารหัสยาวเกิน ไม่ใช่ถูกตัดเงียบ ๆ แล้วสงสัยทีหลังว่าทำไมล็อกอินด้วยรหัสผิดได้

72 ไม่ใช่เลขที่คิดเอง เป็นขนาด block ของอัลกอริทึม Blowfish ที่ bcrypt ใช้

### ทดสอบยังไง

สมัครด้วย password ยาว 100 ตัว ต้องได้ **400** ถ้าได้ 201 แปลว่ายังไม่ใส่

### สถานะ

ยังไม่ยืนยัน — ตรวจใน `registerOwner.dto.ts` และ `createUser.dto.ts`

### ของจริงในอุตสาหกรรม

Django ดักที่ 72 bytes Spring Security ขึ้นคำเตือนถ้าเกิน Auth0 กับ Okta จำกัดที่ 72 หรือเปลี่ยนไปใช้ Argon2 ที่ไม่มีข้อจำกัดนี้ ถ้าวันหลังอยากเปลี่ยนไป Argon2 ก็ทำได้ แต่ต้องให้ผู้ใช้ตั้งรหัสใหม่ทุกคน ไม่คุ้มสำหรับโปรเจกต์นี้

---

## 3. ข้อความ error ของ login ต้องเหมือนกันทุกกรณี

### คืออะไร

ไม่ว่าจะล็อกอินไม่ผ่านด้วยเหตุใด ตอบข้อความเดียวกัน

```ts
const INVALID = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
```

ใช้กับทั้ง 4 กรณี: slug ไม่มีในระบบ, ร้านถูกระงับ, username ไม่มี, รหัสผิด

ข้อยกเว้นที่ยอมให้ต่างได้: `บัญชีนี้ถูกปิดใช้งาน` — เพราะพนักงานที่ถูกปิดบัญชีควรรู้ว่าต้องไปถามเจ้าของร้าน ไม่ใช่นั่งเดารหัสใหม่ แลกความสะดวกกับการรั่วข้อมูลเล็กน้อยอย่างมีเหตุผล

### ถ้าไม่มีจะเกิดอะไร

ข้อความที่ต่างกันบอกข้อมูลให้ผู้โจมตีฟรี

| ข้อความ | ผู้โจมตีรู้ว่า |
|---|---|
| `Tenant not found` | slug นี้ไม่มีร้าน ลองอันอื่น |
| `Invalid credentials` | slug ถูก แต่ username นี้ไม่มี |
| `Invalid password` | **slug ถูก username ถูก เหลือเดารหัสเดียว** |

เรียกว่า username enumeration ผู้โจมตีกวาด username ก่อนเพื่อหาตัวที่มีจริง แล้วค่อยทุ่มเดารหัสเฉพาะตัวนั้น ลดงานจากการเดา 2 ตัวแปรเหลือ 1 ตัวแปร

ร้านอาหารมีพนักงาน 5-10 คน username มักเป็นชื่อเล่น เดาไม่ยาก แค่ยืนยันว่าตัวไหนมีจริงก็ได้เปรียบมาก

### มีแล้วช่วยอะไร

ผู้โจมตีไม่รู้ว่าผิดที่ slug, username หรือรหัส ต้องเดาทั้งสามพร้อมกัน พื้นที่ค้นหาคูณกันไม่ใช่บวกกัน

### ทดสอบยังไง

ยิง login 3 แบบ ต้องได้ข้อความเดียวกันเป๊ะ

1. slug ที่ไม่มีในระบบ
2. slug ถูก username ไม่มี
3. slug ถูก username ถูก รหัสผิด

ถ้าข้อความต่างกัน แปลว่ายังรั่ว

### สถานะ

ยังไม่แก้ — `auth.service.ts` ยังมี `Tenant not found`, `Invalid credentials`, `Invalid password` แยกกัน

### ของจริงในอุตสาหกรรม

GitHub, Stripe, AWS Console, Google ทั้งหมดตอบข้อความเดียวกันไม่ว่าอีเมลจะมีจริงหรือไม่ OWASP ระบุเรื่องนี้ไว้ในหัวข้อ Authentication Cheat Sheet

---

## 4. `validationSchema` ใน ConfigModule

### คืออะไร

ตรวจ environment variable ตอนบูต ถ้าไม่ครบหรือผิดรูป แอปไม่ขึ้น

```ts
ConfigModule.forRoot({
    isGlobal: true,
    cache: true,
    validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        DB_SSL: Joi.boolean().default(false),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('1d'),
        CORS_ORIGIN: Joi.string().required(),
    }),
}),
```

### ถ้าไม่มีจะเกิดอะไร

env ที่หายไปจะแสดงอาการตอน runtime แทนตอนบูต และอาการไม่บอกสาเหตุ

| env ที่หาย | อาการ |
|---|---|
| `JWT_SECRET` | แอปบูตผ่าน แล้วพังตอน login ครั้งแรกด้วย error จากข้างใน `jsonwebtoken` ที่ไม่ได้บอกว่า secret หาย |
| `CORS_ORIGIN` | บูตผ่าน แล้ว frontend ยิง API ไม่ได้ ขึ้น CORS error ใน browser console ซึ่งดูเหมือนปัญหาฝั่ง frontend |
| `DB_PASSWORD` | `database.module.ts` มี `requiredEnv` เช็คไว้ จึงพังตอนบูต — ข้อนี้ดีแล้วแต่เช็คแค่ 4 ตัว |

**`JWT_SECRET` สั้นเป็นเรื่องร้ายแรงกว่าหาย** — secret 8 ตัวอักษรเดาด้วย brute force ได้ในเวลาไม่นาน ใครเดาได้ก็ปลอม token เป็น owner ของร้านไหนก็ได้ ข้าม `JwtAuthGuard` และ `PermissionsGuard` ทั้งคู่ และ RLS ก็จะเชื่อ `tenantID` ปลอมนั้นด้วย เพราะ interceptor อ่านค่าจาก token

`min(32)` คือเหตุผลที่ต้องมีข้อนี้ ไม่ใช่แค่ `required()`

### มีแล้วช่วยอะไร

env ผิดแอปไม่บูต พร้อมบอกว่าตัวไหนขาดหรือผิด

```
Config validation error: "JWT_SECRET" length must be at least 32 characters long
```

ค้นพบปัญหาตอน deploy แทนตอนมีคนใช้ และ `config.get<number>('PORT')` คืน number จริง เพราะ Joi แปลงให้แล้ว ไม่ใช่ string ดิบจาก `process.env`

### ทดสอบยังไง

ลบ `JWT_SECRET` จาก `.env` แล้ว `npm run start:dev` ต้องไม่บูตและขึ้นข้อความบอกว่าตัวไหนขาด

### สถานะ

ยังไม่ทำ

### ของจริงในอุตสาหกรรม

เรียกว่าหลักการ fail fast — The Twelve-Factor App ข้อ 3 (Config) ระบุว่า config ต้องมาจาก environment และต้อง validate NestJS แนะนำ Joi ไว้ในเอกสารทางการ

---

## 5. `ValidationPipe` — whitelist, forbidNonWhitelisted, transform

### คืออะไร

```ts
app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // ไม่เปิด enableImplicitConversion — ดูหัวข้อ "⚠ ทำไมเอา enableImplicitConversion ออก"
}));
```

| option | ทำอะไร |
|---|---|
| `whitelist` | ตัด field ที่ไม่มีใน DTO ออกจาก body |
| `forbidNonWhitelisted` | ส่ง field แปลกปลอมมา ตอบ 400 แทนที่จะตัดทิ้งเงียบ ๆ |
| `transform` | แปลง plain object เป็น instance ของ DTO class เพื่อให้ decorator ทำงาน **ไม่ได้แปลงชนิดของ field** |

### ถ้าไม่มีจะเกิดอะไร

**ไม่มี `whitelist`** — field ที่ไม่ได้ประกาศใน DTO ผ่านเข้าไปถึง service ถ้าโค้ดไหนทำ `{ ...dto }` ลงฐานข้อมูล จะเขียนคอลัมน์ที่ไม่ควรเขียนได้ เรียกว่า mass assignment vulnerability

ตัวอย่างจริงในระบบนี้: ถ้าส่ง `{ "username": "x", "role_id": "<uuid ของ owner>" }` มาที่ endpoint สร้างพนักงาน แล้วโค้ดเผลอใช้ `dto.role_id` ตรง ๆ จะได้ owner ฟรี

**ไม่มี `forbidNonWhitelisted`** — field แปลกถูกตัดเงียบ ๆ ผู้เรียกไม่รู้ว่าข้อมูลที่ส่งไปหายไปไหน จะได้ bug แบบ "ส่งไปแล้วไม่บันทึก" ที่หาสาเหตุนาน

**ไม่มี `transform`** — `@IsString()` และ `@MaxLength()` ไม่ทำงาน เพราะ `class-validator` ต้องการ class instance ไม่ใช่ plain object validation ทั้งหมดจะผ่านทุกอย่างแบบเงียบ ๆ

### มีแล้วช่วยอะไร

DTO กลายเป็นสัญญาที่บังคับใช้จริง field ที่ไม่ประกาศคือ field ที่ไม่มี และผู้เรียกได้ 400 ที่บอกชื่อ field ผิดมาด้วย

`forbidNonWhitelisted` เคยช่วยจับ bug ในโปรเจกต์นี้แล้ว — ตอนที่ DTO ยังไม่มี `display_name` แล้วส่งมาจาก Postman ได้ `property display_name should not exist` ซึ่งชี้ปัญหาตรงจุดกว่า error 23502 จาก PostgreSQL

### ⚠ ทำไมเอา `enableImplicitConversion` ออก (2026-10-09)

**เดิมใส่ไว้เพราะ** ค่าที่มาจาก URL เป็น string เสมอ `?page=2` เข้ามาเป็น `"2"` option นี้แปลงให้เป็น `2` ตาม type ของ DTO อัตโนมัติ ไม่ต้องใส่ `@Type(() => Number)` ทีละ field

**ปัญหาที่เจอ** — Postman ส่ง `{ "is_available": "false" }` (string) ไปที่ `PATCH /menu/items/:id/availability` แล้วได้ **200** และเมนูถูกตั้งเป็น**ขายได้** ทั้งที่ตั้งใจให้หมด

สาเหตุมี 3 ชั้น

1. **แปลงทุก input ไม่ใช่แค่ query** — ตั้งไว้ระดับ global จึงทำงานกับ `@Body()` ด้วย ทั้งที่ JSON body มีชนิดถูกต้องอยู่แล้ว
2. **แปลงด้วย constructor ของ JavaScript ตรง ๆ** — `Boolean("false")` ได้ `true` เพราะ string ที่ไม่ว่างทุกตัวเป็น truthy (`"false"`, `"0"`, `"no"` ได้ `true` หมด) และ `Number("60")` ได้ `60` ทำให้ `price: "60"` ผ่านแบบเงียบ ๆ
3. **แปลงก่อน validate** — `@IsBoolean()` ไม่เคยเห็น `"false"` ตัวจริง เห็นแค่ `true` ที่ถูกแปลงแล้ว validation จึงไม่มีโอกาสกัน

```
"false"  →  Boolean("false") = true  →  @IsBoolean() ผ่าน  →  200, เมนูกลับมาขาย
```

**ผลกระทบถ้าไม่แก้** — ทุก field `boolean` ในระบบกลับด้านได้เมื่อ client ส่ง string มา (`is_available`, `is_required` และของโมดูลอื่นในอนาคต) และทุก field `number` รับ string โดยไม่เตือน

**ทำไมไม่มีใครเห็นมาก่อน** — frontend และ Postman ส่ง `false` แบบ boolean ปกติ และ test ของข้อนี้ทดสอบแค่ field แปลก (`is_admin`) ไม่เคยทดสอบ **ชนิดผิด**

**ทางที่เลือก**

| ทาง | แก้ body | กัน field ในอนาคต | ถ้าลืม |
|---|---|---|---|
| คงไว้ แล้วใส่ `@Transform` ทีละ field | เฉพาะที่ใส่ | ต้องจำใส่ทุกตัว | **พังเงียบ** — 200 แต่ค่ากลับด้าน |
| **เอาออก** (เลือก) | ทั้งระบบ | ปลอดภัยเอง | **พังเสียงดัง** — 400 เห็นตั้งแต่ทดสอบ |

ไม่ลบ DTO แล้วใช้ `@Body('is_available')` แทน เพราะจะเสีย validation ทั้งหมด (`{}` และ `null` กลายเป็น 500, field แปลกผ่านเงียบ)

**หลังเอาออก — การแปลงชนิดต้องระบุเองที่ field** ดู `backend-coding-standard.md` ข้อ 8.1

### ทดสอบยังไง

1. เพิ่ม `"is_admin": true` เข้า body ของ register ต้องได้ **400** `property is_admin should not exist`
2. ส่ง `{ "is_available": "false" }` ไปที่ `PATCH /api/menu/items/:id/availability` ต้องได้ **400** `is_available must be a boolean value` ถ้าได้ 200 แปลว่า `enableImplicitConversion` กลับมาแล้ว
3. ส่ง `{ "price": "60" }` ไปที่ `PATCH /api/menu/items/:id` ต้องได้ **400**

### สถานะ

เสร็จ ทดสอบแล้วทั้ง 3 ข้อ (ข้อ 2 ยืนยัน 2026-10-09)

### ของจริงในอุตสาหกรรม

`Boolean("false") === true` เป็นพฤติกรรมตามมาตรฐาน ECMAScript ไม่ใช่ bug ของ library ระบบที่ต้องแปลง query string เป็น boolean จึงเขียนตัวแปลงที่อ่านความหมายเอง (`"true"` / `"false"`) แทนการใช้ `Boolean()`

---

## 6. Guard เป็น global + `@Public()`

### คืออะไร

ลงทะเบียน `JwtAuthGuard` และ `PermissionsGuard` เป็น `APP_GUARD` ใน `auth.module.ts` ทุก controller จึงถูกคลุมอัตโนมัติ route ที่ต้องเปิดสาธารณะจึงต้องแปะ `@Public()` เอง

```ts
providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
],
```

### ถ้าไม่มีจะเกิดอะไร

ทางเลือกอีกทางคือแปะ `@UseGuards(JwtAuthGuard)` ทุก controller เอง

ปัญหา: **ค่าเริ่มต้นคือไม่ปลอดภัย** ลืมแปะที่ไหนก็เปิดสาธารณะที่นั่น และการลืมไม่มีอาการ ไม่มี error มันทำงานได้ปกติ แค่ใครก็เรียกได้ ระบบนี้จะมี endpoint ประมาณ 40-50 ตัว ลืมแน่

### มีแล้วช่วยอะไร

**ค่าเริ่มต้นคือปลอดภัย** ลืมแปะ `@Public()` ที่ไหนก็แค่ route นั้นเรียกไม่ได้ — ซึ่งเจอทันทีตอนทดสอบ แลกจาก "ลืมแล้วเงียบและอันตราย" เป็น "ลืมแล้วพังและเห็นทันที"

ตอนนี้มี `@Public()` แค่ 2 ที่: `POST /api/auth/login` และ `POST /api/register` ซึ่งนับได้และ review ได้ง่าย

### ทดสอบยังไง

ยิง endpoint ที่ไม่ใช่ public โดยไม่ส่ง token ต้องได้ **401** และใช้ token ของ employee ยิง endpoint ที่ต้องสิทธิ์ owner ต้องได้ **403**

### สถานะ

เสร็จ ทดสอบแล้ว (401 และ 403 ยืนยันแล้ว)

### ของจริงในอุตสาหกรรม

เรียกว่า secure by default หรือ deny by default เป็นหลักการเดียวกับที่ firewall ปิดทุก port แล้วเปิดเฉพาะที่ต้องใช้ ไม่ใช่เปิดหมดแล้วปิดที่ไม่ต้องใช้

---

## 7. ต่อ DB ด้วย `pos_app` ไม่ใช่ `postgres`

### คืออะไร

`.env` ต้องเป็น `DB_USER=pos_app`

`pos_app` ถูกสร้างแบบนี้

```sql
CREATE ROLE pos_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
```

แล้วถูกตัดสิทธิ์เฉพาะจุด: ลบ `tenants`/`users`/`orders`/`order_items` ไม่ได้ (soft delete เท่านั้น) แก้หรือลบตาราง append-only ไม่ได้ (`payments`, `audit_logs`, `inventory_transactions`, `receipt_print_logs`, `cash_movements`) แตะ reference table ไม่ได้เลย

### ถ้าไม่มีจะเกิดอะไร

ถ้าต่อด้วย `postgres` — **RLS ไม่ทำงานเลยแม้แต่น้อย**

PostgreSQL ยกเว้น RLS ให้ 2 กรณี: role ที่มี `BYPASSRLS` หรือเป็น superuser และ **เจ้าของตาราง** เมื่อ RLS เปิดแบบ `ENABLE` (ไม่ใช่ `FORCE`) `postgres` เข้าทั้งสองข้อ

ผลคือทดสอบแล้วผ่านหมด ทั้งที่การแยกร้านไม่ได้ทำงานจริง — ร้าน A มองเห็นข้อมูลร้าน B ได้ตลอด

เรื่องนี้เกิดขึ้นจริงในโปรเจกต์นี้ ทดสอบ register กับ login ผ่านด้วย `postgres` ก่อน แล้วค่อยพบว่าต้องสลับเป็น `pos_app` จึงจะพิสูจน์อะไรได้

และ `postgres` ลบ `payments` กับ `audit_logs` ได้ — bug ในโค้ดที่เผลอ `DELETE` จะทำลายหลักฐานทางบัญชีได้จริงบน production

### มีแล้วช่วยอะไร

RLS ทำงานจริง และถ้าโค้ดมี bug ที่สั่งลบของที่ห้ามลบ PostgreSQL ปฏิเสธที่ชั้น permission ไม่ต้องหวังว่าโค้ดจะไม่มี bug

### ทดสอบยังไง

ยิง endpoint ที่ล็อกอินแล้ว แล้วให้ตอบค่านี้กลับมา (endpoint ชั่วคราว ลบก่อน deploy)

```sql
SELECT current_user AS db_role,
       current_setting('app.current_tenant_id', true) AS tenant_id
```

ต้องได้ `db_role = "pos_app"` ถ้าได้ `postgres` คือ `.env` ยังผิด

การทดสอบที่สำคัญกว่า: สมัคร 2 ร้าน ล็อกอินร้าน A แล้วอ่านข้อมูล ต้องไม่เห็นของร้าน B — **ร้านเดียวพิสูจน์การแยกข้อมูลไม่ได้**

### สถานะ

เสร็จ ทดสอบแล้วด้วย 2 ร้าน

---

## 8. `helmet()`

### คืออะไร

ตั้ง HTTP security header ให้อัตโนมัติ

```ts
app.use(helmet());
```

header ที่ได้: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-DNS-Prefetch-Control` และอื่น ๆ

### ถ้าไม่มีจะเกิดอะไร

| header ที่ขาด | ช่องที่เปิด |
|---|---|
| `X-Frame-Options` | เว็บอื่นเอาหน้าเราไปใส่ `<iframe>` ซ่อนไว้แล้วหลอกให้คลิก (clickjacking) เช่น ซ้อนปุ่ม "ยกเลิกบิล" ไว้ใต้ปุ่มล่อ |
| `X-Content-Type-Options` | browser เดา MIME type เอง ไฟล์ที่อัปโหลดเป็น `.txt` อาจถูกรันเป็น JavaScript |
| `Strict-Transport-Security` | browser ยอมต่อ HTTP ครั้งแรก เปิดช่องให้ดักกลางทาง |

สำหรับ PWA ที่รันในร้านบนมือถือพนักงาน ข้อ clickjacking มีผลจริง

### มีแล้วช่วยอะไร

ปิดช่องพื้นฐานด้วยโค้ด 1 บรรทัด ไม่มีค่าใช้จ่ายด้าน performance

หมายเหตุ: `helmet()` ค่าเริ่มต้นตั้ง CSP ที่เข้มพอสมควร ตอนนี้ไม่มีผลเพราะ backend ตอบแต่ JSON ไม่ได้ส่ง HTML ถ้าวันหลังให้ backend เสิร์ฟหน้าเว็บด้วย ต้องปรับ CSP ตามที่ frontend ต้องใช้

### ทดสอบยังไง

```bash
curl -I http://localhost:3000/api
```

ต้องเห็น `X-Frame-Options`, `X-Content-Type-Options` ใน response header

### สถานะ

เสร็จ

---

## 9. `app.set('trust proxy', 1)`

### คืออะไร

บอก Express ว่าอยู่หลัง reverse proxy ให้อ่าน IP จริงจาก header `X-Forwarded-For` แทนที่จะใช้ IP ของ proxy

```ts
app.set('trust proxy', 1);
```

เลข 1 หมายถึงเชื่อ proxy ชั้นเดียว ถ้ามี nginx + Cloudflare ซ้อนกันต้องเป็น 2

### ถ้าไม่มีจะเกิดอะไร

ตอน deploy หลัง nginx หรือ Cloudflare `req.ip` จะได้ IP ของ proxy ทุก request ซึ่งเป็นค่าเดียวกันหมด ผลเสีย 2 อย่าง

**1. audit log ใช้ไม่ได้** — `audit_logs.ip_address` จะเป็น `127.0.0.1` หรือ IP ของ proxy ทุกแถว ตอนมีปัญหา "ใครยกเลิกบิลใบนี้" จะตามไม่ได้ และข้อมูลที่บันทึกผิดไปแล้วกู้ไม่ได้

**2. rate limiting พัง** — `ThrottlerGuard` นับตาม IP ถ้าทุกคนมี IP เดียวกัน พนักงาน 5 คนในร้านใช้โควตาร่วมกัน คนเดียวยิงเยอะทำให้ทั้งร้านโดนบล็อก และผู้โจมตีจากข้างนอกก็ทำให้ร้านใช้งานไม่ได้ได้ง่าย

### มีแล้วช่วยอะไร

`req.ip` ได้ IP จริงของเครื่องที่ยิงมา audit log ตามรอยได้จริง และ rate limit นับแยกคนถูกต้อง

ใส่ตอนนี้ไม่ใช่ตอน deploy เพราะถ้ารอ แล้วพบว่า audit log ย้อนหลังเป็น IP proxy ทั้งหมด ข้อมูลเดิมกู้ไม่ได้

### ⚠ ข้อควรระวัง

`trust proxy` ทำให้ Express เชื่อ header `X-Forwarded-For` ที่ client ส่งมา ถ้า**ไม่**ได้อยู่หลัง proxy จริง ใครก็ปลอม IP ได้เพื่อหนี rate limit

ฉะนั้น: เปิดเมื่ออยู่หลัง proxy ที่ตั้งค่า `X-Forwarded-For` ให้เท่านั้น ตอนรันบน localhost ไม่มีผลเพราะไม่มี header นี้มา

### ทดสอบยังไง

ทดสอบจริงได้ตอน deploy หลัง nginx แล้วดูว่า `audit_logs.ip_address` เป็น IP ของเครื่องที่ยิง ไม่ใช่ของ nginx

### สถานะ

เสร็จ รอยืนยันตอน deploy

---

## 10. `setGlobalPrefix('api')`

### คืออะไร

ย้าย endpoint ทุกเส้นไปใต้ `/api`

```ts
app.setGlobalPrefix('api');
```

| เดิม | ใหม่ |
|---|---|
| `POST /auth/login` | `POST /api/auth/login` |
| `POST /register` | `POST /api/register` |
| `POST /users` | `POST /api/users` |

### ถ้าไม่มีจะเกิดอะไร

ตอน deploy จะแยกไม่ออกว่า path ไหนเป็น API path ไหนเป็นหน้าเว็บ

PWA-POS เป็น PWA ซึ่งมี route ฝั่ง frontend เช่น `/login`, `/orders`, `/kitchen` ถ้า backend ก็ใช้ `/login` ด้วย จะชนกัน และ nginx เขียน config แยก traffic ไม่ได้

วิธีแก้ทีหลังคือเปลี่ยน URL ทุกเส้น ซึ่งต้องแก้ทั้ง Postman, frontend, และเอกสาร — ยิ่งทำช้ายิ่งแพง

### มีแล้วช่วยอะไร

nginx แยก traffic ด้วยกฎเดียว

```nginx
location /api { proxy_pass http://localhost:3000; }
location /    { root /var/www/pwa-pos; try_files $uri /index.html; }
```

frontend ตั้ง base URL ที่เดียว `VITE_API_URL=http://localhost:3000/api` แล้วทุก request ไม่ต้องเขียน `/api` ซ้ำ

### ⚠ ต้องทำตามด้วย

Postman collection ทั้งชุดต้องเติม `/api` ถ้าทดสอบด้วย URL เดิมจะได้ 404 และ 404 ไม่ได้บอกว่าเพราะ prefix

### สถานะ

เสร็จ ต้องอัปเดต Postman

---

## 11. `enableCors()`

### คืออะไร

บอก browser ว่า origin ไหนเรียก API นี้ได้

```ts
app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173').split(','),
    credentials: true,
});
```

### ถ้าไม่มีจะเกิดอะไร

frontend ที่รันคนละ port (Vite ใช้ 5173, backend ใช้ 3000) จะเรียก API ไม่ได้เลย browser บล็อกเองตามกฎ same-origin policy

ตรงข้ามกัน ถ้าตั้ง `origin: '*'` เว็บไหนก็เรียก API เราได้จากเบราว์เซอร์ของผู้ใช้ที่ล็อกอินอยู่

### มีแล้วช่วยอะไร

เฉพาะ origin ที่ระบุใน `.env` เรียกได้ และ `credentials: true` ทำให้ส่ง cookie ได้ ซึ่งจำเป็นถ้าวันหลังเปลี่ยนจากเก็บ token ใน localStorage ไปเก็บใน httpOnly cookie (ปลอดภัยกว่าเพราะ JavaScript อ่านไม่ได้ จึงกัน XSS ขโมย token)

### ⚠ กับดักที่เจอมาแล้ว

```ts
// ผิด — .split() ผูกกับ string literal ตัวเดียว ไม่ได้ผูกกับผลของ ??
origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173'.split(','),

// ถูก
origin: (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173').split(','),
```

แบบผิดจะทำงานได้ถ้ามี origin เดียว แต่พอใส่หลาย origin คั่น comma จะได้ string ก้อนเดียวที่ไม่ตรงกับ origin ไหนเลย และ TypeScript ไม่ฟ้องเพราะ `origin` รับทั้ง `string` และ `string[]`

### ทดสอบยังไง

ตั้ง `CORS_ORIGIN=http://localhost:5173,https://pos.example.com` แล้วยิงจาก browser ทั้งสอง origin ต้องผ่านทั้งคู่

### สถานะ

เสร็จ วงเล็บถูกแล้ว (ยืนยันจาก `main.ts` 2026-10-09)

---

## 12. `enableShutdownHooks()`

### คืออะไร

ให้ NestJS เรียก `onApplicationShutdown` ของทุก provider ตอนแอปปิด

```ts
app.enableShutdownHooks();
```

`DatabaseModule` ใช้ hook นี้เรียก `pool.end()` เพื่อปิด connection ให้เรียบร้อย

### ถ้าไม่มีจะเกิดอะไร

ตอน restart หรือ deploy connection ที่เปิดอยู่จะถูกตัดกลางคัน

PostgreSQL ไม่รู้ว่า client ไปแล้ว จึงถือ connection ค้างไว้จนกว่า TCP timeout ซึ่งนานหลายนาที ระหว่างนั้น connection slot ถูกใช้อยู่ ถ้า deploy ติด ๆ กันหลายรอบจะเจอ `too many connections`

สำคัญกว่านั้น: transaction ที่กำลังทำงานจะถูกตัดกลาง ซึ่งในระบบนี้คือ request ที่กำลังบันทึกการชำระเงิน PostgreSQL จะ rollback ให้เองตอน connection หลุด (ไม่เสียความถูกต้องของข้อมูล) แต่ผู้ใช้จะเห็น error แปลก ๆ แทนที่จะรอให้งานเสร็จก่อน

### มีแล้วช่วยอะไร

ตอนได้สัญญาณปิด NestJS รอ request ที่ค้างอยู่ให้เสร็จ แล้วปิด pool อย่างถูกต้อง เรียกว่า graceful shutdown

จำเป็นมากขึ้นตอนขึ้น Docker หรือ Kubernetes ที่ส่ง `SIGTERM` แล้วรอ 30 วินาทีก่อนฆ่า process

### ทดสอบยังไง

รันแอป กด `Ctrl+C` แล้วดูใน pgAdmin ว่า connection หายไปทันที

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'pos_app';
```

### สถานะ

เสร็จ

---

## 13. `compression()`

### คืออะไร

บีบ response ด้วย gzip ก่อนส่ง

```ts
app.use(compression());
```

### ถ้าไม่มีจะเกิดอะไร

JSON ขนาดใหญ่ส่งไปเต็มขนาด รายงานยอดขายย้อนหลัง 90 วันอาจเป็น JSON หลายร้อย KB

ร้านอาหารที่ใช้ 4G หรือ WiFi ร่วมกับลูกค้า ความเร็วไม่แน่นอน JSON 300 KB บน 4G ที่ช้าใช้เวลาหลายวินาที

### มีแล้วช่วยอะไร

JSON บีบได้ดีมากเพราะมีข้อความซ้ำเยอะ (ชื่อ key ซ้ำทุกแถว) ลดได้ประมาณ 70-90% รายงาน 300 KB เหลือ 30-50 KB

ต้นทุน: CPU เพิ่มเล็กน้อยต่อ response ซึ่งแลกกันคุ้มเมื่อเครือข่ายเป็นคอขวด ไม่ใช่ CPU

หมายเหตุ: response เล็ก ๆ อย่างผลการเปิดบิล (ไม่ถึง 1 KB) `compression` ข้ามให้เองเพราะบีบแล้วไม่คุ้ม

### สถานะ

เสร็จ

---

## 14. จำกัดขนาด body

### คืออะไร

จำกัดขนาด request body ที่ยอมรับ

### ถ้าไม่มีจะเกิดอะไร

ใครส่ง JSON ขนาด 500 MB มา server จะพยายาม parse ทั้งก้อนในหน่วยความจำจนล่ม เป็นการโจมตีที่ต้นทุนผู้โจมตีต่ำมาก ส่ง request เดียวพอ

### ⚠ บรรทัดที่ใส่ไว้ไม่มีผล

```ts
app.use(express.json({ limit: '1mb' }));   // ไม่ทำงาน
```

NestJS ติดตั้ง body parser ของตัวเองตอน `NestFactory.create()` ซึ่งรันก่อนบรรทัดนี้ พอ `body-parser` ตัวที่สองเจอว่า body ถูก parse แล้ว มันข้ามไป

ลิมิตที่ใช้จริงคือค่าเริ่มต้นของ Express = **100 kB** ไม่ใช่ 1 MB

### ทางเลือก

| ทาง | ทำ | เหมาะกับ |
|---|---|---|
| **ลบบรรทัดทิ้ง** | ใช้ 100 kB ตามค่าเริ่มต้น | **แนะนำ** — POS ส่ง JSON ไม่เกินสองสามกิโล 100 kB เหลือเฟือและปลอดภัยกว่า 1 MB |
| ปิด parser ของ Nest แล้วใส่เอง | `NestFactory.create(AppModule, { bodyParser: false })` แล้วเพิ่ม `express.json` กับ `express.urlencoded` | ถ้าวันหลังต้องอัปโหลดรูปเมนูเป็น base64 |

ตอนนี้ลบบรรทัดทิ้งพร้อม `import express` เพราะโค้ดที่ไม่มีผลทำให้คนอ่านเข้าใจผิดว่าลิมิตเป็น 1 MB

### สถานะ

เสร็จ — `main.ts` ไม่มีบรรทัดนี้แล้ว (ยืนยัน 2026-10-09)

---

## สรุปสถานะ

| ข้อ | เรื่อง | สถานะ |
|---|---|---|
| 5 | `ValidationPipe` | เสร็จ ทดสอบแล้ว · เอา `enableImplicitConversion` ออก 2026-10-09 |
| 6 | Guard global + `@Public()` | เสร็จ ทดสอบแล้ว |
| 7 | `pos_app` | เสร็จ ทดสอบแล้ว 2 ร้าน |
| 8 | `helmet()` | เสร็จ |
| 10 | `setGlobalPrefix('api')` | เสร็จ ต้องอัปเดต Postman |
| 11 | CORS | เสร็จ |
| 12 | `enableShutdownHooks()` | เสร็จ |
| 13 | `compression()` | เสร็จ |
| 14 | Body limit | เสร็จ |
| 9 | `trust proxy` | เสร็จ ยืนยันตอน deploy |
| 1 | Rate limiting | ทำงาน เห็น 429 แล้ว — ยังต้องเช็ค `@Throttle` บน register |
| 2 | `@MaxLength(72)` | ต้องตรวจ DTO |
| 3 | ข้อความ login | ต้องรวมเป็นข้อความเดียว |
| 4 | `validationSchema` | ต้องทำ |

---

## บทเรียนที่ใช้ซ้ำได้

**กลไกความปลอดภัยที่ "มีโค้ดแต่ไม่ทำงาน" อันตรายกว่าไม่มีเลย** เพราะทำให้เชื่อว่าปลอดภัยแล้วจึงไม่ตรวจอีก

ในโปรเจกต์นี้เกิดขึ้น 3 ครั้ง

1. RLS ครบทุก policy แต่ต่อ DB ด้วย `postgres` จึงข้ามหมด
2. `ThrottlerModule` ติดตั้งและ `@Throttle` แปะแล้ว แต่ไม่ได้ลงทะเบียน guard จึงไม่มีผล
3. `@IsBoolean()` แปะครบทุก field แต่ `enableImplicitConversion` แปลง `"false"` เป็น `true` ก่อนถึง validator จึงไม่มีผลกับ string

ทั้งสามครั้ง **ไม่มี error ไม่มีคำเตือน และการทดสอบกรณีปกติผ่านหมด**

กฎที่ตามมา: **ทุกกลไกความปลอดภัยที่เพิ่มเข้าไป ต้องมีการทดสอบที่ทำให้มันปฏิเสธให้เห็น**

- RLS: ต้องเห็นว่าร้าน A อ่านข้อมูลร้าน B ไม่ได้
- Rate limit: ต้องเห็น 429
- Guard: ต้องเห็น 401 และ 403
- Validation: ต้องเห็น 400 — **ทั้งค่าผิด และชนิดผิด** (`"false"` แทน `false`, `"60"` แทน `60`)

ทดสอบว่า "ใช้งานได้ปกติ" ไม่พิสูจน์อะไรเลยเกี่ยวกับความปลอดภัย

**กฎข้อที่สอง: config ระดับ global ต้องคิดว่ามีผลกับ input ทุกแบบ** ไม่ใช่แค่กรณีที่ตั้งใจจะใช้ — `enableImplicitConversion` ใส่เพื่อ query string แต่ไปมีผลกับ body ทั้งระบบ
