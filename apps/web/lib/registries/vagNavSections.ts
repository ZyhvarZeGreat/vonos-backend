import type { NavSection } from "@/components/organisms/Sidebar";

/**
 * VAG group admin sidebar.
 * HRM is a collapsible group with Manage users / Add users / Add roles.
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
  return pathname === route || pathname.startsWith(`${route}/`);
}
