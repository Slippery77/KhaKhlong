import { createContext, useContext, useState } from 'react';
import type { AuthUser } from '../types/auth.types';

interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

const TOKEN_KEY = 'pos_access_token';
const USER_KEY  = 'pos_user';

function readSession(): { token: string | null; user: AuthUser | null } {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const raw   = sessionStorage.getItem(USER_KEY);
    const user  = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // อ่านจาก sessionStorage ตอน mount — รอด refresh / navigate
  const [accessToken, setAccessToken] = useState<string | null>(
    () => readSession().token,
  );
  const [user, setUser] = useState<AuthUser | null>(
    () => readSession().user,
  );

  const setAuth = (token: string, newUser: AuthUser) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setAccessToken(token);
    setUser(newUser);
  };

  const clearAuth = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setAccessToken(null);
    setUser(null);
  };

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
