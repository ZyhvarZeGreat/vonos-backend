"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SaleReturnRow } from "@/lib/types/entityRows";
import type { SaleReturnStatus } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { SaleRecordModal } from "@/components/organisms/SaleRecordModal";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { getCustomers } from "@/lib/api/customers";
import { getReturnsPage } from "@/lib/api/returns";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

/** HQ6 Sell Return list — ui-audit/32_sell-return/screenshot.png */
export function Hq6ReturnsListView() {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [localSearch, setLocalSearch] = useState(search);
  const chrome = useHq6ListChrome();

  const customersQuery = useQuery({
    queryKey: ["customers", tenantId, "return-filter"],
    queryFn: () => getCustomers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const apiFilters = useMemo(
    () => ({
      search: (localSearch || search).trim() || undefined,
      status: (statusFilter || undefined) as SaleReturnStatus | undefined,
      locationCode: locationFilter || undefined,
      customerId: customerFilter || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [
      bounds?.from,
      bounds?.to,
      customerFilter,
      localSearch,
      locationFilter,
      search,
      statusFilter,
    ],
  );

  const {
    items: returns,
    hasMore,
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
    totalCount,
  } = useServerListPage<SaleReturnRow>({
    queryKey: ["returns", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: localSearch || search,
    fetchPage: (cursor, limit) => getReturnsPage(tenantId!, apiFilters, cursor, limit),
  });

  const commitSearch = useCallback(() => setSearch(localSearch), [localSearch, setSearch]);

  const columns: ColumnConfig<SaleReturnRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              { id: "view", label: "View", onClick: () => openRecord(row.id) },
              {
                id: "print",
                label: "Print",
                onClick: () => {
                  openRecord(row.id);
                  window.setTimeout(() => window.print(), 400);
                },
              },
            ]}
          />
        ),
      },
      {
        key: "reference",
        header: "Return #",
        render: (r) => <span className="font-medium">{r.reference}</span>,
      },
      { key: "saleReference", header: "Original Sale" },
      { key: "customerName", header: "Customer" },
      {
        key: "amount",
        header: "Amount",
        sortValue: (r) => r.amount,
        render: (r) => formatCurrency(r.amount, "NGN"),
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <StatusPill status={r.status} vocabulary="saleReturnStatus" />,
      },
      {
        key: "date",
        header: "Date",
        sortValue: (r) => new Date(r.date).getTime(),
        render: (r) => formatDate(r.date),
      },
    ],
    [openRecord],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: String(c.key), label: String(c.header) }));

  const filters = (
    <Hq6FilterGrid>
      <Hq6FilterDateRange value={dateRange} onChange={setDateRange} />
      <Hq6FilterSelect
        label="Status"
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: "", label: "All" },
          { value: "Refunded", label: "Refunded" },
          { value: "Restocked", label: "Restocked" },
          { value: "Written Off", label: "Written Off" },
        ]}
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
        label="Customer"
        value={customerFilter}
        onChange={setCustomerFilter}
        emptyLabel="All"
        options={(customersQuery.data ?? []).map((c) => ({
          value: c.id,
          label: c.businessName || c.name,
        }))}
      />
    </Hq6FilterGrid>
  );

  return (
    <Hq6StandardListShell
      slug="returns"
      tabLabel="All sell returns"
      filters={filters}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={commitSearch}
      pagination={{
        pageIndex,
        pageSize,
        itemCount: returns.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isFetching && !isLoading,
      }}
      modals={<SaleRecordModal saleId={recordId} listSlug="returns" onClose={closeRecord} />}
    >
      <DataTable
        data={returns}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load returns." : null}
        onRowClick={(row) => openRecord(row.id)}
        emptyState={{ message: "No sell returns found." }}
      />
    </Hq6StandardListShell>
  );
}
