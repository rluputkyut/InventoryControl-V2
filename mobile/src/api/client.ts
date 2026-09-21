import { secureStorage } from '../lib/secureStorage';
import type { MobileAuthResponse, UserDto } from './types';
import { API_URL } from '../config';

const ACCESS_TOKEN_KEY = 'ic.accessToken';
const REFRESH_TOKEN_KEY = 'ic.refreshToken';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStore = {
  setTokens(accessToken: string, refreshToken: string): void {
    void secureStorage.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    void secureStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  accessToken(): Promise<string | null> {
    return secureStorage.getItemAsync(ACCESS_TOKEN_KEY);
  },
  refreshToken(): Promise<string | null> {
    return secureStorage.getItemAsync(REFRESH_TOKEN_KEY);
  },
  clear(): Promise<void> {
    return Promise.all([secureStorage.deleteItemAsync(ACCESS_TOKEN_KEY), secureStorage.deleteItemAsync(REFRESH_TOKEN_KEY)]).then(() => undefined);
  },
};

/** True when the stored access token is missing or already past its JWT `exp`. */
export async function isAccessTokenExpired(): Promise<boolean> {
  const token = await tokenStore.accessToken();
  if (!token) return true;
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const data = JSON.parse(atob(padded)) as { exp?: number };
    const exp = typeof data.exp === 'number' ? data.exp : undefined;
    return exp === undefined ? false : exp * 1000 <= Date.now() + 5000;
  } catch {
    return false;
  }
}

async function bodyMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    const parsed = JSON.parse(text) as { message?: string };
    if (parsed?.message) return parsed.message;
    if (text) return text;
  } catch {
    // fall through
  }
  return `Request failed (${res.status}).`;
}

let refreshing: Promise<boolean> | null = null;

export async function tryRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.refreshToken();
  if (!refreshToken) return false;

  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/mobile/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          await tokenStore.clear();
          return false;
        }
        const data = (await res.json()) as MobileAuthResponse;
        await tokenStore.setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        await tokenStore.clear();
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, init: RequestInit & { retry?: boolean } = {}): Promise<T> {
  const access = await tokenStore.accessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string> | undefined) ?? {}),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && !init.retry) {
    if (await tryRefresh()) return apiFetch<T>(path, { ...init, retry: true });
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (!res.ok) throw new ApiError(res.status, await bodyMessage(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getMe(): Promise<UserDto> {
  return apiFetch<UserDto>('/api/auth/me');
}

/** Fetches an authenticated image and returns a base64 data URI for <Image source>. Returns null on 404. */
export async function apiImage(path: string): Promise<string | null> {
  const access = await tokenStore.accessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });

  if (res.status === 401) {
    if (await tryRefresh()) return apiImage(path);
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, await bodyMessage(res));

  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(blob);
  });
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/** Uploads a file via multipart form data (used for payment-proof screenshots). */
export async function apiUploadForm<T>(path: string, file: UploadFile): Promise<T> {
  const access = await tokenStore.accessToken();
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);

  const headers: Record<string, string> = access ? { Authorization: `Bearer ${access}` } : {};
  let res = await fetch(`${API_URL}${path}`, { method: 'PUT', body: form, headers });

  if (res.status === 401) {
    if (await tryRefresh()) {
      const refreshed = await tokenStore.accessToken();
      res = await fetch(`${API_URL}${path}`, {
        method: 'PUT',
        body: form,
        headers: refreshed ? { Authorization: `Bearer ${refreshed}` } : {},
      });
    } else {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!res.ok) throw new ApiError(res.status, await bodyMessage(res));
  return (await res.json()) as T;
}