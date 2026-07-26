"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Trash2 } from "lucide-react";
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
import {
  deleteStockMovement,
  getAllStockMovements,
  getStockMovementsPage,
  type StockMovementListRow,
} from "@/lib/api/stockMovements";
import { getSuppliers } from "@/lib/api/suppliers";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { toast } from "@/stores/toastStore";

/** Exact UPOS purchase_order/index — Action · Date · Reference No · Location · Supplier · Status · Quantity Remaining · Shipping Status · Added By */
export function Hq6PurchaseOrdersListView() {
  const tenantId = useTenantId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantCode, config } = useRouteTenant();
  const chrome = useHq6ListChrome("purchase-orders");
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
  const [localSearch, setLocalSearch] = useState(search);
  const [locationFilter, setLocationFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StockMovementListRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", tenantId, "po-filter"],
    queryFn: () => getSuppliers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const apiFilters = useMemo(
    () => ({
      type: "inbound" as const,
      search: search.trim() || undefined,
      locationCode: locationFilter || undefined,
      supplierId: supplierFilter || undefined,
      status: (statusFilter || undefined) as
        | "Ordered"
        | "Pending"
        | "Approved"
        | "Received"
        | "Shipped"
        | "Delivered"
        | undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [
      bounds?.from,
      bounds?.to,
      locationFilter,
      search,
      statusFilter,
      supplierFilter,
    ],
  );

  const {
    items,
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
  } = useServerListPage<StockMovementListRow>({
    queryKey: ["purchase-orders", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getStockMovementsPage(
        tenantId!,
        {
          ...apiFilters,
          includeSummary: opts?.includeSummary,
        },
        cursor,
        limit,
      ),
  });

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
                icon: <Eye size={15} strokeWidth={1.75} />,
                onClick: () =>
                  router.push(`/${tenantCode}/inbound/${row.id}`),
              },
              {
                id: "edit",
                label: "Edit",
                icon: <Pencil size={15} strokeWidth={1.75} />,
                onClick: () =>
                  router.push(`/${tenantCode}/add-purchase?edit=${row.id}`),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                icon: <Trash2 size={15} strokeWidth={1.75} />,
                onClick: () => setDeleteTarget(row),
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
        key: "location",
        header: "Location",
        sortable: false,
        render: (row) =>
          row.locationName ||
          businessLocationName(row.locationCode, config?.businessLocations) ||
          "—",
      },
      {
        key: "supplier",
        header: "Supplier",
        render: (row) => row.supplierOrDest || "—",
      },
      {
        key: "status",
        header: "Status",
        render: (row) => row.status,
      },
      {
        key: "qtyRemaining",
        header: "Quantity Remaining",
        numeric: true,
        sortable: false,
        render: (row) => row.itemCount,
      },
      {
        key: "shippingStatus",
        header: "Shipping Status",
        sortable: false,
        render: () => "",
      },
      {
        key: "addedBy",
        header: "Added By",
        sortable: false,
        render: (row) => row.createdByName ?? "",
      },
    ],
    [config?.businessLocations, router, tenantCode],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllStockMovements(tenantId, apiFilters);
    exportList(
      "purchase-orders",
      [
        { key: "date", header: "Date" },
        { key: "reference", header: "Reference No" },
        { key: "location", header: "Location" },
        { key: "supplier", header: "Supplier" },
        { key: "status", header: "Status" },
        { key: "qtyRemaining", header: "Quantity Remaining" },
        { key: "addedBy", header: "Added By" },
      ],
      rows.map((row) => ({
        date: row.date,
        reference: row.reference,
        location:
          row.locationName ||
          businessLocationName(row.locationCode, config?.businessLocations) ||
          "—",
        supplier: row.supplierOrDest,
        status: row.status,
        qtyRemaining: row.itemCount,
        addedBy: row.createdByName ?? "",
      })),
      "Export Purchase Orders",
    );
  };

  return (
    <Hq6StandardListShell
      slug="purchase-orders"
      title="Purchase Order"
      tabLabel="All purchase orders"
      onAdd={() => router.push(`/${tenantCode}/add-purchase`)}
      onExport={() => void handleExport()}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={() => setSearch(localSearch)}
      filters={
        <Hq6FilterGrid>
          <Hq6FilterDateRange
            value={dateRange}
            onChange={setDateRange}
            customValue={customDateRange}
            onCustomChange={setCustomDateRange}
          />
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
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "All" },
              { value: "Ordered", label: "Ordered" },
              { value: "Pending", label: "Pending" },
              { value: "Received", label: "Received" },
              { value: "Delivered", label: "Delivered" },
            ]}
          />
        </Hq6FilterGrid>
      }
      pagination={{
        pageIndex,
        pageSize,
        itemCount: items.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isPaging,
      }}
      modals={
        <Hq6ConfirmModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!tenantId || !deleteTarget) return;
            setDeleting(true);
            try {
              await deleteStockMovement(tenantId, deleteTarget.id);
              toast.success("Purchase order deleted");
              setDeleteTarget(null);
              await queryClient.invalidateQueries({
                queryKey: ["purchase-orders"],
              });
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Delete failed",
              );
            } finally {
              setDeleting(false);
            }
          }}
          title="Delete Purchase Order"
          message={`Delete “${deleteTarget?.reference ?? ""}”?`}
          confirmLabel="Delete"
          confirming={deleting}
          danger
        />
      }
    >
      <DataTable
        data={items}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load purchase orders" : null}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}

/** Exact UPOS purchase_return/index — Date · Reference No · Parent Purchase · Location · Supplier · Payment Status · Grand Total · Payment due · Action */
export function Hq6PurchaseReturnsListView() {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const chrome = useHq6ListChrome("purchase-returns");
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
  const [localSearch, setLocalSearch] = useState(search);

  const apiFilters = useMemo(
    () => ({
      type: "outbound" as const,
      source: "purchase_return" as const,
      search: search.trim() || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to, search],
  );

  const {
    items,
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
  } = useServerListPage<StockMovementListRow>({
    queryKey: ["purchase-returns", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getStockMovementsPage(
        tenantId!,
        {
          ...apiFilters,
          includeSummary: opts?.includeSummary,
        },
        cursor,
        limit,
      ),
  });

  const columns: ColumnConfig<StockMovementListRow>[] = useMemo(
    () => [
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
        key: "parentPurchase",
        header: "Parent Purchase",
        sortable: false,
        render: () => "",
      },
      {
        key: "location",
        header: "Location",
        sortable: false,
        render: (row) =>
          row.locationName ||
          businessLocationName(row.locationCode, config?.businessLocations) ||
          "—",
      },
      {
        key: "supplier",
        header: "Supplier",
        render: (row) => row.supplierOrDest || "—",
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (row) => row.paymentStatus ?? "",
      },
      {
        key: "grandTotal",
        header: "Grand Total",
        numeric: true,
        sortValue: (row) => row.grandTotal ?? 0,
        render: (row) => formatHq6Currency(row.grandTotal ?? 0),
      },
      {
        key: "paymentDue",
        header: "Payment due",
        numeric: true,
        sortValue: (row) => row.paymentDue ?? 0,
        render: (row) => formatHq6Currency(row.paymentDue ?? 0),
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: () => (
          <Hq6ActionsMenu
            items={[{ id: "view", label: "View", onClick: () => undefined }]}
          />
        ),
      },
    ],
    [config?.businessLocations],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllStockMovements(tenantId, apiFilters);
    exportList(
      "purchase-returns",
      [
        { key: "date", header: "Date" },
        { key: "reference", header: "Reference No" },
        { key: "location", header: "Location" },
        { key: "supplier", header: "Supplier" },
        { key: "paymentStatus", header: "Payment Status" },
        { key: "grandTotal", header: "Grand Total" },
        { key: "paymentDue", header: "Payment due" },
      ],
      rows.map((row) => ({
        date: row.date,
        reference: row.reference,
        location:
          row.locationName ||
          businessLocationName(row.locationCode, config?.businessLocations) ||
          "—",
        supplier: row.supplierOrDest,
        paymentStatus: row.paymentStatus ?? "",
        grandTotal: row.grandTotal ?? 0,
        paymentDue: row.paymentDue ?? 0,
      })),
      "Export Purchase Returns",
    );
  };

  return (
    <Hq6StandardListShell
      slug="purchase-returns"
      title="Purchase Return"
      tabLabel="All purchase returns"
      hidePrimaryAction
      onExport={() => void handleExport()}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={() => setSearch(localSearch)}
      filters={
        <Hq6FilterGrid>
          <Hq6FilterDateRange
            value={dateRange}
            onChange={setDateRange}
            customValue={customDateRange}
            onCustomChange={setCustomDateRange}
          />
        </Hq6FilterGrid>
      }
      pagination={{
        pageIndex,
        pageSize,
        itemCount: items.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isPaging,
      }}
    >
      <DataTable
        data={items}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load purchase returns" : null}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
