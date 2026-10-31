# คู่มือเขียนแคชเมนู (`useFullMenu`)

> เป้าหมาย: หน้า POS แสดงเมนูได้ตอนติดต่อ server ไม่ได้ — ใช้ `fetchWithSnapshot` ตัวเดิม
> ไฟล์ที่แก้: **2 ไฟล์** — `features/offline/db.ts` (1 บรรทัด) + `features/mainpos/hooks/useFullMenu.ts`
> ไม่แตะ `MainPOS.tsx` · ป้ายเตือนใช้ `OfflineBanner` ที่มีแล้ว
> ทดสอบบน Chromium แล้ว: ออนไลน์ / ออฟไลน์แล้ว reload / ร้านที่ไม่เคยแคช — ผ่านทั้ง 3

---

## 1. แนวคิด

### 1.1 ทำแบบเดียวกับโต๊ะ ต่างกัน 2 จุด

| | โต๊ะ (`useTables`) | เมนู (`useFullMenu`) |
|---|---|---|
| ข้อมูลจาก server | `DiningTable[]` ใช้ตรง ๆ | `FullMenuData` ต้อง **แปลง** เป็น `Menu[]` ก่อนใช้ |
| ป้ายเตือน | `StaleDataBanner` ในหน้าโต๊ะ | **ไม่ใส่ในหน้า POS** (ไฟล์ของเพื่อน) — `OfflineBanner` แสดงอยู่แล้ว |

### 1.2 แคช "ข้อมูลดิบ" ไม่ใช่ "ผลที่แปลงแล้ว"

```
server ──► FullMenuData (ดิบ) ──► buildMenu() ──► Menu[] (หน้าจอใช้)
                  ▲
                  └─ เก็บตัวนี้ลง snapshot
```

ทำไม:
- **แก้โค้ดแปลงทีหลังได้โดยไม่ต้องล้าง cache** — ถ้าเก็บ `Menu[]` แล้ววันหนึ่งเพิ่ม field ใหม่ใน `Menu` snapshot เก่าในเครื่องผู้ใช้จะไม่มี field นั้น → หน้าจอพัง
- **โค้ดแปลงมีที่เดียว** — ข้อมูลสดกับข้อมูลจาก cache ผ่าน `buildMenu()` ตัวเดียวกัน ไม่มีทางได้ผลต่างกัน

เปรียบเทียบ: เก็บ "วัตถุดิบ" ไว้ในตู้เย็น ไม่ใช่ "อาหารที่ปรุงแล้ว" — เปลี่ยนสูตรเมื่อไหร่ก็ปรุงใหม่จากวัตถุดิบเดิมได้

### 1.3 เงื่อนไข `if (!accessToken) return` ต้องเปลี่ยน

ปัญหาเดียวกับที่เจอใน `AuthContext`:

```
ออฟไลน์ → F5 → AuthContext refresh ไม่ได้ → accessToken = null (แต่ user มีแล้ว)
            → useFullMenu: if (!accessToken) return → ไม่ทำอะไรเลย → เมนูว่าง + "กำลังโหลด" ค้าง
```

แก้เป็น `if (!accessToken && !tenantSlug) return` — รู้ว่าเป็นร้านไหนก็พอ เพราะอ่าน snapshot ได้

ปลอดภัยไหม: ตอนไม่มี token `apiFetch` ยิงไปโดยไม่มี `Authorization`
- ออฟไลน์ → `TypeError` → ใช้ snapshot
- ออนไลน์ → 401 → `appClient` refresh token เอง → ยิงซ้ำ → ได้ข้อมูลสด (กลไกเดิม)

### 1.4 ข้อมูลที่อาจเก่าในเมนู

| field | เก่าได้ไหม | ผลถ้าเก่า |
|---|---|---|
| ชื่อเมนู / หมวด | แทบไม่เปลี่ยนระหว่างวัน | ไม่มีผล |
| `price` | เปลี่ยนได้ | ยอดบนจอผิด แต่ **ราคาจริงใช้ snapshot ของ server ตอน sync** (trigger บังคับ) |
| `is_available` (หมดวันนี้) | **เปลี่ยนบ่อย** | สั่งเมนูที่เพิ่งหมด → ตอน sync ได้ 409 "เมนูนี้หมดวันนี้แล้ว" → จัดการในขั้น outbox |

---

## 2. แก้ `features/offline/db.ts` (1 บรรทัด)

```ts
export type SnapshotKind = 'tables' | 'currentShift' | 'menu';
//                                                   ^^^^^^^^ เพิ่ม
```

**ไม่ต้องเพิ่ม `this.version(2)`** — schema ของตาราง (`'[tenantSlug+kind], tenantSlug'`) ไม่เปลี่ยน แค่มีค่า `kind` ใหม่ ซึ่งเป็นแค่ type ของ TypeScript ไม่ใช่โครงสร้าง IndexedDB

---

## 3. แก้ `features/mainpos/hooks/useFullMenu.ts`

ทั้งไฟล์ (บรรทัด `// [ใหม่]` / `// [แก้]` คือจุดที่ต่างจากเดิม)

```ts
import { useCallback, useEffect, useState } from "react"
import type { FullMenuData, ApiModifierGroup } from "../types/item.types"
import type { Menu, ModifierGroup, ModifierOption } from "../types/pos.types"
import type { Category } from "../types/item.types"
import { useAuth } from "../../auth/context/AuthContext"
import { apiFetch } from "../../../libs/appClient"
import { fetchWithSnapshot, isUnreachableError } from "../../offline/snapshotCache"   // [ใหม่]

// ไม่เปลี่ยน
function mapModifierGroup(apiGroup: ApiModifierGroup): ModifierGroup {
    return {
        id: apiGroup.modifier_group_id,
        title: apiGroup.name,
        type: apiGroup.selection_type === "single" ? "radio" : "checkbox",
        isRequired: apiGroup.is_required,
        Choice: apiGroup.modifiers.map((m): ModifierOption => ({
            id: m.modifier_id,
            name: m.name,
            price: m.price_delta,
        })),
    }
}

// [ใหม่] ย้ายโค้ดแปลงข้อมูลออกมาจาก load() เป็นฟังก์ชันแยก
// เนื้อในเหมือนเดิมทุกบรรทัด — แค่ "ย้ายที่" (refactor แบบ extract function)
// เหตุผล: ต้องใช้ทั้งกับข้อมูลสดและข้อมูลจาก snapshot (แนวคิด 1.2)
// อยู่นอก hook → ไม่ถูกสร้างใหม่ทุก render และทดสอบแยกได้
function buildMenu(data: FullMenuData): Menu[] {
    const modGroupMap = new Map<string, ModifierGroup>()
    for (const apiGroup of data.modifier_groups ?? []) {
        modGroupMap.set(apiGroup.modifier_group_id, mapModifierGroup(apiGroup))
    }

    const allMenus: Menu[] = []
    for (const cat of data.categories) {
        for (const item of cat.items) {
            const modifiers = (item.modifier_group_ids ?? [])
                .map((id) => modGroupMap.get(id))
                .filter((g): g is ModifierGroup => g !== undefined)

            allMenus.push({
                id: item.menu_item_id,
                name: item.name,
                price: item.price,
                categoryId: item.category_id,
                isAvailable: item.is_available,
                modifiers: modifiers.length > 0 ? modifiers : undefined,
            })
        }
    }
    return allMenus      // [ใหม่] เดิมเรียก setMenu(allMenus) ตรงนี้ ตอนนี้คืนค่าแทน
}

export function useFullMenu() {
    const { accessToken, user } = useAuth()          // [แก้] เพิ่ม user
    const tenantSlug = user?.tenantSlug               // [ใหม่] key ของ snapshot
    const [categories, setCategories] = useState<Category[]>([])
    const [menu, setMenu] = useState<Menu[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [staleSince, setStaleSince] = useState<number | null>(null)
    // [ใหม่] null = สด · ตัวเลข = มาจาก snapshot (ความหมายเดียวกับ useTables)
    // หน้า POS ยังไม่ได้ใช้ค่านี้ — คืนไว้ให้ใช้ตอนต่อ outbox เข้า MainPOS

    const load = useCallback(
        async (silent = false) => {
            if (!accessToken && !tenantSlug) return
            // [แก้] เดิม: if (!accessToken) return  (แนวคิด 1.3)

            if (!silent) setIsLoading(true)
            setError(null)
            try {
                // [แก้] เดิมเรียก apiFetch ตรง ๆ — ตอนนี้ห่อด้วย fetchWithSnapshot
                const result = await fetchWithSnapshot(tenantSlug, "menu", async () => {
                    const res = await apiFetch<{ data: FullMenuData }>("/menu/full", accessToken)
                    return res.data
                    // คืน FullMenuData ดิบ → ถูกเก็บลง snapshot แบบนี้ (แนวคิด 1.2)
                })

                setCategories(result.data.categories)
                setMenu(buildMenu(result.data))   // แปลงตรงนี้ ทั้งข้อมูลสดและจาก cache
                setStaleSince(result.isStale ? result.savedAt : null)
            } catch (err) {
                if (isUnreachableError(err)) {
                    // [ใหม่] ติดต่อไม่ได้ + ร้านนี้ไม่เคยโหลดเมนูสำเร็จบนเครื่องนี้
                    setError("ติดต่อเซิร์ฟเวอร์ไม่ได้ และยังไม่มีเมนูที่บันทึกไว้ในเครื่องนี้")
                } else {
                    setError(err instanceof Error ? err.message : "โหลดเมนูไม่สำเร็จ")
                }
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken, tenantSlug],    // [แก้] เพิ่ม tenantSlug
    )

    useEffect(() => {
        load()
    }, [load])

    return { categories, menu, isLoading, error, staleSince, reload: () => load(true) }
    //                                          ^^^^^^^^^^ [ใหม่]
}
```

### สิ่งที่หน้า POS ได้โดยไม่ต้องแก้ `MainPOS.tsx`

`MainPOS.tsx` ใช้ `const { categories, menu, isLoading, error, reload } = useFullMenu()` — รูปร่างที่คืนค่าเดิมไม่เปลี่ยน (แค่มี `staleSince` เพิ่ม ซึ่งไม่มีใครดึงไปใช้) จึงไม่ต้องแก้หน้า POS เลย

---

## 4. ทดสอบ

### 4.1 ผลที่รันแล้ว (Chromium + mock API)

| # | ทำ | ผล |
|---|---|---|
| A | เปิด `/demo/mainpos?tableId=t2` ออนไลน์ | เมนูขึ้นครบ ✅ |
| B | ปิด backend + Offline → F5 | เมนูเดิมขึ้นครบ + ป้าย "ออฟไลน์" กลางล่าง ✅ |
| C | ร้านที่ไม่เคยเปิดหน้า POS + backend ล่ม | "ติดต่อเซิร์ฟเวอร์ไม่ได้ และยังไม่มีเมนูที่บันทึกไว้ในเครื่องนี้" ✅ |

`tsc -b` ผ่าน · `vite build` ผ่าน · eslint: 1 error `set-state-in-effect` ที่ `load()` ใน `useEffect` — **มีอยู่ในไฟล์เดิมก่อนแก้** (เหมือน `useTables`)

### 4.2 ทดสอบบนเครื่อง

```powershell
cd frontend; npm run build; npm run preview
```

1. login → หน้าโต๊ะ → กดโต๊ะใดก็ได้ → เมนูขึ้น
2. F12 > Application > IndexedDB > `pwa-pos` > `snapshots` → มีแถว `[ร้าน, menu]` เพิ่ม (รวมเป็น 3 แถว)
3. Network > Offline → F5 → เมนูยังขึ้น + ป้ายกลางล่าง
4. กดเมนูที่มีตัวเลือก (modifier) → popup ตัวเลือกต้องขึ้นปกติ (พิสูจน์ว่า `buildMenu` ทำงานกับข้อมูลจาก cache)
5. **อย่ากด "ส่งครัว" ตอนออฟไลน์** — ยังไม่มี outbox จะ error (ขั้นถัดไป)

---

## 5. หลังทำเสร็จ — สถานะเส้นทางออฟไลน์

```
เปิดแอป ✅ → หน้าโต๊ะ ✅ → กดโต๊ะ ✅ → เห็นเมนู ✅ → กดเมนู/ตัวเลือก ✅ → ส่งครัว ❌ (outbox)
```

เหลือ: ลบ snapshot ตอน logout (เล็ก) → outbox + flush (ใหญ่) → ต่อเข้า MainPOS + แถบ (ค) "บิลนี้มีแล้ว X รายการ"
