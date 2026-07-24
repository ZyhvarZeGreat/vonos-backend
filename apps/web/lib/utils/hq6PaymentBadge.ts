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
