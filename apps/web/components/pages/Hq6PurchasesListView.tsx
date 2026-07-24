"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Barcode,
  ChevronDown,
  CloudDownload,
  Eye,
  Filter,
  Mail,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6ListToolbar } from "@/components/hq6/Hq6ListToolbar";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { Hq6PayPurchaseModal } from "@/components/hq6/Hq6PayPurchaseModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { Hq6PurchaseViewModal } from "@/components/hq6/Hq6PurchaseViewModal";
import { Hq6ViewPaymentsModal } from "@/components/hq6/Hq6ViewPaymentsModal";
import {
  deleteStockMovement,
  getAllStockMovements,
  getStockMovementsListSummary,
  getStockMovementsPage,
  updateStockMovementStatus,
  type StockMovementListRow,
} from "@/lib/api/stockMovements";
import { getSuppliers } from "@/lib/api/suppliers";
import { useServerListPage, serverSortProps, withListSort } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useTableViewPrefs } from "@/lib/hooks/useTableViewPrefs";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  prefetchPaymentAccountsRef,
  prefetchPurchaseListModals,
} from "@/lib/query/prefetchListModals";
import { HQ6_PURCHASE_FILTERS } from "@/lib/registries/hq6Filters";
import { compositeListCursorFrom } from "@/lib/utils/pagination";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";
import { hq6PaymentBadgeClass } from "@/lib/utils/hq6PaymentBadge";
import type { MovementStatus, PurchasePaymentStatus } from "@vonos/types";

function purchaseBadgeClass(status: string | null | undefined): string {
  return hq6PaymentBadgeClass(status);
}

/** HQ6 Purchases list — ui-audit/21_purchases/screenshot.png */
export function Hq6PurchasesListView() {
  const tenantId = useTenantId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantCode, config } = useRouteTenant();
  const { recordId, recordSeed, openRecord, closeRecord } =
    useListRecordModal<StockMovementListRow>({
    onPrefetchRecord: (id) => {
      if (!tenantId) return;
      prefetchPurchaseListModals(queryClient, tenantId, id);
    },
  });
  const exportList = useListExport();
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({ defaultDateRange: "all_time" });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [localSearch, setLocalSearch] = useState(search);
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const tablePrefs = useTableViewPrefs(
    tenantCode ? `${tenantCode}.purchases` : undefined,
  );
  const { visibleColumnKeys, setVisibleColumnKeys, density, setDensity, resetColumnVisibility } =
    tablePrefs;
  const [deleteTarget, setDeleteTarget] = useState<StockMovementListRow | null>(null);
  const [payTarget, setPayTarget] = useState<StockMovementListRow | null>(null);
  const [paymentsTarget, setPaymentsTarget] = useState<StockMovementListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", tenantId, "purchase-filter"],
    queryFn: () => getSuppliers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const apiFilters = useMemo(
    () => ({
      type: "inbound" as const,
      search: (search).trim() || undefined,
      status: (statusFilter || undefined) as MovementStatus | undefined,
      paymentStatus: (paymentStatusFilter || undefined) as
        | PurchasePaymentStatus
        | undefined,
      locationCode: locationFilter || undefined,
      supplierId: supplierFilter || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [
      bounds?.from,
      bounds?.to,
      locationFilter,
      paymentStatusFilter,
      search,
      statusFilter,
      supplierFilter,
    ],
  );

  const {
    items: purchases,
    hasMore,
    totalCount,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,
    isFetching,
    isPaging,
    error,
    goToPage,
    canSelectPage,
    sort,
    setSort,
  } = useServerListPage<StockMovementListRow>({
    queryKey: ["stock-movements", tenantId, "inbound", "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: search,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    defaultSort: { sortBy: "date", sortDir: "desc" },
    fetchPage: (cursor, limit, listSort, opts) =>
      getStockMovementsPage(
        tenantId!,
        withListSort(
          { ...apiFilters, includeSummary: opts?.includeSummary },
          listSort,
        ),
        cursor,
        limit,
      ),
    fetchSummary: () => getStockMovementsListSummary(tenantId!, apiFilters),
    getCursor: (row, listSort) => {
      const requested = listSort?.sortBy ?? "date";
      const sortBy =
        requested === "paymentDue"
          ? "grandTotal"
          : requested === "supplierOrDest"
            ? "supplierId"
            : requested;
      const type =
        sortBy === "grandTotal"
          ? "number"
          : sortBy === "date"
            ? "date"
            : "string";
      return compositeListCursorFrom(row, sortBy, type);
    },
  });

  const commitSearch = () => setSearch(localSearch);

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllStockMovements(tenantId, apiFilters);
    exportList(
      "purchases",
      [
        { key: "date", header: "Date" },
        { key: "reference", header: "Reference No" },
        { key: "location", header: "Location" },
        { key: "supplier", header: "Supplier" },
        { key: "status", header: "Purchase Status" },
        { key: "paymentStatus", header: "Payment Status" },
        { key: "grandTotal", header: "Grand Total" },
        { key: "paymentDue", header: "Payment due" },
      ],
      rows.map((row) => ({
        date: row.date,
        reference: row.reference,
        location: businessLocationName(row.locationCode, config?.businessLocations) ?? "—",
        supplier: row.supplierOrDest,
        status: row.status,
        paymentStatus: formatHq6PaymentStatus(row.paymentStatus),
        grandTotal: row.grandTotal ?? 0,
        paymentDue: row.paymentDue ?? 0,
      })),
      "Export Purchases Spreadsheet",
    );
  };

  const columns: ColumnConfig<StockMovementListRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "view",
                label: "View",
                icon: <Eye className="h-3.5 w-3.5" />,
                onClick: () => openRecord(row.id, row),
              },
              {
                id: "print",
                label: "Print",
                icon: <Printer className="h-3.5 w-3.5" />,
                onClick: () => openRecord(row.id, row),
              },
              {
                id: "edit",
                label: "Edit",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () =>
                  router.push(`/${tenantCode}/add-purchase?edit=${row.id}`),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                icon: <Trash2 className="h-3.5 w-3.5" />,
                onClick: () => setDeleteTarget(row),
              },
              {
                id: "labels",
                label: "Labels",
                icon: <Barcode className="h-3.5 w-3.5" />,
                onClick: () =>
                  router.push(`/${tenantCode}/print-labels?purchaseId=${row.id}`),
              },
              {
                id: "view_payments",
                label: "View Payments",
                dividerBefore: true,
                icon: <Wallet className="h-3.5 w-3.5" />,
                onClick: () => {
                  if (tenantId) {
                    prefetchPurchaseListModals(queryClient, tenantId, row.id);
                  }
                  setPaymentsTarget(row);
                },
              },
              {
                id: "add_payment",
                label: "Add payment",
                icon: <Wallet className="h-3.5 w-3.5" />,
                onClick: () => {
                  if (tenantId) {
                    prefetchPaymentAccountsRef(queryClient, tenantId);
                  }
                  setPayTarget(row);
                },
              },
              {
                id: "purchase_return",
                label: "Purchase Return",
                icon: <RotateCcw className="h-3.5 w-3.5" />,
                onClick: () =>
                  router.push(
                    `/${tenantCode}/purchase-return?purchaseId=${row.id}`,
                  ),
              },
              {
                id: "update_status",
                label: "Update Status",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () => {
                  const next: MovementStatus =
                    row.status === "Ordered" || row.status === "Pending"
                      ? "Received"
                      : row.status === "Received"
                        ? "Delivered"
                        : "Received";
                  void updateStockMovementStatus(row.id, next)
                    .then(async () => {
                      toast.success(`Status → ${next}`);
                      await queryClient.invalidateQueries({
                        queryKey: ["stock-movements"],
                      });
                    })
                    .catch((err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to update status",
                      ),
                    );
                },
              },
              {
                id: "items_received",
                label: "Items Received Notification",
                icon: <Mail className="h-3.5 w-3.5" />,
                onClick: () => openRecord(row.id, row),
              },
            ]}
          />
        ),
      },
      {
        key: "date",
        header: "Date",
        sortValue: (row) => new Date(row.date).getTime(),
        render: (row) => formatHq6DateTime(row.date),
      },
      {
        key: "reference",
        header: "Reference No",
        render: (row) => <span className="font-semibold">{row.reference}</span>,
      },
      {
        key: "locationCode",
        header: "Location",
        render: (row) =>
          businessLocationName(row.locationCode, config?.businessLocations) ?? "—",
      },
      {
        key: "supplierOrDest",
        header: "Supplier",
        render: (row) => row.supplierOrDest,
      },
      {
        key: "status",
        header: "Purchase Status",
        render: (row) => row.status,
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (row) => (
          <span
            className={cn(
              "hq6-pay-badge",
              purchaseBadgeClass(row.paymentStatus),
            )}
          >
            {formatHq6PaymentStatus(row.paymentStatus)}
          </span>
        ),
      },
      {
        key: "grandTotal",
        header: "Grand Total",
        numeric: true,
        sortValue: (row) => row.grandTotal ?? 0,
        render: (row) => formatHq6Currency(row.grandTotal ?? 0, "NGN"),
      },
      {
        key: "paymentDue",
        header: "Payment due",
        numeric: true,
        sortValue: (row) => row.paymentDue ?? 0,
        render: (row) => formatHq6Currency(row.paymentDue ?? 0, "NGN"),
      },
    ],
    [config?.businessLocations, openRecord, queryClient, router, tenantCode],
  );

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header || c.key) })),
    [columns],
  );

  const effectiveColumns = useMemo(() => {
    if (!visibleColumnKeys) return columns;
    const allowed = new Set(["actions", ...visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [columns, visibleColumnKeys]);

  const totals = useMemo(() => {
    let grandTotal = 0;
    let paymentDue = 0;
    for (const row of purchases) {
      grandTotal += row.grandTotal ?? 0;
      paymentDue += row.paymentDue ?? 0;
    }
    return { grandTotal, paymentDue };
  }, [purchases]);

  return (
    <div className="hq6-page">
      <section className="hq6-content-header">
        <h1>Purchases</h1>
      </section>

      <div className="hq6-card hq6-filters-card">
        <button
          type="button"
          className="hq6-filters-summary"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 opacity-60 transition-transform",
              filtersOpen && "rotate-180",
            )}
          />
        </button>
        {filtersOpen ? (
          <div className="hq6-filters-body">
            <Hq6FilterGrid>
              <Hq6FilterSelect
                label="Business Location"
                value={locationFilter}
                onChange={setLocationFilter}
                options={(config?.businessLocations ?? []).map((loc) => ({
                  value: loc.code,
                  label: loc.name,
                }))}
              />
              <Hq6FilterSelect
                label="Supplier"
                value={supplierFilter}
                onChange={setSupplierFilter}
                emptyLabel="All"
                options={(suppliersQuery.data ?? []).map((s) => ({
                  value: s.id,
                  label: s.businessName || s.name,
                }))}
              />
              <Hq6FilterSelect
                label="Purchase Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={HQ6_PURCHASE_FILTERS[2]!.options!}
              />
              <Hq6FilterSelect
                label="Payment Status"
                value={paymentStatusFilter}
                onChange={setPaymentStatusFilter}
                options={HQ6_PURCHASE_FILTERS[3]!.options!}
              />
              <Hq6FilterDateRange
                value={dateRange}
                onChange={setDateRange}
                customValue={customDateRange}
                onCustomChange={setCustomDateRange}
              />
            </Hq6FilterGrid>
          </div>
        ) : null}
      </div>

      <div className="hq6-card hq6-products-box overflow-x-clip">
        <div className="hq6-tab-row">
          <div className="flex min-w-0 flex-1">
            <button type="button" className="hq6-tab hq6-tab-active">
              All purchases
            </button>
          </div>
          {tenantCode ? (
            <div className="flex shrink-0 items-center gap-2 px-3">
              <Link
                href={`/${tenantCode}/add-purchase`}
                className="hq6-btn hq6-btn-blue"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Link>
              <button
                type="button"
                className="hq6-btn hq6-btn-download"
                onClick={() => void handleExport()}
              >
                <CloudDownload className="h-3.5 w-3.5" />
                Download Excel
              </button>
            </div>
          ) : null}
        </div>

        <Hq6ListToolbar
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchValue={localSearch}
          onSearchChange={setLocalSearch}
          onSearchCommit={commitSearch}
          searchPlaceholder={hq6CopyForSlug("inbound").searchPlaceholder}
          onExportCsv={() => void handleExport()}
          onExportExcel={() => void handleExport()}
          onPrint={() => setPrintOpen(true)}
          onColumnVisibility={() => setColumnsOpen(true)}
          density={density}
          onDensityChange={setDensity}
        />

        <div className="hq6-table-wrap hq6-table-freeze-first relative">
          <DataTable
            data={purchases}
            columns={effectiveColumns}
            displayMode="table"
            embedded
            disablePagination
            stickyFirstColumn
            density={density}
            onDensityChange={setDensity}
            showDensityControl={false}
            isLoading={isLoading}
            isFetching={isFetching && !isLoading}
            error={error ? "Could not load purchases." : null}
            onRowClick={(row) => openRecord(row.id, row)}
            emptyState={{ message: "No purchases found." }}
            serverSort={serverSortProps({ sort, setSort })}
          />
          {purchases.length > 0 ? (
            <div className="flex border-t border-[var(--hq6-border)] bg-[#f9fafb] text-xs font-bold text-[#374151]">
              <div className="min-w-0 flex-1 px-3 py-2">Total:</div>
              <div className="w-[7.5rem] shrink-0 px-2 py-2 text-right tabular-nums">
                {formatHq6Currency(totals.grandTotal, "NGN")}
              </div>
              <div className="w-[7.5rem] shrink-0 px-2 py-2 text-right tabular-nums">
                {formatHq6Currency(totals.paymentDue, "NGN")}
              </div>
            </div>
          ) : null}
        </div>

        {(purchases.length > 0 ||
          canGoPrev ||
          hasMore ||
          pageIndex > 0 ||
          isFetching ||
          isLoading) && (
          <CursorPaginationBar
            pageIndex={pageIndex}
            pageSize={pageSize}
            itemCount={purchases.length}
            hasMore={hasMore}
            canGoPrev={canGoPrev}
            onPrev={goPrev}
            onNext={goNext}
            onPageSizeChange={setPageSize}
            onPageSelect={goToPage}
            canSelectPage={canSelectPage}
            totalItems={totalCount}
            isBusy={isFetching || isLoading}
            className="border-t border-[var(--hq6-border)] px-3 py-2"
          />
        )}
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>

      <Hq6PurchaseViewModal
        open={Boolean(recordId)}
        purchaseId={recordId}
        initialPurchase={recordSeed}
        onClose={closeRecord}
      />
      <Hq6PayPurchaseModal
        open={Boolean(payTarget)}
        purchase={payTarget}
        tenantId={tenantId}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
          void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        }}
      />
      <Hq6ViewPaymentsModal
        open={Boolean(paymentsTarget)}
        title={
          paymentsTarget
            ? `View Payments ( Reference No.: ${paymentsTarget.reference} )`
            : "View Payments"
        }
        tenantId={tenantId}
        kind="purchase"
        recordId={paymentsTarget?.id ?? null}
        context={
          paymentsTarget
            ? {
                customerName: paymentsTarget.supplierOrDest || undefined,
                businessName: config?.name ?? undefined,
                businessLocation: businessLocationName(
                  paymentsTarget.locationCode ?? null,
                  config?.businessLocations,
                ),
                invoiceNo: paymentsTarget.reference,
                date: paymentsTarget.date,
                paymentStatus: paymentsTarget.paymentStatus,
              }
            : null
        }
        onClose={() => setPaymentsTarget(null)}
      />
      <Hq6ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!tenantId || !deleteTarget || deleting) return;
          setDeleting(true);
          void deleteStockMovement(tenantId, deleteTarget.id)
            .then(async () => {
              toast.success(`Deleted purchase ${deleteTarget.reference}`);
              setDeleteTarget(null);
              await queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
            })
            .catch((err) =>
              toast.error(
                err instanceof Error ? err.message : "Failed to delete purchase",
              ),
            )
            .finally(() => setDeleting(false));
        }}
        title="Are you sure ?"
        message={
          deleteTarget
            ? `Delete purchase ${deleteTarget.reference}?`
            : "Are you sure ?"
        }
        confirmLabel="Delete"
        danger
      />
      <Hq6PrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
      <Hq6ColumnVisibilityModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columnOptions}
        visibleKeys={visibleColumnKeys ?? columnOptions.map((c) => c.key)}
        onChange={setVisibleColumnKeys}
        onReset={() => {
          resetColumnVisibility();
          setColumnsOpen(false);
        }}
      />
    </div>
  );
}
