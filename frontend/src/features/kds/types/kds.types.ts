export type KDSStatus = "รอทำ" | "กำลังทำ" | "พร้อมเสิร์ฟ"

// TODO เมื่อ POS ใช้เมนูจริง: id ของ addon จาก API เป็น UUID → เปลี่ยน id: number เป็น string
export interface KDSOrderItemAddon {
    id: number
    name: string
    price: number
}

export interface KDSOrderItem {
    id: number | string
    name: string
    quantity: number
    price: number
    basePrice?: number
    selectedSpiciness?: string
    selectedAddons?: KDSOrderItemAddon[]
    note?: string
}

export interface KDSOrder {
    id: string
    orderNumber: number
    table: string
    status: KDSStatus
    createdAt: number // Unix timestamp ms
    items: KDSOrderItem[]
    totalPrice: number
    totalQuantity: number
}
