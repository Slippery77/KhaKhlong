import { apiFetch } from '../../../libs/appClient'

export interface SyncTableStatusResult {
    tableId: string
    status: 'available' | 'occupied' | 'out_of_service'
}

/**
 * คำนวณสถานะโต๊ะใหม่จากบิลที่ยังเปิดอยู่ (เรียก sync_table_status() ของ DB)
 * ใช้ซ่อมกรณีสถานะเพี้ยน — ไม่ใช่การปลดโต๊ะด้วยมือ
 */
export async function syncTableStatus(tableId: string, accessToken: string | null) {
    return apiFetch<{ status: string; data: SyncTableStatusResult }>(
        `/tables/${tableId}/sync-status`,
        accessToken,
        'POST',
    )
}
