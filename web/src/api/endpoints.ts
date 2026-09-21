import { api, apiUploadFile } from './http';
import type {
  CreateUserRequest,
  CustomerOrder,
  DeliveryMethod,
  InventoryBalance,
  InventoryTransaction,
  LoginResponse,
  PaymentMethod,
  Product,
  ProductImage,
  ProductInput,
  PublicShop,
  Shop,
  ShopDto,
  StockDocumentDto,
  StockDocumentRequest,
  TransferDocumentRequest,
  UserDto,
} from './types';
export const authApi = {
  login: (body: { userName: string; password: string }) =>
    api<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api<UserDto>('/api/auth/me'),
  logout: () => api<void>('/api/auth/logout', { method: 'POST' }),
};

export const masterDataApi = {
  list: <T>(kind: string) => api<T[]>(`/api/master-data/${kind}`),
  create: <T>(kind: string, body: unknown) => api<T>(`/api/master-data/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
  update: <T>(kind: string, id: number, body: unknown) =>
    api<T>(`/api/master-data/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (kind: string, id: number) => api<void>(`/api/master-data/${kind}/${id}`, { method: 'DELETE' }),
};

export const productsApi = {
  list: () => api<Product[]>('/api/products'),
  create: (body: ProductInput) => api<Product>('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: ProductInput) => api<void>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => api<void>(`/api/products/${id}`, { method: 'DELETE' }),
  listImages: (id: number) => api<ProductImage[]>(`/api/products/${id}/images`),
  uploadImage: (id: number, file: File) => apiUploadFile<ProductImage>(`/api/products/${id}/images`, file),
  reorderImages: (id: number, imageIds: number[]) =>
    api<void>(`/api/products/${id}/images/reorder`, { method: 'PUT', body: JSON.stringify({ imageIds }) }),
  deleteImage: (id: number, imageId: number) => api<void>(`/api/products/${id}/images/${imageId}`, { method: 'DELETE' }),
};

export const inventoryApi = {
  balances: (warehouseId?: number) =>
    api<InventoryBalance[]>(`/api/inventory/balances${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  transactions: (params?: { warehouseId?: number; documentId?: number }) => {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
    if (params?.documentId) query.set('documentId', String(params.documentId));
    const qs = query.toString();
    return api<InventoryTransaction[]>(`/api/inventory/transactions${qs ? `?${qs}` : ''}`);
  },
  documents: (kind: 'purchases' | 'sales' | 'transfers') => api<StockDocumentDto[]>(`/api/inventory/${kind}`),
  document: (kind: 'purchases' | 'sales' | 'transfers', id: number) => api<StockDocumentDto>(`/api/inventory/${kind}/${id}`),
  postPurchase: (body: StockDocumentRequest) =>
    api<StockDocumentDto>('/api/inventory/purchases', { method: 'POST', body: JSON.stringify(body) }),
  postSale: (body: StockDocumentRequest) =>
    api<StockDocumentDto>('/api/inventory/sales', { method: 'POST', body: JSON.stringify(body) }),
  postTransfer: (body: TransferDocumentRequest) =>
    api<StockDocumentDto>('/api/inventory/transfers', { method: 'POST', body: JSON.stringify(body) }),
};

export const usersApi = {
  list: () => api<UserDto[]>('/api/users'),
  create: (body: CreateUserRequest) => api<UserDto>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  setRoles: (id: string, roles: string[], shopId?: number | null) =>
    api<void>('/api/users/' + id + '/roles', { method: 'PUT', body: JSON.stringify({ roles, shopId }) }),
  setActive: (id: string, isActive: boolean) =>
    api<void>(`/api/users/${id}/active`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  resetPassword: (id: string, newPassword: string) =>
    api<void>(`/api/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  remove: (id: string) => api<void>(`/api/users/${id}`, { method: 'DELETE' }),
};

export const shopsApi = {
  list: () => api<Shop[]>('/api/shops'),
  public: () => api<PublicShop>('/api/shops/public'),
  create: (body: ShopDto) => api<Shop>('/api/shops', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: ShopDto) => api<Shop>('/api/shops/' + id, { method: 'PUT', body: JSON.stringify({ ...body, id }) }),
  remove: (id: number) => api<void>('/api/shops/' + id, { method: 'DELETE' }),
  uploadLogo: (id: number, file: File) => apiUploadFile<Shop>(`/api/shops/${id}/logo`, file),
  deliveryMethods: (id: number) => api<DeliveryMethod[]>(`/api/shops/${id}/delivery-methods`),
  setDeliveryMethods: (id: number, deliveryMethodIds: number[]) =>
    api<void>(`/api/shops/${id}/delivery-methods`, { method: 'PUT', body: JSON.stringify({ deliveryMethodIds }) }),
};

export const deliveryApi = {
  list: () => api<DeliveryMethod[]>('/api/delivery-methods'),
  create: (body: { name: string; isActive: boolean }) =>
    api<DeliveryMethod>('/api/delivery-methods', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; isActive: boolean }) =>
    api<void>(`/api/delivery-methods/${id}`, { method: 'PUT', body: JSON.stringify({ ...body, id }) }),
  remove: (id: number) => api<void>(`/api/delivery-methods/${id}`, { method: 'DELETE' }),
  uploadLogo: (id: number, file: File) => apiUploadFile<DeliveryMethod>(`/api/delivery-methods/${id}/logo`, file),
  payments: (deliveryId: number) => api<PaymentMethod[]>(`/api/delivery-methods/${deliveryId}/payments`),
  addPayment: (deliveryId: number, body: { name: string; isActive: boolean }) =>
    api<PaymentMethod>(`/api/delivery-methods/${deliveryId}/payments`, { method: 'POST', body: JSON.stringify(body) }),
  updatePayment: (id: number, body: { name: string; isActive: boolean; deliveryMethodId: number }) =>
    api<void>(`/api/delivery-methods/payments/${id}`, { method: 'PUT', body: JSON.stringify({ ...body, id }) }),
  removePayment: (id: number) => api<void>(`/api/delivery-methods/payments/${id}`, { method: 'DELETE' }),
  uploadPaymentLogo: (id: number, file: File) =>
    apiUploadFile<PaymentMethod>(`/api/delivery-methods/payments/${id}/logo`, file),
};

export const ordersApi = {
  admin: () => api<CustomerOrder[]>('/api/orders/admin'),
  get: (id: number) => api<CustomerOrder>(`/api/orders/${id}`),
  uploadProof: (id: number, file: File) => apiUploadFile<CustomerOrder>(`/api/orders/${id}/proof`, file),
  approve: (id: number, note?: string | null) =>
    api<{ message: string }>(`/api/orders/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) }),
  reject: (id: number, reason: string) =>
    api<{ message: string }>(`/api/orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  deliver: (id: number) => api<{ message: string }>(`/api/orders/${id}/deliver`, { method: 'POST' }),
};
