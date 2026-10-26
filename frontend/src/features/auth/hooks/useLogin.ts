import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch } from '../../../libs/appClient';
import { getRefreshToken, saveSession } from '../authStorage'; // [เพิ่มใหม่] getRefreshToken ไว้ส่งตอน logout
import { saveLastTenantSlug } from '../tenantStorage';

export function useLogin(){
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { accessToken, setAuth, clearAuth } = useAuth();
    const navigate = useNavigate()

    const login = async (credentials: LoginCredentials)=>{
        setError(null);
        setIsSubmitting(true);
        try{
            const data = await apiFetch<LoginResponse>('/auth/login',null,'POST',credentials)
            setAuth(data.accessToken, data.user); // เก็บ acess token และ ข้อมูล user ลงใน context ให้ทุก components ใช้งาน acessToken และ user เดียวกัน
            saveSession(data.refreshToken, data.user)
            // จำร้านนี้ไว้ในเครื่อง → เปิดเว็บครั้งหน้าจะเด้งเข้าหน้าร้านเดิมทันที
            saveLastTenantSlug(data.user.tenantSlug || credentials.tenantSlug)
            return data;
        }catch(err){
            if (err instanceof ApiError && err.status === 401) {
                setError('ชื่อผู้ใช้ รหัสผ่าน หรือรหัสร้านไม่ถูกต้อง');
            } else {
                setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
            }
            return null;
        }finally{
            setIsSubmitting(false);
        }
    }
    const logout = async ()=>{
        setIsSubmitting(true)
        try{
            // [เพิ่มใหม่] ส่ง refresh token ไปให้ backend ลบทิ้ง ไม่งั้นใบนั้นยังใช้ขอ access token ใหม่ได้จนหมดอายุ
            // (ถ้าไม่มี ส่ง undefined ไป backend ไม่บังคับ field นี้)
            await apiFetch('/auth/logout', accessToken, 'POST', { refreshToken: getRefreshToken() ?? undefined })
        }catch(err){
            console.error('logout failed', err);
        }
        finally{
            clearAuth();
            // กลับไปที่ "/" — ถ้าเครื่องจำร้านไว้จะเด้งเข้าหน้าร้านเดิมให้เอง
            // (ไม่พึ่ง useParams ซึ่งอาจว่างถ้า Header ถูกใช้ خارج route ของร้าน)
            navigate('/');
        }
    }

    return {
        login,
        logout,
        isSubmitting,
        error,
    };

    
}