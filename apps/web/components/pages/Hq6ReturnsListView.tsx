"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SaleReturnRow } from "@/lib/types/entityRows";
import type { Sale, SaleReturnStatus } from "@vonos/types";
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
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { prefetchSaleListModals } from "@/lib/query/prefetchListModals";
import { saleSeedFromReturnRow } from "@/lib/utils/listModalSeeds";
import { formatHq6Currency, formatHq6DateTime } from "@/lib/utils/hq6Format";
import { useListExport } from "@/lib/hooks/useListExport";

/** HQ6 Sell Return list — ui-audit/32_sell-return/screenshot.png */
export function Hq6ReturnsListView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { recordId, recordSeed, openRecord, closeRecord } = useListRecordModal<Sale>({
    onPrefetchRecord: (id) => {
      if (!tenantId) return;
      prefetchSaleListModals(queryClient, tenantId, id);
    },
  });
  const { config } = useRouteTenant();
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({ defaultDateRange: "all_time" });
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [localSearch, setLocalSearch] = useState(search);
  const chrome = useHq6ListChrome("returns");

  const customersQuery = useQuery({
    queryKey: ["customers", tenantId, "return-filter"],
    queryFn: () => getCustomers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const apiFilters = useMemo(
    () => ({
      search: (search).trim() || undefined,
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
    isPaging,
    error,
    goToPage,
    canSelectPage,
    totalCount,
  } = useServerListPage<SaleReturnRow>({
    queryKey: ["returns", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: search,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) => getReturnsPage(tenantId!, { ...apiFilters, includeSummary: opts?.includeSummary }, cursor, limit),
  });

  const commitSearch = useCallback(() => setSearch(localSearch), [localSearch, setSearch]);

  const exportList = useListExport();
  const handleExport = useCallback(() => {
    exportList(
      "sell-returns",
      [
        { key: "date", header: "Date" },
        { key: "reference", header: "Invoice No." },
        { key: "saleReference", header: "Parent Sale" },
        { key: "customerName", header: "Customer name" },
        { key: "location", header: "Location" },
        { key: "paymentStatus", header: "Payment Status" },
        { key: "amount", header: "Total amount" },
        { key: "paymentDue", header: "Payment due" },
      ],
      returns.map((r) => ({
        date: formatHq6DateTime(r.date),
        reference: r.reference,
        saleReference: r.saleReference ?? "",
        customerName: r.customerName,
        location: "",
        paymentStatus: r.status,
        amount: formatHq6Currency(r.amount),
        paymentDue: formatHq6Currency(0),
      })),
    );
  }, [exportList, returns]);

  const columns: ColumnConfig<SaleReturnRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortValue: (r) => new Date(r.date).getTime(),
        render: (r) => formatHq6DateTime(r.date),
      },
      {
        key: "reference",
        header: "Invoice No.",
        render: (r) => <span className="font-medium">{r.reference}</span>,
      },
      { key: "saleReference", header: "Parent Sale" },
      { key: "customerName", header: "Customer name" },
      {
        key: "location",
        header: "Location",
        sortable: false,
        render: () => "",
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        sortable: false,
        render: (r) => (
          <StatusPill status={r.status} vocabulary="saleReturnStatus" />
        ),
      },
      {
        key: "amount",
        header: "Total amount",
        sortValue: (r) => r.amount,
        render: (r) => formatHq6Currency(r.amount),
      },
      {
        key: "paymentDue",
        header: "Payment due",
        sortable: false,
        render: () => formatHq6Currency(0),
      },
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
                onClick: () => openRecord(row.id, saleSeedFromReturnRow(row)),
              },
              {
                id: "print",
                label: "Print",
                onClick: () => {
                  openRecord(row.id, saleSeedFromReturnRow(row));
                  window.setTimeout(() => window.print(), 400);
                },
              },
            ]}
          />
        ),
      },
    ],
    [openRecord],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: String(c.key), label: String(c.header) }));

  const filters = (
    <Hq6FilterGrid>
      <Hq6FilterDateRange
        value={dateRange}
        onChange={setDateRange}
        customValue={customDateRange}
        onCustomChange={setCustomDateRange}
      />
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
      title="Sell Return"
      tabLabel="Sell Return"
      boxTitle="Sell Return"
      filters={filters}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={commitSearch}
      hidePrimaryAction
      onExport={handleExport}
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
        isBusy: isPaging,
      }}
      modals={
        <SaleRecordModal
          saleId={recordId}
          initialSale={recordSeed}
          listSlug="returns"
          onClose={closeRecord}
        />
      }
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
        onRowClick={(row) => openRecord(row.id, saleSeedFromReturnRow(row))}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
