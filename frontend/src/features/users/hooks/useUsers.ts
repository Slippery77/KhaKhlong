import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../libs/appClient';
import { useAuth } from '../../auth/context/AuthContext';
import type { AppUser, UserFormValues } from '../types/user.types';

interface UsersResponse {
    status: string;
    data: AppUser[];
}

/**
 * ดึงรายชื่อผู้ใช้ทั้งหมดของร้าน
 * GET /users — ต้องมีสิทธิ์ user:manage (เจ้าของร้านเท่านั้น)
 */
export function useUsersList() {
    const { accessToken } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (silent = false) => {
            if (!silent) setIsLoading(true);
            setError(null);
            try {
                const res = await apiFetch<UsersResponse>('/users', accessToken);
                setUsers(res.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
            } finally {
                setIsLoading(false);
            }
        },
        [accessToken],
    );

    // โหลดรายชื่อผู้ใช้ตอนเปิดหน้าครั้งแรก (หรือตอน token เปลี่ยน)
    useEffect(() => { load(); }, [load]);

    // silent = true = โหลดใหม่โดยไม่ติดหน้า loading (ใช้หลังบันทึก เพื่อไม่ให้หน้ากระพริบ)
    return { users, isLoading, error, reload: (silent = false) => load(silent) };
}

/**
 * คำสั่งที่มีผลกับข้อมูลผู้ใช้ (เพิ่ม / แก้ไข / ปิดใช้งาน)
 */
export function useUserActions() {
    const { accessToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // เพิ่มบัญชีใหม่ — ต้องมีรหัสผ่านเสมอ
    const createUser = async (values: UserFormValues): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            await apiFetch('/users', accessToken, 'POST', {
                username: values.username,
                password: values.password,
                display_name: values.display_name,
                role_name: values.role_name,
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เพิ่มบัญชีผู้ใช้ไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // แก้ไขบัญชี — ส่งเฉพาะช่องที่เปลี่ยนจริง
    const updateUser = async (userId: string, values: UserFormValues): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            const body: Record<string, string> = {};
            if (values.display_name) body.display_name = values.display_name;
            if (values.username) body.username = values.username;
            if (values.role_name) body.role_name = values.role_name;
            // ว่าง = ไม่เปลี่ยนรหัสผ่าน (ไม่ต้องส่งไป)
            if (values.password) body.password = values.password;

            if (Object.keys(body).length === 0) {
                setError('ไม่มีข้อมูลที่เปลี่ยน');
                return false;
            }

            await apiFetch(`/users/${userId}`, accessToken, 'PATCH', body);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'บันทึกการแก้ไขไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // ปิดใช้งาน / เปิดใช้งานบัญชี
    const setUserActive = async (userId: string, isActive: boolean): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);
        try {
            const action = isActive ? 'reactivate' : 'deactivate';
            await apiFetch(`/users/${userId}/${action}`, accessToken, 'PATCH');
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { createUser, updateUser, setUserActive, isSubmitting, error, clearError: () => setError(null) };
}
