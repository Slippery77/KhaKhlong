import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../libs/appClient';
import { useAuth } from '../../auth/context/AuthContext';
import type { DiningTable } from '../../tables/types/table.types';
import type { Floor, FloorFormValues, TableFormValues } from '../types/floor.types';

interface FloorsResponse {
    status: string;
    data: Floor[];
}

interface TablesResponse {
    status: string;
    data: DiningTable[];
}

/**
 * ดึงรายชั้น + รายโต๊ะของร้านคู่กัน
 * GET /floors (ทุก role) และ GET /tables (ทุก role)
 * โหลดคู่กันเพราะหน้าชั้นต้องใช้ทั้งคู่ — นับ "มีจริง" จาก floors และแสดงแถวโต๊ะจาก tables
 */
export function useFloorsList() {
    const { accessToken } = useAuth();
    const [floors, setFloors] = useState<Floor[]>([]);
    const [tables, setTables] = useState<DiningTable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (silent = false) => {
            if (!silent) setIsLoading(true);
            setError(null);
            try {
                const [floorsRes, tablesRes] = await Promise.all([
                    apiFetch<FloorsResponse>('/floors', accessToken),
                    apiFetch<TablesResponse>('/tables', accessToken),
                ]);
                setFloors(floorsRes.data);
                setTables(tablesRes.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'โหลดข้อมูลชั้นและโต๊ะไม่สำเร็จ');
            } finally {
                setIsLoading(false);
            }
        },
        [accessToken],
    );

    // โหลดตอนเปิดหน้าครั้งแรก (หรือตอน token เปลี่ยน)
    useEffect(() => { load(); }, [load]);

    // silent = true = โหลดใหม่โดยไม่ติดหน้า loading (ใช้หลังบันทึก ไม่ให้หน้ากระพริบ)
    return { floors, tables, isLoading, error, reload: (silent = false) => load(silent) };
}

/**
 * คำสั่งที่มีผลกับข้อมูลชั้นและโต๊ะ
 * เพิ่ม/แก้ไข/ลบชั้น ใช้ /floors · เพิ่ม/แก้ไขโต๊ะ ใช้ /tables (ทั้งหมดต้องมีสิทธิ์ table:manage)
 */
export function useFloorActions() {
    const { accessToken } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);

    // เพิ่มชั้นใหม่ — ชื่อว่างไม่ต้องส่งไป (backend เก็บเป็น null)
    const createFloor = async (values: FloorFormValues): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch('/floors', accessToken, 'POST', {
                floor_no: values.floor_no,
                name: values.name.trim() || undefined,
                table_count: values.table_count,
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เพิ่มชั้นไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // แก้ไขชั้น — ส่งครบทุกช่อง เพราะฟอร์มเติมค่าเดิมไว้แล้ว (name ว่าง = ล้างชื่อ)
    const updateFloor = async (floorId: string, values: FloorFormValues): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch(`/floors/${floorId}`, accessToken, 'PATCH', {
                floor_no: values.floor_no,
                name: values.name.trim(),
                table_count: values.table_count,
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'บันทึกการแก้ไขไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // ลบชั้น (backend จะไม่ยอมลบถ้ายังมีโต๊ะอยู่)
    const deleteFloor = async (floorId: string): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch(`/floors/${floorId}`, accessToken, 'DELETE');
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ลบชั้นไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // เพิ่มโต๊ะในชั้นที่ระบุ (floor_id)
    const createTable = async (floorId: string, values: TableFormValues): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch('/tables', accessToken, 'POST', {
                tableNumber: values.table_number,
                capacity: values.capacity,
                floorId: floorId,
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เพิ่มโต๊ะไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // แก้ไขหมายเลขโต๊ะและจำนวนที่นั่ง (ไม่ย้ายชั้นจากหน้านี้)
    const updateTable = async (tableId: string, values: TableFormValues): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch(`/tables/${tableId}`, accessToken, 'PATCH', {
                tableNumber: values.table_number,
                capacity: values.capacity,
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'บันทึกการแก้ไขไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        createFloor,
        updateFloor,
        deleteFloor,
        createTable,
        updateTable,
        isSubmitting,
        error,
        clearError,
    };
}
