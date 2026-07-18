"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
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

interface ReportRunViewProps {
  slug: string;
}

export function ReportRunView({ slug }: ReportRunViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId, tenantCode } = useRouteTenant();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const entry = reportEntryBySlug(slug);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const periodLabel = ledgerChartSubtitle(dateRange);

  const [expiryEdit, setExpiryEdit] = useState<ExpiryEditPayload | null>(null);
  const [fixStock, setFixStock] = useState<FixStockPayload | null>(null);
  const [filters, setFilters] = useState<ReportRunOptions>(() => emptyReportFilters());
  const debouncedFilters = useDebouncedValue(filters, 400);

  const isProfitLoss = entry?.id === "profit-loss";
  const isPaginated = Boolean(entry && isPaginatedTableReport(entry.id));
  const tableUi = entry ? REPORT_TABLE_UI[entry.id] : undefined;
  const hasFilters = Boolean(tableUi && tableUi.filters.length > 0);
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

  const optionSets = useReportFilterOptions(tenantId, tableUi?.filters);

  const plCoreQuery = useQuery({
    queryKey: ["report-run", tenantId, entry?.id, "pl-core", periodFrom, periodTo],
    queryFn: async () => {
      if (!tenantId || !entry) return null;
      return runReport({
        reportId: entry.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId,
        mode: "pl-core",
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
      case "edit-payment": {
        if (!tenantCode) return;
        const recordType = String(
          action.payload.recordType ?? "payment",
        );
        const recordId = String(
          action.payload.paymentId ??
            action.payload.saleId ??
            action.payload.id ??
            "",
        );
        if (recordType === "payment") {
          router.push(`/${tenantCode}/payments`);
          return;
        }
        const path = recordDetailPath(tenantCode, recordType, recordId);
        if (path) router.push(path);
        break;
      }
      default:
        break;
    }
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

  return (
    <>
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
        <div className="space-y-4">
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
            <p className="text-sm text-red-600">Failed to load report.</p>
          ) : data ? (
            <HqReportPageLayout
              reportId={entry.id}
              title={entry.label}
              subtitle={periodLabel}
              data={data}
              tenantId={tenantId ?? undefined}
              from={bounds?.from}
              to={bounds?.to}
              summaryLoading={summaryLoading}
              tablePagination={tablePagination}
              onRowClick={
                tenantCode
                  ? (row) => {
                      const path = recordDetailPath(
                        tenantCode,
                        String(row.recordType ?? ""),
                        String(row.id ?? ""),
                      );
                      if (path) router.push(path);
                    }
                  : undefined
              }
              onRowAction={handleRowAction}
            />
          ) : null}
        </div>
      </ListPageShell>

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
