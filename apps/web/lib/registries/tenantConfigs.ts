import type { TenantConfig, NavItem } from "@vonos/types";
import { catalogPresetsForCode, RETAIL_CATALOG_ENABLED_MODULES } from "@vonos/types";
import type { NavSection } from "@/components/organisms/Sidebar";
import { adminNavTail } from "@/lib/registries/adminNavItems";
import { allPosNavItems, posNavSectionsForConfig } from "@/lib/registries/posNavSections";

function withCatalog(config: TenantConfig): TenantConfig {
  return { ...config, ...catalogPresetsForCode(config.code) };
}

const stockNavItems = (code: string) => [
  { label: "Overview", icon: "layout-dashboard", route: `/${code}/overview`, pageType: "dashboard" as const },
  ...adminNavTail(code),
];

export const warehouseTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vw_001",
  code: "VW",
  name: "Vonos Warehouse",
  archetype: "stock",
  navItems: stockNavItems("VW"),
  kpiCards: [
    { label: "Total SKU", icon: "package", metricKey: "totalSku", color: "#059669" },
    { label: "Today Inbound", icon: "arrow-down", metricKey: "todayInbound", color: "#2563eb" },
    { label: "Today Outbound", icon: "arrow-up", metricKey: "todayOutbound", color: "#9333ea" },
    { label: "Stock Values", icon: "calculator", metricKey: "stockValue", color: "#e11d48" },
  ],
  terminology: { item: "SKU", inventory: "Inventory", supplier: "Supplier" },
  enabledModules: ["inventory", "movements", "suppliers", "purchases", "paymentAccounts", "reports", "finance", "hrm", "incomingRequisitions"],
});

export const kidsWearTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vkw_001",
  code: "VKW",
  name: "Vonos Kids Wear",
  archetype: "stock",
  navItems: stockNavItems("VKW"),
  kpiCards: [
    { label: "Total SKU", icon: "package", metricKey: "totalSku", color: "#059669" },
    { label: "Today's Sales", icon: "shopping-bag", metricKey: "todaySales", color: "#2563eb" },
    { label: "Returns", icon: "rotate-ccw", metricKey: "returns", color: "#9333ea" },
    { label: "Stock Value", icon: "calculator", metricKey: "stockValue", color: "#e11d48" },
  ],
  terminology: { item: "Variant", inventory: "Inventory", supplier: "Supplier", collection: "Collection" },
  enabledModules: ["inventory", "movements", "suppliers", "purchases", "paymentAccounts", "reports", "finance", "variants", "hrm"],
});

const transactionNavItems = (code: string) => [
  { label: "Overview", icon: "layout-dashboard", route: `/${code}/overview`, pageType: "dashboard" as const },
  { label: "Customers", icon: "users", route: `/${code}/customers`, pageType: "list" as const },
  ...adminNavTail(code),
];

export const vispTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_visp_001",
  code: "VISP",
  name: "Vonos Institute Spare Parts",
  archetype: "transaction",
  navItems: transactionNavItems("VISP"),
  kpiCards: [
    { label: "Today's Sales", icon: "receipt", metricKey: "todaySales", color: "#059669" },
    { label: "Returns", icon: "rotate-ccw", metricKey: "returns", color: "#2563eb" },
    { label: "Low Stock", icon: "alert-triangle", metricKey: "lowStock", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: { sale: "Sale", customer: "Customer", return: "Return" },
  enabledModules: [...RETAIL_CATALOG_ENABLED_MODULES],
});

export const vspTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vsp_001",
  code: "VSP",
  name: "Vonos SP Marketplace",
  archetype: "transaction",
  navItems: transactionNavItems("VSP"),
  kpiCards: [
    { label: "Today's Orders", icon: "receipt", metricKey: "todaySales", color: "#059669" },
    { label: "Listings", icon: "package", metricKey: "totalSku", color: "#2563eb" },
    { label: "Low Stock", icon: "alert-triangle", metricKey: "lowStock", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: { sale: "Order", customer: "Buyer", return: "Return" },
  enabledModules: [...RETAIL_CATALOG_ENABLED_MODULES],
});

export const cafeTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vc_001",
  code: "VC",
  name: "Vonos Cafe",
  archetype: "transaction",
  navItems: [
    { label: "Overview", icon: "layout-dashboard", route: "/VC/overview", pageType: "dashboard" },
    { label: "Tables", icon: "grid-3x3", route: "/VC/tables", pageType: "list" },
    { label: "Customers", icon: "users", route: "/VC/customers", pageType: "list" },
    { label: "Suppliers", icon: "truck", route: "/VC/suppliers", pageType: "list" },
    ...adminNavTail("VC"),
  ],
  kpiCards: [
    { label: "Today's Orders", icon: "receipt", metricKey: "todayOrders", color: "#059669" },
    { label: "Active Tables", icon: "grid-3x3", metricKey: "activeTables", color: "#2563eb" },
    { label: "Low Stock", icon: "alert-triangle", metricKey: "lowStock", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: { order: "Order", menuItem: "Menu Item", table: "Table", supplier: "Supplier" },
  enabledModules: [
    "orders",
    "tables",
    "customers",
    "suppliers",
    "inventory",
    "purchases",
    "movements",
    "paymentAccounts",
    "pos",
    "quotations",
    "reports",
    "finance",
    "hrm",
  ],
});

export const automotiveTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_va_001",
  code: "VA",
  name: "Vonos Automotive",
  archetype: "job",
  navItems: [
    { label: "Overview", icon: "layout-dashboard", route: "/VA/overview", pageType: "dashboard" },
    { label: "Jobs", icon: "wrench", route: "/VA/jobs", pageType: "list" },
    { label: "Vehicles", icon: "car", route: "/VA/vehicles", pageType: "list" },
    { label: "Requisitions", icon: "clipboard-list", route: "/VA/requisitions", pageType: "list" },
    { label: "Customers", icon: "users", route: "/VA/customers", pageType: "list" },
    ...adminNavTail("VA"),
  ],
  kpiCards: [
    { label: "Open Jobs", icon: "wrench", metricKey: "openJobs", color: "#059669" },
    { label: "In Shop", icon: "car", metricKey: "inShop", color: "#2563eb" },
    { label: "Pending QC", icon: "shield-check", metricKey: "pendingQc", color: "#f59e0b" },
    { label: "Parts Pending", icon: "package", metricKey: "partsPending", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: {
    job: "Job",
    vehicle: "Vehicle",
    customer: "Customer",
    requisition: "Parts Requisition",
    sale: "Sale",
  },
  enabledModules: [
    "jobs",
    "vehicles",
    "requisitions",
    "customers",
    "suppliers",
    "purchases",
    "movements",
    "sales",
    "returns",
    "inventory",
    "paymentAccounts",
    "pos",
    "quotations",
    "discounts",
    "shipments",
    "bulkImport",
    "reports",
    "finance",
    "hrm",
  ],
});

/** @deprecated Merged into VA — kept for migration tooling references only. */
export const mechanicsTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vm_001",
  code: "VM",
  name: "Vonos Mechanics",
  archetype: "job",
  navItems: [
    { label: "Overview", icon: "layout-dashboard", route: "/VM/overview", pageType: "dashboard" },
    { label: "Jobs", icon: "wrench", route: "/VM/jobs", pageType: "list" },
    { label: "Vehicles", icon: "car", route: "/VM/vehicles", pageType: "list" },
    { label: "Requisitions", icon: "clipboard-list", route: "/VM/requisitions", pageType: "list" },
    { label: "Customers", icon: "users", route: "/VM/customers", pageType: "list" },
    ...adminNavTail("VM"),
  ],
  kpiCards: [
    { label: "Open Jobs", icon: "wrench", metricKey: "openJobs", color: "#059669" },
    { label: "In Shop", icon: "car", metricKey: "inShop", color: "#2563eb" },
    { label: "Parts Pending", icon: "package", metricKey: "partsPending", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: {
    job: "Job",
    vehicle: "Vehicle",
    customer: "Customer",
    requisition: "Parts Requisition",
  },
  enabledModules: ["jobs", "vehicles", "requisitions", "customers", "suppliers", "reports", "finance", "hrm"],
});

/** @deprecated Merged into VA */
export const mechShopTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vms_001",
  code: "VMS",
  name: "Vonos Mech Shop",
  archetype: "job",
  navItems: [
    { label: "Overview", icon: "layout-dashboard", route: "/VMS/overview", pageType: "dashboard" },
    { label: "Jobs", icon: "wrench", route: "/VMS/jobs", pageType: "list" },
    { label: "Requisitions", icon: "clipboard-list", route: "/VMS/requisitions", pageType: "list" },
    { label: "Customers", icon: "users", route: "/VMS/customers", pageType: "list" },
    ...adminNavTail("VMS"),
  ],
  kpiCards: [
    { label: "Active Jobs", icon: "wrench", metricKey: "activeJobs", color: "#059669" },
    { label: "Completed", icon: "check-circle", metricKey: "completedJobs", color: "#2563eb" },
    { label: "Pending QC", icon: "shield-check", metricKey: "pendingQc", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: {
    job: "Job",
    customer: "Customer",
    requisition: "Material Requisition",
  },
  enabledModules: ["jobs", "requisitions", "customers", "suppliers", "reports", "finance", "hrm"],
});

/** @deprecated Use automotiveTenantConfig */
export const legacyAutomotiveTenantConfig: TenantConfig = mechanicsTenantConfig;

export const saloonTenantConfig: TenantConfig = withCatalog({
  tenantId: "tenant_vs_001",
  code: "VS",
  name: "Vonos Saloon",
  archetype: "appointment",
  navItems: [
    { label: "Overview", icon: "layout-dashboard", route: "/VS/overview", pageType: "dashboard" },
    { label: "Appointments", icon: "calendar", route: "/VS/appointments", pageType: "list" },
    { label: "Customers", icon: "users", route: "/VS/customers", pageType: "list" },
    { label: "Services", icon: "scissors", route: "/VS/services", pageType: "list" },
    { label: "Stylist Schedule", icon: "clock", route: "/VS/stylist-schedule", pageType: "form" },
    ...adminNavTail("VS"),
  ],
  kpiCards: [
    { label: "Today's Appts", icon: "calendar", metricKey: "todayAppts", color: "#059669" },
    { label: "Available Slots", icon: "clock", metricKey: "available", color: "#2563eb" },
    { label: "No-shows", icon: "user-x", metricKey: "noShows", color: "#9333ea" },
    { label: "Revenue", icon: "wallet", metricKey: "revenue", color: "#e11d48" },
  ],
  terminology: { appointment: "Appointment", customer: "Customer", service: "Service", stylist: "Stylist" },
  enabledModules: ["appointments", "services", "reports", "finance", "hrm"],
});

export const TENANT_CONFIGS: Record<string, TenantConfig> = {
  tenant_vw_001: warehouseTenantConfig,
  tenant_vkw_001: kidsWearTenantConfig,
  tenant_visp_001: vispTenantConfig,
  tenant_vsp_001: vspTenantConfig,
  tenant_vc_001: cafeTenantConfig,
  tenant_va_001: automotiveTenantConfig,
  tenant_vm_001: mechanicsTenantConfig,
  tenant_vms_001: mechShopTenantConfig,
  tenant_vs_001: saloonTenantConfig,
};

export function getTenantConfigById(tenantId: string): TenantConfig | null {
  return TENANT_CONFIGS[tenantId] ?? null;
}

export function getTenantConfigByCode(code: string): TenantConfig | null {
  const entry = Object.values(TENANT_CONFIGS).find((c) => c.code === code);
  return entry ?? null;
}

export function allNavRoutesForConfig(config: TenantConfig): NavItem[] {
  return allPosNavItems(config);
}

export function navSectionsForConfig(config: TenantConfig): NavSection[] {
  return posNavSectionsForConfig(config);
}

