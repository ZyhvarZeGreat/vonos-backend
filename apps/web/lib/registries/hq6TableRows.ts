/**
 * HQ6 table row contracts — build tags from
 * `hq6.vonosautomarket.com/MODAL-VS-ROUTE.md` + `IMPLEMENT-FROM.md`.
 *
 * `build` is the source of truth for Vonos implementation:
 * - modal   → dialog/sheet over the list (URL must not change for primary content)
 * - route   → Next.js page (`/:id`, `/:id/edit`, or `?view=` tabs)
 * - confirm → small “Are you sure?” only
 * - unknown → scrape inconclusive — verify before coding
 */

export type Hq6RowActionBuild = "modal" | "route" | "confirm" | "unknown";

export type Hq6RowActionOutcome =
  | "opened_modal"
  | "navigated_subpage"
  | "delete_confirm_modal"
  | "no_visible_change"
  | "not_found";

export interface Hq6RowActionSpec {
  id: string;
  label: string;
  /** How to implement in Vonos (from MODAL-VS-ROUTE.md). */
  build: Hq6RowActionBuild;
  /** Raw scrape outcome (for audits). */
  outcome: Hq6RowActionOutcome;
  danger?: boolean;
}

export interface Hq6ColumnSpec {
  key: string;
  header: string;
  /** Shown by default before column-visibility changes. */
  defaultVisible?: boolean;
}

function action(
  id: string,
  label: string,
  build: Hq6RowActionBuild,
  outcome: Hq6RowActionOutcome,
  danger?: boolean,
): Hq6RowActionSpec {
  return { id, label, build, outcome, ...(danger ? { danger: true } : {}) };
}

/** Users — MODAL-VS-ROUTE / route/01-users */
export const HQ6_USER_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("edit", "Edit", "route", "navigated_subpage"),
  action("view", "View", "route", "navigated_subpage"),
  action("delete", "Delete", "route", "navigated_subpage", true),
];

/** Roles — Edit = route · Delete = confirm */
export const HQ6_ROLE_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("edit", "Edit", "route", "navigated_subpage"),
  action("delete", "Delete", "confirm", "delete_confirm_modal", true),
];

/** Customers — ui-table-rows/05_contacts__type=customer */
export const HQ6_CUSTOMER_COLUMNS: Hq6ColumnSpec[] = [
  { key: "contactId", header: "Contact ID", defaultVisible: true },
  { key: "businessName", header: "Business Name", defaultVisible: true },
  { key: "name", header: "Name", defaultVisible: true },
  { key: "email", header: "Email", defaultVisible: true },
  { key: "taxNumber", header: "Tax number", defaultVisible: true },
  { key: "creditLimit", header: "Credit Limit", defaultVisible: true },
  { key: "payTerm", header: "Pay term", defaultVisible: true },
  { key: "openingBalance", header: "Opening Balance", defaultVisible: true },
  { key: "advanceBalance", header: "Advance Balance", defaultVisible: true },
  { key: "createdAt", header: "Added On", defaultVisible: true },
  { key: "customerGroup", header: "Customer Group", defaultVisible: true },
  { key: "phone", header: "Mobile", defaultVisible: false },
  { key: "totalSellDue", header: "Total Sale Due", defaultVisible: false },
  { key: "totalSellReturn", header: "Total Sell Return Due", defaultVisible: false },
];

export const HQ6_CUSTOMER_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("pay", "Pay", "modal", "opened_modal"),
  action("view", "View", "route", "navigated_subpage"),
  action("edit", "Edit", "modal", "opened_modal"),
  action("delete", "Delete", "route", "navigated_subpage", true),
  action("deactivate", "Deactivate", "unknown", "no_visible_change"),
  action("ledger", "Ledger", "route", "navigated_subpage"),
  action("sales", "Sales", "route", "navigated_subpage"),
  action("documents", "Documents & Note", "route", "navigated_subpage"),
];

/** Suppliers — ui-table-rows/04_contacts__type=supplier */
export const HQ6_SUPPLIER_COLUMNS: Hq6ColumnSpec[] = [
  { key: "contactId", header: "Contact ID", defaultVisible: true },
  { key: "businessName", header: "Business Name", defaultVisible: true },
  { key: "contactName", header: "Name", defaultVisible: true },
  { key: "email", header: "Email", defaultVisible: true },
  { key: "taxNumber", header: "Tax number", defaultVisible: true },
  { key: "payTerm", header: "Pay term", defaultVisible: true },
  { key: "openingBalance", header: "Opening Balance", defaultVisible: true },
  { key: "advanceBalance", header: "Advance Balance", defaultVisible: true },
  { key: "createdAt", header: "Added On", defaultVisible: true },
  { key: "phone", header: "Mobile", defaultVisible: false },
  { key: "address", header: "Address", defaultVisible: false },
  { key: "totalPurchaseDue", header: "Total Purchase Due", defaultVisible: false },
  { key: "totalPurchaseReturn", header: "Total Purchase Return Due", defaultVisible: false },
];

export const HQ6_SUPPLIER_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("pay", "Pay", "modal", "opened_modal"),
  action("view", "View", "route", "navigated_subpage"),
  action("edit", "Edit", "modal", "opened_modal"),
  action("delete", "Delete", "route", "navigated_subpage", true),
  action("deactivate", "Deactivate", "unknown", "no_visible_change"),
  action("ledger", "Ledger", "route", "navigated_subpage"),
  action("purchases", "Purchases", "route", "navigated_subpage"),
  action("stock_report", "Stock Report", "route", "navigated_subpage"),
  action("documents", "Documents & Note", "route", "navigated_subpage"),
];

/** All sales — ui-table-rows/24_sells */
export const HQ6_SALE_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("view", "View", "modal", "opened_modal"),
  action("edit", "Edit", "route", "no_visible_change"),
  action("delete", "Delete", "confirm", "delete_confirm_modal", true),
  action("edit_shipping", "Edit Shipping", "modal", "opened_modal"),
  action("print", "Print Invoice", "modal", "opened_modal"),
  action("packing_slip", "Packing Slip", "modal", "opened_modal"),
  action("delivery_note", "Delivery Note", "modal", "opened_modal"),
  action("view_payments", "View Payments", "modal", "opened_modal"),
  action("sell_return", "Sell Return", "route", "navigated_subpage"),
  action("invoice_url", "Invoice URL", "modal", "opened_modal"),
];

/** Products — View = modal · Edit = route · Delete = confirm */
export const HQ6_PRODUCT_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("details", "Details", "unknown", "no_visible_change"),
  action("labels", "Labels", "route", "navigated_subpage"),
  action("view", "View", "modal", "opened_modal"),
  action("edit", "Edit", "route", "navigated_subpage"),
  action("delete", "Delete", "confirm", "delete_confirm_modal", true),
  action("opening_stock", "Add or edit opening stock", "modal", "opened_modal"),
  action("stock_history", "Product stock history", "route", "navigated_subpage"),
  action("duplicate", "Duplicate Product", "route", "navigated_subpage"),
];

/** Purchases — View/payments = modal · Edit = route · Delete = confirm */
export const HQ6_PURCHASE_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("view", "View", "modal", "opened_modal"),
  action("edit", "Edit", "route", "navigated_subpage"),
  action("delete", "Delete", "confirm", "delete_confirm_modal", true),
  action("print", "Print", "modal", "opened_modal"),
  action("add_payment", "Add payment", "modal", "opened_modal"),
  action("view_payments", "View Payments", "modal", "opened_modal"),
  action("labels", "Labels", "route", "navigated_subpage"),
  action("purchase_return", "Purchase Return", "route", "navigated_subpage"),
];

/** Expenses — Edit = route · Delete = confirm · View Payments = modal */
export const HQ6_EXPENSE_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("edit", "Edit", "route", "navigated_subpage"),
  action("delete", "Delete", "confirm", "delete_confirm_modal", true),
  action("view_payments", "View Payments", "modal", "opened_modal"),
];

/** Essentials todos — View = route · Edit/Change Status = modal · Delete = confirm */
export const HQ6_TODO_ROW_ACTIONS: Hq6RowActionSpec[] = [
  action("view", "View", "route", "navigated_subpage"),
  action("edit", "Edit", "modal", "opened_modal"),
  action("change_status", "Change Status", "modal", "opened_modal"),
  action("delete", "Delete", "confirm", "delete_confirm_modal", true),
];

export function hq6DefaultColumnKeys(columns: Hq6ColumnSpec[]): string[] {
  return columns.filter((c) => c.defaultVisible !== false).map((c) => c.key);
}

export function hq6ActionBuild(
  actions: Hq6RowActionSpec[],
  id: string,
): Hq6RowActionBuild | undefined {
  return actions.find((a) => a.id === id)?.build;
}
