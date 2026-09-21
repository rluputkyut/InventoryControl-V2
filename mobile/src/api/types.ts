export interface UserDto {
  id: string;
  userName: string;
  email?: string | null;
  isActive: boolean;
  roles: string[];
  phoneNumber?: string | null;
  address?: string | null;
  name?: string | null;
}

export interface UpdateProfileRequest {
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  name?: string | null;
}

export interface MobileAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: UserDto;
}

export interface NamedEntity {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Product extends NamedEntity {
  sku: string;
  reorderLevel: number;
  buyPrice: number;
  sellPrice: number;
  discountPercent?: number | null;
  effectivePrice: number;
  imageUrl?: string | null;
  unitOfMeasurement?: NamedEntity | null;
  productType?: NamedEntity | null;
  productGroup?: NamedEntity | null;
}

export interface PublicShop {
  id: number;
  name: string;
  code: string;
  logoUrl?: string | null;
  countryCode?: string | null;
  countryPhoneCode?: string | null;
  countryCurrencyCode?: string | null;
}

export interface DeliveryMethod extends NamedEntity {
  logoUrl?: string | null;
}

export interface PaymentMethod extends NamedEntity {
  deliveryMethodId: number;
  logoUrl?: string | null;
}

export interface CheckoutDelivery {
  id: number;
  name: string;
  logoUrl?: string | null;
  payments: CheckoutPayment[];
}

export interface CheckoutPayment {
  id: number;
  name: string;
  logoUrl?: string | null;
}

export interface CheckoutOptions {
  deliveries: CheckoutDelivery[];
}

export interface AddressSuggestion {
  id: string;
  text: string;
  description?: string | null;
}

export type CustomerOrderStatus = 'PendingApproval' | 'Approved' | 'Delivered' | 'Rejected';

export interface CustomerOrderItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrder {
  id: number;
  number: string;
  shopId: number;
  status: CustomerOrderStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentProofUrl?: string | null;
  notes?: string | null;
  adminNote?: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAtUtc: string;
  approvedAtUtc?: string | null;
  deliveredAtUtc?: string | null;
  saleDocumentId?: number | null;
  deliveryMethodId?: number | null;
  paymentMethodId?: number | null;
  deliveryMethod?: DeliveryMethod | null;
  paymentMethod?: PaymentMethod | null;
  items: CustomerOrderItem[];
}

export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  deliveryMethodId: number;
  paymentMethodId: number;
  notes?: string | null;
  items: OrderItemRequest[];
}

export interface ProductImage {
  id: number;
  productId: number;
  sortOrder: number;
  url: string;
}

export interface Warehouse extends NamedEntity {
  code?: string | null;
}

export interface InventoryBalance {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product?: Product | null;
  warehouse?: Warehouse | null;
}

export type TransactionType = 'Purchase' | 'Sale' | 'TransferOut' | 'TransferIn';

export interface InventoryTransaction {
  id: number;
  type: TransactionType;
  productId: number;
  warehouseId: number;
  stockDocumentId?: number | null;
  quantity: number;
  unitPrice: number;
  referenceNo?: string | null;
  notes?: string | null;
  occurredAtUtc: string;
  product?: Product | null;
  warehouse?: Warehouse | null;
}

export interface StockLineRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface StockDocumentRequest {
  warehouseId: number;
  referenceNo?: string | null;
  notes?: string | null;
  lines: StockLineRequest[];
}

export interface StockLineDto {
  id: number;
  lineNumber: number;
  productId: number;
  productName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface StockDocumentDto {
  id: number;
  type: 'Purchase' | 'Sale' | 'Transfer';
  warehouseId?: number | null;
  fromWarehouseId?: number | null;
  toWarehouseId?: number | null;
  referenceNo?: string | null;
  notes?: string | null;
  occurredAtUtc: string;
  totalAmount: number;
  postedByUserId?: string | null;
  lines?: StockLineDto[] | null;
}