import { createContext, useContext,useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshOnce, setAuthHandlers } from '../../../libs/appClient';
import { clearSession, getSavedUser } from '../authStorage';
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
            const slug = getSavedUser()?.tenantSlug;
            clearSession();
            setAccessToken(null);
            setUser(null);
            navigate(slug ? `/${slug}/login` : '/register');
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
      }catch(err){
            // เน็ตหลุด / server ล่ม: เก็บ session ไว้ request ถัดไปจะ refresh ให้เอง
      }finally{
        setIsRestoring(false);
      }
    }
    restore();
    return () => setAuthHandlers(null);
}, [navigate]);

  const setAuth = (token: string, user: AuthUser) => {
    setAccessToken(token);
    setUser(user);
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

