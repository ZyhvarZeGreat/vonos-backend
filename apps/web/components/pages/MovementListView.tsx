"use client";

import { useMemo, useState } from "react";
import type { MovementSource, MovementStatus } from "@vonos/types";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  getAllStockMovements,
  getStockMovementsPage,
  type StockMovementListRow,
} from "@/lib/api/stockMovements";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListExport } from "@/lib/hooks/useListExport";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";

interface MovementListViewProps {
  type: "inbound" | "outbound";
  title?: string;
  defaultStatus?: MovementStatus;
  source?: MovementSource;
}

export function MovementListView({
  type,
  title,
  defaultStatus,
  source,
}: MovementListViewProps) {
  const { goToDetail } = useRecordNavigation(type);
  const { tenantCode } = useRouteTenant();
  const tenantId = useTenantId();
  const exportList = useListExport();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [activeTab, setActiveTab] = useState(defaultStatus === "Pending" ? "pending" : "all");
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      type,
      ...(defaultStatus ? { status: defaultStatus } : {}),
      ...(source ? { source } : {}),
    }),
    [defaultStatus, source, type],
  );

  const {
    items: data,
    hasMore,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,
    error,
  } = useServerListPage<StockMovementListRow>({
    queryKey: ["stock-movements", tenantId, type, source, defaultStatus],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) =>
      getStockMovementsPage(tenantId!, apiFilters, cursor, limit),
  });

  const columns: ColumnConfig<StockMovementListRow>[] = useMemo(() => {
    const base: ColumnConfig<StockMovementListRow>[] = [
      { key: "reference", header: "Reference", render: (r) => <span className="font-medium">{r.reference}</span> },
      { key: "date", header: "Date", sortValue: (r) => new Date(r.date).getTime() },
      { key: "supplierOrDest", header: type === "inbound" ? "Supplier" : "Destination" },
    ];
    if (type === "inbound") {
      return [
        ...base,
        { key: "locationName", header: "Location", render: (r) => r.locationName ?? "—" },
        {
          key: "status",
          header: "Status",
          render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
        },
        {
          key: "paymentStatus",
          header: "Payment Status",
          render: (r) => <StatusPill status={r.paymentStatus ?? "due"} vocabulary="movementStatus" />,
        },
        {
          key: "grandTotal",
          header: "Grand Total",
          sortValue: (r) => r.grandTotal ?? 0,
          render: (r) => formatCurrency(r.grandTotal ?? 0, "NGN"),
        },
        {
          key: "paymentDue",
          header: "Payment due",
          sortValue: (r) => r.paymentDue ?? 0,
          render: (r) => formatCurrency(r.paymentDue ?? 0, "NGN"),
        },
        { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
      ];
    }
    return [
      ...base,
      { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
      {
        key: "status",
        header: "Status",
        render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
      },
    ];
  }, [type]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(data, "status"),
    [data],
  );

  const filtered = useMemo(() => {
    let rows = filterByDateField(data, bounds, "date");
    if (activeTab === "pending") {
      rows = rows.filter((r) => r.status === "Pending");
    } else if (activeTab === "completed") {
      rows = rows.filter((r) =>
        ["Received", "Shipped", "Delivered", "Approved"].includes(r.status),
      );
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return filterBySearch(rows, search, ["reference", "supplierOrDest"]);
  }, [activeTab, bounds, data, search, statusFilter]);

  return (
    <ListPageShell
      tabs={[
        { id: "all", label: "All" },
        { id: "pending", label: "Pending" },
        { id: "completed", label: "Completed" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Search ${title ?? type}...`}
      primaryAction={
        type === "inbound" && tenantCode ? (
          <a
            href={`/${tenantCode}/add-purchase`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Add Purchase
          </a>
        ) : undefined
      }
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={[
        {
          id: "status",
          label: "Status",
          options: [{ value: "", label: "All statuses" }, ...statusOptions],
          value: statusFilter,
          onChange: setStatusFilter,
        },
      ]}
      onExport={async () => {
        if (!tenantId) return;
        const rows = await getAllStockMovements(tenantId, apiFilters);
        exportList(
          `${title ?? type}.csv`,
          [
            { key: "reference", header: "Reference" },
            { key: "supplierOrDest", header: "Party" },
            { key: "itemCount", header: "Items" },
            { key: "status", header: "Status" },
            { key: "date", header: "Date" },
          ],
          rows.map((row) => ({
            reference: row.reference,
            supplierOrDest: row.supplierOrDest,
            itemCount: row.itemCount,
            status: row.status,
            date: row.date,
          })),
        );
      }}
    >
      <ServerPaginatedTable
        items={filtered}
        columns={columns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        error={error ? "Failed to load movements" : null}
        onRowClick={(row) => goToDetail(row.id)}
        emptyState={{ message: `No ${title?.toLowerCase() ?? type} records yet.` }}
      />
    </ListPageShell>
  );
}

export function PurchaseOrdersView() {
  return <MovementListView type="inbound" title="Purchase Orders" />;
}

export function PurchaseReturnsView() {
  return (
    <MovementListView type="outbound" title="Purchase Returns" source="purchase_return" />
  );
}
