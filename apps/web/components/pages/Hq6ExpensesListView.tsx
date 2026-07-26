"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Expense } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ExpenseViewModal } from "@/components/organisms/ExpenseViewModal";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6ListAmountFooter } from "@/components/hq6/Hq6ListAmountFooter";
import { Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
import {
  deleteExpense,
  getAllExpenses,
  getExpenseCategories,
  getExpensesPage,
} from "@/lib/api/expenses";
import { getCustomers } from "@/lib/api/customers";
import { getUsers } from "@/lib/api/users";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { removeEntityFromQueries } from "@/lib/query/optimistic";
import { expensePageRoute } from "@/lib/registries/expenseNav";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";
import { hq6PaymentBadgeClass } from "@/lib/utils/hq6PaymentBadge";

/** HQ6 Expenses list — ui-audit/36_expenses */
export function Hq6ExpensesListView() {
  const tenantId = useTenantId();
  const { tenantCode, config } = useRouteTenant();
  const router = useRouter();
  const exportList = useListExport();
  const chrome = useHq6ListChrome("expenses");
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
  const [expenseForFilter, setExpenseForFilter] = useState("");
  const [addedByFilter, setAddedByFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [paymentsExpense, setPaymentsExpense] = useState<Expense | null>(null);

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
  const categoriesQuery = useQuery({
    queryKey: ["expense-categories", tenantId, "expense-filter"],
    queryFn: () => getExpenseCategories(tenantId!),
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
      categoryId: categoryFilter || undefined,
      paymentStatus: paymentStatusFilter || undefined,
      search: search.trim() || undefined,
    }),
    [
      addedByFilter,
      bounds?.from,
      bounds?.to,
      categoryFilter,
      contactFilter,
      expenseForFilter,
      locationFilter,
      paymentStatusFilter,
      search,
    ],
  );

  const {
    items,
    hasMore,
    totalCount,
    amountSummary,
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
  } = useServerListPage<Expense>({
    queryKey: ["expenses", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    search,
    filters: listFilters,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getExpensesPage(tenantId!, cursor, limit, {
        ...listFilters,
        search: search.trim() || undefined,
        includeSummary: opts?.includeSummary,
      }),
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteExpense(tenantId!, id),
    successMessage: "Expense deleted",
    optimistic: {
      keys: [["expenses", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["expenses", tenantId], id);
      },
    },
  });

  const commitSearch = () => setSearch(localSearch);

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllExpenses(tenantId, {
      ...listFilters,
      search: search.trim() || undefined,
    });
    exportList(
      "expenses",
      [
        { key: "date", header: "Date" },
        { key: "refNo", header: "Reference No" },
        { key: "category", header: "Expense Category" },
        { key: "subCategory", header: "Sub category" },
        { key: "location", header: "Location" },
        { key: "paymentStatus", header: "Payment Status" },
        { key: "tax", header: "Tax" },
        { key: "total", header: "Total amount" },
        { key: "due", header: "Payment due" },
        { key: "expenseFor", header: "Expense for" },
        { key: "contact", header: "Contact" },
        { key: "note", header: "Expense note" },
        { key: "addedBy", header: "Added By" },
      ],
      rows.map((row) => ({
        date: formatHq6DateTime(row.expenseDate),
        refNo: row.refNo ?? "",
        category: row.categoryName ?? "",
        subCategory: row.subCategory ?? "",
        location: row.locationCode ?? "",
        paymentStatus: formatHq6PaymentStatus(row.paymentStatus),
        tax: row.taxAmount,
        total: row.totalAmount,
        due: row.paymentDue,
        expenseFor: row.expenseFor ?? "",
        contact: row.contactName ?? "",
        note: row.note ?? "",
        addedBy: row.createdByName ?? "",
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
        render: (row) => row.refNo ?? "",
      },
      {
        key: "isRecurring",
        header: "Recurring details",
        render: (row) =>
          row.isRecurring
            ? `Every ${row.recurInterval ?? ""} ${row.recurIntervalType ?? ""}`.trim()
            : "",
      },
      {
        key: "categoryName",
        header: "Expense Category",
        render: (row) => row.categoryName ?? "",
      },
      {
        key: "subCategory",
        header: "Sub category",
        render: (row) => row.subCategory ?? "",
      },
      {
        key: "locationCode",
        header: "Location",
        render: (row) =>
          businessLocationName(row.locationCode, config?.businessLocations) ??
          row.locationCode ??
          "",
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (row) => (
          <span
            className={cn("hq6-pay-badge", hq6PaymentBadgeClass(row.paymentStatus))}
          >
            {formatHq6PaymentStatus(row.paymentStatus)}
          </span>
        ),
      },
      {
        key: "taxAmount",
        header: "Tax",
        numeric: true,
        sortValue: (row) => row.taxAmount,
        render: (row) => formatHq6Currency(row.taxAmount, "NGN"),
      },
      {
        key: "totalAmount",
        header: "Total amount",
        numeric: true,
        sortValue: (row) => row.totalAmount,
        render: (row) => formatHq6Currency(row.totalAmount, "NGN"),
      },
      {
        key: "paymentDue",
        header: "Payment due",
        numeric: true,
        sortValue: (row) => row.paymentDue,
        render: (row) => formatHq6Currency(row.paymentDue, "NGN"),
      },
      {
        key: "expenseFor",
        header: "Expense for",
        render: (row) => row.expenseFor ?? "",
      },
      {
        key: "contactName",
        header: "Contact",
        render: (row) => row.contactName ?? "",
      },
      {
        key: "note",
        header: "Expense note",
        render: (row) => row.note ?? "",
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

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header || c.key) })),
    [columns],
  );

  const visibleColumns = useMemo(() => {
    if (!chrome.visibleColumnKeys) return columns;
    const allowed = new Set(["actions", ...chrome.visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [chrome.visibleColumnKeys, columns]);

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
    <Hq6StandardListShell
      slug="expenses"
      title="Expenses"
      tabLabel="All expenses"
      boxTitle="All expenses"
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={commitSearch}
      searchPlaceholder="Search ..."
      columnOptions={columnOptions}
      onExport={() => void handleExport()}
      hidePrimaryAction
      tabActions={
        tenantCode ? (
          <div className="flex flex-wrap items-center gap-2">
            <UposGradientActionButton
              label="Import expense"
              href={`/${tenantCode}/import-expense`}
            />
            <UposGradientActionButton
              label="Add"
              href={expensePageRoute(tenantCode, "add-expense")}
            />
          </div>
        ) : null
      }
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
            <Hq6FilterSelect
              label="Expense Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              emptyLabel="All"
              options={(categoriesQuery.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
            <Hq6FilterSelect
              label="Payment Status"
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              emptyLabel="All"
              options={[
                { value: "paid", label: "Paid" },
                { value: "due", label: "Due" },
                { value: "partial", label: "Partial" },
              ]}
            />
          </Hq6FilterGrid>
      }
      tableFooter={
        items.length > 0 ? (
          <div className="space-y-0">
            {amountSummary ? (
              <Hq6ListAmountFooter
                title="All matching"
                cells={[
                  {
                    label: "Total",
                    amount: amountSummary.totalAmount ?? 0,
                    currency: "NGN",
                  },
                  {
                    label: "Due",
                    amount: amountSummary.totalDue ?? 0,
                    currency: "NGN",
                  },
                ]}
              />
            ) : null}
            <Hq6ListAmountFooter
              title="Page total"
              cells={[
                { label: "Total", amount: totals.totalAmount, currency: "NGN" },
                { label: "Due", amount: totals.paymentDue, currency: "NGN" },
              ]}
            />
          </div>
        ) : null
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
        <>
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
                ? `View Payments ( Reference No: ${paymentsExpense.refNo ?? paymentsExpense.id} )`
                : "View Payments"
            }
            footer={
              <Hq6ModalSaveClose
                onClose={() => setPaymentsExpense(null)}
                closeLabel="Close"
              />
            }
          >
            {paymentsExpense ? (
              <div className="space-y-3 text-sm text-[#374151]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Payment status:</span>
                  <span
                    className={cn(
                      "hq6-pay-badge",
                      hq6PaymentBadgeClass(paymentsExpense.paymentStatus),
                    )}
                  >
                    {formatHq6PaymentStatus(paymentsExpense.paymentStatus)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Total:</span>{" "}
                  {formatHq6Currency(paymentsExpense.totalAmount)}
                </div>
                <div>
                  <span className="font-semibold">Payment due:</span>{" "}
                  {formatHq6Currency(paymentsExpense.paymentDue)}
                </div>
              </div>
            ) : null}
          </Hq6Modal>
        </>
      }
    >
      <DataTable
        data={items}
        columns={visibleColumns}
        displayMode="table"
        embedded
        disablePagination
        stickyFirstColumn
        density={chrome.density}
        onDensityChange={chrome.setDensity}
        showDensityControl={false}
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Could not load expenses." : null}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
