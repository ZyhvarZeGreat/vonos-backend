import type { ComponentType } from "react";
import { FinanceView } from "@/components/pages/FinanceView";
import { WarehouseInventoryView } from "@/components/pages/WarehouseInventoryView";
import { WarehouseTransfersView } from "@/components/pages/WarehouseTransfersView";
import { WarehouseSuppliersView } from "@/components/pages/WarehouseSuppliersView";
import { EntityReportsView } from "@/components/pages/EntityReportsView";
import {
  MovementListView,
  PurchaseOrdersView,
  PurchaseReturnsView,
} from "@/components/pages/MovementListView";
import { ReportRunView } from "@/components/pages/ReportRunView";
import { KidsWearInventoryView } from "@/components/pages/KidsWearInventoryView";
import { JobsListView } from "@/components/pages/JobsListView";
import {
  SalesListView,
  OrdersListView,
  CustomersListView,
  ReturnsListView,
  VehiclesListView,
  RequisitionsListView,
  MenuItemsListView,
  ServicesListView,
  CatalogListView,
} from "@/components/pages/EntityListViews";
import { KitchenDisplayView } from "@/components/pages/KitchenDisplayView";
import { TableManagementView } from "@/components/pages/TableManagementView";
import {
  AppointmentsCalendarView,
  StylistScheduleView,
} from "@/components/pages/AppointmentsCalendarView";
import { UsersView, SettingsView } from "@/components/pages/UsersSettingsViews";
import { AddOrderView, AddSaleView } from "@/components/pages/AddSaleView";
import { AddProductView } from "@/components/pages/AddProductView";
import { ProductSlugRedirect } from "@/components/pages/ProductSectionRedirect";
import {
  AccountBookView,
  PaymentAccountsListView,
  PaymentsListView,
  PosPlaceholderViews,
} from "@/components/pages/PosNavViews";
import type { TenantCode } from "@/lib/registries/tenants";

import type { CreateFlowKey } from "@/lib/registries/createFlows";
import { REPORT_REGISTRY } from "@/lib/registries/reportRegistry";

export interface EntityPageConfig {
  title: string;
  primaryActionLabel?: string;
  openCreateOnPrimary?: boolean;
  createFlowKey?: CreateFlowKey;
  createCopy?: { title: string; subtitle: string; submitLabel: string };
  /** @deprecated use createCopy */
  newOrderCopy?: { title: string; subtitle: string; submitLabel: string };
  View: ComponentType;
}

type SlugMap = Partial<Record<string, EntityPageConfig>>;

const sharedUsers: EntityPageConfig = { title: "Users", View: UsersView };
const sharedSettings: EntityPageConfig = { title: "Settings", View: SettingsView };
const sharedFinance: EntityPageConfig = { title: "Finance", View: FinanceView };
const sharedSuppliers: EntityPageConfig = {
  title: "Suppliers",
  primaryActionLabel: "Add Supplier",
  openCreateOnPrimary: true,
  createFlowKey: "supplier",
  createCopy: {
    title: "Add Supplier",
    subtitle: "Register a new supplier",
    submitLabel: "Add Supplier",
  },
  View: WarehouseSuppliersView,
};

const inbound: EntityPageConfig = {
  title: "Inbound",
  primaryActionLabel: "New Inbound",
  openCreateOnPrimary: true,
  createFlowKey: "inbound",
  createCopy: { title: "New Inbound", subtitle: "Record incoming stock", submitLabel: "Create" },
  View: () => <MovementListView type="inbound" />,
};

const outbound: EntityPageConfig = {
  title: "Outbound",
  primaryActionLabel: "New Outbound",
  openCreateOnPrimary: true,
  createFlowKey: "outbound",
  createCopy: { title: "New Outbound", subtitle: "Record outgoing stock", submitLabel: "Create" },
  View: () => <MovementListView type="outbound" />,
};

function reportsFor(code: TenantCode): EntityPageConfig {
  return {
    title: "Reports",
    View: () => <EntityReportsView tenantCode={code} />,
  };
}

function transactionRetailPages(code: TenantCode): SlugMap {
  return {
    sales: {
      title: code === "VSP" ? "Orders" : "Sales",
      primaryActionLabel: code === "VSP" ? "New Order" : "New Sale",
      openCreateOnPrimary: true,
      createFlowKey: "sale",
      createCopy: {
        title: code === "VSP" ? "New Order" : "New Sale",
        subtitle: "Record a transaction",
        submitLabel: code === "VSP" ? "Complete Order" : "Complete Sale",
      },
      View: SalesListView,
    },
    catalog: { title: "Catalog", View: CatalogListView },
    returns: { title: "Returns & Warranty", View: ReturnsListView },
    customers: { title: "Customers", View: CustomersListView },
    reports: reportsFor(code),
    finance: sharedFinance,
    users: sharedUsers,
    settings: sharedSettings,
    ...posSellPages(AddSaleView),
    ...posProductPages,
    ...posPaymentPages,
    ...legacyReportPages,
  };
}

function posSellPages(addSaleView: ComponentType): SlugMap {
  return {
    "add-sale": { title: "Add Sale", View: addSaleView },
    pos: { title: "List POS", View: PosPlaceholderViews.pos },
    "pos-terminal": { title: "POS", View: PosPlaceholderViews["pos-terminal"] },
    "add-draft": { title: "Add Draft", View: PosPlaceholderViews["add-draft"] },
    drafts: { title: "List Drafts", View: PosPlaceholderViews.drafts },
    "add-quotation": { title: "Add Quotation", View: PosPlaceholderViews["add-quotation"] },
    quotations: { title: "List Quotations", View: PosPlaceholderViews.quotations },
    shipments: { title: "Shipments", View: PosPlaceholderViews.shipments },
    discounts: { title: "Discounts", View: PosPlaceholderViews.discounts },
    "import-sales": { title: "Import Sales", View: PosPlaceholderViews["import-sales"] },
  };
}

const posProductPages: SlugMap = {
  "add-product": { title: "Add Product", View: AddProductView },
  "update-price": { title: "Update Price", View: () => <ProductSlugRedirect slug="update-price" /> },
  "print-labels": { title: "Print Labels", View: PosPlaceholderViews["print-labels"] },
  variations: { title: "Variations", View: PosPlaceholderViews.variations },
  "import-products": { title: "Import Products", View: PosPlaceholderViews["import-products"] },
  "import-opening-stock": {
    title: "Import Opening Stock",
    View: PosPlaceholderViews["import-opening-stock"],
  },
  "price-groups": { title: "Selling Price Group", View: () => <ProductSlugRedirect slug="price-groups" /> },
  units: { title: "Units", View: () => <ProductSlugRedirect slug="units" /> },
  categories: { title: "Categories", View: () => <ProductSlugRedirect slug="categories" /> },
  brands: { title: "Brands", View: () => <ProductSlugRedirect slug="brands" /> },
  warranties: { title: "Warranties", View: () => <ProductSlugRedirect slug="warranties" /> },
};

const procurementPages: SlugMap = {
  "purchase-orders": { title: "Purchase Orders", View: PurchaseOrdersView },
  "purchase-returns": { title: "Purchase Returns", View: PurchaseReturnsView },
};

function reportRegistryPages(): SlugMap {
  return Object.fromEntries(
    REPORT_REGISTRY.map((entry) => [
      entry.slug,
      {
        title: entry.label,
        View: () => <ReportRunView slug={entry.slug} />,
      },
    ]),
  );
}

const legacyReportPages = reportRegistryPages();

const posPaymentPages: SlugMap = {
  "payment-accounts": { title: "Payment Accounts", View: PaymentAccountsListView },
  payments: { title: "Payments", View: PaymentsListView },
  "account-book": { title: "Account Book", View: AccountBookView },
  "balance-sheet": { title: "Balance Sheet", View: () => <ReportRunView slug="balance-sheet" /> },
  "trial-balance": { title: "Trial Balance", View: () => <ReportRunView slug="trial-balance" /> },
  "cash-flow": { title: "Cash Flow", View: () => <ReportRunView slug="cash-flow" /> },
  "payment-account-report": {
    title: "Payment Account Report",
    View: () => <ReportRunView slug="payment-account-report" />,
  },
};

const ENTITY_PAGES: Record<TenantCode, SlugMap> = {
  VW: {
    inventory: {
      title: "Inventory",
      primaryActionLabel: "Add Item",
      openCreateOnPrimary: true,
      createFlowKey: "item",
      createCopy: { title: "Add Item", subtitle: "Add a new SKU", submitLabel: "Add Item" },
      View: WarehouseInventoryView,
    },
    inbound,
    outbound,
    transfers: {
      title: "Transfers",
      primaryActionLabel: "New Transfer",
      openCreateOnPrimary: true,
      createFlowKey: "transfer",
      createCopy: { title: "New Transfer", subtitle: "Request stock transfer", submitLabel: "Create Transfer" },
      View: WarehouseTransfersView,
    },
    reports: reportsFor("VW"),
    finance: sharedFinance,
    suppliers: sharedSuppliers,
    users: sharedUsers,
    settings: sharedSettings,
    ...posProductPages,
    ...posPaymentPages,
    ...procurementPages,
    ...legacyReportPages,
  },
  VKW: {
    inventory: {
      title: "Inventory",
      primaryActionLabel: "Add Variant",
      openCreateOnPrimary: true,
      createFlowKey: "variant",
      createCopy: { title: "Add Variant", subtitle: "Add item with size × color matrix", submitLabel: "Add" },
      View: KidsWearInventoryView,
    },
    inbound,
    outbound,
    reports: reportsFor("VKW"),
    finance: sharedFinance,
    suppliers: sharedSuppliers,
    users: sharedUsers,
    settings: sharedSettings,
    ...posProductPages,
    ...posPaymentPages,
    ...procurementPages,
    ...legacyReportPages,
  },
  VISP: transactionRetailPages("VISP"),
  VSP: transactionRetailPages("VSP"),
  VC: {
    orders: {
      title: "Orders",
      primaryActionLabel: "New Order",
      openCreateOnPrimary: true,
      createFlowKey: "sale",
      createCopy: { title: "New Order", subtitle: "Create cafe order", submitLabel: "Create Order" },
      View: OrdersListView,
    },
    "menu-items": {
      title: "Menu Items",
      primaryActionLabel: "Add Menu Item",
      openCreateOnPrimary: true,
      createFlowKey: "menu-item",
      createCopy: { title: "Add Menu Item", subtitle: "With modifier groups", submitLabel: "Add" },
      View: MenuItemsListView,
    },
    kitchen: { title: "Kitchen Display", View: KitchenDisplayView },
    tables: { title: "Table Management", View: TableManagementView },
    reports: reportsFor("VC"),
    finance: sharedFinance,
    suppliers: sharedSuppliers,
    users: sharedUsers,
    settings: sharedSettings,
    ...posSellPages(AddOrderView),
    ...posProductPages,
    ...posPaymentPages,
    ...legacyReportPages,
  },
  VM: {
    jobs: {
      title: "Jobs",
      primaryActionLabel: "New Job",
      openCreateOnPrimary: true,
      createFlowKey: "job",
      createCopy: {
        title: "New Job",
        subtitle: "Create repair job",
        submitLabel: "Create Job",
      },
      View: JobsListView,
    },
    vehicles: { title: "Vehicle Registry", View: VehiclesListView },
    requisitions: { title: "Parts Requisition", View: RequisitionsListView },
    customers: { title: "Customers", View: CustomersListView },
    reports: reportsFor("VM"),
    finance: sharedFinance,
    users: sharedUsers,
    settings: sharedSettings,
    ...legacyReportPages,
  },
  VMS: {
    jobs: {
      title: "Jobs",
      primaryActionLabel: "New Job",
      openCreateOnPrimary: true,
      createFlowKey: "job",
      createCopy: {
        title: "New Job",
        subtitle: "Create fabrication job",
        submitLabel: "Create Job",
      },
      View: JobsListView,
    },
    requisitions: { title: "Material Requisition", View: RequisitionsListView },
    customers: { title: "Customers", View: CustomersListView },
    reports: reportsFor("VMS"),
    finance: sharedFinance,
    users: sharedUsers,
    settings: sharedSettings,
    ...legacyReportPages,
  },
  VS: {
    appointments: {
      title: "Appointments",
      primaryActionLabel: "New Appointment",
      openCreateOnPrimary: true,
      createFlowKey: "appointment",
      createCopy: {
        title: "New Appointment",
        subtitle: "Book a customer appointment",
        submitLabel: "Book Appointment",
      },
      View: AppointmentsCalendarView,
    },
    customers: { title: "Customers", View: CustomersListView },
    services: { title: "Services", View: ServicesListView },
    "stylist-schedule": { title: "Stylist Schedule", View: StylistScheduleView },
    reports: reportsFor("VS"),
    finance: sharedFinance,
    users: sharedUsers,
    settings: sharedSettings,
    ...legacyReportPages,
  },
};

export function getEntityPage(tenantCode: string, slug: string): EntityPageConfig | null {
  if (!(tenantCode in ENTITY_PAGES)) return null;
  return ENTITY_PAGES[tenantCode as TenantCode][slug] ?? null;
}

export function isEntityPageSlug(tenantCode: string, slug: string): boolean {
  return getEntityPage(tenantCode, slug) !== null;
}

/** @deprecated use getEntityPage("VW", slug) */
export { warehousePages, isWarehousePageSlug } from "./warehousePages";
