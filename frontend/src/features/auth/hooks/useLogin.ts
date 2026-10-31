import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch } from '../../../libs/appClient';
import { getRefreshToken, saveSession } from '../authStorage';
import { saveLastTenantSlug } from '../tenantStorage';
import { clearTenantSnapshots } from '../../offline/snapshotCache';   // [ใหม่]


export function useLogin() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { accessToken, user, setAuth, clearAuth } = useAuth();
    const [isLocked, setIsLocked] = useState(false);
    const [lockedUntil, setLockedUntil] = useState<string | null>(null);
    const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
    const navigate = useNavigate();

    const clearLock = useCallback(() => {
        setIsLocked(false);
        setLockedUntil(null);
        setError(null);
        setRemainingAttempts(null);
    }, []);

    const login = async (credentials: LoginCredentials) => {
        setError(null);
        setIsLocked(false);
        setLockedUntil(null);
        setRemainingAttempts(null);
        setIsSubmitting(true);
        try {
            const data = await apiFetch<LoginResponse>('/auth/login', null, 'POST', credentials);
            setAuth(data.accessToken, data.user);
            saveSession(data.refreshToken, data.user);
            // จำร้านนี้ไว้ในเครื่อง → เปิดเว็บครั้งหน้าจะเด้งเข้าหน้าร้านเดิมทันที
            saveLastTenantSlug(data.user.tenantSlug || credentials.tenantSlug);
            return data;
        } catch (err) {
            if (err instanceof ApiError) {
                const bodyData = (err.data ?? {}) as {
                    code?: string;
                    lockedUntil?: string;
                    remainingAttempts?: number;
                };
                if (err.status === 429) {
                    if (bodyData.code === 'ACCOUNT_LOCKED') {
                        setIsLocked(true);
                        setLockedUntil(
                            typeof bodyData.lockedUntil === 'string' ? bodyData.lockedUntil : null,
                        );
                        setError(
                            err.message ||
                                'บัญชีถูกระงับชั่วคราวเนื่องจากใส่รหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก 5 นาที',
                        );
                    } else {
                        setError('ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
                    }
                } else if (err.status === 401) {
                    if (typeof bodyData.remainingAttempts === 'number') {
                        setRemainingAttempts(bodyData.remainingAttempts);
                    }
                    if (err.message === 'Account is deactivated') {
                        setError('บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อเจ้าของร้านหรือผู้จัดการ');
                    } else if (err.message === 'Tenant is deactivated') {
                        setError('ร้านค้านี้ถูกระงับการใช้งานชั่วคราว');
                    } else {
                        setError('ชื่อผู้ใช้ รหัสผ่าน หรือรหัสร้านไม่ถูกต้อง');
                    }
                } else {
                    setError(err.message || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
                }
            } else {
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
            }
            return null;
        } finally {
            setIsSubmitting(false);
        }
    };

    const logout = async () => {
        setIsSubmitting(true);
        try {
            await apiFetch('/auth/logout', accessToken, 'POST', {
                refreshToken: getRefreshToken() ?? undefined,
            });
        } catch (err) {
            console.error('logout failed', err);
        }
        finally{
            // กลับไปที่ "/" — ถ้าเครื่องจำร้านไว้จะเด้งเข้าหน้าร้านเดิมให้เอง
            // (ไม่พึ่ง useParams ซึ่งอาจว่างถ้า Header ถูกใช้ خارج route ของร้าน)
            // ลบข้อมูลออฟไลน์ (โต๊ะ/กะ/เมนู) ของร้านนี้ออกจากเครื่อง
            // ต้องทำก่อน clearAuth() เพราะหลังจากนั้น user จะเป็น null ไม่รู้ tenantSlug แล้ว
            if (user?.tenantSlug) await clearTenantSnapshots(user.tenantSlug);
            clearAuth();
            navigate('/');
        }
    };

    return {
        login,
        logout,
        isSubmitting,
        error,
        isLocked,
        lockedUntil,
        remainingAttempts,
        clearLock,
    };
}
