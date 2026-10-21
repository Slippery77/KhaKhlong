import { useCallback, useEffect, useState } from "react"
import type { FullMenuData, ApiModifierGroup } from "../types/item.types"
import type { Menu, ModifierGroup, ModifierOption } from "../types/pos.types"
import type { Category } from "../types/item.types"
import { useAuth } from "../../auth/context/AuthContext"
import { apiFetch } from "../../../libs/appClient"

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

export function useFullMenu() {
    const { accessToken } = useAuth()
    const [categories, setCategories] = useState<Category[]>([])
    const [menu, setMenu] = useState<Menu[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const load = useCallback(
        async (silent = false) => {
            if (!accessToken) return
            if (!silent) setIsLoading(true)
            setError(null)
            try {
                const res = await apiFetch<{ data: FullMenuData }>("/menu/full", accessToken)
                const data = res.data

                // สร้าง Map สำหรับ lookup modifier group ด้วย id
                const modGroupMap = new Map<string, ModifierGroup>()
                for (const apiGroup of data.modifier_groups ?? []) {
                    modGroupMap.set(apiGroup.modifier_group_id, mapModifierGroup(apiGroup))
                }

                // แปลงเมนูทุกตัวให้มี modifiers[] พร้อมใช้
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

                setCategories(data.categories)
                setMenu(allMenus)
            } catch (err) {
                setError(err instanceof Error ? err.message : "โหลดเมนูไม่สำเร็จ")
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken],
    )

    useEffect(() => {
        load()
    }, [load])

    return { categories, menu, isLoading, error, reload: () => load(true) }
}
