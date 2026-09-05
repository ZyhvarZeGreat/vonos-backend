import type { NavSection } from "@/components/organisms/Sidebar";

/**
 * Route slug (last path segment) → HQ6 permission keys required to *see* the link.
 * Any matching key grants access. Empty = always visible (e.g. Home).
 */
export const HQ6_NAV_VIEW_PERMISSIONS: Record<string, string[]> = {
  users: ["user.view"],
  roles: ["roles.view"],
  "commission-agents": ["user.view"],

  suppliers: ["supplier.view", "supplier.view_own"],
  customers: ["customer.view", "customer.view_own"],
  "customer-groups": ["customer.view", "customer.view_own"],
  "import-contacts": ["customer.create", "supplier.create"],

  products: ["product.view"],
  "list-products": ["product.view"],
  inventory: ["product.view"],
  "add-product": ["product.create"],
  "update-price": ["product.update"],
  "print-labels": ["product.view"],
  variations: ["product.view"],
  "import-products": ["product.create"],
  "import-opening-stock": ["product.opening_stock"],
  "group-stock": ["product.view", "stock_report.view"],
  "price-groups": ["product.view"],
  units: ["product.view"],
  categories: ["product.view"],
  brands: ["product.view"],
  warranties: ["product.view"],

  "purchase-orders": ["purchase_order.view_all", "purchase_order.view_own"],
  purchases: ["purchase.view", "view_own_purchase"],
  inbound: ["purchase.view", "view_own_purchase"],
  "add-purchase": ["purchase.create"],
  "purchase-returns": ["purchase.view", "view_own_purchase"],
  outbound: ["purchase.view", "view_own_purchase"],
  transfers: ["purchase.view", "view_own_purchase"],

  sales: ["direct_sell.view", "view_own_sell", "sell.view"],
  "add-sale": ["direct_sell.access"],
  pos: ["sell.view"],
  "pos-terminal": ["sell.create"],
  drafts: ["draft.view_all", "draft.view_own", "direct_sell.view"],
  "add-draft": ["draft.update", "direct_sell.access"],
  quotations: ["direct_sell.view", "view_own_sell"],
  "add-quotation": ["direct_sell.access"],
  shipments: ["access_shipping", "access_own_shipping"],
  "sell-returns": ["access_sell_return", "access_own_sell_return"],
  discounts: ["discount.access"],

  expenses: ["all_expense.access", "view_own_expense"],
  "expense-categories": ["expense.add", "expense.edit"],
  "add-expense": ["expense.add"],

  "payment-accounts": ["account.access"],
  "cash-flow": ["account.access"],
  "trial-balance": ["account.access"],
  "balance-sheet": ["account.access"],

  settings: ["business_settings.access"],
  "business-settings": ["business_settings.access"],
  "business-locations": ["business_settings.access"],
  "invoice-settings": ["invoice_settings.access"],
  "barcode-settings": ["barcode_settings.access"],
  "receipt-printers": ["access_printers"],
  "tax-rates": ["tax_rate.view"],

  // Entity-agnostic app modules (all tenants / archetypes)
  jobs: ["app.jobs.view"],
  vehicles: ["app.vehicles.view"],
  appointments: ["app.appointments.view"],
  "stylist-schedule": ["app.appointments.view"],
  services: ["app.services.view"],
  requisitions: ["app.requisitions.view"],
  tables: ["app.tables.view"],
  kitchen: ["app.kitchen.view"],
  collections: ["product.view"],
  finance: ["app.finance.view", "account.access", "profit_loss_report.view"],
  reports: [
    "app.reports.view",
    "purchase_n_sell_report.view",
    "stock_report.view",
    "profit_loss_report.view",
    "expense_report.view",
  ],
};

function routeSlug(route: string): string {
  const parts = route.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/**
 * Drop nav links the current user cannot view. Sections with no remaining
 * items are removed (except Home).
 */
export function filterNavSectionsByPermissions(
  sections: NavSection[],
  canAny: (...keys: string[]) => boolean,
): NavSection[] {
  return sections
    .map((section) => {
      const items = section.items.filter((item) => {
        const slug = routeSlug(item.route);
        const keys = HQ6_NAV_VIEW_PERMISSIONS[slug];
        if (!keys || keys.length === 0) return true;
        return canAny(...keys);
      });
      return { ...section, items };
    })
    .filter((section) => {
      if (section.label === "Home") return true;
      return section.items.length > 0;
    });
}
