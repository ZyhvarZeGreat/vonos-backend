import type {
  Customer,
  CustomerContact,
  PurchasePaymentStatus,
  Sale,
  SaleReturnStatus,
  StockMovement,
  StockMovementListRow,
} from "@vonos/types";
import type { Order, SaleReturnRow } from "@/lib/types/entityRows";

/** Instant purchase/movement modal frame from a list row. */
export function stockMovementSeedFromListRow(
  row: StockMovementListRow,
  type: StockMovement["type"] = "inbound",
): StockMovement {
  const paymentStatus =
    row.paymentStatus === "paid" ||
    row.paymentStatus === "partial" ||
    row.paymentStatus === "due"
      ? (row.paymentStatus as PurchasePaymentStatus)
      : null;

  return {
    id: row.id,
    tenantId: "",
    type,
    reference: row.reference,
    status: row.status,
    lines: [],
    notes: row.notes ?? null,
    locationCode: row.locationCode ?? null,
    supplierId: row.supplierId ?? null,
    source: null,
    paymentStatus,
    paymentMethod: row.paymentMethod ?? null,
    date: row.date,
    createdAt: row.date,
    updatedAt: row.date,
  };
}

/** Instant sell modal frame from a return list row. */
export function saleSeedFromReturnRow(row: SaleReturnRow): Sale {
  return {
    id: row.id,
    tenantId: row.tenantId,
    reference: row.reference || row.saleReference,
    customerId: null,
    customerName: row.customerName,
    total: row.amount,
    currency: "NGN",
    status: (row.status as SaleReturnStatus) || "Completed",
    paymentStatus: null,
    locationCode: null,
    itemCount: 0,
    date: row.date,
    discountAmount: null,
    taxAmount: null,
    notes: null,
    createdAt: row.date,
    updatedAt: row.date,
  };
}

/** Instant sell modal frame from an order list row. */
export function saleSeedFromOrder(row: Order): Sale {
  return {
    id: row.id,
    tenantId: row.tenantId,
    reference: row.reference,
    customerId: null,
    customerName: row.tableNumber
      ? `Table ${row.tableNumber}`
      : "Takeaway",
    total: row.total,
    currency: row.currency,
    status: "Completed",
    paymentStatus: null,
    locationCode: null,
    itemCount: row.itemCount,
    date: row.saleDate ?? row.createdAt,
    discountAmount: null,
    taxAmount: null,
    notes: null,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
  };
}

/** Instant customer modal frame from a list row. */
export function customerContactSeedFromList(row: Customer): CustomerContact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    totalSellDue: row.totalSellDue ?? 0,
    totalAdvance: row.totalAdvance ?? 0,
    visitCount: row.visitCount,
    createdAt: row.createdAt,
    status: row.status ?? "active",
  };
}
