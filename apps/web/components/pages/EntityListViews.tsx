"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import { StatusPill } from "@/components/atoms/StatusPill";
import { InlinePriceCell } from "@/components/molecules/InlinePriceCell";
import { ProductItemSearch } from "@/components/molecules/ProductItemSearch";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  isProductMetaSection,
  ProductMetaPanel,
  PRODUCT_SECTION_TABS,
  sectionFromParams,
  type ProductSectionId,
} from "@/components/organisms/ProductMetaPanel";
import { getCustomersPage, getCustomerLedger, getCustomerSummary, importCustomers } from "@/lib/api/customers";
import { getCatalogPage } from "@/lib/api/catalog";
import { getSalesPage } from "@/lib/api/sales";
import { getOrdersPage } from "@/lib/api/orders";
import { getReturnsPage } from "@/lib/api/returns";
import { getAllRequisitions, getAllIncomingRequisitions, getIncomingRequisitionsPage, getRequisitionsPage } from "@/lib/api/requisitions";
import { getAllSalonServices, getSalonServicesPage } from "@/lib/api/salonServices";
import { getAllVehicles, createVehicle, getVehiclesPage } from "@/lib/api/vehicles";
import { getItemsPage } from "@/lib/api/items";
import { useListExport } from "@/lib/hooks/useListExport";
import type { Order, MenuItemRow, SaleReturnRow } from "@/lib/types/entityRows";
import type { Customer, Item, Requisition, Sale, SaleReturnStatus, SaleStatus, SalonService, StockStatus, Vehicle } from "@vonos/types";
import { ContactLedgerModal, useContactLedgerQuery } from "@/components/organisms/ContactLedgerModal";
import { CustomerRecordModal } from "@/components/organisms/CustomerRecordModal";
import { SaleRecordModal } from "@/components/organisms/SaleRecordModal";
import { RequisitionRecordModal } from "@/components/organisms/RequisitionRecordModal";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import {
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import { ItemLocationCell } from "@/components/molecules/ItemLocationCell";
import { itemMatchesLocationFilter, locationFilterOptions } from "@/lib/utils/locationLabels";
import { useUiStore } from "@/stores/uiStore";
import { useTenantStore } from "@/stores/tenantStore";

interface SalesListViewProps {
  saleStatus?: SaleStatus;
  shipmentsOnly?: boolean;
  tabLabel?: string;
  hidePrimaryAction?: boolean;
}

export function SalesListView({
  saleStatus,
  shipmentsOnly,
  tabLabel = "All Sales",
  hidePrimaryAction = false,
}: SalesListViewProps = {}) {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const tenantId = useTenantId();
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);
  const exportList = useListExport();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      saleStatus,
      shipmentsOnly,
      status: (statusFilter || undefined) as SaleReturnStatus | undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to, search, saleStatus, shipmentsOnly, statusFilter],
  );

  const {
    items: sales,
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
  } = useServerListPage({
    queryKey: ["sales", tenantId, saleStatus ?? "all"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getSalesPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = sales;

  const statusOptions = useMemo(
    () =>
      (["Completed", "Refunded", "Restocked", "Written Off"] as const).map(
        (value) => ({ value, label: value }),
      ),
    [],
  );

  const columns: ColumnConfig<Sale>[] = [
    { key: "reference", header: "Sale #", render: (r) => <span className="font-medium">{r.reference}</span> },
    {
      key: "jobReference",
      header: "Job",
      render: (r) =>
        r.jobReference ? (
          <span className="font-medium text-[var(--color-brand-primary)]">{r.jobReference}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "customerName", header: "Customer" },
    { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
    {
      key: "total",
      header: "Total",
      sortValue: (r) => r.total,
      render: (r) => formatCurrency(r.total, r.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const label =
          r.recordStatus === "draft"
            ? "Draft"
            : r.recordStatus === "quotation"
              ? "Quotation"
              : r.status;
        return <StatusPill status={label} vocabulary="saleReturnStatus" />;
      },
    },
    { key: "date", header: "Date", sortValue: (r) => new Date(r.date).getTime() },
  ];
  return (
    <ListPageShell
      tabs={[{ id: "all", label: tabLabel }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={
        saleStatus
          ? undefined
          : [
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
            ]
      }
      onExport={() =>
        exportList(
          saleStatus ? `${saleStatus}-sales` : "sales",
          [
            { key: "reference", header: "Sale #" },
            { key: "customerName", header: "Customer" },
            { key: "itemCount", header: "Items" },
            { key: "total", header: "Total" },
            { key: "status", header: "Status" },
            { key: "date", header: "Date" },
          ],
          filtered.map((row) => ({
            reference: row.reference,
            customerName: row.customerName,
            itemCount: row.itemCount,
            total: row.total,
            status: row.status,
            date: row.date,
          })),
          `Export ${tabLabel} Spreadsheet`,
        )
      }
      primaryAction={
        hidePrimaryAction ? undefined : (
          <Button size="sm" onClick={() => openAddSaleModal()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Sale
          </Button>
        )
      }
    >
      <div className="p-4 pt-0">
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
          isFetching={isFetching}
          error={error ? "Failed to load sales" : null}
          onRowClick={(row) => openRecord(row.id)}
        />
      </div>
      <SaleRecordModal saleId={recordId} listSlug="sales" onClose={closeRecord} />
    </ListPageShell>
  );
}

export function DraftsListView() {
  return (
    <SalesListView saleStatus="draft" tabLabel="All Drafts" hidePrimaryAction />
  );
}

export function QuotationsListView() {
  return (
    <SalesListView saleStatus="quotation" tabLabel="All Quotations" hidePrimaryAction />
  );
}

export function OrdersListView() {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to, search],
  );

  const {
    items: orders,
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
  } = useServerListPage<Order>({
    queryKey: ["orders", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getOrdersPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    if (!statusFilter) return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const statusOptions = useMemo(
    () =>
      (["New", "Preparing", "Ready", "Served"] as const).map((value) => ({
        value,
        label: value,
      })),
    [],
  );

  const columns: ColumnConfig<Order>[] = [
    { key: "reference", header: "Order #", render: (r) => <span className="font-medium">{r.reference}</span> },
    { key: "tableNumber", header: "Table", render: (r) => r.tableNumber ?? "Takeaway" },
    { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
    {
      key: "total",
      header: "Total",
      sortValue: (r) => r.total,
      render: (r) => formatCurrency(r.total, r.currency),
    },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} vocabulary="orderStatus" /> },
    { key: "createdAt", header: "Created", sortValue: (r) => new Date(r.createdAt).getTime() },
  ];
  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Orders" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={[
        {
          id: "status",
          label: "Status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: statusOptions,
        },
      ]}
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
        isFetching={isFetching}
        error={error ? "Failed to load orders" : null}
        onRowClick={(row) => openRecord(row.id)}
      />
      <SaleRecordModal saleId={recordId} listSlug="orders" onClose={closeRecord} />
    </ListPageShell>
  );
}

export function CustomersListView() {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const tenantId = useTenantId();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const tenantConfig = useTenantStore((state) => state.tenantConfig);
  const bulkImportEnabled = tenantConfig?.enabledModules.includes("bulkImport") ?? false;
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);
  const [ledgerCustomerName, setLedgerCustomerName] = useState("");

  const { summary, ledger, isLoading: ledgerLoading } = useContactLedgerQuery(
    () => getCustomerSummary(tenantId!, ledgerCustomerId!),
    () => getCustomerLedger(tenantId!, ledgerCustomerId!),
    ledgerCustomerId,
    "customer-ledger",
  );

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to, search],
  );

  const {
    items: customers,
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
  } = useServerListPage<Customer>({
    queryKey: ["customers", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getCustomersPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = customers;

  const handleCustomerImport = useCallback(
    async (file: File) => {
      if (!tenantId) return;
      const csv = await file.text();
      const result = await importCustomers(tenantId, csv);
      window.alert(
        `Imported ${result.created} customer(s)${result.errors.length ? ` with ${result.errors.length} error(s)` : ""}.`,
      );
    },
    [tenantId],
  );

  const columns: ColumnConfig<Customer>[] = [
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (row) => (
        <RowActionsMenu
          actions={[
            { id: "view", label: "View", onClick: () => openRecord(row.id) },
            { id: "pay", label: "Pay", onClick: () => router.push(`/${tenantCode}/payments?customerId=${row.id}`) },
            {
              id: "ledger",
              label: "Ledger",
              onClick: () => {
                setLedgerCustomerId(row.id);
                setLedgerCustomerName(row.businessName ?? row.name);
              },
            },
            { id: "sales", label: "Sales", onClick: () => router.push(`/${tenantCode}/sales`) },
          ]}
        />
      ),
    },
    { key: "contactId", header: "Contact ID", render: (r) => r.contactId ?? "—" },
    { key: "businessName", header: "Business Name", render: (r) => <span className="font-medium">{r.businessName ?? r.name}</span> },
    { key: "name", header: "Name" },
    { key: "email", header: "Email", render: (r) => r.email ?? "—" },
    { key: "phone", header: "Mobile", render: (r) => r.phone ?? "—" },
    {
      key: "totalSell",
      header: "Total Sell",
      sortValue: (r) => r.totalSell ?? r.totalSpend,
      render: (r) => formatCurrency(r.totalSell ?? r.totalSpend, "NGN"),
    },
    {
      key: "totalSellDue",
      header: "Sell Due",
      sortValue: (r) => r.totalSellDue ?? 0,
      render: (r) => formatCurrency(r.totalSellDue ?? 0, "NGN"),
    },
    {
      key: "totalSellPaid",
      header: "Sell Paid",
      sortValue: (r) => r.totalSellPaid ?? 0,
      render: (r) => formatCurrency(r.totalSellPaid ?? 0, "NGN"),
    },
    { key: "visitCount", header: "Visits", sortValue: (r) => r.visitCount },
    { key: "createdAt", header: "Added On", sortValue: (r) => new Date(r.createdAt).getTime() },
  ];
  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Customers" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search customers..."
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      showImport={bulkImportEnabled}
      onImport={bulkImportEnabled ? handleCustomerImport : undefined}
      primaryAction={
        <Button size="sm" onClick={() => openCreateModal("customer")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Customer
        </Button>
      }
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
        isFetching={isFetching}
        error={error ? "Failed to load customers" : null}
        onRowClick={(row) => openRecord(row.id)}
      />
      <CustomerRecordModal customerId={recordId} onClose={closeRecord} />
      <ContactLedgerModal
        open={Boolean(ledgerCustomerId)}
        onClose={() => setLedgerCustomerId(null)}
        title={`Ledger — ${ledgerCustomerName}`}
        summary={summary}
        ledger={ledger}
        isLoading={ledgerLoading}
      />
    </ListPageShell>
  );
}

export function ReturnsListView() {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: (statusFilter || undefined) as SaleReturnStatus | undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to, search, statusFilter],
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
  } = useServerListPage<SaleReturnRow>({
    queryKey: ["returns", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getReturnsPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = returns;

  const statusOptions = useMemo(
    () =>
      (["Refunded", "Restocked", "Written Off"] as const).map((value) => ({
        value,
        label: value,
      })),
    [],
  );

  const columns: ColumnConfig<SaleReturnRow>[] = [
    { key: "reference", header: "Return #", render: (r) => <span className="font-medium">{r.reference}</span> },
    { key: "saleReference", header: "Original Sale" },
    { key: "customerName", header: "Customer" },
    {
      key: "amount",
      header: "Amount",
      sortValue: (r) => r.amount,
      render: (r) => formatCurrency(r.amount, "NGN"),
    },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} vocabulary="saleReturnStatus" /> },
    { key: "date", header: "Date", sortValue: (r) => new Date(r.date).getTime() },
  ];
  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Returns" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={[
        {
          id: "status",
          label: "Status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: statusOptions,
        },
      ]}
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
        isFetching={isFetching}
        error={error ? "Failed to load returns" : null}
        onRowClick={(row) => openRecord(row.id)}
      />
      <SaleRecordModal saleId={recordId} listSlug="returns" onClose={closeRecord} />
    </ListPageShell>
  );
}

export function VehiclesListView() {
  const { goToDetail } = useRecordNavigation("vehicles");
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: "",
    ownerName: "",
    ownerPhone: "",
  });

  const createMutation = useAppMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error("No tenant");
      return createVehicle(tenantId, {
        plateNumber: form.plateNumber.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim() || null,
        vin: null,
      });
    },
    successMessage: "Vehicle registered",
    onSuccess: async (vehicle) => {
      setCreateOpen(false);
      setForm({
        plateNumber: "",
        make: "",
        model: "",
        year: "",
        ownerName: "",
        ownerPhone: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["vehicles", tenantId] });
      goToDetail(vehicle.id);
    },
  });

  const canCreate =
    form.plateNumber.trim() &&
    form.make.trim() &&
    form.model.trim() &&
    form.ownerName.trim();

  const {
    items: vehicles,
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
  } = useServerListPage<Vehicle>({
    queryKey: ["vehicles", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) =>
      getVehiclesPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
      }),
  });

  const filtered = vehicles;

  const columns: ColumnConfig<Vehicle>[] = [
    {
      key: "plateNumber",
      header: "Plate",
      render: (r) => <span className="font-medium">{r.plateNumber}</span>,
    },
    { key: "make", header: "Make" },
    { key: "model", header: "Model" },
    { key: "ownerName", header: "Owner" },
    { key: "year", header: "Year", sortValue: (r) => r.year ?? 0 },
  ];

  return (
    <>
    <ListPageShell
      tabs={[{ id: "all", label: "All Vehicles" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search vehicles..."
      primaryAction={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Register vehicle
        </Button>
      }
      onExport={async () => {
        if (!tenantId) return;
        const rows = await getAllVehicles(tenantId);
        exportList(
          "vehicles",
          [
            { key: "plateNumber", header: "Plate" },
            { key: "make", header: "Make" },
            { key: "model", header: "Model" },
            { key: "ownerName", header: "Owner" },
            { key: "year", header: "Year" },
          ],
          rows.map((row) => ({
            plateNumber: row.plateNumber,
            make: row.make,
            model: row.model,
            ownerName: row.ownerName,
            year: row.year,
          })),
          "Export Vehicles",
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
        isFetching={isFetching}
        error={error ? "Failed to load vehicles" : null}
        onRowClick={(row) => goToDetail(row.id)}
        emptyState={{
          message: "No vehicles in the registry yet. Create a vehicle to track repair history.",
        }}
      />
    </ListPageShell>

    {createOpen ? (
      <Modal open onClose={() => setCreateOpen(false)} panelClassName="max-w-lg">
        <ModalHeader title="Register vehicle" onClose={() => setCreateOpen(false)} />
        <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-2">
          <Input
            label="Plate number"
            value={form.plateNumber}
            onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))}
          />
          <Input
            label="Owner name"
            value={form.ownerName}
            onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
          />
          <Input
            label="Make"
            value={form.make}
            onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
          />
          <Input
            label="Model"
            value={form.model}
            onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
          />
          <Input
            label="Year"
            type="number"
            value={form.year}
            onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
          />
          <Input
            label="Owner phone"
            value={form.ownerPhone}
            onChange={(e) => setForm((p) => ({ ...p, ownerPhone: e.target.value }))}
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canCreate || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Register
          </Button>
        </ModalFooter>
      </Modal>
    ) : null}
    </>
  );
}

export function RequisitionsListView() {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const tenantId = useTenantId();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();

  const {
    items: requisitions,
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
  } = useServerListPage<Requisition>({
    queryKey: ["requisitions", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) =>
      getRequisitionsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
      }),
  });

  const filtered = requisitions;

  const columns: ColumnConfig<Requisition>[] = [
    {
      key: "reference",
      header: "Req #",
      render: (r) => <span className="font-medium">{r.reference}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
    },
    {
      key: "lines",
      header: "Lines",
      render: (r) => r.lines.length,
    },
    { key: "createdAt", header: "Created", sortValue: (r) => new Date(r.createdAt).getTime() },
  ];

  return (
    <>
      <ListPageShell
        tabs={[{ id: "all", label: "All Requisitions" }]}
        activeTab="all"
        onTabChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        onExport={async () => {
          if (!tenantId) return;
          const rows = await getAllRequisitions(tenantId);
          exportList(
            "requisitions",
            [
              { key: "reference", header: "Req #" },
              { key: "status", header: "Status" },
              { key: "createdAt", header: "Created" },
            ],
            rows.map((row) => ({
              reference: row.reference,
              status: row.status,
              createdAt: row.createdAt,
            })),
            "Export Requisitions",
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
          isFetching={isFetching}
          error={error ? "Failed to load requisitions" : null}
          onRowClick={(row) => openRecord(row.id)}
          emptyState={{
            message: "No material requisitions yet. Request parts from a job detail page.",
          }}
        />
      </ListPageShell>
      <RequisitionRecordModal
        requisitionId={recordId}
        mode="outgoing"
        onClose={closeRecord}
      />
    </>
  );
}

/** Warehouse inbox — requisitions fulfilled from this tenant's stock. */
export function IncomingRequisitionsListView() {
  const { recordId, openRecord, closeRecord } = useListRecordModal();
  const tenantId = useTenantId();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();
  const [selectedRow, setSelectedRow] = useState<Requisition | null>(null);

  const {
    items: requisitions,
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
  } = useServerListPage<Requisition>({
    queryKey: ["incoming-requisitions", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) =>
      getIncomingRequisitionsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
      }),
  });

  const filtered = requisitions;

  const columns: ColumnConfig<Requisition>[] = [
    {
      key: "reference",
      header: "Req #",
      render: (r) => <span className="font-medium">{r.reference}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
    },
    {
      key: "lines",
      header: "Lines",
      render: (r) => r.lines.length,
    },
    { key: "createdAt", header: "Created", sortValue: (r) => new Date(r.createdAt).getTime() },
  ];

  return (
    <>
      <ListPageShell
        tabs={[{ id: "incoming", label: "Incoming Requests" }]}
        activeTab="incoming"
        onTabChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        onExport={async () => {
          if (!tenantId) return;
          const rows = await getAllIncomingRequisitions(tenantId);
          exportList(
            "incoming-requisitions",
            [
              { key: "reference", header: "Req #" },
              { key: "status", header: "Status" },
              { key: "createdAt", header: "Created" },
            ],
            rows.map((row) => ({
              reference: row.reference,
              status: row.status,
              createdAt: row.createdAt,
            })),
            "Export Incoming Requisitions",
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
          isFetching={isFetching}
          error={error ? "Failed to load incoming requisitions" : null}
          onRowClick={(row) => {
            setSelectedRow(row);
            openRecord(row.id);
          }}
          emptyState={{
            message: "No incoming requisition requests from other entities.",
          }}
        />
      </ListPageShell>
      <RequisitionRecordModal
        requisitionId={recordId}
        initialRecord={selectedRow}
        mode="incoming"
        onClose={() => {
          setSelectedRow(null);
          closeRecord();
        }}
      />
    </>
  );
}

export function MenuItemsListView() {
  const { goToDetail } = useRecordNavigation("menu-items");
  const tenantId = useTenantId();
  const { search, setSearch } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      category: categoryFilter || undefined,
    }),
    [categoryFilter, search],
  );

  const {
    items,
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
  } = useServerListPage<MenuItemRow>({
    queryKey: ["menu-items", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: async (cursor, limit) => {
      const page = await getItemsPage(tenantId!, apiFilters, cursor, limit);
      return {
        ...page,
        items: page.items.map((item) => ({
          id: item.id,
          tenantId: item.tenantId,
          name: item.name,
          category: item.category ?? "General",
          price: item.costPrice,
          modifierGroups: 0,
          available: item.status !== "out_of_stock",
          createdAt: item.createdAt,
        })),
      };
    },
  });

  const filtered = items;

  const categoryOptions = useMemo(
    () => uniqueFieldOptions(items, "category"),
    [items],
  );

  const columns: ColumnConfig<MenuItemRow>[] = [
    { key: "name", header: "Item", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "category", header: "Category" },
    {
      key: "price",
      header: "Price",
      sortValue: (r) => r.price,
      render: (r) => formatCurrency(r.price, "NGN"),
    },
    { key: "modifierGroups", header: "Modifier Groups", sortValue: (r) => r.modifierGroups },
    { key: "available", header: "Available", render: (r) => (r.available ? "Yes" : "No") },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Menu item detail includes nested modifier group editor.</p>
      <ListPageShell
        tabs={[{ id: "all", label: "All Menu Items" }]}
        activeTab="all"
        onTabChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        showDateRange={false}
        filterDropdowns={[
          {
            id: "category",
            label: "Category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
          },
        ]}
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
          isFetching={isFetching}
          error={error ? "Failed to load menu items" : null}
          onRowClick={(row) => goToDetail(row.id)}
        />
      </ListPageShell>
    </div>
  );
}

export function ServicesListView() {
  const tenantId = useTenantId();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();

  const {
    items: services,
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
  } = useServerListPage<SalonService>({
    queryKey: ["salon-services", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) =>
      getSalonServicesPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
      }),
  });

  const filtered = services;

  const columns: ColumnConfig<SalonService>[] = [
    { key: "name", header: "Service", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "durationMinutes",
      header: "Duration",
      sortValue: (r) => r.durationMinutes,
      render: (r) => `${r.durationMinutes} min`,
    },
    {
      key: "price",
      header: "Price",
      sortValue: (r) => r.price,
      render: (r) => formatCurrency(r.price, r.currency),
    },
  ];

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Services" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      onExport={async () => {
        if (!tenantId) return;
        const rows = await getAllSalonServices(tenantId);
        exportList(
          "salon-services",
          [
            { key: "name", header: "Service" },
            { key: "durationMinutes", header: "Duration (min)" },
            { key: "price", header: "Price" },
          ],
          rows.map((row) => ({
            name: row.name,
            durationMinutes: row.durationMinutes,
            price: row.price,
          })),
          "Export Services",
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
        isFetching={isFetching}
        error={error ? "Failed to load services" : null}
        emptyState={{
          message: "No salon services configured yet.",
        }}
      />
    </ListPageShell>
  );
}

export function CatalogListView() {
  const { goToDetail } = useRecordNavigation("catalog");
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openAddProductModal = useUiStore((state) => state.openAddProductModal);
  const section = sectionFromParams(searchParams.get("section"));
  const { dateRange, setDateRange, search, setSearch } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const setSection = useCallback(
    (next: ProductSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "products") params.delete("section");
      else params.set("section", next);
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const apiFilters = useMemo(() => {
    const next: {
      status?: StockStatus;
      category?: string;
      locationCode?: string;
      search?: string;
    } = {};
    if (categoryFilter) next.category = categoryFilter;
    if (statusFilter) next.status = statusFilter as StockStatus;
    if (locationFilter) next.locationCode = locationFilter;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [categoryFilter, locationFilter, search, statusFilter]);

  const {
    items,
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
  } = useServerListPage({
    queryKey: ["catalog", tenantId],
    enabled: Boolean(tenantId) && section === "products",
    filters: apiFilters,
    fetchPage: (cursor, limit) => getCatalogPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = items;

  const categoryOptions = useMemo(() => {
    const fromConfig = config?.itemCategories ?? [];
    return fromConfig.map((c) => ({ value: c, label: c }));
  }, [config?.itemCategories]);
  const statusOptions = useMemo(
    () => [
      { value: "in_stock", label: "In Stock" },
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
    [],
  );
  const locationOptions = useMemo(
    () => locationFilterOptions(config),
    [config],
  );

  const columns: ColumnConfig<Item>[] = useMemo(
    () => [
      {
        key: "sku",
        header: "SKU",
        render: (row) => <span className="font-medium text-foreground">{row.sku}</span>,
      },
      {
        key: "name",
        header: "Product",
        render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
      },
      { key: "category", header: "Category" },
      {
        key: "binLocation",
        header: "Location",
        render: (row) => (
          <ItemLocationCell item={row} locations={config?.businessLocations} />
        ),
      },
      {
        key: "quantity",
        header: "Available",
        sortValue: (row) => row.quantity,
        render: (row) => formatNumber(row.quantity),
      },
      {
        key: "costPrice",
        header: "Retail price",
        sortValue: (row) => row.costPrice,
        render: (row) => <InlinePriceCell item={row} label="Retail price" />,
      },
      {
        key: "status",
        header: "Stock",
        render: (row) => <StatusPill status={row.status} vocabulary="stockStatus" />,
      },
    ],
    [config?.businessLocations],
  );

  return (
    <ListPageShell
      tabs={PRODUCT_SECTION_TABS}
      activeTab={section}
      onTabChange={(tabId) => setSection(tabId as ProductSectionId)}
      searchPlaceholder={section === "products" ? "Search catalog…" : "Search"}
      searchValue={search}
      onSearchChange={setSearch}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      showDateRange={false}
      filterDropdowns={
        section === "products"
          ? [
              {
                id: "category",
                label: "Category",
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: categoryOptions,
              },
              {
                id: "status",
                label: "Stock",
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
              {
                id: "location",
                label: "Location",
                value: locationFilter,
                onChange: setLocationFilter,
                options: locationOptions,
              },
            ]
          : []
      }
    >
      {section === "products" ? (
        <div className="space-y-3 p-4 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <ProductItemSearch
                tenantId={tenantId}
                retailOnly
                businessLocations={config?.businessLocations}
                onSelect={(item) => {
                  if (item.itemId) goToDetail(item.itemId);
                }}
                placeholder="Search by name, SKU, or location / counter"
              />
            </div>
            <Button size="sm" onClick={() => openAddProductModal("item")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add product
            </Button>
          </div>
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
            isFetching={isFetching}
            error={error ? "Could not load catalog items." : null}
            onRowClick={(row) => goToDetail(row.id)}
            emptyState={{
              message:
                "Retail products appear here when warehouse items are made available for retail.",
            }}
          />
        </div>
      ) : isProductMetaSection(section) ? (
        <div className="p-4 pt-0">
          <ProductMetaPanel kind={section} />
        </div>
      ) : null}
    </ListPageShell>
  );
}
