/**
 * HQ6 / Ultimate POS–style accent colors for sidebar nav icons.
 * Section tones drive group headers; item keys tint leaf icons.
 */

export const NAV_SECTION_ICON_TONE: Record<string, string> = {
  Home: "#3B82F6",
  "User Management": "#6366F1",
  Contacts: "#0EA5E9",
  Products: "#F59E0B",
  Purchases: "#8B5CF6",
  Sell: "#16A34A",
  Expenses: "#EF4444",
  "Payment Accounts": "#0891B2",
  Reports: "#DB2777",
  HRM: "#7C3AED",
  Settings: "#64748B",
};

/** Per-icon accents for leaf links (fallback: section tone / neutral). */
export const NAV_ITEM_ICON_TONE: Record<string, string> = {
  "layout-dashboard": "#3B82F6",
  wrench: "#16A34A",
  car: "#2563EB",
  "clipboard-list": "#8B5CF6",
  calendar: "#DB2777",
  scissors: "#DB2777",
  clock: "#64748B",
  users: "#0EA5E9",
  "shield-check": "#6366F1",
  "badge-dollar-sign": "#16A34A",
  truck: "#F59E0B",
  "folder-tree": "#0EA5E9",
  upload: "#64748B",
  package: "#F59E0B",
  "package-open": "#F59E0B",
  "plus-circle": "#16A34A",
  printer: "#64748B",
  layers: "#F59E0B",
  tags: "#F59E0B",
  ruler: "#F59E0B",
  award: "#F59E0B",
  "arrow-down-to-line": "#8B5CF6",
  "arrow-up-from-line": "#8B5CF6",
  "arrow-right-left": "#8B5CF6",
  "rotate-ccw": "#EF4444",
  receipt: "#16A34A",
  monitor: "#16A34A",
  "scan-line": "#16A34A",
  "file-plus": "#0EA5E9",
  files: "#0EA5E9",
  "file-text": "#0EA5E9",
  "file-stack": "#0EA5E9",
  percent: "#DB2777",
  "credit-card": "#0891B2",
  scale: "#0891B2",
  "list-checks": "#0891B2",
  "trending-up": "#DB2777",
  "file-bar-chart": "#DB2777",
  "pie-chart": "#DB2777",
  briefcase: "#7C3AED",
  settings: "#64748B",
  "map-pin": "#64748B",
  "shopping-cart": "#8B5CF6",
  "circle-arrow-up": "#16A34A",
  box: "#F59E0B",
  wallet: "#16A34A",
  coins: "#7C3AED",
  "check-square": "#7C3AED",
  star: "#7C3AED",
  "user-x": "#7C3AED",
};

export function sectionIconTone(label: string): string {
  return NAV_SECTION_ICON_TONE[label] ?? "#64748B";
}

export function itemIconTone(iconKey: string, sectionLabel?: string): string {
  return (
    NAV_ITEM_ICON_TONE[iconKey] ??
    (sectionLabel ? sectionIconTone(sectionLabel) : "#64748B")
  );
}
