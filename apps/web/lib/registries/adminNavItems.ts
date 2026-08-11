import type { NavItem } from "@vonos/types";
import { tenantPath } from "@/lib/utils/tenantMount";

/** Shared tail nav: finance, reports, locations, settings. HRM lives in the POS sidebar group. */
export function adminNavTail(code: string): NavItem[] {
  return [
    { label: "Finance", icon: "wallet", route: tenantPath(code, "finance"), pageType: "dashboard" },
    { label: "Reports", icon: "pie-chart", route: tenantPath(code, "reports"), pageType: "dashboard" },
    { label: "Locations", icon: "map-pin", route: tenantPath(code, "locations"), pageType: "form" },
    { label: "Settings", icon: "settings", route: tenantPath(code, "settings"), pageType: "form" },
  ];
}
