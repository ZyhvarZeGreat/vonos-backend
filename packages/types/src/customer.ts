export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Aggregated from sales — not stored on Customer row */
  totalSpend: number;
  /** Aggregated from sales — not stored on Customer row */
  visitCount: number;
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  /** HQ6 list parity fields */
  contactId?: string | null;
  businessName?: string | null;
  taxNumber?: string | null;
  openingBalance?: number;
  totalSell?: number;
  totalSellDue?: number;
  totalSellPaid?: number;
  status?: "active" | "inactive";
}

export interface CustomerFilters {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
}

export type CustomerTransactionKind = "sale" | "job" | "appointment";

export interface CustomerTransactionHistoryEntry {
  id: string;
  kind: CustomerTransactionKind;
  reference: string;
  date: string;
  amount: number;
  currency: string;
  status?: string;
  paymentStatus?: string | null;
}

/** Customer detail with purchase/job history for profile + invoices */
export interface CustomerProfile extends Customer {
  transactionHistory: CustomerTransactionHistoryEntry[];
}
