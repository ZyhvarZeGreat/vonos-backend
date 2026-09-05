import type { NavSection } from "@/components/organisms/Sidebar";

/**
 * VAG group admin sidebar.
 * HRM is a collapsible group with Manage users / Add users / Add roles.
 *
 * Permission keys on items drive who sees what. A VAG super_admin with an HR
 * TenantRole (no finance keys) will see HRM / Users / Payroll reports but not
 * Finance or group financial Reports.
 */
export const VAG_NAV_SECTIONS: NavSection[] = [
  {
    label: "Group Overview",
    icon: "layout-dashboard",
    items: [
      {
        label: "Group Overview",
        icon: "layout-dashboard",
        route: "/admin/overview",
        pageType: "dashboard",
      },
    ],
  },
  {
    label: "HRM",
    icon: "briefcase",
    collapsible: true,
    items: [
      {
        label: "Manage users",
        icon: "users",
        route: "/admin/hrm/users",
        pageType: "list",
      },
      {
        label: "Add users",
        icon: "user-plus",
        route: "/admin/hrm/users/new/edit",
        pageType: "form",
      },
      {
        label: "Add roles",
        icon: "shield",
        route: "/admin/hrm/roles/new/edit",
        pageType: "form",
      },
      {
        label: "Roles",
        icon: "shield-check",
        route: "/admin/hrm/roles",
        pageType: "list",
      },
      {
        label: "Payroll",
        icon: "wallet",
        route: "/admin/hrm/payroll",
        pageType: "list",
      },
    ],
  },
  {
    label: "Stock",
    icon: "package",
    items: [
      { label: "Stock", icon: "package", route: "/admin/stock", pageType: "list" },
    ],
  },
  {
    label: "Finance",
    icon: "wallet",
    items: [
      {
        label: "Finance",
        icon: "wallet",
        route: "/admin/finance",
        pageType: "dashboard",
      },
    ],
  },
  {
    label: "Reports",
    icon: "pie-chart",
    items: [
      {
        label: "Reports",
        icon: "pie-chart",
        route: "/admin/reports",
        pageType: "dashboard",
      },
    ],
  },
  {
    label: "Security",
    icon: "shield-check",
    items: [
      {
        label: "Security",
        icon: "shield-check",
        route: "/admin/security",
        pageType: "form",
      },
    ],
  },
];

/** Route → permission keys required to see the VAG nav link (any match grants). */
export const VAG_NAV_VIEW_PERMISSIONS: Record<string, string[]> = {
  "/admin/overview": [], // always visible once in the portal
  "/admin/hrm/users": ["user.view", "user.create", "user.update"],
  "/admin/hrm/users/new/edit": ["user.create"],
  "/admin/hrm/roles": ["roles.view", "roles.create", "roles.update"],
  "/admin/hrm/roles/new/edit": ["roles.create"],
  "/admin/hrm/payroll": [
    "essentials.view_all_payroll",
    "essentials.create_payroll",
    "essentials.update_payroll",
    "essentials.delete_payroll",
  ],
  "/admin/stock": ["product.view", "stock_report.view"],
  "/admin/finance": [
    "app.finance.view",
    "account.access",
    "profit_loss_report.view",
  ],
  "/admin/reports": [
    "app.reports.view",
    "purchase_n_sell_report.view",
    "profit_loss_report.view",
    "expense_report.view",
  ],
  "/admin/security": ["business_settings.access"],
};

/**
 * Drop VAG nav links the current user cannot view. Empty permission lists
 * (e.g. Group Overview) stay visible.
 */
export function filterVagNavSectionsByPermissions(
  sections: NavSection[],
  canAny: (...keys: string[]) => boolean,
  isFullAccess: boolean,
): NavSection[] {
  if (isFullAccess) return sections;
  return sections
    .map((section) => {
      const items = section.items.filter((item) => {
        const keys = VAG_NAV_VIEW_PERMISSIONS[item.route];
        if (!keys || keys.length === 0) return true;
        return canAny(...keys);
      });
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export function isAdminNavActive(pathname: string, route: string): boolean {
  if (route === "/admin/overview") return pathname === route;
  if (route === "/admin/hrm/users/new/edit") {
    return pathname === route;
  }
  if (route === "/admin/hrm/roles/new/edit") {
    return pathname === route;
  }
  if (route === "/admin/hrm/users") {
    return (
      pathname === "/admin/hrm/users" ||
      (pathname.startsWith("/admin/hrm/users/") &&
        !pathname.includes("/new/"))
    );
  }
  if (route === "/admin/hrm/roles") {
    return (
      pathname === "/admin/hrm/roles" ||
      (pathname.startsWith("/admin/hrm/roles/") &&
        !pathname.includes("/new/"))
    );
  }
  if (route === "/admin/hrm/payroll") {
    return (
      pathname === "/admin/hrm/payroll" ||
      pathname.startsWith("/admin/hrm/payroll/")
    );
  }
  return pathname === route || pathname.startsWith(`${route}/`);
}
