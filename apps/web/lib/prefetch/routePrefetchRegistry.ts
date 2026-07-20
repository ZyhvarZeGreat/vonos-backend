import type { QueryClient } from "@tanstack/react-query";
import {
  getGroupLedgerByEntity,
  getGroupLedgerCharts,
  getGroupLedgerSummary,
  getLedgerCharts,
  getLedgerSummary,
} from "@/lib/api/ledger";
import { getStockAvailability } from "@/lib/api/items";
import { getWorkforce } from "@/lib/api/hrm";
import { getJobsPage } from "@/lib/api/jobs";
import { getOverviewDashboard } from "@/lib/api/overview";
import { getGroupReports, getReportsDashboard } from "@/lib/api/reports";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { ADMIN_DEFAULT_ENTITY } from "@/stores/adminEntityStore";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import type { DateRangeBounds } from "@/lib/utils/dateRange";
import { prefetchEntityHrm } from "@/lib/prefetch/prefetchEntityHrm";
import { prefetchGroupOverview } from "@/lib/prefetch/prefetchGroupOverview";
import { REPORT_TABS } from "@/components/pages/ReportsView";

export const ROUTE_PREFETCH_STALE_MS = ADMIN_ENTITY_STALE_MS;

export interface PrefetchRouteOptions {
  pathname: string;
  tenantCode?: string;
  tenantId?: string;
  dateBounds?: DateRangeBounds | null;
}

function defaultBounds(): DateRangeBounds {
  return dateRangePresetToApiBounds("last_7_days");
}

function prefetchQuery<T>(
  queryClient: QueryClient,
  options: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
  },
): void {
  void queryClient.prefetchQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    staleTime: ROUTE_PREFETCH_STALE_MS,
  });
}

function prefetchGroupFinance(
  queryClient: QueryClient,
  from: string,
  to: string,
): void {
  prefetchQuery(queryClient, {
    queryKey: ["ledgerSummary", "group", from, to],
    queryFn: () => getGroupLedgerSummary(from, to),
  });
  prefetchQuery(queryClient, {
    queryKey: ["ledgerCharts", "group", from, to],
    queryFn: () => getGroupLedgerCharts(from, to),
  });
  prefetchQuery(queryClient, {
    queryKey: ["ledgerByEntity", from, to],
    queryFn: () => getGroupLedgerByEntity(from, to),
  });
}

function prefetchGroupReports(
  queryClient: QueryClient,
  from: string,
  to: string,
): void {
  prefetchQuery(queryClient, {
    queryKey: ["groupReports", from, to],
    queryFn: () => getGroupReports({ from, to }),
  });
}

function prefetchAdminStock(queryClient: QueryClient): void {
  prefetchQuery(queryClient, {
    queryKey: ["stock-availability", "", "all", "all"],
    queryFn: () =>
      getStockAvailability({
        limit: 10,
        availability: "all",
      }),
  });
}

function prefetchAdminUsers(queryClient: QueryClient): void {
  const tenant = getTenantByCode(ADMIN_DEFAULT_ENTITY);
  if (!tenant) return;
  prefetchQuery(queryClient, {
    queryKey: ["workforce", tenant.tenantId, "dashboard"],
    queryFn: () => getWorkforce(tenant.tenantId),
  });
}

function prefetchTenantOverview(
  queryClient: QueryClient,
  tenantId: string,
  from: string,
  to: string,
): void {
  prefetchQuery(queryClient, {
    queryKey: ["overviewDashboard", tenantId, from, to],
    queryFn: () => getOverviewDashboard({ from, to }),
  });
}

function prefetchTenantJobs(
  queryClient: QueryClient,
  tenantId: string,
  from: string,
  to: string,
): void {
  const filters = { from, to };
  const filterKey = JSON.stringify({
    ...filters,
    search: "",
    sortBy: null,
    sortDir: null,
  });
  prefetchQuery(queryClient, {
    queryKey: ["jobs", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
    queryFn: () => getJobsPage(tenantId, filters, undefined, DEFAULT_TABLE_PAGE_SIZE),
  });
}

function prefetchTenantFinance(
  queryClient: QueryClient,
  tenantId: string,
  from: string,
  to: string,
): void {
  prefetchQuery(queryClient, {
    queryKey: ["ledgerSummary", tenantId, from, to],
    queryFn: () => getLedgerSummary(tenantId, from, to),
  });
  prefetchQuery(queryClient, {
    queryKey: ["ledgerCharts", tenantId, from, to],
    queryFn: () => getLedgerCharts(tenantId, from, to),
  });
}

function prefetchTenantReports(
  queryClient: QueryClient,
  tenantCode: TenantCode,
  tenantId: string,
  from: string,
  to: string,
): void {
  const archetype = getTenantConfigByCode(tenantCode)?.archetype ?? "stock";
  const defaultTab = REPORT_TABS[archetype]?.[0]?.id ?? "valuation";
  prefetchQuery(queryClient, {
    queryKey: ["reportsDashboard", tenantCode, defaultTab, from, to],
    queryFn: () =>
      getReportsDashboard({
        tab: defaultTab,
        from,
        to,
        tenantId,
      }),
  });
}

/** Prefetch React Query (and Redis on miss) for a single nav route. */
export function prefetchRoute(
  queryClient: QueryClient,
  options: PrefetchRouteOptions,
): void {
  const bounds = options.dateBounds ?? defaultBounds();
  const { from, to } = bounds;
  const pathname = options.pathname;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/overview" || pathname.startsWith("/admin/overview/")) {
      prefetchGroupOverview(queryClient);
      return;
    }
    if (pathname === "/admin/finance" || pathname.startsWith("/admin/finance/")) {
      prefetchGroupFinance(queryClient, from, to);
      return;
    }
    if (pathname === "/admin/reports" || pathname.startsWith("/admin/reports/")) {
      prefetchGroupReports(queryClient, from, to);
      return;
    }
    if (pathname === "/admin/stock" || pathname.startsWith("/admin/stock/")) {
      prefetchAdminStock(queryClient);
      return;
    }
    if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) {
      prefetchAdminUsers(queryClient);
      return;
    }
    return;
  }

  const tenantCode = options.tenantCode;
  const tenantId = options.tenantId;
  if (!tenantCode || !tenantId) return;

  const section = pathname.split("/").filter(Boolean)[1] ?? "";
  switch (section) {
    case "overview":
      prefetchTenantOverview(queryClient, tenantId, from, to);
      break;
    case "jobs":
      prefetchTenantJobs(queryClient, tenantId, from, to);
      break;
    case "finance":
      prefetchTenantFinance(queryClient, tenantId, from, to);
      break;
    case "reports":
      prefetchTenantReports(queryClient, tenantCode as TenantCode, tenantId, from, to);
      break;
    case "hrm":
      prefetchEntityHrm(queryClient, tenantId);
      break;
    default:
      break;
  }
}

const VAG_ADMIN_ROUTES = [
  "/admin/overview",
  "/admin/finance",
  "/admin/reports",
  "/admin/stock",
  "/admin/users",
] as const;

/** Warm all VAG admin nav routes after login. */
export function prefetchVagAdminShell(queryClient: QueryClient): void {
  for (const route of VAG_ADMIN_ROUTES) {
    prefetchRoute(queryClient, { pathname: route });
  }
}

/** Warm primary tenant nav routes (overview, jobs, finance, reports, hrm). */
export function prefetchTenantShell(
  queryClient: QueryClient,
  tenantCode: TenantCode,
  tenantId: string,
): void {
  const slugs = ["overview", "jobs", "finance", "reports", "hrm"] as const;
  for (const slug of slugs) {
    prefetchRoute(queryClient, {
      pathname: `/${tenantCode}/${slug}`,
      tenantCode,
      tenantId,
    });
  }
}
