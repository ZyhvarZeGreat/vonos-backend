/**
 * Element map extracted from apps/home.jsx (Warehouse Overview reference).
 * Source: Vonos Warehouse dashboard mock — light sidebar, KPI row, charts, pending orders, activity feed.
 *
 * Use this registry when adding new Warehouse pages or validating design-system parity.
 */

export const homeReference = {
  source: "apps/home.jsx",
  layout: {
    shell: "flex h-screen overflow-hidden bg-gray-50",
    sidebarWidth: "280px",
    topBarHeight: "64px",
    contentMaxWidth: "1400px",
    contentPadding: "p-6 lg:p-10",
  },
  sidebar: {
    background: "#fdfdfd",
    sections: ["Analytics", "Config"],
    analyticsNav: [
      "Overview",
      "Inventory",
      "Inbound",
      "Outbound",
      "Transfers",
      "Reports",
    ],
    configNav: ["Suppliers", "Users", "Settings"],
    features: ["user profile header", "search with ⌘K", "2FA promo card", "Support", "What's New?"],
    activeNav: "bg-gray-100 text-gray-900",
    inactiveNav: "text-gray-500 hover:bg-gray-50",
  },
  topBar: {
    title: "Overview",
    icons: ["sidebar", "inbox", "bell"],
    primaryCta: { label: "New Order", style: "bg-gray-900" },
  },
  kpiCards: {
    height: "140px",
    cards: [
      { label: "Total SKU", tint: "emerald", icon: "package", sampleValue: 1284, delta: "+12 this week" },
      { label: "Today Inbound", tint: "blue", icon: "arrow-down", sampleValue: 48, delta: "+8 vs yesterday" },
      { label: "Today Outbound", tint: "purple", icon: "arrow-up", sampleValue: 73, delta: "-5 this week" },
      { label: "Stock Values", tint: "rose", icon: "calculator", sampleValue: "$ 2.4M", delta: "+3.2% this week" },
    ],
  },
  charts: {
    height: "400px",
    periodFilter: "Last 30 days",
    panels: [
      { title: "Stock Level Trend", type: "stacked-bar" },
      { title: "Inbound vs Outbound", type: "dual-line" },
    ],
  },
  pendingOrders: {
    title: "Pending Orders",
    tabs: ["Outbound", "Inbound", "Transfers"],
    columns: ["ref", "name", "date", "carrier", "status"],
    statusPill: "bg-emerald-100 text-emerald-700 rounded-md (Ready)",
  },
  activityFeed: {
    iconBox: "40px blue-500 rounded-lg white icon",
    fields: ["title", "subtitle", "timestamp"],
    columnRatio: "1.45 (45% wider than pending orders panel)",
  },
  fab: {
    position: "bottom-8 right-8",
    size: "56px",
    icon: "message-square-plus",
    style: "bg-gray-900 rounded-full",
  },
  componentMapping: {
    Sidebar: "components/organisms/Sidebar.tsx",
    TopBar: "components/organisms/TopBar.tsx",
    KpiRow: "components/organisms/KpiRow.tsx",
    KpiCard: "components/molecules/KpiCard.tsx",
    ChartPanel: "components/organisms/ChartPanel.tsx",
    PendingOrdersPanel: "components/organisms/PendingOrdersPanel.tsx",
    ActivityFeedPanel: "components/organisms/ActivityFeedPanel.tsx",
    FloatingActionButton: "components/atoms/FloatingActionButton.tsx",
    DashboardTemplate: "components/templates/DashboardTemplate.tsx",
    livePage: "app/VW/overview/page.tsx",
  },
} as const;

export type HomeReference = typeof homeReference;
