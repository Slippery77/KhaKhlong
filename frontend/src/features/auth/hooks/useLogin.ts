import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../../../libs/appClient';

export function useLogin(){
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { accessToken, setAuth, clearAuth } = useAuth();
    const navigate = useNavigate()
    const { tenantSlug } = useParams<{ tenantSlug: string }>()

    const login = async (credentials: LoginCredentials)=>{
        setError(null);
        setIsSubmitting(true);
        try{
            const response = await fetch('http://localhost:3000/api/auth/login',{
                method: 'POST',
                headers:{'Content-Type': 'application/json',},
                body: JSON.stringify(credentials),
            });
            if (!response.ok){
                console.log(response.status);
                throw new Error(`Invalid username , password or restuarant code`);
            }
            const data: LoginResponse = await response.json();
            setAuth(data.accessToken, data.user); // เก็บ acess token และ ข้อมูล user ลงใน context ให้ทุก components ใช้งาน acessToken และ user เดียวกัน
            return data;
        }catch(err){
            const message = err instanceof Error ? err.message : 'an unknown error occurred';
            setError(message);
            return null;
        }finally{
            setIsSubmitting(false);
        }
    }
    const logout = async ()=>{
        setIsSubmitting(true)
        try{
            await apiFetch('/auth/logout', accessToken, 'POST')
        }catch(err){
            console.error('logout failed', err);
        }
        finally{
            clearAuth();
            navigate(`/${tenantSlug}/login`);
        }
    }

    return {
        login,
        logout,
        isSubmitting,
        error,
    };

    
}