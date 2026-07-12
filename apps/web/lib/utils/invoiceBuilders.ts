import type { CustomerProfile, SaleDetail, SaleStatus, StockMovement } from "@vonos/types";
import type {
  InvoiceContact,
  InvoiceDocumentKind,
  InvoiceLineItem,
} from "@/components/organisms/InvoiceDocument";

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
  customer?: Pick<CustomerProfile, "email" | "phone" | "businessName"> | null,
): InvoiceContact {
  return {
    name: sale.customerName,
    email: customer?.email,
    phone: customer?.phone,
    businessName: customer?.businessName,
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
