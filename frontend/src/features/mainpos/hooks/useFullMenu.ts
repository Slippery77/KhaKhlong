import { useCallback, useEffect, useState } from "react"
import type { FullMenuData, ApiModifierGroup } from "../types/item.types"
import type { Menu, ModifierGroup, ModifierOption } from "../types/pos.types"
import type { Category } from "../types/item.types"
import { useAuth } from "../../auth/context/AuthContext"
import { apiFetch } from "../../../libs/appClient"
import { fetchWithSnapshot, isUnreachableError } from "../../offline/snapshotCache"   


// แปลง ApiModifierGroup → ModifierGroup ที่ component ใช้
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
    const { accessToken , user} = useAuth()
    const [categories, setCategories] = useState<Category[]>([])
    const [menu, setMenu] = useState<Menu[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [staleSince, setStaleSince] = useState<number | null>(null)
    // [ใหม่] null = สด · ตัวเลข = มาจาก snapshot (ความหมายเดียวกับ useTables)
    // หน้า POS ยังไม่ได้ใช้ค่านี้ — คืนไว้ให้ใช้ตอนต่อ outbox เข้า MainPOS

    const load = useCallback(
        async (silent = false) => {
            if (!accessToken && !user?.tenantSlug ) return;
            if (!silent) setIsLoading(true)
            setError(null)
            try {
            const result = await fetchWithSnapshot(user?.tenantSlug,'menu',async () => {
                const res = await apiFetch<{ data: FullMenuData }>("/menu/full", accessToken)
                return res.data;
                // คืน FullMenuData ดิบ → ถูกเก็บลง snapshot แบบนี้ (แนวคิด 1.2)
            }) 
                // // สร้าง Map สำหรับ lookup modifier group ด้วย id
                // const modGroupMap = new Map<string, ModifierGroup>()
                // for (const apiGroup of data.modifier_groups ?? []) {
                //     modGroupMap.set(apiGroup.modifier_group_id, mapModifierGroup(apiGroup))
                // }

                // // แปลงเมนูทุกตัวให้มี modifiers[] พร้อมใช้
                // const allMenus: Menu[] = []
                // for (const cat of data.categories) {
                //     for (const item of cat.items) {
                //         const modifiers = (item.modifier_group_ids ?? [])
                //             .map((id) => modGroupMap.get(id))
                //             .filter((g): g is ModifierGroup => g !== undefined)

                //         allMenus.push({
                //             id: item.menu_item_id,
                //             name: item.name,
                //             price: item.price,
                //             categoryId: item.category_id,
                //             isAvailable: item.is_available,
                //             modifiers: modifiers.length > 0 ? modifiers : undefined,
                //         })
                //     }
                // }

                setCategories(result.data.categories)
                setMenu(buildMenu(result.data))
                setStaleSince(result.isStale ? result.savedAt : null)
            } catch (err) {
                if(isUnreachableError(err))
                    // [ใหม่] ติดต่อไม่ได้ + ร้านนี้ไม่เคยโหลดเมนูสำเร็จบนเครื่องนี้
                    setError("ติดต่อเซิร์ฟเวอร์ไม่ได้ และยังไม่มีเมนูที่บันทึกไว้ในเครื่องนี้")
                else 
                    setError(err instanceof Error ? err.message : "โหลดเมนูไม่สำเร็จ")
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken,user?.tenantSlug],
    )

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load()
        }, 0)
        return () => window.clearTimeout(timer)
    }, [load])

    return { categories, menu, isLoading, error,staleSince, reload: () => load(true) }
}
