/** HQ6 Ultimate POS role permission matrix — from ui-walkthrough edit role. */

export type Hq6RolePermissionType = "checkbox";

export interface Hq6RolePermissionOption {
  key: string;
  label: string;
  type: Hq6RolePermissionType;
  /** @deprecated Former radio exclusive group — all options are checkboxes now. */
  group?: string;
}

export interface Hq6RolePermissionModule {
  id: string;
  label: string;
  permissions: Hq6RolePermissionOption[];
}

export interface Hq6StoredRole {
  id: string;
  name: string;
  /** Selected permission keys (checkboxes + chosen radio values). */
  permissions: string[];
  isServiceStaff?: boolean;
  /** Admin / system roles cannot be deleted. */
  locked?: boolean;
}

export const HQ6_ROLE_PERMISSION_MODULES: Hq6RolePermissionModule[] = [
  {
    id: "others",
    label: "Others",
    permissions: [
      { key: "is_service_staff", label: "Service staff", type: "checkbox" },
      { key: "view_export_buttons", label: "View export to buttons (csv/excel/print/pdf) on tables", type: "checkbox" },
    ],
  },
  {
    id: "user",
    label: "User",
    permissions: [
      { key: "user.view", label: "View user", type: "checkbox" },
      { key: "user.create", label: "Add user", type: "checkbox" },
      { key: "user.update", label: "Edit user", type: "checkbox" },
      { key: "user.delete", label: "Delete user", type: "checkbox" },
    ],
  },
  {
    id: "roles",
    label: "Roles",
    permissions: [
      { key: "roles.view", label: "View role", type: "checkbox" },
      {
        key: "roles.create",
        label: "Add Role",
        type: "checkbox",
      },
      {
        key: "roles.update",
        label: "Edit Role",
        type: "checkbox",
      },
      {
        key: "roles.delete",
        label: "Delete role",
        type: "checkbox",
      },
    ],
  },
  {
    id: "supplier",
    label: "Supplier",
    permissions: [
      { key: "supplier.view", label: "View all supplier", type: "checkbox", group: "supplier_view" },
      { key: "supplier.view_own", label: "View own supplier", type: "checkbox", group: "supplier_view" },
      { key: "supplier.create", label: "Add supplier", type: "checkbox" },
      { key: "supplier.update", label: "Edit supplier", type: "checkbox" },
      { key: "supplier.delete", label: "Delete supplier", type: "checkbox" },
    ],
  },
  {
    id: "customer",
    label: "Customer",
    permissions: [
      { key: "customer.view", label: "View all customer", type: "checkbox", group: "customer_view" },
      { key: "customer.view_own", label: "View own customer", type: "checkbox", group: "customer_view" },
      { key: "customer_with_no_sell_one_month", label: "View customers with no sell from one month only", type: "checkbox", group: "customer_view_by_sell" },
      { key: "customer_with_no_sell_three_month", label: "View customers with no sell from three months only", type: "checkbox", group: "customer_view_by_sell" },
      { key: "customer_with_no_sell_six_month", label: "View customers with no sell from six months only", type: "checkbox", group: "customer_view_by_sell" },
      { key: "customer_with_no_sell_one_year", label: "View customers with no sell from one year only", type: "checkbox", group: "customer_view_by_sell" },
      { key: "customer_irrespective_of_sell", label: "View customers irrespective of their sell", type: "checkbox", group: "customer_view_by_sell" },
      { key: "customer.create", label: "Add customer", type: "checkbox" },
      { key: "customer.update", label: "Edit customer", type: "checkbox" },
      { key: "customer.delete", label: "Delete customer", type: "checkbox" },
    ],
  },
  {
    id: "product",
    label: "Product",
    permissions: [
      { key: "product.view", label: "View product", type: "checkbox" },
      { key: "product.create", label: "Add product", type: "checkbox" },
      { key: "product.update", label: "Edit product", type: "checkbox" },
      { key: "product.delete", label: "Delete product", type: "checkbox" },
      { key: "product.opening_stock", label: "Add Opening Stock", type: "checkbox" },
      { key: "view_purchase_price", label: "View Purchase Price", type: "checkbox" },
    ],
  },
  {
    id: "purchase_stock_adjustment",
    label: "Purchase & Stock Adjustment",
    permissions: [
      { key: "purchase.view", label: "View all Purchase & Stock Adjustment", type: "checkbox", group: "purchase_view" },
      { key: "view_own_purchase", label: "View own Purchase & Stock Adjustment", type: "checkbox", group: "purchase_view" },
      { key: "purchase.create", label: "Add purchase & Stock Adjustment", type: "checkbox" },
      { key: "purchase.update", label: "Edit purchase & Stock Adjustment", type: "checkbox" },
      { key: "purchase.delete", label: "Delete purchase & Stock Adjustment", type: "checkbox" },
      { key: "purchase.payments", label: "Add purchase payment", type: "checkbox" },
      { key: "edit_purchase_payment", label: "Edit purchase payment", type: "checkbox" },
      { key: "delete_purchase_payment", label: "Delete purchase payment", type: "checkbox" },
      { key: "purchase.update_status", label: "Update Status", type: "checkbox" },
    ],
  },
  {
    id: "purchase_order",
    label: "Purchase Order",
    permissions: [
      { key: "purchase_order.view_all", label: "View all purchase order", type: "checkbox", group: "purchase_order_view" },
      { key: "purchase_order.view_own", label: "View own purchase order", type: "checkbox", group: "purchase_order_view" },
      { key: "purchase_order.create", label: "Create purchase order", type: "checkbox" },
      { key: "purchase_order.update", label: "Edit purchase order", type: "checkbox" },
      { key: "purchase_order.delete", label: "Delete purchase order", type: "checkbox" },
    ],
  },
  {
    id: "pos",
    label: "POS",
    permissions: [
      { key: "sell.view", label: "View POS sell", type: "checkbox" },
      { key: "sell.create", label: "Add POS sell", type: "checkbox" },
      { key: "sell.update", label: "Edit POS sell", type: "checkbox" },
      { key: "sell.delete", label: "Delete POS sell", type: "checkbox" },
      { key: "edit_product_price_from_pos_screen", label: "Edit product price from POS screen", type: "checkbox" },
      { key: "edit_product_discount_from_pos_screen", label: "Edit product discount from POS screen", type: "checkbox" },
      { key: "edit_pos_payment", label: "Add/Edit Payment", type: "checkbox" },
      { key: "print_invoice", label: "Print Invoice", type: "checkbox" },
      { key: "disable_pay_checkout", label: "Disable Multiple Pay", type: "checkbox" },
      { key: "disable_draft", label: "Disable Draft", type: "checkbox" },
      { key: "disable_express_checkout", label: "Disable Express Checkout", type: "checkbox" },
      { key: "disable_discount", label: "Disable Discount", type: "checkbox" },
      { key: "disable_suspend_sale", label: "Disable Suspend Sale", type: "checkbox" },
      { key: "disable_credit_sale", label: "Disable credit sale button", type: "checkbox" },
      { key: "disable_quotation", label: "Disable Quotation", type: "checkbox" },
      { key: "disable_card", label: "Disable Card", type: "checkbox" },
    ],
  },
  {
    id: "sell",
    label: "Sell",
    permissions: [
      { key: "direct_sell.view", label: "View all sell", type: "checkbox", group: "sell_view" },
      { key: "view_own_sell_only", label: "View own sell only", type: "checkbox", group: "sell_view" },
      { key: "view_paid_sells_only", label: "View paid sells only", type: "checkbox" },
      { key: "view_due_sells_only", label: "View due sells only", type: "checkbox" },
      { key: "view_partial_sells_only", label: "View partially paid sells only", type: "checkbox" },
      { key: "view_overdue_sells_only", label: "View overdue sells only", type: "checkbox" },
      { key: "direct_sell.access", label: "Add Sell", type: "checkbox" },
      { key: "direct_sell.update", label: "Update Sell", type: "checkbox" },
      { key: "direct_sell.delete", label: "Delete Sell", type: "checkbox" },
      { key: "view_commission_agent_sell", label: "Commission agent can view their own sell", type: "checkbox" },
      { key: "sell.payments", label: "Add sell payment", type: "checkbox" },
      { key: "edit_sell_payment", label: "Edit sell payment", type: "checkbox" },
      { key: "delete_sell_payment", label: "Delete sell payment", type: "checkbox" },
      { key: "edit_product_price_from_sale_screen", label: "Edit product price from sales screen", type: "checkbox" },
      { key: "edit_product_discount_from_sale_screen", label: "Edit product discount from Sale screen", type: "checkbox" },
      { key: "discount.access", label: "Add/Edit/Delete Discount", type: "checkbox" },
      { key: "access_sell_return", label: "Access all sell return", type: "checkbox" },
      { key: "access_own_sell_return", label: "Access own sell return", type: "checkbox" },
      { key: "edit_invoice_number", label: "Add edit invoice number", type: "checkbox" },
    ],
  },
  {
    id: "draft",
    label: "Draft",
    permissions: [
      { key: "draft.view_all", label: "View all drafts", type: "checkbox", group: "draft_view" },
      { key: "draft.view_own", label: "View own drafts", type: "checkbox", group: "draft_view" },
      { key: "draft.update", label: "Edit draft", type: "checkbox" },
      { key: "draft.delete", label: "Delete draft", type: "checkbox" },
    ],
  },
  {
    id: "quotation",
    label: "Quotation",
    permissions: [
      { key: "quotation.view_all", label: "View all quotations", type: "checkbox", group: "quotation_view" },
      { key: "quotation.view_own", label: "View own quotations", type: "checkbox", group: "quotation_view" },
      { key: "quotation.update", label: "Edit quotation", type: "checkbox" },
      { key: "quotation.delete", label: "Delete quotation", type: "checkbox" },
    ],
  },
  {
    id: "shipments",
    label: "Shipments",
    permissions: [
      { key: "access_shipping", label: "Access all shipments", type: "checkbox", group: "shipping_view" },
      { key: "access_own_shipping", label: "Access own shipments", type: "checkbox", group: "shipping_view" },
      { key: "access_pending_shipments_only", label: "Access pending shipments only", type: "checkbox" },
      { key: "access_commission_agent_shipping", label: "Commission agent can access their own shipments", type: "checkbox" },
    ],
  },
  {
    id: "cash_register",
    label: "Cash Register",
    permissions: [
      { key: "view_cash_register", label: "View cash register", type: "checkbox" },
      { key: "close_cash_register", label: "Close cash register", type: "checkbox" },
    ],
  },
  {
    id: "brand",
    label: "Brand",
    permissions: [
      { key: "brand.view", label: "View brand", type: "checkbox" },
      { key: "brand.create", label: "Add brand", type: "checkbox" },
      { key: "brand.update", label: "Edit brand", type: "checkbox" },
      { key: "brand.delete", label: "Delete brand", type: "checkbox" },
    ],
  },
  {
    id: "tax_rate",
    label: "Tax rate",
    permissions: [
      { key: "tax_rate.view", label: "View tax rate", type: "checkbox" },
      { key: "tax_rate.create", label: "Add tax rate", type: "checkbox" },
      { key: "tax_rate.update", label: "Edit tax rate", type: "checkbox" },
      { key: "tax_rate.delete", label: "Delete tax rate", type: "checkbox" },
    ],
  },
  {
    id: "unit",
    label: "Unit",
    permissions: [
      { key: "unit.view", label: "View unit", type: "checkbox" },
      { key: "unit.create", label: "Add unit", type: "checkbox" },
      { key: "unit.update", label: "Edit unit", type: "checkbox" },
      { key: "unit.delete", label: "Delete unit", type: "checkbox" },
    ],
  },
  {
    id: "category",
    label: "Category",
    permissions: [
      { key: "category.view", label: "View category", type: "checkbox" },
      { key: "category.create", label: "Add category", type: "checkbox" },
      { key: "category.update", label: "Edit category", type: "checkbox" },
      { key: "category.delete", label: "Delete category", type: "checkbox" },
    ],
  },
  {
    id: "report",
    label: "Report",
    permissions: [
      { key: "purchase_n_sell_report.view", label: "View purchase & sell report", type: "checkbox" },
      { key: "tax_report.view", label: "View Tax report", type: "checkbox" },
      { key: "contacts_report.view", label: "View Supplier & Customer report", type: "checkbox" },
      { key: "expense_report.view", label: "View expense report", type: "checkbox" },
      { key: "stock_report.view", label: "View stock report, stock adjustment report & stock expiry report", type: "checkbox" },
      { key: "trending_product_report.view", label: "View trending product report", type: "checkbox" },
      { key: "register_report.view", label: "View register report", type: "checkbox" },
      { key: "sales_representative.view", label: "View sales representative report", type: "checkbox" },
      { key: "view_product_stock_value", label: "View product stock value", type: "checkbox" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    permissions: [
      { key: "business_settings.access", label: "Access business settings", type: "checkbox" },
      { key: "barcode_settings.access", label: "Access barcode settings", type: "checkbox" },
      { key: "invoice_settings.access", label: "Access invoice settings", type: "checkbox" },
      { key: "access_printers", label: "Access printers", type: "checkbox" },
    ],
  },
  {
    id: "expense",
    label: "Expense",
    permissions: [
      { key: "all_expense.access", label: "Access all expenses", type: "checkbox", group: "expense_view" },
      { key: "view_own_expense", label: "View own expense only", type: "checkbox", group: "expense_view" },
      { key: "expense.add", label: "Add Expense", type: "checkbox" },
      { key: "expense.edit", label: "Edit Expense", type: "checkbox" },
      { key: "expense.delete", label: "Delete Expense", type: "checkbox" },
      { key: "dashboard.data", label: "View Home data", type: "checkbox" },
    ],
  },
  {
    id: "financial_dashboard",
    label: "Financial dashboard",
    permissions: [
      {
        key: "app.finance.view",
        label:
          "Financial dashboard access — Finance page (default: Accountant only; tick for HR or others who need it)",
        type: "checkbox",
      },
      { key: "account.access", label: "Access Accounts", type: "checkbox" },
      {
        key: "profit_loss_report.view",
        label: "View profit & loss report",
        type: "checkbox",
      },
    ],
  },
  {
    id: "account",
    label: "Account (transactions)",
    permissions: [
      { key: "edit_account_transaction", label: "Edit account transaction", type: "checkbox" },
      { key: "delete_account_transaction", label: "Delete account transaction", type: "checkbox" },
      { key: "access_default_selling_price", label: "Default Selling Price", type: "checkbox" },
    ],
  },
  {
    id: "app_modules",
    label: "App modules (all entities)",
    permissions: [
      { key: "app.jobs.view", label: "View jobs", type: "checkbox" },
      { key: "app.jobs.create", label: "Create / edit jobs", type: "checkbox" },
      { key: "app.vehicles.view", label: "View vehicles", type: "checkbox" },
      { key: "app.appointments.view", label: "View appointments", type: "checkbox" },
      { key: "app.appointments.create", label: "Create / edit appointments", type: "checkbox" },
      { key: "app.services.view", label: "View services", type: "checkbox" },
      { key: "app.requisitions.view", label: "View requisitions", type: "checkbox" },
      { key: "app.requisitions.approve", label: "Approve requisitions", type: "checkbox" },
      { key: "app.tables.view", label: "View tables", type: "checkbox" },
      { key: "app.kitchen.view", label: "View kitchen display", type: "checkbox" },
      { key: "app.reports.view", label: "View reports", type: "checkbox" },
    ],
  },
  {
    id: "essentials",
    label: "Essentials",
    permissions: [
      { key: "essentials.crud_leave_type", label: "Add/Edit/View/Delete leave type", type: "checkbox" },
      { key: "essentials.crud_all_leave", label: "Add/Edit/View/Delete all leave", type: "checkbox", group: "leave_crud" },
      { key: "essentials.crud_own_leave", label: "Add/View own leave", type: "checkbox", group: "leave_crud" },
      { key: "essentials.approve_leave", label: "Approve Leave", type: "checkbox" },
      { key: "essentials.crud_all_attendance", label: "Add/Edit/View/Delete all attendance", type: "checkbox", group: "attendance_crud" },
      { key: "essentials.view_own_attendance", label: "View own attendance", type: "checkbox", group: "attendance_crud" },
      { key: "essentials.allow_users_for_attendance_from_web", label: "Allow users to enter their own attendance from web", type: "checkbox" },
      { key: "essentials.allow_users_for_attendance_from_api", label: "Allow users to enter their own attendance from api", type: "checkbox" },
      { key: "essentials.view_allowance_and_deduction", label: "View Pay Component", type: "checkbox" },
      { key: "essentials.add_allowance_and_deduction", label: "Add Pay Component", type: "checkbox" },
      { key: "essentials.crud_department", label: "Add/Edit/View/Delete department", type: "checkbox" },
      { key: "essentials.crud_designation", label: "Add/Edit/View/Delete designation", type: "checkbox" },
      { key: "essentials.view_all_payroll", label: "View all Payroll", type: "checkbox" },
      { key: "essentials.create_payroll", label: "Add Payroll", type: "checkbox" },
      { key: "essentials.update_payroll", label: "Edit Payroll", type: "checkbox" },
      { key: "essentials.delete_payroll", label: "Delete Payroll", type: "checkbox" },
      { key: "essentials.assign_todos", label: "Assign To Do's to others", type: "checkbox" },
      { key: "essentials.add_todos", label: "Add To Do's", type: "checkbox" },
      { key: "essentials.edit_todos", label: "Edit To Do's", type: "checkbox" },
      { key: "essentials.delete_todos", label: "Delete To Do's", type: "checkbox" },
      { key: "essentials.create_message", label: "Create Message", type: "checkbox" },
      { key: "essentials.view_message", label: "View Message", type: "checkbox" },
      { key: "essentials.access_sales_target", label: "Access Sales Targets", type: "checkbox" },
    ],
  },
];

export const HQ6_DEMO_ROLE_NAMES = [
  "AC TECHNICIAN",
  "ACCOUNTANT",
  "Admin",
  "Assistant Manager",
  "AUTO-ELECTRICIAN",
  "AUTO-MECHANIC",
  "AUTO-REPAIR QC OFFICER",
  "BODY WORKS AND PAINTING",
  "CAR WASH ATTENDANT",
  "CLEANER",
  "Domestic Driver",
  "FRONT DESK",
  "HEAD OF TRAINIING",
  "HR & OPERATIONS MANAGER",
  "INTERN",
  "MACHINIST",
  "MANAGER",
  "Manager1",
  "NYSC INTERN",
  "OFFICE ASSISTANT",
  "PARTS AUDITOR",
  "PARTS MANAGEMENT",
  "QUALITY CONTROL OFFICER",
  "SALES REPRESENTATIVE/MARKETERS",
  "SECURITY/CLEANING",
  "Service Staff",
  "SOCIAL MEDIA MANAGER",
  "TECHNICAL SUPERVISOR",
  "WEB DEVELOPER",
] as const;

export function hq6RoleStorageKey(tenantCode: string): string {
  return `vonos.hq6.roles.${tenantCode}`;
}

export function slugifyRoleName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return slug || `role_${Date.now().toString(36)}`;
}

export function defaultDemoRoles(): Hq6StoredRole[] {
  return HQ6_DEMO_ROLE_NAMES.map((name) => ({
    id: slugifyRoleName(name),
    name,
    permissions: [],
    locked: name === "Admin",
  }));
}

export function loadStoredRoles(tenantCode: string): Hq6StoredRole[] {
  if (typeof window === "undefined") return defaultDemoRoles();
  try {
    const raw = window.localStorage.getItem(hq6RoleStorageKey(tenantCode));
    if (!raw) return defaultDemoRoles();
    const parsed = JSON.parse(raw) as Hq6StoredRole[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultDemoRoles();
    return parsed.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : [],
      isServiceStaff: Boolean(row.isServiceStaff),
      locked: Boolean(row.locked) || row.name === "Admin",
    }));
  } catch {
    return defaultDemoRoles();
  }
}

export function saveStoredRoles(tenantCode: string, roles: Hq6StoredRole[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(hq6RoleStorageKey(tenantCode), JSON.stringify(roles));
}

/** Maps app user id → HQ6 role id (Roles page assignments). */
export function hq6UserRoleStorageKey(tenantCode: string): string {
  return `vonos.hq6.userRoles.${tenantCode}`;
}

export type Hq6UserRoleAssignments = Record<string, string>;

export function loadUserRoleAssignments(tenantCode: string): Hq6UserRoleAssignments {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(hq6UserRoleStorageKey(tenantCode));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Hq6UserRoleAssignments = {};
    for (const [userId, roleId] of Object.entries(parsed)) {
      if (typeof roleId === "string" && roleId.trim()) {
        out[userId] = roleId;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveUserRoleAssignments(
  tenantCode: string,
  assignments: Hq6UserRoleAssignments,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    hq6UserRoleStorageKey(tenantCode),
    JSON.stringify(assignments),
  );
}

export function getAssignedHq6RoleId(
  tenantCode: string,
  userId: string,
): string | null {
  const id = loadUserRoleAssignments(tenantCode)[userId];
  return id ?? null;
}

export function setAssignedHq6RoleId(
  tenantCode: string,
  userId: string,
  roleId: string,
): void {
  const next = { ...loadUserRoleAssignments(tenantCode), [userId]: roleId };
  saveUserRoleAssignments(tenantCode, next);
}

export function getAssignedHq6Role(
  tenantCode: string,
  userId: string,
): Hq6StoredRole | null {
  const roleId = getAssignedHq6RoleId(tenantCode, userId);
  if (!roleId) return null;
  return loadStoredRoles(tenantCode).find((r) => r.id === roleId) ?? null;
}

export function findHq6RoleById(
  tenantCode: string,
  roleId: string,
): Hq6StoredRole | null {
  return loadStoredRoles(tenantCode).find((r) => r.id === roleId) ?? null;
}

/**
 * Resolve which HQ6 role to show for a user: explicit assignment, then
 * match JWT role name against stored roles (Admin / MANAGER / …).
 */
export function resolveHq6RoleForUser(
  tenantCode: string,
  userId: string,
  jwtRole: string,
): Hq6StoredRole | null {
  const assigned = getAssignedHq6Role(tenantCode, userId);
  if (assigned) return assigned;

  const roles = loadStoredRoles(tenantCode);
  const normalized = jwtRole.toLowerCase().replace(/_/g, " ");
  const byName = roles.find((r) => r.name.toLowerCase() === normalized);
  if (byName) return byName;

  if (jwtRole === "admin") {
    return roles.find((r) => r.locked || r.name.toLowerCase() === "admin") ?? null;
  }
  if (jwtRole === "manager") {
    return (
      roles.find((r) => {
        const n = r.name.toLowerCase();
        return n === "manager" || n === "manager1" || n.includes("manager");
      }) ?? null
    );
  }
  return null;
}

export function hq6RoleHasPermission(
  role: Hq6StoredRole,
  permissionKey: string,
): boolean {
  if (isFullAccessHq6Role(role)) return true;
  return role.permissions.includes(permissionKey);
}

export function isFullAccessHq6Role(role: Hq6StoredRole): boolean {
  if (role.locked) return true;
  const name = role.name.trim().toLowerCase();
  return name === "admin";
}

/**
 * Maps an HQ6 Roles-page role onto the JWT Role enum required by the API.
 * Prefer permission signals; fall back to role name heuristics.
 */
export function mapHq6RoleToJwtRole(
  role: Hq6StoredRole,
): "admin" | "manager" | "staff" | "viewer" {
  if (isFullAccessHq6Role(role)) return "admin";

  const perms = new Set(role.permissions);
  const name = role.name.trim().toLowerCase();

  if (
    perms.has("user.create") ||
    perms.has("user.delete") ||
    perms.has("roles.create") ||
    perms.has("roles.delete") ||
    perms.has("business_settings.access")
  ) {
    return "admin";
  }

  if (
    perms.has("essentials.approve_leave") ||
    perms.has("purchase.update_status") ||
    perms.has("user.update") ||
    name.includes("manager") ||
    name.includes("supervisor") ||
    name.includes("head of")
  ) {
    return "manager";
  }

  if (
    name.includes("intern") ||
    name.includes("cleaner") ||
    name.includes("security") ||
    name.includes("viewer") ||
    name === "nysc intern"
  ) {
    return "viewer";
  }

  // Custom role with no permissions yet — operational staff default.
  return "staff";
}

