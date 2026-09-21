import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserDto } from '../api/types';
import { authApi } from '../api/endpoints';
import { getMe, isAccessTokenExpired, tokenStore, tryRefresh } from '../api/client';

interface AuthContextValue {
  user: UserDto | null;
  booting: boolean;
  login: (userName: string, password: string) => Promise<void>;
  register: (userName: string, password: string, email?: string, phoneNumber?: string, address?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserDto) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const BOOT_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (!cancelled) setBooting(false);
    };

    // Safety net: if the boot effect hangs for any reason, force booting to false
    // so the user always sees the login/home screen rather than a stuck spinner.
    timer = setTimeout(finish, BOOT_TIMEOUT_MS);

    (async () => {
      try {
        const access = await tokenStore.accessToken();
        if (!access) return;
        // If the access token is already past its expiry, go straight to refresh
        // instead of firing a doomed /me request (avoids a spurious 401 in the console).
        if (await isAccessTokenExpired()) {
          const refreshed = await tryRefresh();
          if (!refreshed) return;
          const me = await getMe();
          if (!cancelled) setUser(me);
          return;
        }
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch {
        await tokenStore.clear();
      } finally {
        finish();
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const login = async (userName: string, password: string) => {
    const result = await authApi.login(userName, password);
    await tokenStore.setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  };

  const register = async (userName: string, password: string, email?: string, phoneNumber?: string, address?: string, name?: string) => {
    const result = await authApi.register(userName, password, email, phoneNumber, address, name);
    await tokenStore.setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  };

  const logout = async () => {
    const refreshToken = await tokenStore.refreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // best effort
      }
    }
    await tokenStore.clear();
    setUser(null);
  };

  const updateUser = (updated: UserDto) => setUser(updated);

  const value = useMemo(
    () => ({ user, booting, login, register, logout, updateUser }),
    [user, booting, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
