"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SaleReturnRow } from "@/lib/types/entityRows";
import type { Sale, SaleReturnStatus } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { SaleRecordModal } from "@/components/organisms/SaleRecordModal";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  Hq6PrintInvoiceModal,
  type Hq6PrintDocKind,
} from "@/components/hq6/Hq6PrintInvoiceModal";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { getCustomersForPicker, loadMoreCustomersForPicker, customersPickerHasMore } from "@/lib/api/customers";
import { getReturnsPage } from "@/lib/api/returns";
import { useServerListPage, withListSort } from "@/lib/hooks/useServerListPage";
import { chronoListCursor } from "@/lib/utils/pagination";

import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { entitySaleLocations } from "@/lib/hooks/useBusinessLocationOptions";
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
  } = useListPageFilters({
    defaultDateRange: "last_7_days",
    isolateDateRange: true,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [printDoc, setPrintDoc] = useState<{
    sale: Sale;
    kind: Hq6PrintDocKind;
  } | null>(null);
  const chrome = useHq6ListChrome("returns");

  const customerLabelById = useRef(new Map<string, string>());
  const [customerLabel, setCustomerLabel] = useState("");
  const loadCustomerOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getCustomersForPicker(tenantId, query || undefined);
      for (const row of rows) {
        customerLabelById.current.set(row.id, row.businessName || row.name);
      }
      return {
        options: rows.map((c) => ({
          value: c.id,
          label: c.businessName || c.name,
        })),
        hasMore: !query.trim() && customersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreCustomerOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreCustomersForPicker(tenantId);
    for (const row of page.appended) {
      customerLabelById.current.set(row.id, row.businessName || row.name);
    }
    return {
      options: page.appended.map((c) => ({
        value: c.id,
        label: c.businessName || c.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const apiFilters = useMemo(
    () => ({
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
    isSearching,
    error,
    goToPage,
    canSelectPage,
    totalCount,
  } = useServerListPage<SaleReturnRow>({
    queryKey: ["returns", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: search,
    searchMode: "hybrid",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, listSort, opts) =>
      getReturnsPage(
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
    getCursor: (row) => chronoListCursor(row),
  });

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
        render: (row) => {
          const seed = saleSeedFromReturnRow(row);
          return (
            <Hq6ActionsMenu
              items={[
                {
                  id: "view",
                  label: "View",
                  onClick: () => openRecord(row.id, seed),
                },
                {
                  id: "print",
                  label: "Print Invoice",
                  onClick: () => setPrintDoc({ sale: seed, kind: "invoice" }),
                },
                {
                  id: "packing_slip",
                  label: "Packing Slip",
                  onClick: () =>
                    setPrintDoc({ sale: seed, kind: "packing_slip" }),
                },
                {
                  id: "delivery_note",
                  label: "Delivery Note",
                  onClick: () =>
                    setPrintDoc({ sale: seed, kind: "delivery_note" }),
                },
              ]}
            />
          );
        },
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
        emptyLabel="All locations"
        options={entitySaleLocations(config).map((loc) => ({
          value: loc.code,
          label: loc.name,
        }))}
      />
      <Hq6FilterSelect
        label="Customer"
        value={customerFilter}
        selectedLabel={customerLabel}
        onChange={(id) => {
          setCustomerFilter(id);
          setCustomerLabel(id ? customerLabelById.current.get(id) ?? "" : "");
        }}
        emptyLabel="All"
        loadOptions={loadCustomerOptions}
        loadMoreOptions={loadMoreCustomerOptions}
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
      searchValue={search}
      onSearchChange={setSearch}
      
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
        isSearching,
      }}
      modals={
        <>
          <SaleRecordModal
            saleId={recordId}
            initialSale={recordSeed}
            listSlug="returns"
            onClose={closeRecord}
          />
          <Hq6PrintInvoiceModal
            open={Boolean(printDoc)}
            saleId={printDoc?.sale.id ?? null}
            initialSale={printDoc?.sale ?? null}
            kind={printDoc?.kind ?? "invoice"}
            onClose={() => setPrintDoc(null)}
          />
        </>
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
