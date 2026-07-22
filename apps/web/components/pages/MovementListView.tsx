"use client";

import { useMemo, useState } from "react";
import type { MovementSource, MovementStatus } from "@vonos/types";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  getAllStockMovements,
  getStockMovementsPage,
  type StockMovementListRow,
} from "@/lib/api/stockMovements";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { MovementRecordModal } from "@/components/organisms/MovementRecordModal";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListExport } from "@/lib/hooks/useListExport";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6PurchasesListView } from "@/components/pages/Hq6PurchasesListView";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import { movementListCursor } from "@/lib/utils/pagination";

interface MovementListViewProps {
  type: "inbound" | "outbound";
  title?: string;
  defaultStatus?: MovementStatus;
  source?: MovementSource;
}

export function MovementListView(props: MovementListViewProps) {
  const isHq6 = useIsVaHq6();
  if (
    isHq6 &&
    props.type === "inbound" &&
    !props.source &&
    !props.defaultStatus
  ) {
    return <Hq6PurchasesListView />;
  }
  return <MovementListViewBody {...props} />;
}

function MovementListViewBody({
  type,
  title,
  defaultStatus,
  source,
}: MovementListViewProps) {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const { tenantCode } = useRouteTenant();
  const tenantId = useTenantId();
  const isHq6 = useIsVaHq6();
  const exportList = useListExport();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters({
    defaultDateRange: "all_time",
  });
  const [activeTab, setActiveTab] = useState(defaultStatus === "Pending" ? "pending" : "all");
  const [statusFilter, setStatusFilter] = useState("");
  const tabStatus = useMemo((): MovementStatus | undefined => {
    if (defaultStatus) return defaultStatus;
    if (statusFilter) return statusFilter as MovementStatus;
    if (activeTab === "pending") return "Pending";
    return undefined;
  }, [activeTab, defaultStatus, statusFilter]);

  const apiFilters = useMemo(
    () => ({
      type,
      ...(tabStatus ? { status: tabStatus } : {}),
      ...(source ? { source } : {}),
      search: search.trim() || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to, search, source, tabStatus, type],
  );

  const {
    items: data,
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
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<StockMovementListRow>({
    queryKey: ["stock-movements", tenantId, type, source, defaultStatus],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) =>
      getStockMovementsPage(tenantId!, apiFilters, cursor, limit),
    getCursor: (row) => movementListCursor(row),
  });

  const columns: ColumnConfig<StockMovementListRow>[] = useMemo(() => {
    const actionsCol: ColumnConfig<StockMovementListRow> | null = isHq6
      ? {
          key: "actions",
          header: "Action",
          sortable: false,
          render: (row) => (
            <Hq6ActionsMenu
              items={[
                { id: "view", label: "View", onClick: () => openRecord(row.id) },
                ...(type === "inbound"
                  ? [
                      {
                        id: "edit",
                        label: "Edit",
                        onClick: () => {
                          if (!tenantCode) return;
                          window.location.href = `/${tenantCode}/add-purchase?edit=${row.id}`;
                        },
                      },
                    ]
                  : []),
              ]}
            />
          ),
        }
      : null;

    const base: ColumnConfig<StockMovementListRow>[] = [
      { key: "reference", header: "Reference", render: (r) => <span className="font-medium">{r.reference}</span> },
      { key: "date", header: "Date", sortValue: (r) => new Date(r.date).getTime(), render: (r) => formatDate(r.date) },
      { key: "supplierOrDest", header: type === "inbound" ? "Supplier" : "Destination" },
    ];
    if (type === "inbound") {
      return [
        ...(actionsCol ? [actionsCol] : []),
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
      ...(actionsCol ? [actionsCol] : []),
      ...base,
      { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
      {
        key: "status",
        header: "Status",
        render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
      },
    ];
  }, [isHq6, openRecord, tenantCode, type]);
  const statusOptions = useMemo(
    () => uniqueFieldOptions(data, "status"),
    [data],
  );

  // Completed tab spans multiple statuses — keep that filter client-side on the page.
  const filtered = useMemo(() => {
    if (activeTab !== "completed" || defaultStatus || statusFilter) return data;
    return data.filter((r) =>
      ["Received", "Shipped", "Delivered", "Approved"].includes(r.status),
    );
  }, [activeTab, data, defaultStatus, statusFilter]);

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
        onPageSelect={goToPage}
        canSelectPage={canSelectPage}
        totalCount={totalCount}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error ? "Failed to load movements" : null}
        onRowClick={(row) => openRecord(row.id)}
        emptyState={{ message: `No ${title?.toLowerCase() ?? type} records yet.` }}
      />
      <MovementRecordModal
        movementId={recordId}
        listSlug={type}
        onClose={closeRecord}
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
