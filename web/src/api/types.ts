export interface NamedEntity {
  id: number;
  name: string;
  isActive: boolean;
}

export interface UnitOfMeasurement extends NamedEntity {
  symbol?: string | null;
}

export interface Country extends NamedEntity {
  code: string;
  phoneCode?: string | null;
  currencyCode?: string | null;
}

export interface ProductType extends NamedEntity {
  description?: string | null;
}

export interface ProductGroup extends NamedEntity {
  description?: string | null;
}

export interface Warehouse extends NamedEntity {
  code?: string | null;
  address?: string | null;
}

export interface DeliveryMethod extends NamedEntity {
  logoUrl?: string | null;
  payments?: PaymentMethod[];
}

export interface PaymentMethod extends NamedEntity {
  deliveryMethodId: number;
  logoUrl?: string | null;
}

export interface Product extends NamedEntity {
  sku: string;
  shopId: number;
  unitOfMeasurementId: number;
  productTypeId: number;
  productGroupId: number;
  reorderLevel: number;
  buyPrice: number;
  sellPrice: number;
  discountPercent?: number | null;
  effectivePrice: number;
  imageUrl?: string | null;
  unitOfMeasurement?: UnitOfMeasurement | null;
  productType?: ProductType | null;
  productGroup?: ProductGroup | null;
}

export interface ProductImage {
  id: number;
  productId: number;
  sortOrder: number;
  url: string;
}

export type ProductInput = {
  id?: number;
  name: string;
  sku: string;
  shopId: number;
  unitOfMeasurementId: number;
  productTypeId: number;
  productGroupId: number;
  reorderLevel: number;
  buyPrice: number;
  sellPrice: number;
  discountPercent?: number | null;
  isActive: boolean;
};

export interface Shop {
  id: number;
  name: string;
  code: string;
  notes?: string | null;
  isActive: boolean;
  countryId?: number | null;
  logoUrl?: string | null;
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

export type ShopDto = Omit<Shop, 'id' | 'logoUrl'>;


export interface UserDto {
  id: string;
  userName: string;
  email?: string | null;
  isActive: boolean;
  roles: string[];
  shopId?: number | null;
  phoneNumber?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: UserDto;
}

export interface CreateUserRequest {
  userName: string;
  email?: string | null;
  password: string;
  roles: string[];
  shopId?: number | null;
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

export interface TransferDocumentRequest {
  fromWarehouseId: number;
  toWarehouseId: number;
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

export interface StockLineBalanceDto {
  productId: number;
  warehouseId: number;
  quantity: number;
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
  balances?: StockLineBalanceDto[] | null;
}

export interface InventoryBalance {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product?: Product | null;
  warehouse?: Warehouse | null;
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
  customerUserId: string;
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
  items: CustomerOrderItem[];
  shop?: Shop | null;
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
