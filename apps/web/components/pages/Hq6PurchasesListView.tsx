"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Barcode,
  Eye,
  Mail,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { Hq6PayPurchaseModal } from "@/components/hq6/Hq6PayPurchaseModal";
import { Hq6PurchaseViewModal } from "@/components/hq6/Hq6PurchaseViewModal";
import { Hq6UpdatePurchaseStatusModal } from "@/components/hq6/Hq6UpdatePurchaseStatusModal";
import { Hq6ViewPaymentsModal } from "@/components/hq6/Hq6ViewPaymentsModal";
import {
  deleteStockMovement,
  getAllStockMovements,
  getStockMovementsListSummary,
  getStockMovementsPage,
  type StockMovementListRow,
} from "@/lib/api/stockMovements";
import { getSuppliersForPicker, loadMoreSuppliersForPicker, suppliersPickerHasMore } from "@/lib/api/suppliers";
import { useServerListPage, serverSortProps, withListSort } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  prefetchPaymentAccountsRef,
  prefetchPurchaseListModals,
  prefetchPurchasePaymentsModal,
} from "@/lib/query/prefetchListModals";
import { parsePurchaseNotes } from "@/lib/utils/purchaseNotes";
import { modalKeys } from "@/lib/query/modalQueryKeys";
import { HQ6_PURCHASE_FILTERS } from "@/lib/registries/hq6Filters";
import { compositeListCursorFrom } from "@/lib/utils/pagination";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { entitySaleLocations } from "@/lib/hooks/useBusinessLocationOptions";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";
import { hq6PaymentBadgeClass, canAddPaymentForStatus } from "@/lib/utils/hq6PaymentBadge";
import type { MovementStatus, PurchasePaymentStatus } from "@vonos/types";
import { tenantBasePath } from "@/lib/utils/tenantMount";

function purchaseBadgeClass(status: string | null | undefined): string {
  return hq6PaymentBadgeClass(status);
}

/** HQ6 Purchases list — purchase/index.blade.php + ui-audit/21_purchases */
export function Hq6PurchasesListView() {
  const tenantId = useTenantId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantCode, config } = useRouteTenant();
  const chrome = useHq6ListChrome("purchases");

  // Warm payment-account dropdown while the purchases list loads.
  useEffect(() => {
    if (!tenantId) return;
    prefetchPaymentAccountsRef(queryClient, tenantId);
  }, [tenantId, queryClient]);

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
  } = useListPageFilters({
    // Match sales: unbounded list so Redis warm keys stay stable (no sliding from/to).
    defaultDateRange: "all_time",
    isolateDateRange: true,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StockMovementListRow | null>(null);
  const [payTarget, setPayTarget] = useState<StockMovementListRow | null>(null);
  const [paymentsTarget, setPaymentsTarget] = useState<StockMovementListRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<StockMovementListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supplierLabelById = useRef(new Map<string, string>());
  const [supplierLabel, setSupplierLabel] = useState("");
  const loadSupplierOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getSuppliersForPicker(tenantId, query || undefined);
      for (const row of rows) {
        supplierLabelById.current.set(row.id, row.businessName || row.name);
      }
      return {
        options: rows.map((s) => ({
          value: s.id,
          label: s.businessName || s.name,
        })),
        hasMore: !query.trim() && suppliersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreSupplierOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreSuppliersForPicker(tenantId);
    for (const row of page.appended) {
      supplierLabelById.current.set(row.id, row.businessName || row.name);
    }
    return {
      options: page.appended.map((s) => ({
        value: s.id,
        label: s.businessName || s.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const apiFilters = useMemo(
    () => ({
      type: "inbound" as const,
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
    isSearching,
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
    searchMode: "hybrid",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    defaultSort: { sortBy: "updatedAt", sortDir: "desc" },
    fetchPage: (cursor, limit, listSort, opts) =>
      getStockMovementsPage(
        tenantId!,
        withListSort(
          {
            ...apiFilters,
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          },
          listSort,
        ),
        cursor,
        limit,
      ),
    fetchSummary: (opts) =>
      getStockMovementsListSummary(tenantId!, {
        ...apiFilters,
        search: opts?.search,
      }),
    getCursor: (row, listSort) => {
      const requested = listSort?.sortBy ?? "updatedAt";
      const sortBy =
        requested === "paymentDue"
          ? "grandTotal"
          : requested === "supplierOrDest"
            ? "supplierId"
            : requested;
      const type =
        sortBy === "grandTotal"
          ? "number"
          : sortBy === "date" || sortBy === "createdAt" || sortBy === "updatedAt"
            ? "date"
            : "string";
      return compositeListCursorFrom(row, sortBy, type);
    },
  });

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
        { key: "additionalNotes", header: "Additional Notes" },
        { key: "paymentNote", header: "Payment note" },
        { key: "addedBy", header: "Added By" },
      ],
      rows.map((row) => {
        const notes = parsePurchaseNotes(row.notes);
        return {
          date: row.date,
          reference: row.reference,
          location: businessLocationName(row.locationCode, config?.businessLocations) ?? "—",
          supplier: row.supplierOrDest,
          status: row.status,
          paymentStatus: formatHq6PaymentStatus(row.paymentStatus),
          grandTotal: row.grandTotal ?? 0,
          paymentDue: row.paymentDue ?? 0,
          additionalNotes: notes.additionalNotes,
          paymentNote: notes.paymentNote,
          addedBy: row.createdByName ?? "",
        };
      }),
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
                  router.push(`${tenantBasePath(tenantCode)}/add-purchase?edit=${row.id}`),
              },
              ...(canAddPaymentForStatus(row.paymentStatus, row.paymentDue)
                ? [
                    {
                      id: "add_payment",
                      label: "Add Payment",
                      dividerBefore: true,
                      icon: <Wallet className="h-3.5 w-3.5" />,
                      onClick: () => {
                        if (tenantId) {
                          prefetchPaymentAccountsRef(queryClient, tenantId);
                        }
                        setPayTarget(row);
                      },
                    },
                  ]
                : []),
              {
                id: "view_payments",
                label: "View Payments",
                icon: <Wallet className="h-3.5 w-3.5" />,
                dividerBefore: !canAddPaymentForStatus(
                  row.paymentStatus,
                  row.paymentDue,
                ),
                onClick: () => {
                  if (tenantId) {
                    prefetchPurchasePaymentsModal(queryClient, tenantId, row.id);
                  }
                  setPaymentsTarget(row);
                },
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
                  router.push(`${tenantBasePath(tenantCode)}/print-labels?purchaseId=${row.id}`),
              },
              {
                id: "purchase_return",
                label: "Purchase Return",
                icon: <RotateCcw className="h-3.5 w-3.5" />,
                onClick: () =>
                  router.push(
                    `${tenantBasePath(tenantCode)}/purchase-return?purchaseId=${row.id}`,
                  ),
              },
              {
                id: "update_status",
                label: "Update Status",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () => setStatusTarget(row),
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
        render: (row) => {
          const canPay = canAddPaymentForStatus(
            row.paymentStatus,
            row.paymentDue,
          );
          return (
            <button
              type="button"
              className={cn(
                "hq6-pay-badge",
                purchaseBadgeClass(row.paymentStatus),
              )}
              title={canPay ? "Add Payment" : "View Payments"}
              onClick={(e) => {
                e.stopPropagation();
                if (canPay) {
                  if (tenantId) {
                    prefetchPaymentAccountsRef(queryClient, tenantId);
                  }
                  setPayTarget(row);
                } else {
                  if (tenantId) {
                    prefetchPurchasePaymentsModal(queryClient, tenantId, row.id);
                  }
                  setPaymentsTarget(row);
                }
              }}
            >
              {formatHq6PaymentStatus(row.paymentStatus)}
            </button>
          );
        },
      },
      {
        key: "paymentMethod",
        header: "Payment Method",
        sortable: false,
        render: (row) => formatHq6PaymentMethod(row.paymentMethod),
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
      {
        key: "additionalNotes",
        header: "Additional Notes",
        sortable: false,
        render: (row) => parsePurchaseNotes(row.notes).additionalNotes || "",
      },
      {
        key: "paymentNote",
        header: "Payment note",
        sortable: false,
        render: (row) => parsePurchaseNotes(row.notes).paymentNote || "",
      },
      {
        key: "addedBy",
        header: "Added By",
        render: (row) => row.createdByName ?? "—",
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

  // Saved column prefs from before Payment Method existed omit it — force on.
  useEffect(() => {
    const keys = chrome.visibleColumnKeys;
    if (!keys) return;
    if (keys.includes("paymentMethod")) return;
    if (!columnOptions.some((c) => c.key === "paymentMethod")) return;
    chrome.setVisibleColumnKeys([...keys, "paymentMethod"]);
  }, [
    chrome.visibleColumnKeys,
    chrome.setVisibleColumnKeys,
    columnOptions,
  ]);

  const effectiveColumns = useMemo(() => {
    if (!chrome.visibleColumnKeys) return columns;
    const allowed = new Set(["actions", ...chrome.visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [chrome.visibleColumnKeys, columns]);

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
    <Hq6StandardListShell
      slug="purchases"
      title="Purchases"
      tabLabel="All Purchases"
      addHref={tenantCode ? `${tenantBasePath(tenantCode)}/add-purchase` : undefined}
      onExport={() => void handleExport()}
      columnOptions={columnOptions}
      defaultVisibleColumnKeys={columnOptions.map((c) => c.key)}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={search}
      onSearchChange={setSearch}
      
      filters={
        <Hq6FilterGrid>
          <Hq6FilterSelect
            label="Business Location"
            value={locationFilter}
            onChange={setLocationFilter}
            emptyLabel="All locations"
            options={entitySaleLocations(config).map((loc) => ({
              value: loc.code,
              label: loc.name,
            }))}
          />
          <Hq6FilterSelect
            label="Supplier"
            value={supplierFilter}
            selectedLabel={supplierLabel}
            onChange={(id) => {
              setSupplierFilter(id);
              setSupplierLabel(
                id ? supplierLabelById.current.get(id) ?? "" : "",
              );
            }}
            emptyLabel="All"
            loadOptions={loadSupplierOptions}
            loadMoreOptions={loadMoreSupplierOptions}
            prefetchKey={tenantId}
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
      }
      tableFooter={
        purchases.length > 0 ? (
          <div className="flex border-t border-[var(--hq6-border)] bg-[#f9fafb] text-xs font-bold text-[#374151]">
            <div className="min-w-0 flex-1 px-3 py-2">Total:</div>
            <div className="w-[7.5rem] shrink-0 px-2 py-2 text-right tabular-nums">
              {formatHq6Currency(totals.grandTotal, "NGN")}
            </div>
            <div className="w-[7.5rem] shrink-0 px-2 py-2 text-right tabular-nums">
              {formatHq6Currency(totals.paymentDue, "NGN")}
            </div>
          </div>
        ) : null
      }
      pagination={{
        pageIndex,
        pageSize,
        itemCount: purchases.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isPaging,
        isSearching,
      }}
      modals={
        <>
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
              // Do not invalidate list caches here — Pay modal already patched
              // the row. A refetch can race server list cache and flip Paid → Due.
              void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
              if (payTarget) {
                void queryClient.invalidateQueries({
                  queryKey: modalKeys.purchaseView(tenantId, payTarget.id),
                });
                void queryClient.invalidateQueries({
                  queryKey: modalKeys.purchasePayments(tenantId, payTarget.id),
                });
              }
            }}
          />
          <Hq6UpdatePurchaseStatusModal
            open={Boolean(statusTarget)}
            purchase={statusTarget}
            onClose={() => setStatusTarget(null)}
            onUpdated={() => {
              void queryClient.invalidateQueries({
                queryKey: ["stock-movements"],
              });
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
                    supplierName: paymentsTarget.supplierOrDest || undefined,
                    businessName: config?.name ?? undefined,
                    businessLocation: businessLocationName(
                      paymentsTarget.locationCode ?? null,
                      config?.businessLocations,
                    ),
                    businessMobile:
                      typeof config?.businessSettings?.business?.mobile ===
                      "string"
                        ? config.businessSettings.business.mobile
                        : typeof config?.businessSettings?.business?.phone ===
                            "string"
                          ? config.businessSettings.business.phone
                          : null,
                    businessEmail:
                      typeof config?.businessSettings?.business?.email ===
                      "string"
                        ? config.businessSettings.business.email
                        : null,
                    invoiceNo: paymentsTarget.reference,
                    date: paymentsTarget.date,
                    paymentStatus: paymentsTarget.paymentStatus,
                    purchaseStatus: paymentsTarget.status,
                    remainingDue: paymentsTarget.paymentDue,
                  }
                : null
            }
            onClose={() => setPaymentsTarget(null)}
            onAddPayment={
              paymentsTarget &&
              canAddPaymentForStatus(
                paymentsTarget.paymentStatus,
                paymentsTarget.paymentDue,
              )
                ? () => {
                    const purchase = paymentsTarget;
                    if (tenantId) {
                      prefetchPaymentAccountsRef(queryClient, tenantId);
                    }
                    setPaymentsTarget(null);
                    setPayTarget(purchase);
                  }
                : undefined
            }
          />
          <Hq6ConfirmModal
            open={Boolean(deleteTarget)}
            onClose={() => {
              if (!deleting) setDeleteTarget(null);
            }}
            confirming={deleting}
            onConfirm={() => {
              if (!tenantId || !deleteTarget || deleting) return;
              setDeleting(true);
              void deleteStockMovement(tenantId, deleteTarget.id)
                .then(async () => {
                  toast.success(`Deleted purchase ${deleteTarget.reference}`);
                  setDeleteTarget(null);
                  void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
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
        </>
      }
    >
      <DataTable
        data={purchases}
        columns={effectiveColumns}
        displayMode="table"
        embedded
        disablePagination
        stickyFirstColumn
        density={chrome.density}
        onDensityChange={chrome.setDensity}
        showDensityControl={false}
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Could not load purchases." : null}
        onRowClick={(row) => openRecord(row.id, row)}
        emptyState={{ message: "No data available in table" }}
        serverSort={serverSortProps({ sort, setSort })}
      />
    </Hq6StandardListShell>
  );
}
