import type { CustomerProfile, InvoiceDetail, InvoiceKind, SaleDetail, SaleStatus, StockMovement } from "@vonos/types";
import type {
  InvoiceContact,
  InvoiceDocumentKind,
  InvoiceLineItem,
} from "@/components/organisms/InvoiceDocument";

const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  sale: "Sale",
  purchase: "Purchase",
  expense: "Expense",
  payroll: "Payroll Slip",
  payroll_group: "Payroll Batch",
  job_invoice: "Job Invoice",
  job_quote: "Job Quote",
};

export function invoiceKindLabel(kind: InvoiceKind): string {
  return INVOICE_KIND_LABELS[kind];
}

export function invoiceDetailDocumentKind(
  kind: InvoiceKind,
  paymentStatus?: string | null,
  status?: string | null,
): InvoiceDocumentKind {
  if (kind === "purchase") return "purchase";
  if (kind === "job_quote") return "quotation";
  if (kind === "sale" && (status === "quotation" || status === "draft")) {
    return "quotation";
  }
  if (paymentStatus === "paid") return "receipt";
  return "invoice";
}

export function invoiceDetailToLines(detail: InvoiceDetail): InvoiceLineItem[] {
  return detail.lineItems.map((line: InvoiceDetail["lineItems"][number]) => ({
    label: line.label,
    kind: line.kind,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    total: line.total,
  }));
}

export function invoiceDetailToContact(detail: InvoiceDetail): InvoiceContact {
  return {
    name: detail.contactName ?? "—",
  };
}

export function invoiceDetailSubtotal(detail: InvoiceDetail): number {
  if (detail.subtotal != null) return detail.subtotal;
  return detail.lineItems.reduce(
    (sum: number, line: InvoiceDetail["lineItems"][number]) => sum + line.total,
    0,
  );
}

export function saleDocumentKind(
  recordStatus?: SaleStatus | null,
  paymentStatus?: string | null,
): InvoiceDocumentKind {
  if (recordStatus === "quotation") return "quotation";
  if (recordStatus === "draft") return "quotation";
  if (paymentStatus === "paid") return "receipt";
  return "invoice";
}

export function saleToInvoiceLines(sale: SaleDetail): InvoiceLineItem[] {
  return sale.lines.map((line) => ({
    label: line.name,
    kind: line.sku,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    total: line.lineTotal,
  }));
}

export function saleToInvoiceContact(
  sale: SaleDetail,
  customer?: Pick<
    CustomerProfile,
    "email" | "phone" | "businessName"
  > | null,
): InvoiceContact {
  return {
    name: sale.customerName,
    email: customer?.email ?? sale.customerEmail ?? undefined,
    phone: customer?.phone ?? sale.customerPhone ?? undefined,
    businessName:
      customer?.businessName ?? sale.customerBusinessName ?? undefined,
  };
}

export function movementToPurchaseLines(movement: StockMovement): InvoiceLineItem[] {
  return movement.lines.map((line) => ({
    label: line.name ?? line.sku,
    kind: line.sku,
    quantity: line.quantity,
    unitPrice: line.unitCost ?? 0,
    total: (line.unitCost ?? 0) * line.quantity,
  }));
}

export function customerStatementLines(
  profile: CustomerProfile,
): InvoiceLineItem[] {
  return profile.transactionHistory.map((entry) => ({
    label: entry.reference,
    kind: entry.kind,
    quantity: 1,
    unitPrice: entry.amount,
    total: entry.amount,
  }));
}
