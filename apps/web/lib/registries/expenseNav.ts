import type { TenantCode } from "@/lib/registries/tenants";

export const EXPENSE_PAGE_TABS = [
  { id: "expenses", label: "List Expenses", slug: "expenses" },
  { id: "add-expense", label: "Add Expense", slug: "add-expense" },
  {
    id: "expense-categories",
    label: "Expense Categories",
    slug: "expense-categories",
  },
] as const;

export type ExpensePageSlug = (typeof EXPENSE_PAGE_TABS)[number]["slug"];

export function expensePageTabs(activeSlug: ExpensePageSlug) {
  return EXPENSE_PAGE_TABS.map((tab) => ({
    id: tab.slug,
    label: tab.label,
  }));
}

export function expensePageRoute(code: TenantCode, slug: ExpensePageSlug): string {
  return `/${code}/${slug}`;
}
