// TODO (เมนูจริงจาก API)
//   1) เพิ่ม type ของ response GET /menu/full ไว้ในไฟล์นี้ (ดูโครงใน hooks/useFullMenu.ts)
//   2) id ทุกตัวจาก API เป็น UUID (string) → Menu, CartMenu เปลี่ยนแล้ว ✅
//      เหลือ ModifierOption, ModifierGroup (ทำตอนต่อ modifier_groups)
//      ⚠ KDS ใช้ด้วย: kds/types/kds.types.ts → KDSOrderItemAddon.id ต้องเปลี่ยนเป็น string ตาม
//   3) Menu: categoryId + isAvailable ✅
//   4) ModifierGroup: เพิ่ม isRequired: boolean / type ใช้ 'radio' | 'checkbox' ให้ตรงกับ selection_type
//   5) ลบ KHAO_PAD_MODIFIERS (mockup) เมื่อใช้ข้อมูลจริงแล้ว
//   6) รวม type ไว้ที่ไฟล์นี้ที่เดียวแล้ว ✅ (MainPOS / MenuCard / ModifierPopup / OrderSidebar import จากที่นี่)

export interface ModifierOption {
    id: number
    name: string
    price: number
}
export type ModifierOpiton = ModifierOption // รองรับกรณีสะกดชื่อเดิม

export interface ModifierGroup {
    id: number
    title: string
    Choice: ModifierOption[]
    type: "radio" | "checkbox" | string
    price?: number
}

// เมนูที่หน้า POS ใช้ (แปลงมาจาก MenuItem ของ API ใน MainPOS)
export interface Menu {
    id: string              // menu_item_id (UUID)
    name: string
    price: number
    categoryId: string      // category_id ใช้กรองตามหมวด
    isAvailable: boolean    // false = หมดวันนี้ แสดงสีเทา กดไม่ได้
    modifiers?: ModifierGroup[]
}

export interface CartMenu {
    cartItemId: string
    id: string // menu_item_id
    name: string
    price: number // ราคาต่อหน่วยที่รวมตัวเลือกเพิ่มเติมแล้ว
    basePrice: number
    quantity: number
    selectedSpiciness?: string
    selectedAddons?: ModifierOption[]
    note?: string
}

// ตัวอย่าง Modifier สำหรับข้าวผัดกุ้ง
export const KHAO_PAD_MODIFIERS: ModifierGroup[] = [
    {
        id: 1,
        title: "ระดับความเผ็ด",
        type: "radio",
        Choice: [
            { id: 101, name: "ไม่เผ็ด", price: 0 },
            { id: 102, name: "เผ็ดปกติ", price: 0 },
            { id: 103, name: "เผ็ดมาก", price: 0 },
        ],
    },
    {
        id: 2,
        title: "เพิ่มเติม",
        type: "checkbox",
        Choice: [
            { id: 201, name: "เพิ่มไข่ดาว", price: 10 },
            { id: 202, name: "เพิ่มข้าว", price: 10 },
            { id: 203, name: "เพิ่มเนื้อ", price: 10 },
        ],
    },
]