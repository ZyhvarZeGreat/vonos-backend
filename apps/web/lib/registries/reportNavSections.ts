import type { NavItem, TenantConfig } from "@vonos/types";
import type { ReportSource } from "@vonos/types";
import { reportsForArchetype } from "@/lib/registries/reportRegistry";
import type { NavSection } from "@/components/organisms/Sidebar";

function tenantRoute(code: string, slug: string): string {
  return `/${code}/${slug}`;
}

function hasReportsModule(config: TenantConfig): boolean {
  return config.enabledModules.includes("reports");
}

/** Group registry reports into labeled sidebar sections. */
const REPORT_KIND_GROUPS: {
  kinds: ReportSource["kind"][];
  label: string;
  icon: string;
}[] = [
  { kinds: ["ledger"], label: "Financial Reports", icon: "wallet" },
  { kinds: ["stock"], label: "Stock Reports", icon: "package" },
  { kinds: ["product", "sales"], label: "Sales & Product Reports", icon: "receipt" },
  { kinds: ["payments"], label: "Payment Reports", icon: "banknote" },
  { kinds: ["contacts"], label: "Contact Reports", icon: "users" },
  { kinds: ["reports"], label: "Performance Reports", icon: "pie-chart" },
  { kinds: ["audit"], label: "Audit", icon: "file-bar-chart" },
];

function registryNavItem(code: string, label: string, slug: string): NavItem {
  return {
    label,
    icon: "file-bar-chart",
    route: tenantRoute(code, slug),
    pageType: "dashboard",
  };
}

/**
 * Reports hub + collapsible detail sections (registry-driven per archetype).
 * Place after Analytics so Finance and Reports sit together on the sidebar.
 */
export function reportNavSectionsForConfig(config: TenantConfig): NavSection[] {
  const code = config.code ?? "VW";
  if (!hasReportsModule(config) || !config.archetype) return [];

  const entries = reportsForArchetype(config.archetype, config.enabledModules);
  const sections: NavSection[] = [
    {
      label: "Reports",
      items: [
        {
          label: "All Reports",
          icon: "pie-chart",
          route: tenantRoute(code, "reports"),
          pageType: "dashboard",
        },
      ],
    },
  ];

  for (const group of REPORT_KIND_GROUPS) {
    const groupEntries = entries.filter((entry) =>
      group.kinds.includes(entry.source.kind),
    );
    if (groupEntries.length === 0) continue;

    sections.push({
      label: group.label,
      icon: group.icon,
      collapsible: true,
      items: groupEntries.map((entry) =>
        registryNavItem(code, entry.label, entry.slug),
      ),
    });
  }

  return sections;
}

/** Flat list of every report nav route (hub + registry) for route guards. */
export function allReportNavItems(config: TenantConfig): NavItem[] {
  return reportNavSectionsForConfig(config).flatMap((section) => section.items);
}
