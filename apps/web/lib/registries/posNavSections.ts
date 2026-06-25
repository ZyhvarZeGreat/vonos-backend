import type { NavItem, TenantConfig } from "@vonos/types";
import type { NavSection } from "@/components/organisms/Sidebar";
import { reportNavSectionsForConfig } from "@/lib/registries/reportNavSections";

function route(code: string, slug: string): string {
  return `/${code}/${slug}`;
}

function hasModule(config: TenantConfig, moduleId: string): boolean {
  return config.enabledModules.includes(moduleId);
}

/** Shell-only nav labels — operational routes live under POS groups. */
const ANALYTICS_ONLY_LABELS = new Set([
  "Finance",
  "Customers",
  "Kitchen",
  "Tables",
  "Suppliers",
]);

function showProductsSection(config: TenantConfig): boolean {
  const archetype = config.archetype;
  if (archetype !== "transaction" && archetype !== "stock") return false;
  if (hasModule(config, "inventory")) return true;
  if (archetype === "transaction" && (hasModule(config, "sales") || hasModule(config, "orders"))) {
    return true;
  }
  return false;
}

function sellItems(code: string, archetype: TenantConfig["archetype"]): NavItem[] {
  if (archetype === "transaction") {
    const salesSlug = code === "VC" ? "orders" : "sales";
    const returnsSlug = "returns";
    return [
      { label: "All sales", icon: "receipt", route: route(code, salesSlug), pageType: "list" },
      { label: "Add Sale", icon: "plus-circle", route: route(code, "add-sale"), pageType: "list" },
      { label: "List POS", icon: "monitor", route: route(code, "pos"), pageType: "list" },
      { label: "POS", icon: "scan-line", route: route(code, "pos-terminal"), pageType: "list" },
      { label: "Add Draft", icon: "file-plus", route: route(code, "add-draft"), pageType: "list" },
      { label: "List Drafts", icon: "files", route: route(code, "drafts"), pageType: "list" },
      { label: "Add Quotation", icon: "file-text", route: route(code, "add-quotation"), pageType: "list" },
      { label: "List quotations", icon: "file-stack", route: route(code, "quotations"), pageType: "list" },
      { label: "List Sell Return", icon: "rotate-ccw", route: route(code, returnsSlug), pageType: "list" },
      { label: "Shipments", icon: "truck", route: route(code, "shipments"), pageType: "list" },
      { label: "Discounts", icon: "percent", route: route(code, "discounts"), pageType: "list" },
      { label: "Import Sales", icon: "upload", route: route(code, "import-sales"), pageType: "list" },
    ];
  }
  return [];
}

function productsItems(code: string, archetype: TenantConfig["archetype"]): NavItem[] {
  const listSlug =
    archetype === "transaction"
      ? code === "VC"
        ? "menu-items"
        : "catalog"
      : "inventory";

  return [
    { label: "List Products", icon: "package", route: route(code, listSlug), pageType: "list" },
    { label: "Add Product", icon: "plus-circle", route: route(code, "add-product"), pageType: "list" },
    { label: "Print Labels", icon: "printer", route: route(code, "print-labels"), pageType: "list" },
    { label: "Variations", icon: "layers", route: route(code, "variations"), pageType: "list" },
    { label: "Import Products", icon: "upload", route: route(code, "import-products"), pageType: "list" },
    { label: "Import Opening Stock", icon: "package-open", route: route(code, "import-opening-stock"), pageType: "list" },
  ];
}

function purchasesItems(code: string, config: TenantConfig): NavItem[] {
  const items: NavItem[] = [];

  if (hasModule(config, "purchases")) {
    items.push(
      { label: "Purchase Order", icon: "clipboard-list", route: route(code, "purchase-orders"), pageType: "list" },
      { label: "List Purchases", icon: "arrow-down-to-line", route: route(code, "inbound"), pageType: "list" },
      { label: "Add Purchase", icon: "plus-circle", route: route(code, "inbound?create"), pageType: "list" },
      { label: "List Purchase Return", icon: "rotate-ccw", route: route(code, "purchase-returns"), pageType: "list" },
    );
  }

  if (config.archetype === "stock" && hasModule(config, "movements")) {
    items.push(
      { label: "Outbound", icon: "arrow-up-from-line", route: route(code, "outbound"), pageType: "list" },
    );
    if (code === "VW") {
      items.push({
        label: "Transfers",
        icon: "arrow-right-left",
        route: route(code, "transfers"),
        pageType: "list",
      });
    }
  }

  if (hasModule(config, "suppliers")) {
    items.push({
      label: "Suppliers",
      icon: "truck",
      route: route(code, "suppliers"),
      pageType: "list",
    });
  }

  return items;
}

function paymentAccountItems(code: string, config: TenantConfig): NavItem[] {
  return [
    { label: "List Accounts", icon: "credit-card", route: route(code, "payment-accounts"), pageType: "list" },
    { label: "Payments", icon: "banknote", route: route(code, "payments"), pageType: "list" },
    ...paymentReportNavItems(code, config),
  ];
}

function paymentReportNavItems(code: string, config: TenantConfig): NavItem[] {
  if (!hasModule(config, "paymentAccounts")) return [];
  if (config.archetype !== "stock" && config.archetype !== "transaction") return [];

  return [
    { label: "Balance Sheet", icon: "scale", route: route(code, "balance-sheet"), pageType: "dashboard" },
    { label: "Trial Balance", icon: "list-checks", route: route(code, "trial-balance"), pageType: "dashboard" },
    { label: "Cash Flow", icon: "trending-up", route: route(code, "cash-flow"), pageType: "dashboard" },
    {
      label: "Payment Account Report",
      icon: "file-bar-chart",
      route: route(code, "payment-account-report"),
      pageType: "dashboard",
    },
  ];
}

/** Legacy Ultimate POS–style collapsible sidebar groups. */
export function posNavSectionsForConfig(config: TenantConfig): NavSection[] {
  const code = config.code ?? "VW";
  const archetype = config.archetype;
  const sections: NavSection[] = [];

  const overview = config.navItems.find((item) => item.label === "Overview");
  if (overview) {
    sections.push({
      label: "Home",
      items: [{ ...overview, route: route(code, "overview") }],
    });
  }

  if (archetype === "transaction" && (hasModule(config, "sales") || hasModule(config, "orders"))) {
    sections.push({
      label: "Sell",
      icon: "circle-arrow-up",
      collapsible: true,
      items: sellItems(code, archetype),
    });
  }

  const purchaseLinks = purchasesItems(code, config);
  if (purchaseLinks.length > 0) {
    sections.push({
      label: "Purchases",
      icon: "shopping-cart",
      collapsible: true,
      items: purchaseLinks,
    });
  }

  if (showProductsSection(config)) {
    sections.push({
      label: "Products",
      icon: "box",
      collapsible: true,
      items: productsItems(code, archetype),
    });
  }

  if (
    (archetype === "transaction" || archetype === "stock") &&
    hasModule(config, "paymentAccounts")
  ) {
    sections.push({
      label: "Payment Accounts",
      icon: "credit-card",
      collapsible: true,
      items: paymentAccountItems(code, config),
    });
  }

  const analytics = config.navItems.filter((item) => ANALYTICS_ONLY_LABELS.has(item.label));
  if (analytics.length > 0) {
    sections.push({
      label: "Analytics",
      items: analytics.map((item) => {
        const slug = item.route.split("/").filter(Boolean)[1] ?? item.label.toLowerCase();
        return { ...item, route: route(code, slug) };
      }),
    });
  }

  sections.push(...reportNavSectionsForConfig(config));

  const configLabels = new Set(["Users", "Settings"]);
  const configItems = config.navItems.filter((item) => configLabels.has(item.label));
  if (configItems.length > 0) {
    sections.push({
      label: "Config",
      items: configItems.map((item) => {
        const slug = item.route.split("/").filter(Boolean)[1] ?? item.label.toLowerCase();
        return { ...item, route: route(code, slug) };
      }),
    });
  }

  return sections;
}

/** Flatten all POS nav routes for entity-switch and route guards. */
export function allPosNavItems(config: TenantConfig): NavItem[] {
  return posNavSectionsForConfig(config).flatMap((section) => section.items);
}

export function usesPosNav(config: TenantConfig): boolean {
  return config.archetype === "transaction" || config.archetype === "stock";
}
