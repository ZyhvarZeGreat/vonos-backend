import { cn } from "@/lib/utils/cn";

/** HQ6 payment-status badge class (paid / partial / due). */
export function hq6PaymentBadgeClass(
  status: string | null | undefined,
): string {
  const key = (status ?? "").toLowerCase();
  if (key === "paid") return "hq6-pay-paid";
  if (key === "partial") return "hq6-pay-partial";
  if (key === "due" || key === "overdue") return "hq6-pay-due";
  return "hq6-pay-due";
}

export function hq6PaymentBadgeProps(
  status: string | null | undefined,
): { className: string } {
  return {
    className: cn("hq6-pay-badge", hq6PaymentBadgeClass(status)),
  };
}

/**
 * UPOS rule: Add Payment when the invoice/PO still has an open balance.
 * Prefer remainingDue > 0. Status due/partial/overdue also shows the button
 * (even if amount is briefly 0) so the Due badge matches the toolbar.
 */
export function canAddPaymentForStatus(
  paymentStatus: string | null | undefined,
  remainingDue?: number | null,
): boolean {
  const key = (paymentStatus ?? "").toLowerCase().trim();
  if (remainingDue != null && remainingDue > 1e-6) return true;
  if (key === "paid") return false;
  if (key === "due" || key === "partial" || key === "overdue") return true;
  // Unknown status: only if we don't know the due amount, or it's open.
  if (!key) return remainingDue == null || remainingDue > 1e-6;
  return false;
}
