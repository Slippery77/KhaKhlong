# หน้า POS: เปลี่ยนจากเมนู mockup เป็นเมนูจริงจาก API

หน้าขาย (`/mainpos`) เลิกใช้เมนูที่เขียนไว้ในโค้ดแล้ว ตอนนี้ดึงหมวดและเมนูของร้านจาก `GET /menu/full`

## สรุปสั้น ๆ

- หมวดใน sidebar และเมนูในกริดมาจากฐานข้อมูลของร้าน
- เลือกหมวดด้วย `category_id` แทนชื่อหมวด
- เมนูที่หมดวันนี้ (`is_available = false`) กดไม่ได้
- ระหว่างโหลดจะขึ้น "กำลังโหลดเมนู..." ถ้าโหลดไม่สำเร็จจะขึ้นข้อความพร้อมปุ่ม "ลองใหม่"
- **ยังไม่มีตัวเลือกเสริม (modifier)** กดเมนูไหนก็เข้าตะกร้าทันที ไม่เปิด popup เลือกตัวเลือก

## การไหลของข้อมูล

```
GET /menu/full
   ↓
useFullMenu()            → categories (มี items อยู่ข้างใน), isLoading, error, reload
   ↓
MainPOS                  → แปลง items ทุกหมวดเป็น Menu[] แล้วกรองตามหมวดที่เลือก / คำค้น
   ├─ MenuSidebar        → categories + หมวดที่เลือก
   │    └─ CategoryCard  → การ์ดหมวด 1 ใบ
   └─ MenuCard           → การ์ดเมนู 1 ใบ
```

## ไฟล์ที่เปลี่ยน

ทุกไฟล์อยู่ใต้ `frontend/src/features/mainpos/`

| ไฟล์ | เปลี่ยนอะไร |
|---|---|
| `hooks/useFullMenu.ts` (ใหม่) | เรียก `GET /menu/full` คืน `categories`, `isLoading`, `error`, `reload` โดย `reload` โหลดใหม่แบบไม่ขึ้น "กำลังโหลด" ทับ |
| `types/item.types.ts` (ใหม่) | type ของข้อมูลจาก API: `Category`, `MenuItem` |
| `types/pos.types.ts` | `Menu.id` / `CartMenu.id` เป็น `string` (UUID), เพิ่ม `Menu.categoryId` และ `Menu.isAvailable`, ลบ field `type` (ชื่อหมวด) และเป็นที่เก็บ type ของหน้า POS ที่เดียว |
| `pages/MainPOS.tsx` | ลบ mockup และ type ที่ซ้ำ, เรียก `useFullMenu()`, เปลี่ยนการเลือกหมวดเป็น `category_id`, กันกดเมนูที่หมด, เพิ่มสถานะกำลังโหลดและ error |
| `components/MenuSidebar.tsx` | รับ `categories` เป็น prop แทน mockup แล้ววนลูปสร้าง `CategoryCard` |
| `components/CategoryCard.tsx` | รับ `name`, `icon`, `isActive`, `onClick` แล้ววาดการ์ด 1 ใบ |
| `components/MenuCard.tsx`, `ModifierPopup.tsx`, `OrderSidebar.tsx` | import type จาก `types/pos.types` แทน `pages/MainPOS` |

## รายละเอียดใน MainPOS

**แปลงข้อมูลจาก API เป็น `Menu`**

```ts
const { categories, isLoading, error, reload } = useFullMenu()

const menu: Menu[] = categories.flatMap((c) =>
    c.items.map((item) => ({
        id: item.menu_item_id,
        name: item.name,
        price: item.price,
        categoryId: item.category_id,
        isAvailable: item.is_available,
    }))
)
```

ใช้ `flatMap` รวมเมนูทุกหมวดไว้ใน array เดียว เพื่อให้ช่องค้นหาหาข้ามหมวดได้

**หมวดที่เลือก**

```ts
const [seletedCategory, setSelectCategory] = useState<string | null>(null)
const activeCategoryId = seletedCategory ?? categories[0]?.category_id
```

- เก็บแค่ `category_id` ของหมวดที่กด เพราะชื่อหมวดเปลี่ยนได้ แต่ id ไม่เปลี่ยน
- ถ้ายังไม่ได้กดหมวดไหน (`null`) จะใช้หมวดแรกจาก API ไม่ต้องตั้งค่าใน `useEffect` ตอนโหลดเสร็จ
- ไม่ต้องเก็บ `isSelected` แยกในแต่ละหมวด เพราะ `MenuSidebar` คำนวณเองตอน render ด้วย `isActive={seletedCategory === c.category_id}`

**เมนูที่หมด**

```ts
function handleMenuClick(clickedMenu: Menu) {
    if (!clickedMenu.isAvailable) return
    ...
}
```

## ยังไม่ได้ทำ

| เรื่อง | ต้องทำอะไร | ไฟล์ |
|---|---|---|
| 🔴 ทุกหมวดเป็นสีที่ถูกเลือก | `isActive === isActive` ได้ `true` เสมอ ต้องเปลี่ยนเป็น `isActive ? ... : ...` | `components/CategoryCard.tsx` |
| ตัวเลือกเสริม (modifier) | ให้ `useFullMenu` คืน `modifier_groups` ด้วย แล้วแปลง `item.modifier_group_ids` เป็น `ModifierGroup[]` ใส่ใน `modifiers` ของแต่ละเมนู | `hooks/useFullMenu.ts`, `pages/MainPOS.tsx` |
| ModifierPopup | ยังผูกกับ mockup "ระดับความเผ็ด" อยู่ ต้องรองรับกลุ่ม single หลายกลุ่ม, `is_required` และราคาของตัวเลือก single (รายละเอียดอยู่ใน TODO ในไฟล์) | `components/ModifierPopup.tsx` |
| id ของตัวเลือกเป็น UUID | `ModifierOption.id`, `ModifierGroup.id` และ `KDSOrderItemAddon.id` ต้องเปลี่ยนเป็น `string` | `types/pos.types.ts`, `kds/types/kds.types.ts` |
| เมนูที่หมดดูไม่ออก | `MenuCard` ต้องแสดงสีเทาและป้าย "หมดวันนี้" ตอนนี้กดไม่ได้ แต่หน้าตายังเหมือนเมนูปกติ | `components/MenuCard.tsx` |
| icon ของหมวด | API ไม่มี icon มาให้ ทำตัวเลือก icon ตามชื่อหมวด ถ้าไม่รู้จักให้ใช้ icon กลาง | `components/MenuSidebar.tsx` |
| คำเตือนจาก lint | `useFullMenu.ts` เรียก `load()` ที่มี `setState` ตรง ๆ ใน `useEffect` (`react-hooks/set-state-in-effect`) ยังใช้งานได้ปกติ | `hooks/useFullMenu.ts` |

## สิ่งที่ต้องรู้ถ้าทำงานกับหน้า POS

- `id` ของเมนูและของในตะกร้าเป็น **string (UUID)** แล้ว ไม่ใช่ number
- type ของหน้า POS อยู่ที่ `types/pos.types.ts` ที่เดียว ส่วน type ของ response จาก API อยู่ที่ `types/item.types.ts`
- `GET /menu/full` ส่งมาเฉพาะหมวดและเมนูที่เปิดใช้งาน (`is_active = true`) ส่วนเมนูที่หมดวันนี้ยังถูกส่งมา
