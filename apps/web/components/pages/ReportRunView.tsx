"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportRowAction } from "@vonos/types";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import { runReport } from "@/lib/api/reports";
import {
  fixReportLocationStock,
  updateReportMovementLineExpiry,
} from "@/lib/api/reportActions";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { HqReportPageLayout } from "@/components/organisms/HqReportPageLayout";
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

  const isProfitLoss = entry?.id === "profit-loss";
  const reportStaleMs = 5 * 60_000;
  const periodKey = [bounds?.from ?? "all", bounds?.to ?? "all"] as const;

  const plCoreQuery = useQuery({
    queryKey: ["report-run", tenantId, entry?.id, "pl-core", ...periodKey],
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
    queryKey: ["report-run", tenantId, entry?.id, "full", ...periodKey],
    queryFn: async () => {
      if (!tenantId || !entry) return null;
      return runReport({
        reportId: entry.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId,
        mode: "full",
      });
    },
    enabled: Boolean(tenantId && entry && !isProfitLoss),
    staleTime: reportStaleMs,
  });

  const data = useMemo(() => {
    if (isProfitLoss) return plCoreQuery.data ?? null;
    return fullQuery.data ?? null;
  }, [isProfitLoss, plCoreQuery.data, fullQuery.data]);

  const isLoading = isProfitLoss ? plCoreQuery.isLoading : fullQuery.isLoading;
  const error = isProfitLoss ? plCoreQuery.error : fullQuery.error;
  const summaryLoading = false;

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

  return (
    <>
      <ListPageShell
        tabs={[{ id: "report", label: entry.label }]}
        activeTab="report"
        onTabChange={() => {}}
        showImport={false}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
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
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading report…</p>
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
