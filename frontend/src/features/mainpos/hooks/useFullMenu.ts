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

export function buildMenu(data: FullMenuData): Menu[] {
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
                description: item.description ?? null,
                imageUrl: item.image_url ?? null,
                price: item.price,
                categoryId: item.category_id,
                isAvailable: item.is_available,
                modifiers: modifiers.length > 0 ? modifiers : undefined,
            })
        }
    }
    return allMenus
}

interface MenuMemoryCache {
    tenantSlug: string
    categories: Category[]
    menu: Menu[]
    staleSince: number | null
}

let menuMemoryCache: MenuMemoryCache | null = null

/** ล้าง in-memory cache ของเมนู (เรียกเมื่อมีการแก้ไขเมนูในหน้าตั้งค่า หรือเปลี่ยนผู้ใช้/ร้าน) */
export function invalidateMenuCache(tenantSlug?: string) {
    if (!tenantSlug || menuMemoryCache?.tenantSlug === tenantSlug) {
        menuMemoryCache = null
    }
}

export function useFullMenu() {
    const { accessToken, user } = useAuth()
    const tenantSlug = user?.tenantSlug

    const hasValidCache = Boolean(
        menuMemoryCache &&
        tenantSlug &&
        menuMemoryCache.tenantSlug === tenantSlug &&
        menuMemoryCache.categories.length > 0,
    )

    const [categories, setCategories] = useState<Category[]>(() =>
        hasValidCache ? menuMemoryCache!.categories : [],
    )
    const [menu, setMenu] = useState<Menu[]>(() =>
        hasValidCache ? menuMemoryCache!.menu : [],
    )
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(() => !hasValidCache)
    const [staleSince, setStaleSince] = useState<number | null>(() =>
        hasValidCache ? menuMemoryCache!.staleSince : null,
    )

    const load = useCallback(
        async (silent = false) => {
            if (!accessToken || !tenantSlug) return
            // ถ้ายังไม่มี cache ใน memory ให้เปิด loading เพื่อแสดง skeleton
            // ถ้ามี cache อยู่แล้ว ให้ดึงข้อมูลสดมา sync เบื้องหลังแบบเงียบ ๆ (ไม่ทำลาย UI)
            const shouldShowLoading = !silent && !menuMemoryCache
            if (shouldShowLoading) setIsLoading(true)
            setError(null)
            try {
                const result = await fetchWithSnapshot(tenantSlug, 'menu', async () => {
                    const res = await apiFetch<{ data: FullMenuData }>("/menu/full", accessToken)
                    return res.data
                })

                const builtCategories = result.data.categories
                const builtMenu = buildMenu(result.data)
                const nextStale = result.isStale ? result.savedAt : null

                // บันทึกลง in-memory cache สำหรับการเปิดหน้า POS ครั้งต่อไป
                menuMemoryCache = {
                    tenantSlug,
                    categories: builtCategories,
                    menu: builtMenu,
                    staleSince: nextStale,
                }

                setCategories(builtCategories)
                setMenu(builtMenu)
                setStaleSince(nextStale)
            } catch (err) {
                if (isUnreachableError(err))
                    setError("ติดต่อเซิร์ฟเวอร์ไม่ได้ และยังไม่มีเมนูที่บันทึกไว้ในเครื่องนี้")
                else 
                    setError(err instanceof Error ? err.message : "โหลดเมนูไม่สำเร็จ")
            } finally {
                setIsLoading(false)
            }
        },
        [accessToken, tenantSlug],
    )

    useEffect(() => {
        // มี cache อยู่แล้ว → โหลดเบื้องหลังแบบ silent ทันที ไม่ต้องรอ loading spinner
        const isSilent = Boolean(
            menuMemoryCache &&
            tenantSlug &&
            menuMemoryCache.tenantSlug === tenantSlug &&
            menuMemoryCache.categories.length > 0,
        )
        const timer = window.setTimeout(() => {
            void load(isSilent)
        }, 0)
        return () => window.clearTimeout(timer)
    }, [load, tenantSlug])

    return { categories, menu, isLoading, error, staleSince, reload: () => load(false) }
}
