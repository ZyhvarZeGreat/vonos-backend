"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductSellReportView, ReportRowAction, ReportRunOptions } from "@vonos/types";
import { isPaginatedTableReport } from "@vonos/types";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import {
  compactReportFilters,
  emptyReportFilters,
  REPORT_TABLE_UI,
  TABLE_REPORT_PAGE_SIZE,
} from "@/lib/registries/reportTableUi";
import { runReport } from "@/lib/api/reports";
import {
  fixReportLocationStock,
  updateReportMovementLineExpiry,
} from "@/lib/api/reportActions";
import { useCursorPage } from "@/lib/hooks/useCursorPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useReportFilterOptions } from "@/lib/hooks/useReportFilterOptions";
import { useReportRecordModals } from "@/lib/hooks/useReportRecordModals";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { HqReportPageLayout, HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
import { ReportFilterShell } from "@/components/organisms/ReportFilterShell";
import {
  ReportExpiryEditModal,
  type ExpiryEditPayload,
} from "@/components/organisms/ReportExpiryEditModal";
import {
  ReportFixStockModal,
  type FixStockPayload,
} from "@/components/organisms/ReportFixStockModal";
import { useUiStore } from "@/stores/uiStore";
import { Button } from "@/components/atoms/Button";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ReportsTableRow } from "@vonos/types";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import { Hq6ReportFiltersPanel } from "@/components/hq6/Hq6ReportFiltersPanel";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { UposNavTabs } from "@/components/upos/UposNavTabs";

interface ReportRunViewProps {
  slug: string;
}

export function ReportRunView({ slug }: ReportRunViewProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const entry = reportEntryBySlug(slug);
  // Isolate from the global uiStore preset (defaults to last_7_days) so migrated
  // history (expenses, payments, etc.) is visible. Cap still applies via API bounds.
  const { dateRange, setDateRange, customDateRange, setCustomDateRange, bounds } =
    useListPageFilters({
      unboundedAllTime: false,
      defaultDateRange: "last_7_days",
      isolateDateRange: true,
    });
  const periodLabel = ledgerChartSubtitle(dateRange);

  const [expiryEdit, setExpiryEdit] = useState<ExpiryEditPayload | null>(null);
  const [fixStock, setFixStock] = useState<FixStockPayload | null>(null);
  const isProfitLoss = entry?.id === "profit-loss";
  const isPaginated = Boolean(entry && isPaginatedTableReport(entry.id));
  const tableUi = entry ? REPORT_TABLE_UI[entry.id] : undefined;
  const hasFilters = Boolean(tableUi && tableUi.filters.length > 0);

  const [draftFilters, setDraftFilters] = useState<ReportRunOptions>(() =>
    emptyReportFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<ReportRunOptions>(() =>
    emptyReportFilters(),
  );
  /** Live search stays snappy; select filters batch via Apply on paginated reports. */
  const filters = isPaginated
    ? { ...appliedFilters, search: draftFilters.search }
    : draftFilters;
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 400);
  const debouncedFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters],
  );
  const filtersDirty = useMemo(() => {
    if (!isPaginated) return false;
    const draftSansSearch = { ...draftFilters, search: "" };
    const appliedSansSearch = { ...appliedFilters, search: "" };
    return (
      JSON.stringify(compactReportFilters(draftSansSearch)) !==
      JSON.stringify(compactReportFilters(appliedSansSearch))
    );
  }, [appliedFilters, draftFilters, isPaginated]);

  const {
    openReportRecord,
    handleRowAction: openLinkedRecordAction,
    modals: recordModals,
  } = useReportRecordModals();

  const reportStaleMs = 5 * 60_000;
  const periodFrom = bounds?.from ?? "all";
  const periodTo = bounds?.to ?? "all";

  const {
    cursor,
    pageIndex,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    maxReachablePageIndex,
    reset: resetTablePage,
  } = useCursorPage();
  const [pageSize, setPageSize] = useState(TABLE_REPORT_PAGE_SIZE);

  const filterKey = useMemo(
    () => JSON.stringify(compactReportFilters(debouncedFilters)),
    [debouncedFilters],
  );

  useEffect(() => {
    resetTablePage();
  }, [periodFrom, periodTo, pageSize, filterKey, resetTablePage]);

  const optionSets = useReportFilterOptions(
    tenantId,
    isProfitLoss
      ? [
          {
            key: "locationCode",
            kind: "select",
            label: "Business Location",
            optionsSource: "locations",
          },
        ]
      : tableUi?.filters,
  );

  const plCoreQuery = useQuery({
    queryKey: [
      "report-run",
      tenantId,
      entry?.id,
      "pl-core",
      periodFrom,
      periodTo,
      filters.locationCode || "",
    ],
    queryFn: async () => {
      if (!tenantId || !entry) return null;
      return runReport({
        reportId: entry.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId,
        mode: "pl-core",
        ...(filters.locationCode
          ? { locationCode: filters.locationCode }
          : {}),
      });
    },
    enabled: Boolean(tenantId && entry && isProfitLoss),
    staleTime: reportStaleMs,
  });

  const fullQuery = useQuery({
    queryKey: [
      "report-run",
      tenantId,
      entry?.id,
      "full",
      periodFrom,
      periodTo,
      isPaginated ? cursor : null,
      isPaginated ? pageSize : null,
      hasFilters || isPaginated ? filterKey : null,
    ],
    queryFn: async () => {
      if (!tenantId || !entry) return null;
      const filterOpts =
        hasFilters || isPaginated
          ? compactReportFilters({
              ...debouncedFilters,
              ...(isPaginated ? { cursor, limit: pageSize } : {}),
            })
          : {};
      return runReport({
        reportId: entry.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId,
        mode: "full",
        ...filterOpts,
      });
    },
    enabled: Boolean(tenantId && entry && !isProfitLoss),
    staleTime: reportStaleMs,
    placeholderData: isPaginated ? (prev) => prev : undefined,
  });

  const data = useMemo(() => {
    if (isProfitLoss) return plCoreQuery.data ?? null;
    return fullQuery.data ?? null;
  }, [isProfitLoss, plCoreQuery.data, fullQuery.data]);

  const isLoading = isProfitLoss ? plCoreQuery.isLoading : fullQuery.isLoading;
  const isFetching = isProfitLoss ? plCoreQuery.isFetching : fullQuery.isFetching;
  const error = isProfitLoss ? plCoreQuery.error : fullQuery.error;
  const summaryLoading = false;

  const tablePagination = isPaginated
    ? {
        pageIndex,
        pageSize: data?.table?.pageSize ?? pageSize,
        hasMore: Boolean(data?.table?.hasMore),
        canGoPrev,
        isBusy: isFetching && !isLoading,
        onPrev: goPrev,
        onNext: () => {
          const next = data?.table?.nextCursor;
          if (next) goNext(next);
        },
        onPageSizeChange: (size: number) => {
          setPageSize(size);
          resetTablePage();
        },
        onPageSelect: goToPage,
        canSelectPage: (index: number) => index <= maxReachablePageIndex,
      }
    : undefined;

  const invalidateReport = () => {
    void queryClient.invalidateQueries({ queryKey: ["report-run", tenantId, entry?.id] });
  };

  const fixStockMutation = useMutation({
    mutationFn: (payload: FixStockPayload) =>
      fixReportLocationStock({
        itemId: payload.itemId,
        locationCode: payload.locationCode,
        binLocation: payload.binLocation,
        quantity: payload.quantity,
        tenantId: tenantId ?? undefined,
      }),
    onSuccess: invalidateReport,
  });

  const expiryMutation = useMutation({
    mutationFn: (payload: ExpiryEditPayload & { expDate: string }) =>
      updateReportMovementLineExpiry({
        movementId: payload.movementId,
        lineSku: payload.lineSku,
        expDate: payload.expDate,
        tenantId: tenantId ?? undefined,
      }),
    onSuccess: invalidateReport,
  });

  const handleRowAction = (action: ReportRowAction) => {
    switch (action.kind) {
      case "fix-stock":
        setFixStock({
          itemId: String(action.payload.itemId),
          locationCode: String(action.payload.locationCode),
          binLocation: action.payload.binLocation
            ? String(action.payload.binLocation)
            : undefined,
          quantity: Number(action.payload.quantity ?? 0),
        });
        break;
      case "edit-expiry":
        setExpiryEdit({
          movementId: String(action.payload.movementId),
          lineSku: String(action.payload.lineSku),
          expDate: String(action.payload.expDate ?? ""),
        });
        break;
      case "view-record":
      case "edit-payment":
        openLinkedRecordAction(action);
        break;
      default:
        break;
    }
  };

  const handleRowClick = (row: ReportsTableRow & { id: string }) => {
    openReportRecord(row);
  };

  const exportPayload =
    data?.table && entry
      ? {
          filename: entry.slug,
          columns: data.table.columns.map((col) => ({
            key: col.key,
            header: col.header,
          })),
          rows: data.table.rows.map((row) => {
            const out: Record<string, string | number | null | undefined> = {};
            for (const [key, value] of Object.entries(row)) {
              if (key === "actions" || Array.isArray(value)) continue;
              if (
                typeof value === "string" ||
                typeof value === "number" ||
                value == null
              ) {
                out[key] = value;
              }
            }
            return out;
          }),
        }
      : null;

  if (!entry) {
    return <p className="p-6 text-sm text-muted-foreground">Unknown report.</p>;
  }

  const activeView = (filters.view ?? "detailed") as ProductSellReportView;
  const searchField = tableUi?.filters.find((field) => field.kind === "search");
  const searchPlaceholder = searchField?.placeholder ?? "Search …";

  const reportBody = (
    <div className="space-y-4">
      {isHq6 && tableUi?.views ? (
        <div className="row no-print">
          <div className="col-md-12">
            <UposNavTabs
              tabs={tableUi.views.map((view) => ({
                id: view.id,
                label: view.label,
                active: activeView === view.id,
                onClick: () =>
                  setDraftFilters((prev) => ({ ...prev, view: view.id })),
              }))}
            >
              <div className="tab-pane active" />
            </UposNavTabs>
          </div>
        </div>
      ) : null}

      {isHq6 && isProfitLoss ? (
        <div className="row no-print hq6-pl-toolbar upos-report-filters-row">
          <div className="col-xs-12 col-sm-6 col-md-4">
            <div className="input-group">
              <span className="input-group-addon bg-light-blue">
                <i className="fa fa-map-marker" aria-hidden />
              </span>
              <select
                className="form-control select2"
                id="profit_loss_location_filter"
                value={filters.locationCode ?? ""}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    locationCode: e.target.value,
                  }))
                }
              >
                <option value="">All locations</option>
                {optionSets.locations.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-xs-12 col-sm-6 col-md-4">
            <div className="form-group hq6-pl-date-filter">
              <label className="sr-only" htmlFor="profit_loss_date_filter">
                Filter by date
              </label>
              <DateRangeDropdown
                id="profit_loss_date_filter"
                value={dateRange}
                onChange={setDateRange}
                customValue={customDateRange}
                onCustomChange={setCustomDateRange}
                className="hq6-pl-date-dropdown"
              />
            </div>
          </div>
        </div>
      ) : null}

      {isHq6 && !isProfitLoss ? (
        <Hq6ReportFiltersPanel
          fields={tableUi?.filters ?? []}
          values={draftFilters}
          optionSets={optionSets}
          onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
          dateFrom={bounds?.from?.slice(0, 10) ?? ""}
          dateTo={bounds?.to?.slice(0, 10) ?? ""}
          onDateFromChange={(from) => {
            setCustomDateRange({
              from: from || "",
              to: bounds?.to?.slice(0, 10) || from || "",
            });
          }}
          onDateToChange={(to) => {
            setCustomDateRange({
              from: bounds?.from?.slice(0, 10) || to || "",
              to: to || "",
            });
          }}
          defaultOpen
          onApply={
            isPaginated
              ? () => setAppliedFilters({ ...draftFilters })
              : undefined
          }
          onClear={
            isPaginated
              ? () => {
                  const empty = emptyReportFilters();
                  setDraftFilters(empty);
                  setAppliedFilters(empty);
                }
              : undefined
          }
          dirty={filtersDirty}
        />
      ) : null}

      {!isHq6 && tableUi && tableUi.filters.length > 0 ? (
        <ReportFilterShell
          fields={tableUi.filters}
          values={draftFilters}
          optionSets={optionSets}
          onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
          onApply={
            isPaginated
              ? () => setAppliedFilters({ ...draftFilters })
              : undefined
          }
          onClear={
            isPaginated
              ? () => {
                  const empty = emptyReportFilters();
                  setDraftFilters(empty);
                  setAppliedFilters(empty);
                }
              : undefined
          }
          dirty={filtersDirty}
        />
      ) : null}

      {!isHq6 && tableUi?.views ? (
        <div className="flex flex-wrap gap-2 print:hidden">
          {tableUi.views.map((view) => (
            <button
              key={view.id}
              type="button"
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                activeView === view.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-card text-muted hover:text-foreground",
              )}
              onClick={() =>
                setDraftFilters((prev) => ({ ...prev, view: view.id }))
              }
            >
              {view.label}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading || (isFetching && !data) ? (
        <HqReportPageSkeleton reportId={entry.id} />
      ) : error ? (
        <p className="text-sm text-red-600">Failed to load report.</p>
      ) : data ? (
        <HqReportPageLayout
          reportId={entry.id}
          title={entry.label}
          subtitle={isHq6 ? "" : periodLabel}
          bare={isHq6}
          data={data}
          tenantId={tenantId ?? undefined}
          from={bounds?.from}
          to={bounds?.to}
          locationCode={filters.locationCode || undefined}
          summaryLoading={summaryLoading}
          tablePagination={tablePagination}
          tableSearch={filters.search ?? ""}
          onTableSearchChange={(search) =>
            setDraftFilters((prev) => ({ ...prev, search }))
          }
          searchPlaceholder={searchPlaceholder}
          onRowClick={handleRowClick}
          onRowAction={handleRowAction}
        />
      ) : null}
    </div>
  );

  return (
    <>
      {isHq6 ? (
        <div className="hq6-page">
          <Hq6PageHeader title={entry.label} />
          <section className="content">{reportBody}</section>
          <p className="hq6-footer">
            Vonos Autos Head Office - V8.1 | Copyright ©{" "}
            {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      ) : (
        <ListPageShell
          tabs={[{ id: "report", label: entry.label }]}
          activeTab="report"
          onTabChange={() => {}}
          showImport={false}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          contentClassName="p-6 sm:p-8"
          primaryAction={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 print:hidden"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          }
          onExport={
            entry.exportable && exportPayload
              ? () =>
                  openExportModal(
                    {
                      title: `Export ${entry.label}`,
                      subtitle: "Download report data as CSV",
                    },
                    exportPayload,
                  )
              : undefined
          }
        >
          {reportBody}
        </ListPageShell>
      )}

      {recordModals}

      <ReportExpiryEditModal
        open={expiryEdit}
        onClose={() => setExpiryEdit(null)}
        onSave={async (payload) => {
          await expiryMutation.mutateAsync(payload);
        }}
      />

      <ReportFixStockModal
        open={fixStock}
        onClose={() => setFixStock(null)}
        onSave={async (payload) => {
          await fixStockMutation.mutateAsync(payload);
        }}
      />
    </>
  );
}
