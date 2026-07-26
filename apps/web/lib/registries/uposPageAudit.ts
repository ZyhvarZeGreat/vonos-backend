/**
 * VA / HQ6 sidebar ↔ ui-audit inventory.
 * Source: hq6.vonosautomarket.com/ui-audit + ui-walkthrough/_sidebar/links.json
 *
 * Counts: 71 audit page folders + 9 section headers + ~70 leaf routes.
 * Fix UI one leaf at a time against screenshot.png in each audit folder.
 */

export interface UposAuditPage {
  /** HQ6 sidebar label */
  label: string;
  /** ui-audit folder under hq6.vonosautomarket.com/ui-audit/ */
  audit: string;
  /** Vonos App Router slug under /VA/… */
  route: string;
  section: string;
}

/** Collapsible sidebar section headers (not pages). */
export const UPOS_SIDEBAR_SECTIONS = [
  "User Management",
  "Contacts",
  "Products",
  "Purchases",
  "Sell",
  "Expenses",
  "Payment Accounts",
  "Reports",
  "Settings",
] as const;

/**
 * Leaf pages in HQ6 sidebar order — 70 pages with matching ui-audit scrapes.
 * Use this as the checklist for per-page UPOS markup/CSS fixes.
 */
export const UPOS_AUDIT_PAGES: UposAuditPage[] = [
  { label: "Home", audit: "00_home", route: "/VA/overview", section: "Home" },
  { label: "Users", audit: "01_users", route: "/VA/users", section: "User Management" },
  { label: "Roles", audit: "02_roles", route: "/VA/roles", section: "User Management" },
  {
    label: "Sales Commission Agents",
    audit: "03_sales-commission-agents",
    route: "/VA/commission-agents",
    section: "User Management",
  },
  {
    label: "Suppliers",
    audit: "04_contacts__type=supplier",
    route: "/VA/suppliers",
    section: "Contacts",
  },
  {
    label: "Customers",
    audit: "05_contacts__type=customer",
    route: "/VA/customers",
    section: "Contacts",
  },
  {
    label: "Customer Groups",
    audit: "06_customer-group",
    route: "/VA/customer-groups",
    section: "Contacts",
  },
  {
    label: "Import Contacts",
    audit: "07_contacts__import",
    route: "/VA/import-contacts",
    section: "Contacts",
  },
  { label: "List Products", audit: "08_products", route: "/VA/catalog", section: "Products" },
  {
    label: "Add Product",
    audit: "09_products__create",
    route: "/VA/add-product",
    section: "Products",
  },
  {
    label: "Update Price",
    audit: "10_update-product-price",
    route: "/VA/update-price",
    section: "Products",
  },
  {
    label: "Print Labels",
    audit: "11_labels__show",
    route: "/VA/print-labels",
    section: "Products",
  },
  {
    label: "Variations",
    audit: "12_variation-templates",
    route: "/VA/variations",
    section: "Products",
  },
  {
    label: "Import Products",
    audit: "13_import-products",
    route: "/VA/import-products",
    section: "Products",
  },
  {
    label: "Import Opening Stock",
    audit: "14_import-opening-stock",
    route: "/VA/import-opening-stock",
    section: "Products",
  },
  {
    label: "Selling Price Group",
    audit: "15_selling-price-group",
    route: "/VA/price-groups",
    section: "Products",
  },
  { label: "Units", audit: "16_units", route: "/VA/units", section: "Products" },
  {
    label: "Categories",
    audit: "17_taxonomies__type=product",
    route: "/VA/categories",
    section: "Products",
  },
  { label: "Brands", audit: "18_brands", route: "/VA/brands", section: "Products" },
  { label: "Warranties", audit: "19_warranties", route: "/VA/warranties", section: "Products" },
  {
    label: "Purchase Order",
    audit: "20_purchase-order",
    route: "/VA/purchase-orders",
    section: "Purchases",
  },
  {
    label: "List Purchases",
    audit: "21_purchases",
    route: "/VA/purchases",
    section: "Purchases",
  },
  {
    label: "Add Purchase",
    audit: "22_purchases__create",
    route: "/VA/add-purchase",
    section: "Purchases",
  },
  {
    label: "List Purchase Return",
    audit: "23_purchase-return",
    route: "/VA/purchase-returns",
    section: "Purchases",
  },
  { label: "All sales", audit: "24_sells", route: "/VA/sales", section: "Sell" },
  { label: "Add Sale", audit: "25_sells__create", route: "/VA/add-sale", section: "Sell" },
  { label: "List POS", audit: "26_pos", route: "/VA/pos", section: "Sell" },
  { label: "POS", audit: "27_pos__create", route: "/VA/pos-terminal", section: "Sell" },
  {
    label: "Add Draft",
    audit: "28_sells__create__status=draft",
    route: "/VA/add-draft",
    section: "Sell",
  },
  { label: "List Drafts", audit: "29_sells__drafts", route: "/VA/drafts", section: "Sell" },
  {
    label: "Add Quotation",
    audit: "30_sells__create__status=quotation",
    route: "/VA/add-quotation",
    section: "Sell",
  },
  {
    label: "List quotations",
    audit: "31_sells__quotations",
    route: "/VA/quotations",
    section: "Sell",
  },
  { label: "List Sell Return", audit: "32_sell-return", route: "/VA/returns", section: "Sell" },
  { label: "Shipments", audit: "33_shipments", route: "/VA/shipments", section: "Sell" },
  { label: "Discounts", audit: "34_discount", route: "/VA/discounts", section: "Sell" },
  { label: "Import Sales", audit: "35_import-sales", route: "/VA/import-sales", section: "Sell" },
  { label: "List Expenses", audit: "36_expenses", route: "/VA/expenses", section: "Expenses" },
  {
    label: "Add Expense",
    audit: "37_expenses__create",
    route: "/VA/add-expense",
    section: "Expenses",
  },
  {
    label: "Expense Categories",
    audit: "38_expense-categories",
    route: "/VA/expense-categories",
    section: "Expenses",
  },
  {
    label: "List Accounts",
    audit: "39_account__account",
    route: "/VA/payment-accounts",
    section: "Payment Accounts",
  },
  {
    label: "Balance Sheet",
    audit: "40_account__balance-sheet",
    route: "/VA/balance-sheet",
    section: "Payment Accounts",
  },
  {
    label: "Trial Balance",
    audit: "41_account__trial-balance",
    route: "/VA/trial-balance",
    section: "Payment Accounts",
  },
  {
    label: "Cash Flow",
    audit: "42_account__cash-flow",
    route: "/VA/cash-flow",
    section: "Payment Accounts",
  },
  {
    label: "Payment Account Report",
    audit: "43_account__payment-account-report",
    route: "/VA/payment-account-report",
    section: "Payment Accounts",
  },
  {
    label: "Profit / Loss Report",
    audit: "44_reports__profit-loss",
    route: "/VA/reports/profit-loss",
    section: "Reports",
  },
  {
    label: "Purchase & Sale",
    audit: "45_reports__purchase-sell",
    route: "/VA/reports/purchase-sell",
    section: "Reports",
  },
  {
    label: "Tax Report",
    audit: "46_reports__tax-report",
    route: "/VA/reports/tax",
    section: "Reports",
  },
  {
    label: "Supplier & Customer Report",
    audit: "47_reports__customer-supplier",
    route: "/VA/reports/customer-supplier",
    section: "Reports",
  },
  {
    label: "Customer Groups Report",
    audit: "48_reports__customer-group",
    route: "/VA/reports/customer-group",
    section: "Reports",
  },
  {
    label: "Stock Report",
    audit: "49_reports__stock-report",
    route: "/VA/reports/stock",
    section: "Reports",
  },
  {
    label: "Trending Products",
    audit: "50_reports__trending-products",
    route: "/VA/reports/trending-products",
    section: "Reports",
  },
  {
    label: "Items Report",
    audit: "51_reports__items-report",
    route: "/VA/reports/items",
    section: "Reports",
  },
  {
    label: "Product Purchase Report",
    audit: "52_reports__product-purchase-report",
    route: "/VA/reports/product-purchase",
    section: "Reports",
  },
  {
    label: "Product Sell Report",
    audit: "53_reports__product-sell-report",
    route: "/VA/reports/product-sell",
    section: "Reports",
  },
  {
    label: "Purchase Payment Report",
    audit: "54_reports__purchase-payment-report",
    route: "/VA/reports/purchase-payment",
    section: "Reports",
  },
  {
    label: "Sell Payment Report",
    audit: "55_reports__sell-payment-report",
    route: "/VA/reports/sell-payment",
    section: "Reports",
  },
  {
    label: "Expense Report",
    audit: "56_reports__expense-report",
    route: "/VA/reports/expense",
    section: "Reports",
  },
  {
    label: "Register Report",
    audit: "57_reports__register-report",
    route: "/VA/reports/register",
    section: "Reports",
  },
  {
    label: "Sales Representative Report",
    audit: "58_reports__sales-representative-report",
    route: "/VA/reports/sales-representative",
    section: "Reports",
  },
  {
    label: "Service Staff Report",
    audit: "59_reports__service-staff-report",
    route: "/VA/reports/service-staff",
    section: "Reports",
  },
  {
    label: "Activity Log",
    audit: "60_reports__activity-log",
    route: "/VA/reports/activity-log",
    section: "Reports",
  },
  { label: "Orders", audit: "61_modules__orders", route: "/VA/orders", section: "Orders" },
  {
    label: "Notification Templates",
    audit: "62_notification-templates",
    route: "/VA/notification-templates",
    section: "Notification Templates",
  },
  {
    label: "Business Settings",
    audit: "63_business__settings",
    route: "/VA/settings",
    section: "Settings",
  },
  {
    label: "Business Locations",
    audit: "64_business-location",
    route: "/VA/locations",
    section: "Settings",
  },
  {
    label: "Invoice Settings",
    audit: "65_invoice-schemes",
    route: "/VA/invoice-settings",
    section: "Settings",
  },
  {
    label: "Barcode Settings",
    audit: "66_barcodes",
    route: "/VA/barcode-settings",
    section: "Settings",
  },
  {
    label: "Receipt Printers",
    audit: "67_printers",
    route: "/VA/receipt-printers",
    section: "Settings",
  },
  { label: "Tax Rates", audit: "68_tax-rates", route: "/VA/tax-rates", section: "Settings" },
  { label: "HRM", audit: "69_hrm__dashboard", route: "/VA/hrm", section: "HRM" },
  {
    label: "Essentials",
    audit: "70_essentials__todo",
    route: "/VA/essentials-todo",
    section: "Essentials",
  },
];

export const UPOS_AUDIT_PAGE_COUNT = UPOS_AUDIT_PAGES.length;
export const UPOS_AUDIT_FOLDER_COUNT = 71;
