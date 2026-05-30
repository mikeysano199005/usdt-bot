'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, setToken, clearToken } from '@/lib/auth';
import { AdminInfo } from '@/lib/types';

interface AuthContextValue {
  token: string | null;
  admin: AdminInfo | null;
  login: (token: string, admin: AdminInfo) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    const a = localStorage.getItem('usdt_admin_info');
    if (t) setTokenState(t);
    if (a) setAdmin(JSON.parse(a));
    setIsReady(true);
  }, []);

  const login = (t: string, a: AdminInfo) => {
    setToken(t);
    localStorage.setItem('usdt_admin_info', JSON.stringify(a));
    setTokenState(t);
    setAdmin(a);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ token, admin, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
