import type { PaymentStatus, Sale } from "@vonos/types";

export function paymentStatusFromPaid(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "due";
  if (paid + 0.0001 >= total) return "paid";
  return "partial";
}

export type SalePaymentSnapshot = Pick<
  Sale,
  "id" | "total" | "totalPaid" | "sellDue" | "currency" | "customerName" | "reference"
>;

/**
 * Capture everything needed to record a sale payment *before* the modal
 * dismisses. Closing the modal nulls the live `sale` prop; TanStack Query
 * then re-binds mutationFn over `sale === null` and throws "Missing sale".
 */
export function captureSalePaymentWrite(input: {
  tenantId: string | null | undefined;
  sale: SalePaymentSnapshot | null | undefined;
  amount: number;
  method: string;
  accountId: string;
  note?: string;
  paidOnIso: string;
}): {
  tenantId: string;
  saleId: string;
  currency: string;
  apply: number;
  nextPaid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
  body: {
    amount: number;
    method: string;
    accountId: string;
    note?: string;
    paidOn: string;
  };
} {
  const tenantId = input.tenantId?.trim();
  if (!tenantId) {
    throw new Error("Missing tenant");
  }
  if (!input.sale?.id) {
    throw new Error("Missing sale");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Enter a valid amount");
  }
  const accountId = input.accountId.trim();
  if (!accountId) {
    throw new Error(
      "Select a Payment Account so this payment posts to the account book",
    );
  }

  const due =
    input.sale.sellDue ??
    Math.max(0, input.sale.total - (input.sale.totalPaid ?? 0));
  const apply = Math.min(input.amount, due > 0 ? due : input.amount);
  const nextPaid = (input.sale.totalPaid ?? 0) + apply;
  const remaining = Math.max(0, input.sale.total - nextPaid);

  return {
    tenantId,
    saleId: input.sale.id,
    currency: input.sale.currency || "NGN",
    apply,
    nextPaid,
    remaining,
    paymentStatus: paymentStatusFromPaid(input.sale.total, nextPaid),
    body: {
      amount: input.amount,
      method: input.method,
      accountId,
      note: input.note?.trim() || undefined,
      paidOn: input.paidOnIso,
    },
  };
}
