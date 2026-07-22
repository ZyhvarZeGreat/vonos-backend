"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CloudDownload, Filter, Plus } from "lucide-react";
import type { Expense } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { ExpenseViewModal } from "@/components/organisms/ExpenseViewModal";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6ListToolbar } from "@/components/hq6/Hq6ListToolbar";
import { Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import {
  deleteExpense,
  getAllExpenses,
  getExpensesPage,
} from "@/lib/api/expenses";
import { getCustomers } from "@/lib/api/customers";
import { getUsers } from "@/lib/api/users";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { expensePageRoute } from "@/lib/registries/expenseNav";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";

function paymentBadgeClass(status: string | null | undefined): string {
  if (status === "paid") return "hq6-pay-paid";
  if (status === "partial") return "hq6-pay-partial";
  return "hq6-pay-due";
}

/** HQ6 Expenses list — ui-audit/36_expenses/screenshot.png */
export function Hq6ExpensesListView() {
  const tenantId = useTenantId();
  const { tenantCode, config } = useRouteTenant();
  const router = useRouter();
  const qc = useQueryClient();
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [localSearch, setLocalSearch] = useState(search);
  const [locationFilter, setLocationFilter] = useState("");
  const [expenseForFilter, setExpenseForFilter] = useState("");
  const [addedByFilter, setAddedByFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [paymentsExpense, setPaymentsExpense] = useState<Expense | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[] | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", tenantId, "expense-filter"],
    queryFn: () => getCustomers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const usersQuery = useQuery({
    queryKey: ["users", tenantId, "expense-filter"],
    queryFn: () => getUsers(tenantId),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const listFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
      locationCode: locationFilter || undefined,
      expenseForCustomerId: expenseForFilter || undefined,
      createdById: addedByFilter || undefined,
      contactCustomerId: contactFilter || undefined,
      search: (localSearch || search).trim() || undefined,
    }),
    [
      addedByFilter,
      bounds?.from,
      bounds?.to,
      contactFilter,
      expenseForFilter,
      localSearch,
      locationFilter,
      search,
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
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<Expense>({
    queryKey: ["expenses", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    search,
    filters: listFilters,
    fetchPage: (cursor, limit) =>
      getExpensesPage(tenantId!, cursor, limit, {
        ...listFilters,
        search: (localSearch || search).trim() || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(tenantId!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses", tenantId] });
    },
  });

  const commitSearch = () => setSearch(localSearch);

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllExpenses(tenantId, {
      ...listFilters,
      search: (localSearch || search).trim() || undefined,
    });
    exportList(
      "expenses",
      [
        { key: "date", header: "Date" },
        { key: "refNo", header: "Reference No" },
        { key: "category", header: "Expense Category" },
        { key: "location", header: "Location" },
        { key: "paymentStatus", header: "Payment Status" },
        { key: "total", header: "Total Amount" },
        { key: "due", header: "Payment Due" },
      ],
      rows.map((row) => ({
        date: formatHq6DateTime(row.expenseDate),
        refNo: row.refNo ?? "",
        category: row.categoryName ?? "",
        location: row.locationCode ?? "",
        paymentStatus: formatHq6PaymentStatus(row.paymentStatus),
        total: row.totalAmount,
        due: row.paymentDue,
      })),
      "Export Expenses Spreadsheet",
    );
  };

  const columns: ColumnConfig<Expense>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              { id: "view", label: "View", onClick: () => setViewExpense(row) },
              {
                id: "edit",
                label: "Edit",
                onClick: () => {
                  if (!tenantCode) return;
                  router.push(
                    `${expensePageRoute(tenantCode, "add-expense")}?edit=${row.id}`,
                  );
                },
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteTarget(row),
              },
              {
                id: "view_payments",
                label: "View Payments",
                onClick: () => setPaymentsExpense(row),
              },
            ]}
          />
        ),
      },
      {
        key: "expenseDate",
        header: "Date",
        sortValue: (row) => new Date(row.expenseDate).getTime(),
        render: (row) => formatHq6DateTime(row.expenseDate),
      },
      {
        key: "refNo",
        header: "Reference No",
        render: (row) => row.refNo ?? "—",
      },
      {
        key: "isRecurring",
        header: "Recurring details",
        render: (row) =>
          row.isRecurring
            ? `Every ${row.recurInterval ?? ""} ${row.recurIntervalType ?? ""}`.trim()
            : "—",
      },
      {
        key: "categoryName",
        header: "Expense Category",
        render: (row) => row.categoryName ?? "—",
      },
      {
        key: "subCategory",
        header: "Sub Category",
        render: (row) => row.subCategory ?? "—",
      },
      {
        key: "locationCode",
        header: "Location",
        render: (row) =>
          businessLocationName(row.locationCode, config?.businessLocations) ??
          row.locationCode ??
          "—",
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (row) => (
          <span
            className={cn(
              "hq6-pay-badge",
              paymentBadgeClass(row.paymentStatus),
            )}
          >
            {formatHq6PaymentStatus(row.paymentStatus)}
          </span>
        ),
      },
      {
        key: "taxAmount",
        header: "Tax",
        sortValue: (row) => row.taxAmount,
        render: (row) => formatHq6Currency(row.taxAmount, "NGN"),
      },
      {
        key: "totalAmount",
        header: "Total Amount",
        sortValue: (row) => row.totalAmount,
        render: (row) => formatHq6Currency(row.totalAmount, "NGN"),
      },
      {
        key: "paymentDue",
        header: "Payment Due",
        sortValue: (row) => row.paymentDue,
        render: (row) => formatHq6Currency(row.paymentDue, "NGN"),
      },
    ],
    [config?.businessLocations, deleteMutation, router, tenantCode],
  );

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header || c.key) })),
    [columns],
  );

  const effectiveColumns = useMemo(() => {
    if (!visibleColumnKeys) return columns;
    const allowed = new Set(["actions", ...visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [columns, visibleColumnKeys]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let paymentDue = 0;
    for (const row of items) {
      totalAmount += row.totalAmount;
      paymentDue += row.paymentDue;
    }
    return { totalAmount, paymentDue };
  }, [items]);

  return (
    <>
      <div className="hq6-page">
        <section className="hq6-content-header">
          <h1>Expenses</h1>
        </section>

        <div className="hq6-card hq6-filters-card">
          <button
            type="button"
            className="hq6-filters-summary"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 opacity-60 transition-transform",
                filtersOpen && "rotate-180",
              )}
            />
          </button>
          {filtersOpen ? (
            <div className="hq6-filters-body">
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
                  emptyLabel="All locations"
                  options={(config?.businessLocations ?? []).map((loc) => ({
                    value: loc.code,
                    label: loc.name,
                  }))}
                />
                <Hq6FilterSelect
                  label="Expense for"
                  value={expenseForFilter}
                  onChange={setExpenseForFilter}
                  emptyLabel="All"
                  options={(customersQuery.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.businessName || c.name,
                  }))}
                />
                <Hq6FilterSelect
                  label="Added By"
                  value={addedByFilter}
                  onChange={setAddedByFilter}
                  emptyLabel="All"
                  options={(usersQuery.data ?? []).map((u) => ({
                    value: u.id,
                    label: u.name || u.email,
                  }))}
                />
                <Hq6FilterSelect
                  label="Contact"
                  value={contactFilter}
                  onChange={setContactFilter}
                  emptyLabel="All"
                  options={(customersQuery.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.businessName || c.name,
                  }))}
                />
              </Hq6FilterGrid>
            </div>
          ) : null}
        </div>

        <div className="hq6-card hq6-products-box overflow-hidden">
          <div className="hq6-tab-row">
            <div className="flex min-w-0 flex-1">
              <button type="button" className="hq6-tab hq6-tab-active">
                All expenses
              </button>
            </div>
            {tenantCode ? (
              <div className="flex shrink-0 items-center gap-2 px-3">
                <button
                  type="button"
                  className="hq6-btn hq6-btn-purple"
                  onClick={() =>
                    router.push(expensePageRoute(tenantCode, "add-expense"))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
                <button
                  type="button"
                  className="hq6-btn hq6-btn-download"
                  onClick={() => void handleExport()}
                >
                  <CloudDownload className="h-3.5 w-3.5" />
                  Download Excel
                </button>
              </div>
            ) : null}
          </div>

          <Hq6ListToolbar
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            searchValue={localSearch}
            onSearchChange={setLocalSearch}
            onSearchCommit={commitSearch}
            onExportCsv={() => void handleExport()}
            onExportExcel={() => void handleExport()}
            onPrint={() => setPrintOpen(true)}
            onColumnVisibility={() => setColumnsOpen(true)}
            onExportPdf={() => undefined}
          />

          <div className="hq6-table-wrap relative">
            <DataTable
              data={items}
              columns={effectiveColumns}
              displayMode="table"
              embedded
              disablePagination
              isLoading={isLoading}
              isFetching={isFetching && !isLoading}
              error={error ? "Could not load expenses." : null}
              emptyState={{ message: "No expenses found." }}
            />
            {items.length > 0 ? (
              <div className="flex border-t border-[var(--hq6-border)] bg-[#f9fafb] text-xs font-bold text-[#374151]">
                <div className="min-w-0 flex-1 px-3 py-2">Total:</div>
                <div className="w-[7.5rem] shrink-0 px-2 py-2 text-right tabular-nums">
                  {formatHq6Currency(totals.totalAmount, "NGN")}
                </div>
                <div className="w-[7.5rem] shrink-0 px-2 py-2 text-right tabular-nums">
                  {formatHq6Currency(totals.paymentDue, "NGN")}
                </div>
              </div>
            ) : null}
          </div>

          {(items.length > 0 || canGoPrev || isLoading) && !isLoading ? (
            <CursorPaginationBar
              pageIndex={pageIndex}
              pageSize={pageSize}
              itemCount={items.length}
              hasMore={hasMore}
              canGoPrev={canGoPrev}
              onPrev={goPrev}
              onNext={goNext}
              onPageSizeChange={setPageSize}
              onPageSelect={goToPage}
              canSelectPage={canSelectPage}
              totalItems={totalCount}
              isBusy={isFetching && !isLoading}
              className="border-t border-[var(--hq6-border)] px-3 py-2"
            />
          ) : null}
        </div>

        <p className="hq6-footer">
          Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
          rights reserved.
        </p>
      </div>

      <ExpenseViewModal
        expense={viewExpense}
        onClose={() => setViewExpense(null)}
        onEdit={
          tenantCode
            ? (expense) => {
                setViewExpense(null);
                router.push(
                  `${expensePageRoute(tenantCode, "add-expense")}?edit=${expense.id}`,
                );
              }
            : undefined
        }
      />
      <Hq6ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Are you sure ?"
        message={
          deleteTarget
            ? `Delete expense ${deleteTarget.refNo ?? deleteTarget.id}?`
            : "Are you sure ?"
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Expense deleted");
              setDeleteTarget(null);
            },
            onError: () => toast.error("Failed to delete expense"),
          });
        }}
      />
      <Hq6Modal
        open={Boolean(paymentsExpense)}
        onClose={() => setPaymentsExpense(null)}
        title={
          paymentsExpense
            ? `View Payments (Ref: ${paymentsExpense.refNo ?? paymentsExpense.id})`
            : "View Payments"
        }
        footer={<Hq6ModalSaveClose onClose={() => setPaymentsExpense(null)} closeLabel="Close" />}
      >
        {paymentsExpense ? (
          <div className="space-y-2 text-sm text-[#374151]">
            <div>
              <span className="font-semibold">Payment status:</span>{" "}
              {formatHq6PaymentStatus(paymentsExpense.paymentStatus)}
            </div>
            <div>
              <span className="font-semibold">Total:</span>{" "}
              {formatHq6Currency(paymentsExpense.totalAmount)}
            </div>
            <div>
              <span className="font-semibold">Payment due:</span>{" "}
              {formatHq6Currency(paymentsExpense.paymentDue)}
            </div>
            <p className="pt-2 text-xs text-[#9ca3af]">
              Expense payments are tracked on the expense record (no separate payment ledger
              lines yet).
            </p>
          </div>
        ) : null}
      </Hq6Modal>
      <Hq6PrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
      <Hq6ColumnVisibilityModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columnOptions}
        visibleKeys={visibleColumnKeys ?? columnOptions.map((c) => c.key)}
        onChange={setVisibleColumnKeys}
      />
    </>
  );
}
