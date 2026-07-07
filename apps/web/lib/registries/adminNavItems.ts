import type { NavItem } from "@vonos/types";

/** Shared tail nav: finance, reports, locations, settings. HRM lives in the POS sidebar group. */
export function adminNavTail(code: string): NavItem[] {
  return [
    { label: "Finance", icon: "wallet", route: `/${code}/finance`, pageType: "dashboard" },
    { label: "Reports", icon: "pie-chart", route: `/${code}/reports`, pageType: "dashboard" },
    { label: "Locations", icon: "map-pin", route: `/${code}/locations`, pageType: "form" },
    { label: "Settings", icon: "settings", route: `/${code}/settings`, pageType: "form" },
  ];
}
