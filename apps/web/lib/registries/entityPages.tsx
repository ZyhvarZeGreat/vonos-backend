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
  DraftsListView,
  QuotationsListView,
  OrdersListView,
  CustomersListView,
  ReturnsListView,
  VehiclesListView,
  RequisitionsListView,
  IncomingRequisitionsListView,
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
import { HrView, UsersView } from "@/components/pages/HrView";
import { LocationsView } from "@/components/pages/LocationsView";
import { SettingsView } from "@/components/pages/UsersSettingsViews";
import { AddOrderView, AddDraftView, AddQuotationView, AddSaleView } from "@/components/pages/AddSaleView";
import {
  DiscountsListView,
  ListPosView,
  PrintLabelsView,
  ShipmentsListView,
  UpdatePriceView,
  VariationsListView,
} from "@/components/pages/PosExtrasViews";
import { AddProductView } from "@/components/pages/AddProductView";
import { ProductSlugRedirect } from "@/components/pages/ProductSectionRedirect";
import {
  AccountBookView,
  createPosPlaceholderView,
  PaymentsListView,
  PosPlaceholderViews,
} from "@/components/pages/PosNavViews";
import { CatalogMetaListView } from "@/components/pages/CatalogMetaListView";
import { RolesListView, CommissionAgentsListView } from "@/components/pages/UserManagementViews";
import { CustomerGroupsListView, ImportContactsView, ImportProductsView, ImportSalesView } from "@/components/pages/ContactsGroupViews";
import { AddExpenseView, ExpenseCategoriesListView, ExpensesListView } from "@/components/pages/ExpensesViews";
import {
  PaymentAccountReportView,
  PaymentAccountsListView,
} from "@/components/pages/PaymentAccountViews";
import { AddPurchaseView } from "@/components/pages/AddPurchaseView";
import { PayrollView } from "@/components/pages/PayrollView";
import { InvoicesListView } from "@/components/pages/InvoicesListView";
import { HrmPageView, HRM_SLUG_TO_TAB, type HrmTab } from "@/components/pages/HrmPageView";
import { InvoiceSettingsView, BarcodeSettingsView, ReceiptPrintersView, TaxRatesListView } from "@/components/pages/SettingsSubViews";
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

const sharedHr: EntityPageConfig = { title: "HR & People", View: HrView };
const sharedUsers: EntityPageConfig = { title: "HR & People", View: UsersView };
const sharedLocations: EntityPageConfig = { title: "Locations", View: LocationsView };
const sharedSettings: EntityPageConfig = { title: "Settings", View: SettingsView };
const sharedFinance: EntityPageConfig = { title: "Finance", View: FinanceView };
const sharedCustomers: EntityPageConfig = {
  title: "Customers",
  primaryActionLabel: "Add Customer",
  openCreateOnPrimary: true,
  createFlowKey: "customer",
  createCopy: {
    title: "Add Customer",
    subtitle: "Register a new customer profile",
    submitLabel: "Add Customer",
  },
  View: CustomersListView,
};
const sharedCatalog: EntityPageConfig = {
  title: "Catalog",
  primaryActionLabel: "Add Product",
  openCreateOnPrimary: true,
  createFlowKey: "item",
  createCopy: {
    title: "Add Product",
    subtitle: "Add a product to the retail catalog",
    submitLabel: "Add Product",
  },
  View: CatalogListView,
};
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
    catalog: sharedCatalog,
    returns: { title: "Returns & Warranty", View: ReturnsListView },
    customers: sharedCustomers,
    suppliers: sharedSuppliers,
    reports: reportsFor(code),
    finance: sharedFinance,
    hr: sharedHr,
    users: sharedUsers,
    locations: sharedLocations,
    settings: sharedSettings,
    ...posSellPages(AddSaleView),
    ...posProductPages,
    ...posPaymentPages,
    ...procurementPages,
    ...userManagementPages,
    ...contactPages,
    ...expensePages,
    ...invoicePages,
    ...hrmPages,
    ...settingsPages,
    ...legacyReportPages,
  };
}

function posSellPages(addSaleView: ComponentType): SlugMap {
  return {
    "add-sale": { title: "Add Sale", View: addSaleView },
    pos: { title: "List POS", View: ListPosView },
    "pos-terminal": { title: "POS", View: PosPlaceholderViews["pos-terminal"] },
    "add-draft": { title: "Add Draft", View: AddDraftView },
    drafts: { title: "List Drafts", View: DraftsListView },
    "add-quotation": { title: "Add Quotation", View: AddQuotationView },
    quotations: { title: "List Quotations", View: QuotationsListView },
    shipments: { title: "Shipments", View: ShipmentsListView },
    discounts: { title: "Discounts", View: DiscountsListView },
    "import-sales": { title: "Import Sales", View: ImportSalesView },
  };
}

const posProductPages: SlugMap = {
  "add-product": { title: "Add Product", View: AddProductView },
  "update-price": { title: "Update Price", View: UpdatePriceView },
  "print-labels": { title: "Print Labels", View: PrintLabelsView },
  variations: { title: "Variations", View: VariationsListView },
  "import-products": { title: "Import Products", View: ImportProductsView },
  "import-opening-stock": {
    title: "Import Opening Stock",
    View: ImportProductsView,
  },
  "price-groups": { title: "Selling Price Group", View: () => <CatalogMetaListView kind="price-groups" /> },
  units: { title: "Units", View: () => <CatalogMetaListView kind="units" /> },
  categories: { title: "Categories", View: () => <CatalogMetaListView kind="categories" /> },
  brands: { title: "Brands", View: () => <CatalogMetaListView kind="brands" /> },
  warranties: { title: "Warranties", View: () => <CatalogMetaListView kind="warranties" /> },
};

const procurementPages: SlugMap = {
  inbound,
  "purchase-orders": { title: "Purchase Orders", View: PurchaseOrdersView },
  "purchase-returns": { title: "Purchase Returns", View: PurchaseReturnsView },
  "add-purchase": { title: "Add Purchase", View: AddPurchaseView },
};

const userManagementPages: SlugMap = {
  roles: { title: "Roles", View: RolesListView },
  "commission-agents": { title: "Sales Commission Agents", View: CommissionAgentsListView },
};

const contactPages: SlugMap = {
  "customer-groups": { title: "Customer Groups", View: CustomerGroupsListView },
  "import-contacts": { title: "Import Contacts", View: ImportContactsView },
};

const expensePages: SlugMap = {
  expenses: { title: "Expenses", View: ExpensesListView },
  "add-expense": { title: "Add Expense", View: AddExpenseView },
  "expense-categories": { title: "Expense Categories", View: ExpenseCategoriesListView },
};

const invoicePages: SlugMap = {
  invoices: { title: "Invoices", View: InvoicesListView },
};

function hrmPage(defaultTab: HrmTab): EntityPageConfig {
  return {
    title: "HRM",
    View: () => <HrmPageView defaultTab={defaultTab} />,
  };
}

const hrmPages: SlugMap = Object.fromEntries(
  Object.entries(HRM_SLUG_TO_TAB).map(([slug, tab]) => [slug, hrmPage(tab)]),
);

const settingsPages: SlugMap = {
  "invoice-settings": { title: "Invoice Settings", View: InvoiceSettingsView },
  "barcode-settings": { title: "Barcode Settings", View: BarcodeSettingsView },
  "receipt-printers": { title: "Receipt Printers", View: ReceiptPrintersView },
  "tax-rates": { title: "Tax Rates", View: TaxRatesListView },
};

function reportRegistryPages(): SlugMap {
  return Object.fromEntries(
    REPORT_REGISTRY.filter((entry) => entry.source.kind !== "payment-accounts").map(
      (entry) => [
        entry.slug,
        {
          title: entry.label,
          View: () => <ReportRunView slug={entry.slug} />,
        },
      ],
    ),
  );
}

const legacyReportPages: SlugMap = {
  ...reportRegistryPages(),
};

const posPaymentPages: SlugMap = {
  "payment-accounts": { title: "Payment Accounts", View: PaymentAccountsListView },
  payments: { title: "Payments", View: PaymentsListView },
  "account-book": { title: "Account Book", View: AccountBookView },
  "balance-sheet": {
    title: "Balance Sheet",
    View: () => <PaymentAccountReportView slug="balance-sheet" />,
  },
  "trial-balance": {
    title: "Trial Balance",
    View: () => <PaymentAccountReportView slug="trial-balance" />,
  },
  "cash-flow": {
    title: "Cash Flow",
    View: () => <PaymentAccountReportView slug="cash-flow" />,
  },
  "payment-account-report": {
    title: "Payment Account Report",
    View: () => <PaymentAccountReportView slug="payment-account-report" />,
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
    "incoming-requisitions": {
      title: "Incoming Requests",
      View: IncomingRequisitionsListView,
    },
    reports: reportsFor("VW"),
    finance: sharedFinance,
    suppliers: sharedSuppliers,
    customers: sharedCustomers,
    hr: sharedHr,
    users: sharedUsers,
    locations: sharedLocations,
    settings: sharedSettings,
    ...posProductPages,
    ...posPaymentPages,
    ...procurementPages,
    ...userManagementPages,
    ...contactPages,
    ...expensePages,
    ...invoicePages,
    ...hrmPages,
    ...settingsPages,
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
    customers: sharedCustomers,
    hr: sharedHr,
    users: sharedUsers,
    locations: sharedLocations,
    settings: sharedSettings,
    ...posProductPages,
    ...posPaymentPages,
    ...procurementPages,
    ...userManagementPages,
    ...contactPages,
    ...expensePages,
    ...invoicePages,
    ...hrmPages,
    ...settingsPages,
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
    customers: sharedCustomers,
    reports: reportsFor("VC"),
    finance: sharedFinance,
    suppliers: sharedSuppliers,
    hr: sharedHr,
    users: sharedUsers,
    locations: sharedLocations,
    settings: sharedSettings,
    ...posSellPages(AddOrderView),
    ...posProductPages,
    ...posPaymentPages,
    ...procurementPages,
    ...userManagementPages,
    ...contactPages,
    ...expensePages,
    ...invoicePages,
    ...hrmPages,
    ...settingsPages,
    ...legacyReportPages,
  },
  VA: {
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
    sales: {
      title: "Sales",
      primaryActionLabel: "New Sale",
      openCreateOnPrimary: true,
      createFlowKey: "sale",
      createCopy: {
        title: "New Sale",
        subtitle: "Record the commercial sale for a repair job",
        submitLabel: "Complete Sale",
      },
      View: SalesListView,
    },
    catalog: sharedCatalog,
    returns: { title: "Returns & Warranty", View: ReturnsListView },
    customers: sharedCustomers,
    suppliers: sharedSuppliers,
    reports: reportsFor("VA"),
    finance: sharedFinance,
    hr: sharedHr,
    users: sharedUsers,
    locations: sharedLocations,
    settings: sharedSettings,
    ...posSellPages(AddSaleView),
    ...posProductPages,
    ...procurementPages,
    ...posPaymentPages,
    ...userManagementPages,
    ...contactPages,
    ...expensePages,
    ...invoicePages,
    ...hrmPages,
    ...settingsPages,
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
    customers: sharedCustomers,
    services: { title: "Services", View: ServicesListView },
    "stylist-schedule": { title: "Stylist Schedule", View: StylistScheduleView },
    reports: reportsFor("VS"),
    finance: sharedFinance,
    hr: sharedHr,
    users: sharedUsers,
    locations: sharedLocations,
    settings: sharedSettings,
    ...posPaymentPages,
    ...userManagementPages,
    ...contactPages,
    ...expensePages,
    ...invoicePages,
    ...hrmPages,
    ...settingsPages,
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
