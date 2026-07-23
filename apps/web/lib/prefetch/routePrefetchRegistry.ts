import type { QueryClient } from "@tanstack/react-query";
import {
  getGroupLedgerByEntity,
  getGroupLedgerCharts,
  getGroupLedgerSummary,
  getLedgerCharts,
  getLedgerSummary,
} from "@/lib/api/ledger";
import { getCustomersPage } from "@/lib/api/customers";
import { getItemsPage, getStockAvailability } from "@/lib/api/items";
import { getWorkforce } from "@/lib/api/hrm";
import { getJobsPage } from "@/lib/api/jobs";
import { getOverviewDashboard, getVaHq6Home } from "@/lib/api/overview";
import { getRequisitionsPage } from "@/lib/api/requisitions";
import { getGroupReports, getReportsDashboard } from "@/lib/api/reports";
import { getSalesPage } from "@/lib/api/sales";
import { getStockMovementsPage, getStockMovementsListSummary } from "@/lib/api/stockMovements";
import { getSuppliersPage } from "@/lib/api/suppliers";
import { getVehiclesPage } from "@/lib/api/vehicles";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { ADMIN_DEFAULT_ENTITY } from "@/stores/adminEntityStore";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { allNavRoutesForConfig, getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import type { DateRangeBounds } from "@/lib/utils/dateRange";
import { prefetchEntityHrm } from "@/lib/prefetch/prefetchEntityHrm";
import { prefetchGroupOverview } from "@/lib/prefetch/prefetchGroupOverview";
import { scheduleIdleBatch } from "@/lib/prefetch/scheduleIdle";
import { REPORT_TABS } from "@/lib/registries/reportTabs";

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
  tenantCode?: string,
): void {
  if (tenantCode === "VA") {
    prefetchQuery(queryClient, {
      queryKey: ["vaHq6Home", tenantId, from, to],
      queryFn: () => getVaHq6Home({ from, to }),
    });
    return;
  }
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

function emptyListFilterKey(
  filters: Record<string, unknown> = {},
  search = "",
): string {
  return JSON.stringify({
    ...filters,
    search,
    sortBy: null,
    sortDir: null,
  });
}

/** Warm first page of common list screens (inventory, customers, movements, …). */
function prefetchTenantListSection(
  queryClient: QueryClient,
  tenantId: string,
  slug: string,
  from: string,
  to: string,
): void {
  const bounds = { from, to };

  switch (slug) {
    case "inventory":
    case "products": {
      const filterKey = emptyListFilterKey();
      prefetchQuery(queryClient, {
        queryKey: ["items", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () => getItemsPage(tenantId, {}, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "inbound":
    case "outbound": {
      const type = slug as "inbound" | "outbound";
      // HQ6 purchases list (inbound) uses a dedicated query key + page size 50.
      if (type === "inbound") {
        const hq6Filters = { type: "inbound" as const };
        const hq6FilterKey = emptyListFilterKey(hq6Filters);
        prefetchQuery(queryClient, {
          queryKey: [
            "stock-movements",
            tenantId,
            "inbound",
            "hq6",
            hq6FilterKey,
            0,
            undefined,
            50,
            null,
          ],
          queryFn: () =>
            getStockMovementsPage(
              tenantId,
              { ...hq6Filters, includeSummary: false },
              undefined,
              50,
            ),
        });
        prefetchQuery(queryClient, {
          queryKey: [
            "stock-movements",
            tenantId,
            "inbound",
            "hq6",
            "summary",
            hq6FilterKey,
          ],
          queryFn: () =>
            getStockMovementsListSummary(tenantId, hq6Filters),
        });
      }
      const filterKey = emptyListFilterKey(bounds);
      prefetchQuery(queryClient, {
        queryKey: [
          "stock-movements",
          tenantId,
          type,
          undefined,
          undefined,
          filterKey,
          undefined,
          DEFAULT_TABLE_PAGE_SIZE,
        ],
        queryFn: () =>
          getStockMovementsPage(
            tenantId,
            { type, from, to, includeSummary: false },
            undefined,
            DEFAULT_TABLE_PAGE_SIZE,
          ),
      });
      break;
    }
    case "customers": {
      const filterKey = emptyListFilterKey(bounds);
      prefetchQuery(queryClient, {
        queryKey: ["customers", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () => getCustomersPage(tenantId, bounds, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "suppliers": {
      const filterKey = emptyListFilterKey({ tab: "active" });
      prefetchQuery(queryClient, {
        queryKey: ["suppliers", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () => getSuppliersPage(tenantId, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "vehicles": {
      const filterKey = emptyListFilterKey();
      prefetchQuery(queryClient, {
        queryKey: ["vehicles", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () => getVehiclesPage(tenantId, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "requisitions": {
      const filterKey = emptyListFilterKey();
      prefetchQuery(queryClient, {
        queryKey: ["requisitions", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () => getRequisitionsPage(tenantId, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "sales": {
      const filterKey = emptyListFilterKey(bounds);
      prefetchQuery(queryClient, {
        queryKey: ["sales", tenantId, "all", filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () =>
          getSalesPage(tenantId, { ...bounds }, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "users":
    case "hrm":
    case "hrm-dashboard":
      prefetchEntityHrm(queryClient, tenantId);
      break;
    default:
      break;
  }
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
      prefetchTenantOverview(queryClient, tenantId, from, to, tenantCode);
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
    case "hrm-dashboard":
      prefetchEntityHrm(queryClient, tenantId);
      break;
    default:
      prefetchTenantListSection(queryClient, tenantId, section, from, to);
      break;
  }
}

/** Prefetch every sidebar route for the tenant (staggered idle). */
export function prefetchTenantNavRoutes(
  queryClient: QueryClient,
  tenantCode: TenantCode,
  tenantId: string,
  dateBounds?: DateRangeBounds | null,
): void {
  const config = getTenantConfigByCode(tenantCode);
  const routes = config
    ? allNavRoutesForConfig(config).map((item) => item.route)
    : ["overview", "jobs", "finance", "reports", "hrm"].map(
        (slug) => `/${tenantCode}/${slug}`,
      );

  const unique = [...new Set(routes)];
  scheduleIdleBatch(
    unique.map(
      (pathname) => () =>
        prefetchRoute(queryClient, {
          pathname,
          tenantCode,
          tenantId,
          dateBounds,
        }),
    ),
  );
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

/** Warm all tenant sidebar routes after login / entity entry. */
export function prefetchTenantShell(
  queryClient: QueryClient,
  tenantCode: TenantCode,
  tenantId: string,
  dateBounds?: DateRangeBounds | null,
): void {
  prefetchTenantNavRoutes(queryClient, tenantCode, tenantId, dateBounds);
}
