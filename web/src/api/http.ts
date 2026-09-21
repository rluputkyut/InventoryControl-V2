import type { LoginResponse } from './types';

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5023';

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const data = (await res.json()) as LoginResponse;
      accessToken = data.accessToken;
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  try {
    const body: unknown = await res.json();
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.length > 0) message = m;
    }
  } catch {
    // response had no JSON body
  }
  return new ApiError(message, res.status);
}

async function fetchWithAuth(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await fetchWithAuth(path, init, accessToken);

  if (res.status === 401 && !path.startsWith('/api/auth')) {
    const token = await refreshAccessToken();
    if (token) res = await fetchWithAuth(path, init, token);
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Fetches a binary resource with auth and returns an object URL to display in an <img> (caller revokes it). */
export async function apiObjectUrl(path: string): Promise<string | null> {
  let res = await fetchWithAuth(path, {}, accessToken);

  if (res.status === 401 && !path.startsWith('/api/auth')) {
    const token = await refreshAccessToken();
    if (token) res = await fetchWithAuth(path, {}, token);
  }

  if (res.status === 404) return null;
  if (!res.ok) throw await parseError(res);
  return URL.createObjectURL(await res.blob());
}

/** Uploads a file (multipart) with auth and returns the created resource. */
export async function apiUploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  let res = await fetchWithAuth(path, { method: 'POST', body: form }, accessToken);

  if (res.status === 401 && !path.startsWith('/api/auth')) {
    const token = await refreshAccessToken();
    if (token) res = await fetchWithAuth(path, { method: 'POST', body: form }, token);
  }

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}