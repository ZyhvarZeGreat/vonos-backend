import type { NavSection } from "@/components/organisms/Sidebar";

export const VAG_NAV_SECTIONS: NavSection[] = [
  {
    label: "Group",
    items: [
      {
        label: "Group Overview",
        icon: "layout-dashboard",
        route: "/admin/overview",
        pageType: "dashboard",
      },
      { label: "HR", icon: "users", route: "/admin/users", pageType: "form" },
      { label: "Stock", icon: "package", route: "/admin/stock", pageType: "list" },
      { label: "Finance", icon: "wallet", route: "/admin/finance", pageType: "dashboard" },
      { label: "Reports", icon: "pie-chart", route: "/admin/reports", pageType: "dashboard" },
      { label: "Security", icon: "shield-check", route: "/admin/security", pageType: "form" },
    ],
  },
];

export function isAdminNavActive(pathname: string, route: string): boolean {
  if (route === "/admin/overview") return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}
