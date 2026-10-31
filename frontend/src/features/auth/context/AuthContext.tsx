import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, refreshOnce, setAuthHandlers } from '../../../libs/appClient';
import { clearSession, getSavedUser, saveSavedUser } from '../authStorage';
import { getLastTenantSlug } from '../tenantStorage';
import type { AuthUser, UserMeData } from '../types/auth.types';

interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  hasPermission: (permissionKey: string) => boolean;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapMeToAuthUser(me: UserMeData, fallback?: AuthUser | null): AuthUser {
  return {
    sub: me.user_id,
    username: me.username,
    display_name: me.display_name || fallback?.display_name,
    role: me.role_name,
    tenantSlug: me.store?.tenant_slug || fallback?.tenantSlug || '',
    tenantID: me.store?.tenant_id || fallback?.tenantID,
    restaurant_name: me.store?.restaurant_name || fallback?.restaurant_name,
    has_pin: me.has_pin,
    permissions: Array.isArray(me.permissions) ? me.permissions : [],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const [isRestoring, setIsRestoring] = useState(true);

  const syncUserFromServer = useCallback(
    async (token: string, fallbackUser?: AuthUser | null): Promise<AuthUser | null> => {
      try {
        const res = await apiFetch<{ status: string; data: UserMeData }>('/users/me', token);
        if (res?.data) {
          const synced = mapMeToAuthUser(res.data, fallbackUser);
          setUser(synced);
          saveSavedUser(synced);
          return synced;
        }
      } catch {
        // กรณีออฟไลน์หรือเชื่อมต่อไม่ได้ ให้คงข้อมูล user เดิมในเครื่องไว้
      }
      return fallbackUser ?? null;
    },
    [],
  );

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
    const restore = async () => {
      try {
        const token = await refreshOnce();
        if (token) {
          const saved = getSavedUser();
          if (saved) {
            setUser(saved);
          }
          await syncUserFromServer(token, saved);
        } else {
          clearSession();
        }
      } catch {
        // เน็ตหลุด / server ล่ม: เก็บ session ไว้ request ถัดไปจะ refresh ให้เอง
      } finally {
        setIsRestoring(false);
      }
    };
    void restore();
    return () => setAuthHandlers(null);
  }, [navigate, syncUserFromServer]);

  const setAuth = useCallback(
    (token: string, newUser: AuthUser) => {
      setAccessToken(token);
      setUser(newUser);
      void syncUserFromServer(token, newUser);
    },
    [syncUserFromServer],
  );

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    clearSession();
  }, []);

  const hasPermission = useCallback(
    (permissionKey: string): boolean => {
      if (!user) return false;
      if (user.role === 'owner') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
    },
    [user],
  );

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    if (!accessToken) return null;
    return syncUserFromServer(accessToken, user);
  }, [accessToken, syncUserFromServer, user]);

  if (isRestoring) {
    return null;
  }
  return (
    <AuthContext.Provider
      value={{ accessToken, user, setAuth, clearAuth, hasPermission, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
