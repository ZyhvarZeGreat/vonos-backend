import { apiUrl } from "@/lib/api/client";
import type { SaleDetail, SalePaymentViewRow } from "@vonos/types";

export type PublicInvoicePayment = SalePaymentViewRow;

export type PublicInvoice = {
  token: string;
  businessName: string;
  businessSection?: string | null;
  businessLocation: string | null;
  businessLocationAddress: string | null;
  businessAddress: string | null;
  businessMobile: string | null;
  businessMobileSecondary?: string | null;
  businessEmail: string | null;
  sale: SaleDetail;
  payments: PublicInvoicePayment[];
  /** Legacy flat fields */
  reference: string;
  date: string;
  paymentStatus: string | null;
  currency: string;
  total: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  lines: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

/** Unauthenticated public invoice fetch (HQ6 share link). */
export async function getPublicInvoice(token: string): Promise<PublicInvoice> {
  const response = await fetch(
    apiUrl(`/public/invoices/${encodeURIComponent(token)}`),
    {
      credentials: "omit",
    },
  );
  if (!response.ok) throw new Error("Invoice not found");
  return response.json();
}
