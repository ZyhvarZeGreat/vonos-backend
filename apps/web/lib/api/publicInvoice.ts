import { apiUrl } from "@/lib/api/client";

export type PublicInvoicePayment = {
  id: string;
  amount: number;
  currency: string;
  method: string | null;
  paymentRefNo: string | null;
  paidOn: string | null;
  note: string | null;
  accountName: string | null;
};

export type PublicInvoice = {
  token: string;
  reference: string;
  date: string;
  paymentStatus: string | null;
  currency: string;
  total: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  businessName: string;
  businessLocation: string | null;
  businessMobile: string | null;
  businessEmail: string | null;
  lines: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  payments: PublicInvoicePayment[];
};

/** Unauthenticated public invoice fetch (HQ6 share link). */
export async function getPublicInvoice(token: string): Promise<PublicInvoice> {
  const response = await fetch(apiUrl(`/public/invoices/${encodeURIComponent(token)}`), {
    credentials: "omit",
  });
  if (!response.ok) throw new Error("Invoice not found");
  return response.json();
}
