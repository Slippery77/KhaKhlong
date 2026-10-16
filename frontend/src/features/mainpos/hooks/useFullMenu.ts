// =====================================================================
// useFullMenu: ดึงเมนูทั้งร้านสำหรับหน้า POS จาก GET /menu/full
// ดูแบบได้จาก features/editMenu/hooks/useAdminMenu.ts → useAdminMenu() (โครงเกือบเหมือนกัน)
// =====================================================================
//
// response ของ GET /menu/full (ส่งมาแค่ของที่ is_active = true)
// {
//   status: 'success',
//   data: {
//     version: string | null,              ← updated_at ล่าสุดของเมนูทั้งร้าน (ไว้เช็ก cache ทีหลัง ตอนนี้ยังไม่ต้องใช้)
//     categories: [{
//       category_id: string, name: string, sort_order: number,
//       items: [{
//         menu_item_id: string,            ← UUID (string) ไม่ใช่ number แบบ mockup
//         category_id: string,
//         name: string,
//         description: string | null,
//         price: number,
//         is_available: boolean,           ← false = หมดวันนี้ ยังส่งมา ให้แสดงสีเทา กดไม่ได้
//         modifier_group_ids: string[],    ← อ้างไปที่ modifier_groups ข้างล่าง (เรียงตามลำดับแสดง)
//       }]
//     }],
//     modifier_groups: [{
//       modifier_group_id: string,
//       name: string,                      ← เช่น "ระดับความเผ็ด"
//       selection_type: 'single' | 'multi',← single = เลือกได้ 1 (radio), multi = หลายตัว (checkbox)
//       is_required: boolean,              ← ต้องเลือกก่อนกดเพิ่มลงออเดอร์
//       modifiers: [{ modifier_id: string, modifier_group_id: string, name: string, price_delta: number }]
//     }]
//   }
// }
//
// TODO 1) ประกาศ type ของ response ไว้ใน types/pos.types.ts (FullMenuResponse, ApiCategory, ApiMenuItem, ApiModifierGroup ...)
//
// TODO 2) state: categories, modifierGroups, isLoading, error
//
// TODO 3) load(): apiFetch<{ data: FullMenuResponse }>('/menu/full', accessToken)
//   - accessToken จาก useAuth() (endpoint นี้แค่ต้อง login ไม่ต้องมีสิทธิ์ menu:edit)
//   - useEffect เรียก load() ตอนเปิดหน้า
//
// TODO 4) แปลงข้อมูลให้ component ใช้ง่าย (ทำใน hook ที่เดียว component จะได้ไม่ต้องรู้โครง API)
//   - ทำ Map ของ modifier_groups ด้วย id: new Map(groups.map(g => [g.modifier_group_id, g]))
//   - แต่ละเมนู: modifiers = item.modifier_group_ids.map(id => map.get(id)).filter(Boolean)
//     (กลุ่มที่ถูกปิดจะไม่อยู่ใน map → filter ทิ้ง)
//   - ถ้ายังอยากใช้ type Menu / ModifierGroup เดิมของหน้า POS ให้ map ชื่อ field ตรงนี้:
//       menu_item_id → id, category_id → (ใช้แทน type), name, price, is_available
//       group: modifier_group_id → id, name → title, selection_type 'single' → 'radio' / 'multi' → 'checkbox', is_required
//       modifier: modifier_id → id, name, price_delta → price
//
// TODO 5) return { categories, menus (เมนูทุกหมวดรวมกัน), isLoading, error, reload: load }
import { useCallback, useEffect, useState } from "react";
import type { Category } from "../types/item.types";
import { useAuth } from "../../auth/context/AuthContext";
import { apiFetch } from "../../../libs/appClient";

export function useFullMenu() {
    const { accessToken } = useAuth()
    const [ categories, setCategories ] = useState<Category[]>([]);
    const [ error, setError ] = useState<string|null>(null);
    const [ isLoading, setIsLoading ] = useState<boolean>(true);

    const load = useCallback( async (silent = false) =>{
        if(!silent)
            setIsLoading(true);
        setError(null);
        try{
            const res = await apiFetch<{data : {categories:Category[]}}>('/menu/full',accessToken);
            setCategories(res.data.categories);
        }catch(err){
            setError(err instanceof Error ? err.message : 'โหลดเมนูไม่สำเร็จ');
        }finally{
            setIsLoading(false);
        }
    },[accessToken])

    useEffect(()=> {load();},[load]);
    return {categories, isLoading,error,reload:()=>load(true)};
}
