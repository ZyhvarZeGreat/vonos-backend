import type { NavItem, TenantConfig } from "@vonos/types";
import { reportsForArchetype } from "@vonos/types";
import type { NavSection } from "@/components/organisms/Sidebar";

function r(code: string, slug: string): string {
  return `/${code}/${slug}`;
}

function has(config: TenantConfig, moduleId: string): boolean {
  return config.enabledModules.includes(moduleId);
}

/** Primary sidebar links for job- and appointment-centric tenants. */
function homeItems(code: string, config: TenantConfig): NavItem[] {
  const items: NavItem[] = [
    { label: "Overview", icon: "layout-dashboard", route: r(code, "overview"), pageType: "dashboard" },
  ];

  if (config.archetype === "job") {
    if (has(config, "jobs")) {
      items.push({
        label: config.terminology?.job ?? "Jobs",
        icon: "wrench",
        route: r(code, "jobs"),
        pageType: "list",
      });
    }
    if (has(config, "vehicles")) {
      items.push({
        label: config.terminology?.vehicle ?? "Vehicles",
        icon: "car",
        route: r(code, "vehicles"),
        pageType: "list",
      });
    }
    if (has(config, "requisitions")) {
      items.push({
        label: config.terminology?.requisition ?? "Requisitions",
        icon: "clipboard-list",
        route: r(code, "requisitions"),
        pageType: "list",
      });
    }
  }

  if (config.archetype === "appointment") {
    if (has(config, "appointments")) {
      items.push({
        label: config.terminology?.appointment ?? "Appointments",
        icon: "calendar",
        route: r(code, "appointments"),
        pageType: "list",
      });
    }
    if (has(config, "services")) {
      items.push({
        label: config.terminology?.service ?? "Services",
        icon: "scissors",
        route: r(code, "services"),
        pageType: "list",
      });
    }
    items.push({
      label: "Stylist Schedule",
      icon: "clock",
      route: r(code, "stylist-schedule"),
      pageType: "form",
    });
  }

  return items;
}

function filterNavItems(
  items: NavItem[],
  config: TenantConfig,
  rules: Array<{ routeSuffix: string; moduleId: string }>,
): NavItem[] {
  return items.filter((item) => {
    for (const rule of rules) {
      if (item.route.endsWith(rule.routeSuffix) && !has(config, rule.moduleId)) {
        return false;
      }
    }
    return true;
  });
}

function userManagementItems(code: string, config: TenantConfig): NavItem[] {
  return filterNavItems(
    [
      { label: "Users", icon: "users", route: r(code, "users"), pageType: "list" },
      { label: "Roles", icon: "shield-check", route: r(code, "roles"), pageType: "list" },
      { label: "Sales Commission Agents", icon: "badge-dollar-sign", route: r(code, "commission-agents"), pageType: "list" },
    ],
    config,
    [
      { routeSuffix: "/roles", moduleId: "legacyRoles" },
      { routeSuffix: "/commission-agents", moduleId: "legacyRoles" },
    ],
  );
}

function contactsItems(code: string, config: TenantConfig): NavItem[] {
  const items: NavItem[] = [];
  if (has(config, "suppliers")) {
    items.push({ label: "Suppliers", icon: "truck", route: r(code, "suppliers"), pageType: "list" });
  }
  if (has(config, "customers") || has(config, "sales") || has(config, "orders")) {
    items.push(
      { label: "Customers", icon: "users", route: r(code, "customers"), pageType: "list" },
      { label: "Customer Groups", icon: "folder-tree", route: r(code, "customer-groups"), pageType: "list" },
    );
  }
  if (items.length > 0) {
    items.push(
      ...(has(config, "bulkImport")
        ? [{ label: "Import Contacts", icon: "upload", route: r(code, "import-contacts"), pageType: "list" as const }]
        : []),
    );
  }
  return items;
}

function productsItems(code: string, config: TenantConfig): NavItem[] {
  const listSlug =
    code === "VC"
      ? "menu-items"
      : config.archetype === "stock"
        ? "inventory"
        : "catalog";

  return filterNavItems(
    [
      { label: "List Products", icon: "package", route: r(code, listSlug), pageType: "list" },
      { label: "Add Product", icon: "plus-circle", route: r(code, "add-product"), pageType: "list" },
      { label: "Update Price", icon: "badge-dollar-sign", route: r(code, "update-price"), pageType: "list" },
      { label: "Print Labels", icon: "printer", route: r(code, "print-labels"), pageType: "list" },
      { label: "Variations", icon: "layers", route: r(code, "variations"), pageType: "list" },
      { label: "Import Products", icon: "upload", route: r(code, "import-products"), pageType: "list" },
      { label: "Import Opening Stock", icon: "package-open", route: r(code, "import-opening-stock"), pageType: "list" },
      { label: "Selling Price Group", icon: "tags", route: r(code, "price-groups"), pageType: "list" },
      { label: "Units", icon: "ruler", route: r(code, "units"), pageType: "list" },
      { label: "Categories", icon: "folder-tree", route: r(code, "categories"), pageType: "list" },
      { label: "Brands", icon: "award", route: r(code, "brands"), pageType: "list" },
      { label: "Warranties", icon: "shield-check", route: r(code, "warranties"), pageType: "list" },
    ],
    config,
    [
      { routeSuffix: "/update-price", moduleId: "bulkPriceUpdate" },
      { routeSuffix: "/print-labels", moduleId: "productLabels" },
      { routeSuffix: "/variations", moduleId: "productVariations" },
      { routeSuffix: "/import-products", moduleId: "bulkImport" },
      { routeSuffix: "/import-opening-stock", moduleId: "bulkImport" },
    ],
  );
}

function purchasesItems(code: string, config: TenantConfig): NavItem[] {
  const items: NavItem[] = [];

  if (has(config, "purchases") || has(config, "movements")) {
    items.push(
      { label: "Purchase Order", icon: "clipboard-list", route: r(code, "purchase-orders"), pageType: "list" },
      { label: "List Purchases", icon: "arrow-down-to-line", route: r(code, "inbound"), pageType: "list" },
      { label: "Add Purchase", icon: "plus-circle", route: r(code, "add-purchase"), pageType: "list" },
      { label: "List Purchase Return", icon: "rotate-ccw", route: r(code, "purchase-returns"), pageType: "list" },
    );
  }

  if (config.archetype === "stock" && has(config, "movements")) {
    items.push(
      { label: "Outbound", icon: "arrow-up-from-line", route: r(code, "outbound"), pageType: "list" },
    );
    if (code === "VW") {
      items.push({ label: "Transfers", icon: "arrow-right-left", route: r(code, "transfers"), pageType: "list" });
    }
    if (code === "VW" && has(config, "incomingRequisitions")) {
      items.push({
        label: "Incoming Requests",
        icon: "clipboard-list",
        route: r(code, "incoming-requisitions"),
        pageType: "list",
      });
    }
  }

  return items;
}

function sellItems(code: string, config: TenantConfig): NavItem[] {
  if (!has(config, "sales") && !has(config, "orders")) return [];
  const salesSlug = code === "VC" ? "orders" : "sales";
  return filterNavItems(
    [
      { label: "All sales", icon: "receipt", route: r(code, salesSlug), pageType: "list" },
      { label: "Add Sale", icon: "plus-circle", route: r(code, "add-sale"), pageType: "list" },
      { label: "List POS", icon: "monitor", route: r(code, "pos"), pageType: "list" },
      { label: "POS", icon: "scan-line", route: r(code, "pos-terminal"), pageType: "list" },
      { label: "Add Draft", icon: "file-plus", route: r(code, "add-draft"), pageType: "list" },
      { label: "List Drafts", icon: "files", route: r(code, "drafts"), pageType: "list" },
      { label: "Add Quotation", icon: "file-text", route: r(code, "add-quotation"), pageType: "list" },
      { label: "List quotations", icon: "file-stack", route: r(code, "quotations"), pageType: "list" },
      { label: "List Sell Return", icon: "rotate-ccw", route: r(code, "returns"), pageType: "list" },
      { label: "Shipments", icon: "truck", route: r(code, "shipments"), pageType: "list" },
      { label: "Discounts", icon: "percent", route: r(code, "discounts"), pageType: "list" },
      { label: "Import Sales", icon: "upload", route: r(code, "import-sales"), pageType: "list" },
    ],
    config,
    [
      { routeSuffix: "/pos", moduleId: "pos" },
      { routeSuffix: "/pos-terminal", moduleId: "pos" },
      { routeSuffix: "/add-draft", moduleId: "quotations" },
      { routeSuffix: "/drafts", moduleId: "quotations" },
      { routeSuffix: "/add-quotation", moduleId: "quotations" },
      { routeSuffix: "/quotations", moduleId: "quotations" },
      { routeSuffix: "/returns", moduleId: "returns" },
      { routeSuffix: "/shipments", moduleId: "shipments" },
      { routeSuffix: "/discounts", moduleId: "discounts" },
      { routeSuffix: "/import-sales", moduleId: "bulkImport" },
    ],
  );
}

function expensesItems(code: string): NavItem[] {
  return [
    { label: "List Expenses", icon: "receipt", route: r(code, "expenses"), pageType: "list" },
    { label: "Add Expense", icon: "plus-circle", route: r(code, "add-expense"), pageType: "list" },
    { label: "Expense Categories", icon: "folder-tree", route: r(code, "expense-categories"), pageType: "list" },
  ];
}

function paymentAccountItems(code: string): NavItem[] {
  return [
    { label: "List Accounts", icon: "credit-card", route: r(code, "payment-accounts"), pageType: "list" },
    { label: "Invoices", icon: "file-text", route: r(code, "invoices"), pageType: "list" },
    { label: "Balance Sheet", icon: "scale", route: r(code, "balance-sheet"), pageType: "dashboard" },
    { label: "Trial Balance", icon: "list-checks", route: r(code, "trial-balance"), pageType: "dashboard" },
    { label: "Cash Flow", icon: "trending-up", route: r(code, "cash-flow"), pageType: "dashboard" },
    { label: "Payment Account Report", icon: "file-bar-chart", route: r(code, "payment-account-report"), pageType: "dashboard" },
  ];
}

/** HQ6 Reports dropdown — one sidebar sublink per report page (filtered like AdminSidebarMenu.php). */
function reportsItems(code: string, config: TenantConfig): NavItem[] {
  if (!config.archetype) return [];
  const hub: NavItem = {
    label: "All Reports",
    icon: "pie-chart",
    route: r(code, "reports"),
    pageType: "dashboard",
  };
  const reports = reportsForArchetype(config.archetype, config.enabledModules)
    .filter((entry) => entry.source.kind !== "payment-accounts")
    .map((entry) => ({
      label: entry.label,
      icon: entry.id === "trending" ? "trending-up" : "file-bar-chart",
      route: r(code, entry.slug),
      pageType: "dashboard" as const,
    }));
  return [hub, ...reports];
}

function hrmItems(code: string): NavItem[] {
  return [{ label: "HRM", icon: "briefcase", route: r(code, "hrm"), pageType: "dashboard" }];
}

function settingsItems(code: string): NavItem[] {
  return [
    { label: "Business Settings", icon: "settings", route: r(code, "settings"), pageType: "form" },
    { label: "Business Locations", icon: "map-pin", route: r(code, "locations"), pageType: "form" },
    { label: "Invoice Settings", icon: "file-text", route: r(code, "invoice-settings"), pageType: "form" },
    { label: "Barcode Settings", icon: "scan-line", route: r(code, "barcode-settings"), pageType: "form" },
    { label: "Receipt Printers", icon: "printer", route: r(code, "receipt-printers"), pageType: "form" },
    { label: "Tax Rates", icon: "percent", route: r(code, "tax-rates"), pageType: "form" },
  ];
}

/**
 * HQ6 Ultimate POS-style collapsible sidebar groups.
 * Order matches hq6.vonosautomarket.com AdminSidebarMenu.php + Essentials HRM:
 * Home > User Management > Contacts > Products > Purchases > Sell >
 * Expenses > Payment Accounts > Reports > HRM > Settings
 */
export function posNavSectionsForConfig(config: TenantConfig): NavSection[] {
  const code = config.code ?? "VW";
  const sections: NavSection[] = [];

  // 1. Home (+ workshop / appointment primary links by archetype)
  sections.push({
    label: "Home",
    icon: "layout-dashboard",
    items: homeItems(code, config),
  });

  // 2. User Management
  sections.push({
    label: "User Management",
    icon: "users",
    collapsible: true,
    items: userManagementItems(code, config),
  });

  // 3. Contacts
  const contacts = contactsItems(code, config);
  if (contacts.length > 0) {
    sections.push({ label: "Contacts", icon: "users", collapsible: true, items: contacts });
  }

  // 4. Products (stock + transaction archetypes)
  if (
    has(config, "inventory") ||
    has(config, "sales") ||
    has(config, "orders")
  ) {
    sections.push({
      label: "Products",
      icon: "box",
      collapsible: true,
      items: productsItems(code, config),
    });
  }

  // 5. Purchases
  const purchases = purchasesItems(code, config);
  if (purchases.length > 0) {
    sections.push({ label: "Purchases", icon: "shopping-cart", collapsible: true, items: purchases });
  }

  // 6. Sell
  const sell = sellItems(code, config);
  if (sell.length > 0) {
    sections.push({ label: "Sell", icon: "circle-arrow-up", collapsible: true, items: sell });
  }

  // 7. Expenses
  if (has(config, "finance") || has(config, "reports")) {
    sections.push({ label: "Expenses", icon: "receipt", collapsible: true, items: expensesItems(code) });
  }

  // 8. Payment Accounts
  if (has(config, "paymentAccounts") || has(config, "finance")) {
    sections.push({
      label: "Payment Accounts",
      icon: "credit-card",
      collapsible: true,
      items: paymentAccountItems(code),
    });
  }

  // 9. Reports
  if (has(config, "reports")) {
    sections.push({
      label: "Reports",
      icon: "pie-chart",
      collapsible: true,
      items: reportsItems(code, config),
    });
  }

  // 10. HRM — single sidebar link; sub-sections are tabs on the HRM page
  if (has(config, "hrm")) {
    sections.push({ label: "HRM", icon: "briefcase", items: hrmItems(code) });
  }

  // 11. Settings
  sections.push({ label: "Settings", icon: "settings", collapsible: true, items: settingsItems(code) });

  return sections;
}

/** Flatten all POS nav routes for entity-switch and route guards. */
export function allPosNavItems(config: TenantConfig): NavItem[] {
  return posNavSectionsForConfig(config).flatMap((section) => section.items);
}

/**
 * All entities now use the unified HQ6-style sidebar so every tenant gets
 * the same collapsible group structure (with items filtered by archetype/modules).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function usesPosNav(_config: TenantConfig): boolean {
  return true;
}
