import type { TenantCode } from "@/lib/registries/tenants";

export const PAYMENT_ACCOUNT_PAGE_TABS = [
  { id: "payment-accounts", label: "List Accounts", slug: "payment-accounts" },
  { id: "balance-sheet", label: "Balance Sheet", slug: "balance-sheet" },
  { id: "trial-balance", label: "Trial Balance", slug: "trial-balance" },
  { id: "cash-flow", label: "Cash Flow", slug: "cash-flow" },
  {
    id: "payment-account-report",
    label: "Payment Account Report",
    slug: "payment-account-report",
  },
] as const;

export type PaymentAccountPageSlug =
  (typeof PAYMENT_ACCOUNT_PAGE_TABS)[number]["slug"];

export function paymentAccountPageTabs() {
  return PAYMENT_ACCOUNT_PAGE_TABS.map((tab) => ({
    id: tab.slug,
    label: tab.label,
  }));
}

export function paymentAccountPageRoute(
  code: TenantCode,
  slug: PaymentAccountPageSlug,
): string {
  return `/${code}/${slug}`;
}
