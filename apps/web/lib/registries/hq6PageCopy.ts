const HQ6_PAGE_COPY: Record<
  string,
  { title: string; subtitle: string; searchPlaceholder?: string }
> = {
  overview: { title: "Home", subtitle: "Welcome" },
  catalog: {
    title: "Products",
    subtitle: "Manage your products",
    searchPlaceholder: "Search by SKU, name, brand, model, category…",
  },
  inventory: {
    title: "Products",
    subtitle: "Manage your products",
    searchPlaceholder: "Search by SKU, name, brand, model, category…",
  },
  "add-product": { title: "Add new product", subtitle: "" },
  "update-price": { title: "Update Product Price", subtitle: "" },
  "print-labels": { title: "Print Labels", subtitle: "" },
  variations: {
    title: "Variations",
    subtitle: "Manage product variations",
    searchPlaceholder: "Search ...",
  },
  "import-products": { title: "Import Products", subtitle: "" },
  "import-opening-stock": {
    title: "Import Opening Stock",
    subtitle: "",
  },
  "group-stock": {
    title: "Group Stock",
    subtitle: "VW / VISP / VSP quantities (view only)",
    searchPlaceholder: "Search by name or SKU…",
  },
  "price-groups": {
    title: "Selling Price Group",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  units: {
    title: "Units",
    subtitle: "Manage your units",
    searchPlaceholder: "Search ...",
  },
  categories: {
    title: "Categories",
    subtitle: "Manage your categories",
    searchPlaceholder: "Search ...",
  },
  brands: {
    title: "Brands",
    subtitle: "Manage your brands",
    searchPlaceholder: "Search ...",
  },
  warranties: {
    title: "Warranties",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  sales: {
    title: "Sales",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "add-sale": { title: "Add Sale", subtitle: "" },
  drafts: {
    title: "Drafts",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "add-draft": { title: "Add Draft", subtitle: "" },
  quotations: {
    title: "List quotations",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "add-quotation": { title: "Add Quotation", subtitle: "" },
  returns: {
    title: "Sell Return",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  shipments: {
    title: "Shipments",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  discounts: {
    title: "Discount",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "import-sales": { title: "Import Sales", subtitle: "" },
  pos: { title: "POS", subtitle: "" },
  "pos-terminal": { title: "POS", subtitle: "" },
  customers: {
    title: "Customers",
    subtitle: "Manage your Customers",
    searchPlaceholder: "Search ...",
  },
  suppliers: {
    title: "Suppliers",
    subtitle: "Manage your Suppliers",
    searchPlaceholder: "Search ...",
  },
  "customer-groups": {
    title: "Customer Groups",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "import-contacts": { title: "Import Contacts", subtitle: "" },
  inbound: {
    title: "Purchases",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  purchases: {
    title: "Purchases",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "add-purchase": { title: "Add Purchase", subtitle: "" },
  "purchase-orders": {
    title: "Purchase Order",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "purchase-returns": {
    title: "Purchase Return",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  expenses: {
    title: "Expenses",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  "add-expense": { title: "Add Expense", subtitle: "" },
  "expense-categories": {
    title: "Expense Categories",
    subtitle: "Manage your expense categories",
    searchPlaceholder: "Search ...",
  },
  "payment-accounts": {
    title: "Payment Accounts",
    subtitle: "Manage your account",
    searchPlaceholder: "Search ...",
  },
  "account-book": {
    title: "Account Book",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  payments: {
    title: "Payments",
    subtitle: "Manage your payments",
    searchPlaceholder: "Search ...",
  },
  accounts: {
    title: "Payment Accounts",
    subtitle: "Manage your account",
    searchPlaceholder: "Search ...",
  },
  "balance-sheet": { title: "Balance Sheet", subtitle: "" },
  "trial-balance": { title: "Trial Balance", subtitle: "" },
  "cash-flow": { title: "Cash Flow", subtitle: "" },
  "payment-account-report": {
    title: "Payment Account Report",
    subtitle: "",
  },
  reports: { title: "Reports", subtitle: "Business reports" },
  finance: {
    title: "Finance",
    subtitle: "Ledger and P&L",
    searchPlaceholder: "Search by description, category, currency…",
  },
  users: {
    title: "Users",
    subtitle: "Manage users",
    searchPlaceholder: "Search ...",
  },
  roles: {
    title: "Roles",
    subtitle: "Manage roles",
    searchPlaceholder: "Search by role name…",
  },
  "commission-agents": {
    title: "Sales Commission Agents",
    subtitle: "",
    searchPlaceholder: "Search ...",
  },
  hrm: {
    title: "HRM",
    subtitle: "Human resource management",
    searchPlaceholder: "Search by employee name…",
  },
  settings: { title: "Business Settings", subtitle: "" },
  locations: {
    title: "Business Locations",
    subtitle: "Manage your business locations",
  },
  "invoice-settings": {
    title: "Invoice Settings",
    subtitle: "Manage your invoice settings",
  },
  "barcode-settings": {
    title: "Barcodes",
    subtitle: "Manage your barcode settings",
  },
  "receipt-printers": {
    title: "Printers",
    subtitle: "Manage your Printers",
  },
  "tax-rates": { title: "Tax Rates", subtitle: "Manage your tax rates" },
  jobs: {
    title: "Jobs",
    subtitle: "Manage workshop jobs",
    searchPlaceholder: "Search by job #, customer, plate, make, model…",
  },
  vehicles: {
    title: "Vehicles",
    subtitle: "Vehicle registry",
    searchPlaceholder: "Search by plate, VIN, make, model, owner…",
  },
  requisitions: { title: "Requisitions", subtitle: "Parts requisitions" },
  orders: {
    title: "Orders",
    subtitle: "Manage orders",
    searchPlaceholder: "Search by order #, customer, phone…",
  },
  "essentials-todo": {
    title: "To Do",
    subtitle: "",
    searchPlaceholder: "Search...",
  },
  "notification-templates": {
    title: "Notification Templates",
    subtitle: "",
  },
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
  returns: { addVariant: "none", showDownloadExcel: false, titleOnly: true },
  shipments: { addVariant: "none", showDownloadExcel: false, titleOnly: true },
  discounts: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  inbound: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  purchases: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  expenses: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  users: { addVariant: "blue", showDownloadExcel: false, titleOnly: false },
  customers: { addVariant: "blue", showDownloadExcel: true, titleOnly: false },
  suppliers: { addVariant: "blue", showDownloadExcel: true, titleOnly: false },
  units: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  categories: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  brands: { addVariant: "purple", showDownloadExcel: true, titleOnly: false },
  roles: { addVariant: "blue", showDownloadExcel: false, titleOnly: false },
  "commission-agents": { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  pos: { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  warranties: { addVariant: "purple", showDownloadExcel: true, titleOnly: true },
  "price-groups": { addVariant: "purple", showDownloadExcel: true, titleOnly: true },
  "purchase-orders": { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  "purchase-returns": { addVariant: "none", showDownloadExcel: false, titleOnly: true },
  "customer-groups": { addVariant: "blue", showDownloadExcel: true, titleOnly: true },
  variations: { addVariant: "blue", showDownloadExcel: false, titleOnly: false },
  "expense-categories": {
    addVariant: "blue",
    showDownloadExcel: false,
    titleOnly: false,
  },
  "payment-accounts": {
    addVariant: "blue",
    showDownloadExcel: false,
    titleOnly: false,
  },
  "account-book": {
    addVariant: "none",
    showDownloadExcel: true,
    titleOnly: true,
  },
  payments: {
    addVariant: "none",
    showDownloadExcel: true,
    titleOnly: false,
  },
  accounts: {
    addVariant: "blue",
    showDownloadExcel: false,
    titleOnly: false,
  },
  "essentials-todo": { addVariant: "blue", showDownloadExcel: false, titleOnly: true },
  locations: { addVariant: "blue", showDownloadExcel: false, titleOnly: false },
  "receipt-printers": { addVariant: "blue", showDownloadExcel: false, titleOnly: false },
  "barcode-settings": { addVariant: "blue", showDownloadExcel: false, titleOnly: false },
  jobs: { addVariant: "blue", showDownloadExcel: true, titleOnly: false },
  vehicles: { addVariant: "blue", showDownloadExcel: true, titleOnly: false },
  requisitions: { addVariant: "blue", showDownloadExcel: true, titleOnly: false },
};

export function hq6CopyForSlug(slug: string | null | undefined): {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
} {
  if (!slug) return { title: "Home", subtitle: "", searchPlaceholder: "Search by name, reference…" };
  const copy = HQ6_PAGE_COPY[slug];
  if (!copy) {
    return {
      title: slug.replace(/-/g, " "),
      subtitle: "",
      searchPlaceholder: "Search by name, reference…",
    };
  }
  return {
    title: copy.title,
    subtitle: copy.subtitle,
    searchPlaceholder: copy.searchPlaceholder ?? "Search by name, reference…",
  };
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
