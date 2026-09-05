import type { QueryClient } from "@tanstack/react-query";
import {
  getGroupLedgerByEntity,
  getGroupLedgerEntriesPage,
  getGroupLedgerSummary,
  getLedgerCharts,
  getLedgerSummary,
  LEDGER_TABLE_PAGE_SIZE,
} from "@/lib/api/ledger";
import { getCustomersPage, getCustomersListSummary } from "@/lib/api/customers";
import { getCatalogPage, getCatalogListSummary } from "@/lib/api/catalog";
import { getExpensesPage } from "@/lib/api/expenses";
import { getItemsPage, getStockAvailability } from "@/lib/api/items";
import { prefetchProductFormMeta } from "@/lib/query/prefetchListDetails";
import { getJobsPage } from "@/lib/api/jobs";
import { getOverviewDashboard, getVaHq6Home } from "@/lib/api/overview";
import { getRequisitionsPage } from "@/lib/api/requisitions";
import { getGroupReports, getReportsDashboard } from "@/lib/api/reports";
import { getSalesPage, getSalesListSummary } from "@/lib/api/sales";
import { getStockMovementsPage, getStockMovementsListSummary } from "@/lib/api/stockMovements";
import { getSuppliersPage, getSuppliersListSummary } from "@/lib/api/suppliers";
import { getVehiclesPage } from "@/lib/api/vehicles";
import { getAllTenantUsersPage } from "@/lib/api/users";
import { DEFAULT_TABLE_PAGE_SIZE, HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { getTenantByCode, isTenantCode, type TenantCode } from "@/lib/registries/tenants";
import { allNavRoutesForConfig, getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import type { DateRangeBounds } from "@/lib/utils/dateRange";
import { stableListFilterKey } from "@/lib/utils/stableListFilterKey";
import { prefetchEntityHrm } from "@/lib/prefetch/prefetchEntityHrm";
import { prefetchGroupOverview } from "@/lib/prefetch/prefetchGroupOverview";
import { scheduleIdleBatch } from "@/lib/prefetch/scheduleIdle";
import { REPORT_TABS } from "@/lib/registries/reportTabs";
import type { ListSortState } from "@/lib/api/fetchAllPages";
import { tenantBasePath } from "@/lib/utils/tenantMount";

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
    queryKey: ["ledgerByEntity", from, to],
    queryFn: () => getGroupLedgerByEntity(from, to),
  });
  // First ledger table page — matches PaginatedLedgerTable / useServerListPage.
  const ledgerFilters = {
    type: null,
    category: null,
    from,
    to,
  };
  const ledgerFilterKey = stableListFilterKey(ledgerFilters, null);
  prefetchQuery(queryClient, {
    queryKey: [
      "ledgerTablePage",
      "group",
      ledgerFilterKey,
      0,
      null,
      LEDGER_TABLE_PAGE_SIZE,
      null,
      null,
    ],
    queryFn: () =>
      getGroupLedgerEntriesPage(
        { from, to, limit: LEDGER_TABLE_PAGE_SIZE },
        undefined,
        LEDGER_TABLE_PAGE_SIZE,
      ),
  });
}

function prefetchGroupReports(
  queryClient: QueryClient,
  from: string,
  to: string,
): void {
  // Core KPIs first so Reports paints quickly; full payload fills charts after.
  prefetchQuery(queryClient, {
    queryKey: ["groupReports", "core", from, to],
    queryFn: () => getGroupReports({ from, to, mode: "core" }),
  });
  prefetchQuery(queryClient, {
    queryKey: ["groupReports", from, to],
    queryFn: () => getGroupReports({ from, to }),
  });
}

function prefetchAdminStock(queryClient: QueryClient): void {
  prefetchQuery(queryClient, {
    queryKey: [
      "stock-availability-roster",
      "all",
      "all",
      "",
      50,
    ],
    queryFn: () =>
      getStockAvailability({
        limit: 50,
        availability: "all",
      }),
  });
}

function prefetchAdminUsers(queryClient: QueryClient): void {
  // VAG HRM users list is group-wide (getAllTenantUsersPage).
  const usersPageSize = 50;
  const filterKey = stableListFilterKey({}, null);
  prefetchQuery(queryClient, {
    queryKey: [
      "users",
      "all",
      "hq6",
      filterKey,
      0,
      null,
      usersPageSize,
      null,
      null,
    ],
    queryFn: () =>
      getAllTenantUsersPage(undefined, usersPageSize, {
        includeSummary: false,
      }),
  });
}

function prefetchTenantOverview(
  queryClient: QueryClient,
  tenantId: string,
  from: string,
  to: string,
  tenantCode?: string,
): void {
  // All operating tenants use the same HQ6 home endpoint as VA.
  if (tenantCode && isTenantCode(tenantCode)) {
    prefetchQuery(queryClient, {
      queryKey: ["hq6Home", tenantId, from, to],
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
  const filterKey = stableListFilterKey(filters, null);
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
): string {
  return stableListFilterKey(filters, null);
}

/** Match `useServerListPage` page 0 query keys for HQ6 lists. */
function hq6Page0QueryKey(
  baseKey: readonly unknown[],
  filters: Record<string, unknown>,
  sort: ListSortState | null,
  pageSize = HQ6_TABLE_PAGE_SIZE,
): unknown[] {
  const filterKey = stableListFilterKey(filters, sort);
  return [
    ...baseKey,
    filterKey,
    0,
    null,
    pageSize,
    sort?.sortBy ?? null,
    sort?.sortDir ?? null,
  ];
}

function hq6SummaryQueryKey(
  baseKey: readonly unknown[],
  filters: Record<string, unknown>,
  sort: ListSortState | null,
): unknown[] {
  const filterKey = stableListFilterKey(filters, sort);
  return [...baseKey, "summary", filterKey];
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
    case "inventory": {
      const filterKey = emptyListFilterKey();
      prefetchQuery(queryClient, {
        queryKey: ["items", tenantId, filterKey, undefined, DEFAULT_TABLE_PAGE_SIZE],
        queryFn: () => getItemsPage(tenantId, {}, undefined, DEFAULT_TABLE_PAGE_SIZE),
      });
      break;
    }
    case "products":
    case "catalog":
    case "menu-items": {
      const sort: ListSortState = { sortBy: "name", sortDir: "asc" };
      const filters = {};
      prefetchQuery(queryClient, {
        queryKey: hq6Page0QueryKey(["catalog", tenantId, "hq6-upos"], filters, sort),
        queryFn: () =>
          getCatalogPage(
            tenantId,
            { ...filters, sortBy: "name", sortDir: "asc", includeSummary: false },
            undefined,
            HQ6_TABLE_PAGE_SIZE,
          ),
      });
      prefetchQuery(queryClient, {
        queryKey: hq6SummaryQueryKey(["catalog", tenantId, "hq6-upos"], filters, sort),
        queryFn: () => getCatalogListSummary(tenantId, filters),
      });
      break;
    }
    case "add-product": {
      prefetchProductFormMeta(queryClient, tenantId);
      break;
    }
    case "purchases":
    case "inbound": {
      const sort: ListSortState = { sortBy: "date", sortDir: "desc" };
      const filters = { type: "inbound" as const };
      prefetchQuery(queryClient, {
        queryKey: hq6Page0QueryKey(
          ["stock-movements", tenantId, "inbound", "hq6"],
          filters,
          sort,
        ),
        queryFn: () =>
          getStockMovementsPage(
            tenantId,
            {
              ...filters,
              sortBy: "date",
              sortDir: "desc",
              includeSummary: false,
            },
            undefined,
            HQ6_TABLE_PAGE_SIZE,
          ),
      });
      prefetchQuery(queryClient, {
        queryKey: hq6SummaryQueryKey(
          ["stock-movements", tenantId, "inbound", "hq6"],
          filters,
          sort,
        ),
        queryFn: () => getStockMovementsListSummary(tenantId, filters),
      });
      if (slug === "inbound") {
        const filterKey = emptyListFilterKey(bounds);
        prefetchQuery(queryClient, {
          queryKey: [
            "stock-movements",
            tenantId,
            "inbound",
            undefined,
            undefined,
            filterKey,
            undefined,
            DEFAULT_TABLE_PAGE_SIZE,
          ],
          queryFn: () =>
            getStockMovementsPage(
              tenantId,
              { type: "inbound", from, to, includeSummary: false },
              undefined,
              DEFAULT_TABLE_PAGE_SIZE,
            ),
        });
      }
      break;
    }
    case "outbound": {
      const filterKey = emptyListFilterKey(bounds);
      prefetchQuery(queryClient, {
        queryKey: [
          "stock-movements",
          tenantId,
          "outbound",
          undefined,
          undefined,
          filterKey,
          undefined,
          DEFAULT_TABLE_PAGE_SIZE,
        ],
        queryFn: () =>
          getStockMovementsPage(
            tenantId,
            { type: "outbound", from, to, includeSummary: false },
            undefined,
            DEFAULT_TABLE_PAGE_SIZE,
          ),
      });
      break;
    }
    case "customers": {
      const filters = {};
      prefetchQuery(queryClient, {
        queryKey: hq6Page0QueryKey(["customers", tenantId, "hq6"], filters, null),
        queryFn: () =>
          getCustomersPage(tenantId, { includeSummary: false }, undefined, HQ6_TABLE_PAGE_SIZE),
      });
      prefetchQuery(queryClient, {
        queryKey: hq6SummaryQueryKey(["customers", tenantId, "hq6"], filters, null),
        queryFn: () => getCustomersListSummary(tenantId, {}),
      });
      break;
    }
    case "suppliers": {
      const filters = {};
      prefetchQuery(queryClient, {
        queryKey: hq6Page0QueryKey(["suppliers", tenantId, "hq6"], filters, null),
        queryFn: () =>
          getSuppliersPage(tenantId, undefined, HQ6_TABLE_PAGE_SIZE, {
            includeSummary: false,
          }),
      });
      prefetchQuery(queryClient, {
        queryKey: hq6SummaryQueryKey(["suppliers", tenantId, "hq6"], filters, null),
        queryFn: () => getSuppliersListSummary(tenantId, {}),
      });
      break;
    }
    case "expenses": {
      const filters = {};
      prefetchQuery(queryClient, {
        queryKey: hq6Page0QueryKey(["expenses", tenantId, "hq6"], filters, null),
        queryFn: () =>
          getExpensesPage(tenantId, undefined, HQ6_TABLE_PAGE_SIZE, {
            includeSummary: false,
          }),
      });
      prefetchQuery(queryClient, {
        queryKey: hq6SummaryQueryKey(["expenses", tenantId, "hq6"], filters, null),
        queryFn: () =>
          getExpensesPage(tenantId, undefined, 1, { includeSummary: true }),
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
      const sort: ListSortState = { sortBy: "date", sortDir: "desc" };
      const filters = {};
      prefetchQuery(queryClient, {
        queryKey: hq6Page0QueryKey(["sales", tenantId, "all", "hq6"], filters, sort),
        queryFn: () =>
          getSalesPage(
            tenantId,
            { sortBy: "date", sortDir: "desc", includeSummary: false },
            undefined,
            HQ6_TABLE_PAGE_SIZE,
          ),
      });
      prefetchQuery(queryClient, {
        queryKey: hq6SummaryQueryKey(["sales", tenantId, "all", "hq6"], filters, sort),
        queryFn: () => getSalesListSummary(tenantId, {}),
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
    if (pathname === "/admin/hrm" || pathname.startsWith("/admin/hrm/") ||
        pathname === "/admin/users" || pathname.startsWith("/admin/users/")) {
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

/** Prefetch sidebar routes (staggered). Prefer hover / priority shell instead. */
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
        (slug) => `${tenantBasePath(tenantCode)}/${slug}`,
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
  "/admin/hrm",
  "/admin/hrm/users",
  "/admin/hrm/users/new/edit",
  "/admin/hrm/roles/new/edit",
  "/admin/hrm/payroll",
] as const;

/** Warm VAG admin overview first; other admin tabs on idle stagger. */
export function prefetchVagAdminShell(queryClient: QueryClient): void {
  prefetchRoute(queryClient, { pathname: "/admin/overview" });
  scheduleIdleBatch(
    VAG_ADMIN_ROUTES.filter((route) => route !== "/admin/overview").map(
      (pathname) => () => prefetchRoute(queryClient, { pathname }),
    ),
  );
}

/**
 * After login / entity entry: warm Home only.
 * Full nav warm (~40 HQ6 routes × shell+sidebar) starved the overview request.
 * Other routes prefetch on sidebar hover.
 */
export function prefetchTenantShell(
  queryClient: QueryClient,
  tenantCode: TenantCode,
  tenantId: string,
  dateBounds?: DateRangeBounds | null,
): void {
  prefetchRoute(queryClient, {
    pathname: `${tenantBasePath(tenantCode)}/overview`,
    tenantCode,
    tenantId,
    dateBounds,
  });
}
