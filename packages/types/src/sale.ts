/** UI-facing labels — matches StatusPill `saleReturnStatus` vocabulary */
export const SALE_RETURN_STATUSES = [
  "Completed",
  "Refunded",
  "Restocked",
  "Written Off",
] as const;

export type SaleReturnStatus = (typeof SALE_RETURN_STATUSES)[number];

/** Stored on Sale records (Prisma / API) */
export const SALE_STATUSES = [
  "completed",
  "refunded",
  "partially_refunded",
  "written_off",
  "draft",
  "quotation",
] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];

export const PAYMENT_STATUSES = ["paid", "partial", "due"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface SaleLine {
  id: string;
  saleId: string;
  itemId: string | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountAmount: number | null;
}

/** List / summary shape */
export const SHIPPING_STATUSES = [
  "pending",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export interface Sale {
  id: string;
  tenantId: string;
  reference: string;
  customerId: string | null;
  customerName: string;
  total: number;
  currency: string;
  status: SaleReturnStatus;
  /** Stored DB status (draft, quotation, completed, …) for documents and filters. */
  recordStatus?: SaleStatus;
  paymentStatus: PaymentStatus | null;
  locationCode: string | null;
  shippingStatus?: ShippingStatus | null;
  shippingAddress?: string | null;
  trackingNumber?: string | null;
  itemCount: number;
  date: string;
  discountAmount: number | null;
  taxAmount: number | null;
  notes: string | null;
  originalSaleId?: string | null;
  originalSaleReference?: string | null;
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Detail view includes line items */
export interface SaleDetail extends Sale {
  lines: SaleLine[];
}

export interface SaleFilters {
  status?: SaleReturnStatus;
  /** Filter by stored sale status (draft, quotation, completed, etc.). */
  saleStatus?: SaleStatus;
  /** When true, only sales mapped to return statuses (Refunded / Restocked). */
  returnsOnly?: boolean;
  /** When true, only sales with a shipping status set. */
  shipmentsOnly?: boolean;
  customerId?: string;
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface CreateSaleLineRequest {
  itemId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface CreateSalePaymentRequest {
  amount: number;
  method?: string;
  note?: string;
  accountId?: string;
}

export interface CreateSaleRequest {
  reference: string;
  customerName?: string;
  locationCode?: string;
  lines: CreateSaleLineRequest[];
  currency?: string;
  date?: string;
  /** DB status. Use `final` as alias for `completed`. Draft/quotation skip stock and ledger. */
  status?: SaleStatus | "final";
  shippingStatus?: ShippingStatus;
  shippingAddress?: string;
  trackingNumber?: string;
  /** When omitted, a single payment for the sale total is recorded as cash. */
  payments?: CreateSalePaymentRequest[];
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
}

export interface UpdateSaleShippingRequest {
  shippingStatus?: ShippingStatus | null;
  shippingAddress?: string | null;
  trackingNumber?: string | null;
}

export const SALE_RETURN_DISPOSITIONS = [
  "refunded",
  "restocked",
  "written_off",
] as const;

export type SaleReturnDisposition = (typeof SALE_RETURN_DISPOSITIONS)[number];

export interface CreateSaleReturnLineRequest {
  saleLineId: string;
  quantity: number;
}

export interface CreateSaleReturnRequest {
  disposition: SaleReturnDisposition;
  notes?: string;
  /** Omit to return all lines at full quantity. */
  lines?: CreateSaleReturnLineRequest[];
}
