"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, Upload } from "lucide-react";
import { AdminEntityBanner } from "@/components/molecules/AdminEntityBanner";
import { Button } from "@/components/atoms/Button";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { HqReportPageLayout, HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
import { ReportFilterShell } from "@/components/organisms/ReportFilterShell";
import { runReport } from "@/lib/api/reports";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import {
  compactReportFilters,
  emptyReportFilters,
  REPORT_TABLE_UI,
  TABLE_REPORT_PAGE_SIZE,
} from "@/lib/registries/reportTableUi";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { useCursorPage } from "@/lib/hooks/useCursorPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useReportFilterOptions } from "@/lib/hooks/useReportFilterOptions";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { cn } from "@/lib/utils/cn";
import type {
  ProductSellReportView,
  ReportRunOptions,
  ReportsTableRow,
} from "@vonos/types";
import { isPaginatedTableReport } from "@vonos/types";
import { useUiStore } from "@/stores/uiStore";

export interface AdminEntityReportSheetProps {
  tenantCode: TenantCode;
  reportSlug: string;
}

export function AdminEntityReportSheet({
  tenantCode,
  reportSlug,
}: AdminEntityReportSheetProps) {
  const router = useRouter();
  const tenant = getTenantByCode(tenantCode);
  const entry = reportEntryBySlug(reportSlug);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const periodLabel = ledgerChartSubtitle(dateRange);
  const [filters, setFilters] = useState<ReportRunOptions>(() => emptyReportFilters());
  const debouncedFilters = useDebouncedValue(filters, 400);

  const isProfitLoss = entry?.id === "profit-loss";
  const isPaginated = Boolean(entry && isPaginatedTableReport(entry.id));
  const tableUi = entry ? REPORT_TABLE_UI[entry.id] : undefined;
  const hasFilters = Boolean(tableUi && tableUi.filters.length > 0);
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

  const optionSets = useReportFilterOptions(tenant?.tenantId, tableUi?.filters);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "adminReportRun",
      tenant?.tenantId,
      entry?.id,
      periodFrom,
      periodTo,
      isPaginated ? cursor : null,
      isPaginated ? pageSize : null,
      hasFilters || isPaginated ? filterKey : null,
    ],
    queryFn: () => {
      const filterOpts =
        hasFilters || isPaginated
          ? compactReportFilters({
              ...debouncedFilters,
              ...(isPaginated ? { cursor, limit: pageSize } : {}),
            })
          : {};
      return runReport({
        reportId: entry!.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId: tenant!.tenantId,
        mode: isProfitLoss ? "pl-core" : "full",
        ...filterOpts,
      });
    },
    enabled: Boolean(tenant && entry),
    staleTime: 5 * 60_000,
    placeholderData: isPaginated ? (prev) => prev : undefined,
  });

  if (!tenant) {
    return (
      <p className="text-sm text-muted">Unknown entity code &quot;{tenantCode}&quot;.</p>
    );
  }

  if (!entry) {
    return <p className="text-sm text-muted">Unknown report &quot;{reportSlug}&quot;.</p>;
  }

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

  const handleExport = () => {
    if (!data?.table) return;
    openExportModal(
      {
        title: `Export ${entry.label} — ${tenant.name}`,
        subtitle: periodLabel,
      },
      {
        filename: `${entry.slug}-${tenantCode.toLowerCase()}`,
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
      },
    );
  };

  const handleRowClick = (row: ReportsTableRow & { id: string }) => {
    const path = recordDetailPath(
      tenantCode,
      String(row.recordType ?? ""),
      String(row.id ?? ""),
    );
    if (path) router.push(path);
  };

  const activeView = (filters.view ?? "detailed") as ProductSellReportView;

  return (
    <div className="space-y-6">
      <AdminEntityBanner
        tenantCode={tenantCode}
        tenantName={tenant.name}
        backHref={`/admin/reports/${tenantCode}`}
        backLabel="Back to entity reports"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={!data?.table?.rows.length}
          >
            <Upload className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-2 sm:p-4">
        {tableUi && tableUi.filters.length > 0 ? (
          <ReportFilterShell
            fields={tableUi.filters}
            values={filters}
            optionSets={optionSets}
            onChange={(patch) =>
              setFilters((prev) => ({ ...prev, ...patch }))
            }
          />
        ) : null}

        {tableUi?.views ? (
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
                  setFilters((prev) => ({ ...prev, view: view.id }))
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
          <p className="text-sm text-error">Failed to load report.</p>
        ) : data ? (
          <HqReportPageLayout
            reportId={entry.id}
            title={entry.label}
            subtitle={periodLabel}
            data={data}
            tablePagination={tablePagination}
            onRowClick={handleRowClick}
          />
        ) : null}
      </div>
    </div>
  );
}
