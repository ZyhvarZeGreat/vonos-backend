export const STOCK_STATUSES = [
  "in_stock",
  "low_stock",
  "out_of_stock",
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

/** Per-location quantity breakdown for an item (branch/counter + qty). */
export interface ItemLocationStock {
  locationCode: string;
  binLocation: string | null;
  quantity: number;
}

/** Input shape when writing per-location stock rows (create/update). */
export interface ItemLocationStockInput {
  locationCode: string;
  binLocation?: string | null;
  quantity: number;
}

export interface Item {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  binLocation: string | null;
  locationCode: string | null;
  reorderPoint: number | null;
  costPrice: number;
  currency: string;
  status: StockStatus;
  availableForRetail: boolean;
  /** Per-location breakdown; `quantity` above is the sum across these. */
  locationStock: ItemLocationStock[];
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFilters {
  status?: StockStatus;
  category?: string;
  search?: string;
  locationCode?: string;
  cursor?: string;
  limit?: number;
}

export interface KpiSummary {
  totalSku: number;
  todayInbound: number;
  todayOutbound: number;
  stockValue: number;
  currency: string;
}
