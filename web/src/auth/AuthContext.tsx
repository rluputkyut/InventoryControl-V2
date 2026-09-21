import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import { refreshAccessToken, setAccessToken } from '../api/http';
import type { UserDto } from '../api/types';

interface AuthContextValue {
  user: UserDto | null;
  booting: boolean;
  hasRole: (...roles: string[]) => boolean;
  login: (userName: string, password: string) => Promise<UserDto>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // On a hard refresh the access token lives only in memory; restore it
        // from the refresh cookie before validating the session.
        await refreshAccessToken();
        if (cancelled) return;
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    const result = await authApi.login({ userName, password });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // token already invalid; fall through
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: string[]) => (user ? roles.some((r) => user.roles.includes(r)) : false), [user]);

  return (
    <AuthContext.Provider value={{ user, booting, hasRole, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}