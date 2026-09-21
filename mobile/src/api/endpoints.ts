import type {
  AddressSuggestion,
  CheckoutOptions,
  CreateOrderRequest,
  CustomerOrder,
  InventoryBalance,
  InventoryTransaction,
  MobileAuthResponse,
  Product,
  ProductImage,
  PublicShop,
  StockDocumentDto,
  StockDocumentRequest,
  UpdateProfileRequest,
  UserDto,
  Warehouse,
} from './types';
import { API_URL } from '../config';
import { apiFetch, apiUploadForm } from './client';
import type { UploadFile } from './client';

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const parsed = (await res.json()) as { message?: string };
      if (parsed?.message) message = parsed.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const authApi = {
  login: (userName: string, password: string) => publicPost<MobileAuthResponse>('/api/auth/mobile/login', { userName, password }),
  register: (userName: string, password: string, email?: string, phoneNumber?: string, address?: string, name?: string) =>
    publicPost<MobileAuthResponse>('/api/auth/register', {
      userName,
      password,
      email: email || null,
      phoneNumber: phoneNumber || null,
      address: address || null,
      name: name || null,
    }),
  logout: (refreshToken: string) => publicPost<unknown>('/api/auth/mobile/logout', { refreshToken }),
  me: () => apiFetch<UserDto>('/api/auth/me'),
  updateProfile: (body: UpdateProfileRequest) =>
    apiFetch<UserDto>('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
};

export const catalogApi = {
  products: () => apiFetch<Product[]>('/api/products'),
  productImages: (id: number) => apiFetch<ProductImage[]>(`/api/products/${id}/images`),
  warehouses: () => apiFetch<Warehouse[]>('/api/master-data/warehouses'),
};

export const shopApi = {
  public: () => apiFetch<PublicShop>('/api/shops/public'),
};

export const addressApi = {
  autocomplete: (q: string, country?: string) =>
    apiFetch<AddressSuggestion[]>(
      `/api/addresses/autocomplete?q=${encodeURIComponent(q)}${country ? `&country=${encodeURIComponent(country)}` : ''}`,
    ),
};

export const checkoutApi = {
  options: () => apiFetch<CheckoutOptions>('/api/checkout/options'),
};

export const inventoryApi = {
  balances: (warehouseId?: number) =>
    apiFetch<InventoryBalance[]>(
      warehouseId ? `/api/inventory/balances?warehouseId=${warehouseId}` : '/api/inventory/balances',
    ),
  transactions: () => apiFetch<InventoryTransaction[]>('/api/inventory/transactions'),
  documents: (kind: 'purchases' | 'sales' | 'transfers') => apiFetch<StockDocumentDto[]>(`/api/inventory/${kind}`),
  document: (kind: 'purchases' | 'sales' | 'transfers', id: number) => apiFetch<StockDocumentDto>(`/api/inventory/${kind}/${id}`),
  postPurchase: (request: StockDocumentRequest) =>
    apiFetch<StockDocumentDto>('/api/inventory/purchases', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
};

export const ordersApi = {
  listMy: () => apiFetch<CustomerOrder[]>('/api/orders/my'),
  get: (id: number) => apiFetch<CustomerOrder>(`/api/orders/${id}`),
  create: (request: CreateOrderRequest) =>
    apiFetch<CustomerOrder>('/api/orders', { method: 'POST', body: JSON.stringify(request) }),
  uploadProof: (id: number, file: UploadFile) => apiUploadForm<CustomerOrder>(`/api/orders/${id}/proof`, file),
};