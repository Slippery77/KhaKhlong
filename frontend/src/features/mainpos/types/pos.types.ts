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
    id: string          // modifier_id (UUID)
    name: string
    price: number       // price_delta จาก API
}
export type ModifierOpiton = ModifierOption // รองรับกรณีสะกดชื่อเดิม

export interface ModifierGroup {
    id: string          // modifier_group_id (UUID)
    title: string       // name จาก API
    Choice: ModifierOption[]
    type: "radio" | "checkbox"  // single → radio, multi → checkbox
    isRequired: boolean
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
    /** จำนวนที่ส่งเข้าครัวสำเร็จแล้ว — รายการยังคงแสดงใน Sidebar จนกว่าจะชำระเงิน */
    sentQuantity?: number
    /** order_item_ids ที่เกี่ยวข้องกับกลุ่มนี้ (สำหรับ void/comp) */
    orderItemIds?: string[]
    /** สถานะของ order items ในกลุ่ม */
    orderItemStatuses?: string[]
    /** รายการไหนถูก Comp บ้าง (ขนานกับ orderItemIds) — ใช้คำนวณยอดที่ต้องจ่ายจริง */
    orderItemComped?: boolean[]
    /** ว่ามีรายการที่ถูก comp หรือ void ในกลุ่มนี้ */
    hasVoided?: boolean
    hasComped?: boolean
}