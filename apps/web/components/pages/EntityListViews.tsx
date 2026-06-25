"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { InlinePriceCell } from "@/components/molecules/InlinePriceCell";
import { ProductItemSearch } from "@/components/molecules/ProductItemSearch";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  isProductMetaSection,
  ProductMetaPanel,
  PRODUCT_SECTION_TABS,
  sectionFromParams,
  type ProductSectionId,
} from "@/components/organisms/ProductMetaPanel";
import { getCustomers, getItems, getSales } from "@/lib/api";
import { getCatalog } from "@/lib/api/catalog";
import { getOrders } from "@/lib/api/orders";
import { getReturns } from "@/lib/api/returns";
import { getRequisitions } from "@/lib/api/requisitions";
import { getSalonServices } from "@/lib/api/salonServices";
import { getVehicles } from "@/lib/api/vehicles";
import { useListExport } from "@/lib/hooks/useListExport";
import type { Order, MenuItemRow, SaleReturnRow } from "@/lib/types/entityRows";
import type { Customer, Item, Requisition, Sale, SalonService, Vehicle } from "@vonos/types";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import { useUiStore } from "@/stores/uiStore";

export function SalesListView() {
  const { goToDetail } = useRecordNavigation("sales");
  const tenantId = useTenantId();
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);
  const exportList = useListExport();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ["sales", tenantId],
    queryFn: () => getSales(tenantId!),
    enabled: Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(sales, bounds, "date");
    if (statusFilter) rows = rows.filter((s) => s.status === statusFilter);
    return filterBySearch(rows, search, ["reference", "customerName"]);
  }, [bounds, sales, search, statusFilter]);

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
    >
      <div className="space-y-3 p-4 pt-0">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => openAddSaleModal()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add sale
          </Button>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          displayMode="table"
          embedded
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

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["orders", tenantId],
    queryFn: () => getOrders(tenantId!),
    enabled: Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(orders, bounds, "createdAt");
    if (statusFilter) rows = rows.filter((o) => o.status === statusFilter);
    return filterBySearch(rows, search, ["reference", "tableNumber"]);
  }, [bounds, orders, search, statusFilter]);

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
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
        isLoading={isLoading}
        error={error ? "Failed to load orders" : null}
        onRowClick={(row) => goToDetail(row.id)}
      />
    </ListPageShell>
  );
}

export function CustomersListView() {
  const { goToDetail } = useRecordNavigation("customers");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["customers", tenantId],
    queryFn: () => getCustomers(tenantId!),
    enabled: Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    const rows = filterByDateField(customers, bounds, "createdAt");
    return filterBySearch(rows, search, ["name", "email", "phone"]);
  }, [bounds, customers, search]);

  const columns: ColumnConfig<Customer>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => r.email ?? "—" },
    { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
    { key: "visitCount", header: "Visits", sortValue: (r) => r.visitCount },
    {
      key: "totalSpend",
      header: "Total Spend",
      sortValue: (r) => r.totalSpend,
      render: (r) => formatCurrency(r.totalSpend, "NGN"),
    },
    { key: "createdAt", header: "Joined", sortValue: (r) => new Date(r.createdAt).getTime() },
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
    >
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
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

  const { data: returns = [], isLoading, error } = useQuery({
    queryKey: ["returns", tenantId],
    queryFn: () => getReturns(tenantId!),
    enabled: Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(returns, bounds, "date");
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return filterBySearch(rows, search, ["reference", "customerName", "saleReference"]);
  }, [bounds, returns, search, statusFilter]);

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
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
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

  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles", tenantId],
    queryFn: () => getVehicles(tenantId!),
    enabled: Boolean(tenantId),
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
      onExport={() =>
        exportList(
          "vehicles",
          [
            { key: "plateNumber", header: "Plate" },
            { key: "make", header: "Make" },
            { key: "model", header: "Model" },
            { key: "ownerName", header: "Owner" },
            { key: "year", header: "Year" },
          ],
          filtered.map((row) => ({
            plateNumber: row.plateNumber,
            make: row.make,
            model: row.model,
            ownerName: row.ownerName,
            year: row.year,
          })),
          "Export Vehicles",
        )
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
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

  const { data: requisitions = [], isLoading, error } = useQuery({
    queryKey: ["requisitions", tenantId],
    queryFn: () => getRequisitions(tenantId!),
    enabled: Boolean(tenantId),
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
      onExport={() =>
        exportList(
          "requisitions",
          [
            { key: "reference", header: "Req #" },
            { key: "status", header: "Status" },
            { key: "createdAt", header: "Created" },
          ],
          filtered.map((row) => ({
            reference: row.reference,
            status: row.status,
            createdAt: row.createdAt,
          })),
          "Export Requisitions",
        )
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
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

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["menu-items", tenantId],
    queryFn: async (): Promise<MenuItemRow[]> => {
      const rows = await getItems(tenantId!);
      return rows.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
        name: item.name,
        category: item.category ?? "General",
        price: item.costPrice,
        modifierGroups: 0,
        available: item.status !== "out_of_stock",
        createdAt: item.createdAt,
      }));
    },
    enabled: Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(items, bounds, "createdAt");
    if (categoryFilter) rows = rows.filter((r) => r.category === categoryFilter);
    return filterBySearch(rows, search, ["name", "category"]);
  }, [bounds, categoryFilter, items, search]);

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
        <DataTable
          data={filtered}
          columns={columns}
          displayMode="table"
          embedded
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

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ["salon-services", tenantId],
    queryFn: () => getSalonServices(tenantId!),
    enabled: Boolean(tenantId),
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
      onExport={() =>
        exportList(
          "salon-services",
          [
            { key: "name", header: "Service" },
            { key: "durationMinutes", header: "Duration (min)" },
            { key: "price", header: "Price" },
          ],
          filtered.map((row) => ({
            name: row.name,
            durationMinutes: row.durationMinutes,
            price: row.price,
          })),
          "Export Services",
        )
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const openAddProductModal = useUiStore((state) => state.openAddProductModal);
  const section = sectionFromParams(searchParams.get("section"));
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["catalog", tenantId],
    queryFn: () => getCatalog(tenantId!),
    enabled: Boolean(tenantId) && section === "products",
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(items, bounds, "updatedAt");
    if (categoryFilter) rows = rows.filter((item) => item.category === categoryFilter);
    if (statusFilter) rows = rows.filter((item) => item.status === statusFilter);
    return filterBySearch(rows, search, ["name", "sku", "category"]);
  }, [bounds, categoryFilter, items, search, statusFilter]);

  const categoryOptions = useMemo(
    () => uniqueFieldOptions(items, "category"),
    [items],
  );
  const statusOptions = useMemo(
    () => uniqueFieldOptions(items, "status"),
    [items],
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
    [],
  );

  return (
    <ListPageShell
      tabs={PRODUCT_SECTION_TABS}
      activeTab={section}
      onTabChange={(tabId) => setSection(tabId as ProductSectionId)}
      searchPlaceholder={section === "products" ? "Filter visible rows" : "Search"}
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
                onSelect={(item) => goToDetail(item.id)}
                placeholder="Search catalog by name or SKU"
              />
            </div>
            <Button size="sm" onClick={() => openAddProductModal("item")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add product
            </Button>
          </div>
          <DataTable
            data={filtered}
            columns={columns}
            displayMode="table"
            embedded
            isLoading={isLoading}
            error={error ? "Could not load catalog items." : undefined}
            onRowClick={(row) => goToDetail(row.id)}
            emptyState={{
              message:
                "Retail products appear here when items are marked available for retail or imported from legacy POS.",
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
