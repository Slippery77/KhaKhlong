import { createContext, useContext,useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshOnce, setAuthHandlers } from '../../../libs/appClient';
import { clearSession, getSavedUser } from '../authStorage';
import { getLastTenantSlug } from '../tenantStorage';
import type { AuthUser } from '../types/auth.types';


interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const [isRestoring, setIsRestoring] = useState(true);
  
  useEffect(() => {
    // 1) ลงทะเบียนก่อน เพื่อให้ refresh ด้านล่างส่ง access ใบใหม่เข้า state ได้
    setAuthHandlers({
        onRefreshed: (token) => setAccessToken(token),
        onSessionExpired: () => {
            // จำร้านจาก user ที่เพิ่งหมดอายุ หรือร้านที่เครื่องเคยจำไว้
            const slug = getSavedUser()?.tenantSlug ?? getLastTenantSlug();
            clearSession();
            setAccessToken(null);
            setUser(null);
            // ไม่มี slug ก็กลับหน้าแรก (store finder) ไม่ใช่เด้งไป /register
            // เพราะคนที่เคยมีบัญชีแต่เครื่องลืมร้านต้องกรอกรหัสร้านเดิมได้
            navigate(slug ? `/${slug}/login` : '/');
        },
    });
    const restore = async () =>{
      try{
        const token = await refreshOnce();
        if(token){
          setUser(getSavedUser());
        }else{
          clearSession();
        }
      }catch{
            // เน็ตหลุด / server ล่ม: เก็บ session ไว้ request ถัดไปจะ refresh ให้เอง
            // ใช้ user ที่บันทึกไว้ทำงานต่อแบบออฟไลน์ (ยังไม่มี access token)
            // - หน้าจอรู้ว่าเป็นร้านไหน จึงอ่านข้อมูลที่แคชไว้ของร้านนั้นได้
            // - พอเน็ตกลับมา request แรกจะได้ 401 แล้ว appClient refresh token ให้เอง
            // - ข้อมูลจริงยังผ่านการตรวจสิทธิ์ที่ server เสมอ ไม่ได้ข้ามความปลอดภัย
            setUser(getSavedUser());
      }finally{
        setIsRestoring(false);
      }
    }
    restore();
    return () => setAuthHandlers(null);
}, [navigate]);

  const setAuth = (token: string, newUser: AuthUser) => {
    setAccessToken(token);
    setUser(newUser);
  };

  const clearAuth = () => {
    setAccessToken(null);
    setUser(null);
    clearSession();
  };

  if(isRestoring){
    return null;
  }
  return (
    <AuthContext.Provider value={{ accessToken, user, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}