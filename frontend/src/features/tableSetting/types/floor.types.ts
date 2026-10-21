// ชั้นในร้าน — เก็บอยู่ในตาราง floors (มาจาก PATCH_03_floors.sql)
export interface Floor {
    floor_id: string;
    floor_no: number;
    name: string | null;
    table_count: number;        // จำนวนโต๊ะที่ "ตั้งไว้" ตอนสร้าง/แก้ไขชั้น (เป้าหมาย ไม่ใช่จำนวนจริง)
    actual_table_count: number; // จำนวนโต๊ะที่มีจริง (นับจาก dining_tables)
    created_at: string;
    updated_at: string;
}

// ค่าที่ฟอร์มชั้นส่งออกไปให้หน้า page
export interface FloorFormValues {
    floor_no: number;   // เลขชั้น
    name: string;       // ชื่อชั้น (ว่าง = ไม่ตั้งชื่อ)
    table_count: number; // จำนวนโต๊ะที่ตั้งไว้
}

// ค่าที่ฟอร์มโต๊ะส่งออกไป (เพิ่ม/แก้ไขในหน้าชั้น)
export interface TableFormValues {
    table_number: string; // หมายเลขโต๊ะ
    capacity: number;     // จำนวนคนที่นั่งได้
}

// ป้ายสถานะโต๊ะ (ตัวเดียวกับหน้าผังโต๊ะ)
export const TABLE_STATUS_LABEL: Record<string, string> = {
    available: 'ว่าง',
    occupied: 'มีลูกค้า',
    out_of_service: 'ปิดใช้งาน',
};
