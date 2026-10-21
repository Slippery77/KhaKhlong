export type TableStatus = 'available' | 'occupied' | 'out_of_service'

export interface DiningTable {
    table_id: string
    table_number: string
    capacity: number
    floor: number
    status: TableStatus
    created_at: string
    updated_at: string
    // คืนมาจาก GET /tables พร้อม JOIN กับ orders และ order_items
    open_order_id: string | null   // null เมื่อโต๊ะว่าง
    item_count: number             // จำนวนรายการที่ยังไม่ชำระ (0 เมื่อว่าง)
    total_amount: number           // ยอดค้างชำระ (0 เมื่อว่าง)
}
