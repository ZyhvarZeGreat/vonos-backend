const HQ6_PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Home", subtitle: "Welcome" },
  catalog: { title: "Products", subtitle: "Manage your products" },
  inventory: { title: "Products", subtitle: "Manage your products" },
  "add-product": { title: "Add Product", subtitle: "Create a new product" },
  "update-price": { title: "Update Product Price", subtitle: "Bulk update selling prices" },
  "print-labels": { title: "Print Labels", subtitle: "Print product barcodes" },
  variations: { title: "Variations", subtitle: "Manage variation templates" },
  "import-products": { title: "Import Products", subtitle: "Import products from CSV" },
  "import-opening-stock": {
    title: "Import Opening Stock",
    subtitle: "Import opening stock",
  },
  "price-groups": { title: "Selling Price Group", subtitle: "Manage price groups" },
  units: { title: "Units", subtitle: "Manage your units" },
  categories: { title: "Categories", subtitle: "Manage your categories" },
  brands: { title: "Brands", subtitle: "Manage your brands" },
  warranties: { title: "Warranties", subtitle: "Manage warranties" },
  sales: { title: "Sales", subtitle: "Manage all sales" },
  "add-sale": { title: "Add Sale", subtitle: "Create a new sale" },
  drafts: { title: "List Drafts", subtitle: "Manage draft sales" },
  "add-draft": { title: "Add Draft", subtitle: "Create a draft sale" },
  quotations: { title: "List Quotations", subtitle: "Manage quotations" },
  "add-quotation": { title: "Add Quotation", subtitle: "Create a quotation" },
  returns: { title: "Sell Return", subtitle: "Manage sell returns" },
  shipments: { title: "Shipments", subtitle: "Manage shipments" },
  discounts: { title: "Discounts", subtitle: "Manage discounts" },
  "import-sales": { title: "Import Sales", subtitle: "Import sales from CSV" },
  pos: { title: "List POS", subtitle: "Point of sale registers" },
  "pos-terminal": { title: "POS", subtitle: "Point of sale terminal" },
  customers: { title: "Customers", subtitle: "Manage customers" },
  suppliers: { title: "Suppliers", subtitle: "Manage suppliers" },
  "customer-groups": { title: "Customer Groups", subtitle: "Manage customer groups" },
  "import-contacts": { title: "Import Contacts", subtitle: "Import contacts" },
  inbound: { title: "Purchases", subtitle: "Manage purchases" },
  "add-purchase": { title: "Add Purchase", subtitle: "Create a purchase" },
  "purchase-orders": { title: "Purchase Order", subtitle: "Manage purchase orders" },
  "purchase-returns": { title: "Purchase Return", subtitle: "Manage purchase returns" },
  expenses: { title: "Expenses", subtitle: "Manage expenses" },
  "add-expense": { title: "Add Expense", subtitle: "Create an expense" },
  "expense-categories": {
    title: "Expense Categories",
    subtitle: "Manage expense categories",
  },
  "payment-accounts": { title: "List Accounts", subtitle: "Payment accounts" },
  "balance-sheet": { title: "Balance Sheet", subtitle: "Account balance sheet" },
  "trial-balance": { title: "Trial Balance", subtitle: "Trial balance report" },
  "cash-flow": { title: "Cash Flow", subtitle: "Cash flow report" },
  "payment-account-report": {
    title: "Payment Account Report",
    subtitle: "Payment account report",
  },
  reports: { title: "Reports", subtitle: "Business reports" },
  finance: { title: "Finance", subtitle: "Ledger and P&L" },
  users: { title: "Users", subtitle: "Manage users" },
  roles: { title: "Roles", subtitle: "Manage roles" },
  "commission-agents": {
    title: "Sales Commission Agents",
    subtitle: "Manage commission agents",
  },
  hrm: { title: "HRM", subtitle: "Human resource management" },
  settings: { title: "Business Settings", subtitle: "Configure your business" },
  locations: { title: "Business Locations", subtitle: "Manage locations" },
  "invoice-settings": {
    title: "Invoice Settings",
    subtitle: "Invoice schemes and layouts",
  },
  "barcode-settings": { title: "Barcode Settings", subtitle: "Manage barcodes" },
  "receipt-printers": { title: "Receipt Printers", subtitle: "Manage printers" },
  "tax-rates": { title: "Tax Rates", subtitle: "Manage tax rates" },
  jobs: { title: "Jobs", subtitle: "Manage workshop jobs" },
  vehicles: { title: "Vehicles", subtitle: "Vehicle registry" },
  requisitions: { title: "Requisitions", subtitle: "Parts requisitions" },
  orders: { title: "Orders", subtitle: "Manage orders" },
  "essentials-todo": { title: "To Do", subtitle: "Essentials to do list" },
};

/** HQ6 tab-row primary action rules per ui-audit screenshots. */
export type Hq6ListActionRule = {
  addVariant: "blue" | "purple" | "none";
  showDownloadExcel: boolean;
  titleOnly: boolean;
};

const HQ6_LIST_ACTION_RULES: Record<string, Hq6ListActionRule> = {
  catalog: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  sales: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  drafts: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  quotations: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  returns: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  shipments: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  discounts: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  inbound: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  expenses: { addVariant: "purple", showDownloadExcel: true, titleOnly: true },
  users: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  customers: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  suppliers: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  units: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  categories: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  brands: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  roles: { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  "commission-agents": { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  pos: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  warranties: { addVariant: "purple", showDownloadExcel: true, titleOnly: true },
  "price-groups": { addVariant: "purple", showDownloadExcel: true, titleOnly: true },
  "purchase-orders": { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  "purchase-returns": { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  "customer-groups": { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  "expense-categories": { addVariant: "purple", showDownloadExcel: true, titleOnly: true },
  "essentials-todo": { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
};

export function hq6CopyForSlug(slug: string | null | undefined): {
  title: string;
  subtitle: string;
} {
  if (!slug) return { title: "Home", subtitle: "" };
  return HQ6_PAGE_COPY[slug] ?? { title: slug.replace(/-/g, " "), subtitle: "" };
}

export function hq6ListActionRule(slug: string | null | undefined): Hq6ListActionRule {
  if (!slug) {
    return { addVariant: "blue", showDownloadExcel: false, titleOnly: true };
  }
  return (
    HQ6_LIST_ACTION_RULES[slug] ?? {
      addVariant: "blue",
      showDownloadExcel: true,
      titleOnly: true,
    }
  );
}
