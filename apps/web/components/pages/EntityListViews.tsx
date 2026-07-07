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
import { getCustomersPage } from "@/lib/api/customers";
import { getCatalogPage } from "@/lib/api/catalog";
import { getSalesPage } from "@/lib/api/sales";
import { getOrdersPage } from "@/lib/api/orders";
import { getReturnsPage } from "@/lib/api/returns";
import { getAllRequisitions, getRequisitionsPage } from "@/lib/api/requisitions";
import { getAllSalonServices, getSalonServicesPage } from "@/lib/api/salonServices";
import { getAllVehicles, getVehiclesPage } from "@/lib/api/vehicles";
import { getItemsPage } from "@/lib/api/items";
import { useListExport } from "@/lib/hooks/useListExport";
import type { Order, MenuItemRow, SaleReturnRow } from "@/lib/types/entityRows";
import type { Customer, Item, Requisition, Sale, SalonService, StockStatus, Vehicle } from "@vonos/types";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import { ItemLocationCell } from "@/components/molecules/ItemLocationCell";
import { itemMatchesLocationFilter, locationFilterOptions } from "@/lib/utils/locationLabels";
import { useUiStore } from "@/stores/uiStore";

export function SalesListView() {
  const { goToDetail } = useRecordNavigation("sales");
  const tenantId = useTenantId();
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);
  const exportList = useListExport();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
    }),
    [search],
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
    error,
  } = useServerListPage({
    queryKey: ["sales", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getSalesPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(sales, bounds, "date");
    if (statusFilter) rows = rows.filter((s) => s.status === statusFilter);
    return rows;
  }, [bounds, sales, statusFilter]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(sales, "status"),
    [sales],
  );

  const columns: ColumnConfig<Sale>[] = [
    { key: "reference", header: "Sale #", render: (r) => <span className="font-medium">{r.reference}</span> },
    { key: "customerName", header: "Customer" },
    { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
    {
      key: "total",
      header: "Total",
      sortValue: (r) => r.total,
      render: (r) => formatCurrency(r.total, r.currency),
    },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} vocabulary="saleReturnStatus" /> },
    { key: "date", header: "Date", sortValue: (r) => new Date(r.date).getTime() },
  ];
  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Sales" }]}
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
      onExport={() =>
        exportList(
          "sales",
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
          "Export Sales Spreadsheet",
        )
      }
      primaryAction={
        <Button size="sm" onClick={() => openAddSaleModal()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Sale
        </Button>
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
          error={error ? "Failed to load sales" : null}
          onRowClick={(row) => goToDetail(row.id)}
        />
      </div>
    </ListPageShell>
  );
}

export function OrdersListView() {
  const { goToDetail } = useRecordNavigation("orders");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
    }),
    [search],
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
    error,
  } = useServerListPage<Order>({
    queryKey: ["orders", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getOrdersPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(orders, bounds, "createdAt");
    if (statusFilter) rows = rows.filter((o) => o.status === statusFilter);
    return rows;
  }, [bounds, orders, statusFilter]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(orders, "status"),
    [orders],
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
        error={error ? "Failed to load orders" : null}
        onRowClick={(row) => goToDetail(row.id)}
      />
    </ListPageShell>
  );
}

export function CustomersListView() {
  const { goToDetail } = useRecordNavigation("customers");
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const tenantId = useTenantId();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
    }),
    [search],
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
    error,
  } = useServerListPage<Customer>({
    queryKey: ["customers", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getCustomersPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    return filterByDateField(customers, bounds, "createdAt");
  }, [bounds, customers]);

  const columns: ColumnConfig<Customer>[] = [
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (row) => (
        <RowActionsMenu
          actions={[
            { id: "view", label: "View", onClick: () => goToDetail(row.id) },
            { id: "pay", label: "Pay", onClick: () => router.push(`/${tenantCode}/payments`) },
            { id: "ledger", label: "Ledger", onClick: () => router.push(`/${tenantCode}/finance`) },
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
        error={error ? "Failed to load customers" : null}
        onRowClick={(row) => goToDetail(row.id)}
      />
    </ListPageShell>
  );
}

export function ReturnsListView() {
  const { goToDetail } = useRecordNavigation("returns");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
    }),
    [search],
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
    error,
  } = useServerListPage<SaleReturnRow>({
    queryKey: ["returns", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getReturnsPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(returns, bounds, "date");
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [bounds, returns, statusFilter]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(returns, "status"),
    [returns],
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
        error={error ? "Failed to load returns" : null}
        onRowClick={(row) => goToDetail(row.id)}
      />
    </ListPageShell>
  );
}

export function VehiclesListView() {
  const { goToDetail } = useRecordNavigation("vehicles");
  const tenantId = useTenantId();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();

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
    error,
  } = useServerListPage<Vehicle>({
    queryKey: ["vehicles", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) => getVehiclesPage(tenantId!, cursor, limit),
  });

  const filtered = useMemo(
    () => filterBySearch(vehicles, search, ["plateNumber", "make", "model", "ownerName"]),
    [search, vehicles],
  );

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
    <ListPageShell
      tabs={[{ id: "all", label: "All Vehicles" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search vehicles..."
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
        error={error ? "Failed to load vehicles" : null}
        onRowClick={(row) => goToDetail(row.id)}
        emptyState={{
          message: "No vehicles in the registry yet. Create a vehicle to track repair history.",
        }}
      />
    </ListPageShell>
  );
}

export function RequisitionsListView() {
  const { goToDetail } = useRecordNavigation("requisitions");
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
    error,
  } = useServerListPage<Requisition>({
    queryKey: ["requisitions", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) => getRequisitionsPage(tenantId!, cursor, limit),
  });

  const filtered = useMemo(
    () => filterBySearch(requisitions, search, ["reference", "notes"]),
    [requisitions, search],
  );

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
    { key: "createdAt", header: "Created", sortValue: (r) => new Date(r.createdAt).getTime() },
  ];

  return (
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
        error={error ? "Failed to load requisitions" : null}
        onRowClick={(row) => goToDetail(row.id)}
        emptyState={{
          message: "No material requisitions yet.",
        }}
      />
    </ListPageShell>
  );
}

export function MenuItemsListView() {
  const { goToDetail } = useRecordNavigation("menu-items");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
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

  const filtered = useMemo(() => {
    return filterByDateField(items, bounds, "createdAt");
  }, [bounds, items]);

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
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
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
    error,
  } = useServerListPage<SalonService>({
    queryKey: ["salon-services", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) => getSalonServicesPage(tenantId!, cursor, limit),
  });

  const filtered = useMemo(
    () => filterBySearch(services, search, ["name"]),
    [search, services],
  );

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
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
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
    error,
  } = useServerListPage({
    queryKey: ["catalog", tenantId],
    enabled: Boolean(tenantId) && section === "products",
    filters: apiFilters,
    fetchPage: (cursor, limit) => getCatalogPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    return filterByDateField(items, bounds, "updatedAt");
  }, [bounds, items]);

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
      showDateRange={section === "products"}
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
                onSelect={(item) => goToDetail(item.id)}
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
