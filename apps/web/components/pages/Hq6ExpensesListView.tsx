"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { Hq6PayExpenseModal } from "@/components/hq6/Hq6PayExpenseModal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
import {
  getCustomersForPicker,
  loadMoreCustomersForPicker,
  customersPickerHasMore,
} from "@/lib/api/customers";
import {
  deleteExpense,
  getAllExpenses,
  getExpense,
  getExpenseCategoriesForPicker,
  getExpensesPage,
  expenseCategoriesPickerHasMore,
  loadMoreExpenseCategoriesForPicker,
  updateExpense,
} from "@/lib/api/expenses";
import {
  getUsersForPicker,
  loadMoreUsersForPicker,
  usersPickerHasMore,
} from "@/lib/api/users";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { Hq6Field } from "@/components/hq6/Hq6Modal";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { removeEntityFromQueries } from "@/lib/query/optimistic";
import { prefetchPaymentAccountsRef } from "@/lib/query/prefetchListModals";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { expensePageRoute } from "@/lib/registries/expenseNav";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import {
  buildExpenseNoteBlob,
  parseExpenseNotes,
} from "@/lib/utils/expenseNotes";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { entitySaleLocations } from "@/lib/hooks/useBusinessLocationOptions";
import { expenseListCursor } from "@/lib/utils/pagination";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";
import {
  canAddPaymentForStatus,
  hq6PaymentBadgeClass,
} from "@/lib/utils/hq6PaymentBadge";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import { tenantBasePath } from "@/lib/utils/tenantMount";

/** HQ6 Expenses list — ui-audit/36_expenses */
export function Hq6ExpensesListView() {
  const tenantId = useTenantId();
  const { tenantCode, config } = useRouteTenant();
  const router = useRouter();
  const queryClient = useQueryClient();
  const exportList = useListExport();
  const chrome = useHq6ListChrome("expenses");

  // Warm payment-account dropdown while the expenses list loads.
  useEffect(() => {
    if (!tenantId) return;
    prefetchPaymentAccountsRef(queryClient, tenantId);
  }, [tenantId, queryClient]);

  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({
    // Match sales: unbounded list so Redis warm keys stay stable (no sliding from/to).
    defaultDateRange: "all_time",
    isolateDateRange: true,
  });
  const [locationFilter, setLocationFilter] = useState("");
  const [expenseForFilter, setExpenseForFilter] = useState("");
  const [expenseForLabel, setExpenseForLabel] = useState("");
  const [addedByFilter, setAddedByFilter] = useState("");
  const [addedByLabel, setAddedByLabel] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [paymentsExpense, setPaymentsExpense] = useState<Expense | null>(null);
  const [payExpense, setPayExpense] = useState<Expense | null>(null);
  const { data: paymentsDetail } = useQuery({
    queryKey: modalKeys.expense(tenantId, paymentsExpense?.id ?? null),
    queryFn: () => getExpense(tenantId!, paymentsExpense!.id),
    enabled: Boolean(tenantId && paymentsExpense?.id),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: () => paymentsExpense ?? undefined,
  });
  const paymentsView = paymentsDetail ?? paymentsExpense;

  const customerLabelById = useRef(new Map<string, string>());
  const userLabelById = useRef(new Map<string, string>());
  const categoryLabelById = useRef(new Map<string, string>());

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

  const loadUserOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getUsersForPicker(tenantId, query || undefined);
      for (const row of rows) {
        userLabelById.current.set(row.id, row.name || row.email);
      }
      return {
        options: rows.map((u) => ({
          value: u.id,
          label: u.name || u.email,
        })),
        hasMore: !query.trim() && usersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreUserOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreUsersForPicker(tenantId);
    for (const row of page.appended) {
      userLabelById.current.set(row.id, row.name || row.email);
    }
    return {
      options: page.appended.map((u) => ({
        value: u.id,
        label: u.name || u.email,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const loadCategoryOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getExpenseCategoriesForPicker(
        tenantId,
        query || undefined,
      );
      for (const row of rows) {
        categoryLabelById.current.set(row.id, row.name);
      }
      return {
        options: rows.map((c) => ({ value: c.id, label: c.name })),
        hasMore: !query.trim() && expenseCategoriesPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreCategoryOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreExpenseCategoriesForPicker(tenantId);
    for (const row of page.appended) {
      categoryLabelById.current.set(row.id, row.name);
    }
    return {
      options: page.appended.map((c) => ({ value: c.id, label: c.name })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

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
    isSearching,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<Expense>({
    queryKey: ["expenses", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    search,
    searchMode: "hybrid",
    filters: listFilters,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getExpensesPage(tenantId!, cursor, limit, {
        ...listFilters,
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => expenseListCursor(row),
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

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllExpenses(tenantId, {
      ...listFilters,
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
        { key: "paymentNote", header: "Payment note" },
        { key: "addedBy", header: "Added By" },
      ],
      rows.map((row) => {
        const notes = parseExpenseNotes(row.note);
        return {
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
          note: notes.expenseNote,
          paymentNote: notes.paymentNote,
          addedBy: row.createdByName ?? "",
        };
      }),
      "Export Expenses Spreadsheet",
    );
  };

  const columns: ColumnConfig<Expense>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => {
          const canPay = canAddPaymentForStatus(
            row.paymentStatus,
            row.paymentDue,
          );
          return (
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
              ...(canPay
                ? [
                    {
                      id: "add_payment",
                      label: "Add Payment",
                      dividerBefore: true as const,
                      onClick: () => setPayExpense(row),
                    },
                    {
                      id: "view_payments",
                      label: "View Payments",
                      onClick: () => setPaymentsExpense(row),
                    },
                  ]
                : [
                    {
                      id: "view_payments",
                      label: "View Payments",
                      dividerBefore: true as const,
                      onClick: () => setPaymentsExpense(row),
                    },
                  ]),
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteTarget(row),
              },
            ]}
          />
          );
        },
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
        key: "paymentMethod",
        header: "Payment Method",
        sortable: false,
        render: (row) => formatHq6PaymentMethod(row.paymentMethod),
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
        render: (row) => parseExpenseNotes(row.note).expenseNote || "",
      },
      {
        key: "paymentNote",
        header: "Payment note",
        sortable: false,
        render: (row) => parseExpenseNotes(row.note).paymentNote || "",
      },
      {
        key: "addedBy",
        header: "Added By",
        sortable: false,
        render: (row) => row.createdByName ?? "—",
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

  // Saved column prefs from before Payment Method existed omit it — force on.
  useEffect(() => {
    const keys = chrome.visibleColumnKeys;
    if (!keys) return;
    if (keys.includes("paymentMethod")) return;
    if (!columnOptions.some((c) => c.key === "paymentMethod")) return;
    chrome.setVisibleColumnKeys([...keys, "paymentMethod"]);
  }, [
    chrome.visibleColumnKeys,
    chrome.setVisibleColumnKeys,
    columnOptions,
  ]);

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
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search ..."
      columnOptions={columnOptions}
      onExport={() => void handleExport()}
      hidePrimaryAction
      tabActions={
        tenantCode ? (
          <div className="flex flex-wrap items-center gap-2">
            <UposGradientActionButton
              label="Import expense"
              href={`${tenantBasePath(tenantCode)}/import-expense`}
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
              options={entitySaleLocations(config).map((loc) => ({
                value: loc.code,
                label: loc.name,
              }))}
            />
            <Hq6FilterSelect
              label="Expense for"
              value={expenseForFilter}
              selectedLabel={expenseForLabel}
              onChange={(id) => {
                setExpenseForFilter(id);
                setExpenseForLabel(
                  id ? customerLabelById.current.get(id) ?? "" : "",
                );
              }}
              emptyLabel="All"
              loadOptions={loadCustomerOptions}
              loadMoreOptions={loadMoreCustomerOptions}
              prefetchKey={tenantId}
            />
            <Hq6FilterSelect
              label="Added By"
              value={addedByFilter}
              selectedLabel={addedByLabel}
              onChange={(id) => {
                setAddedByFilter(id);
                setAddedByLabel(id ? userLabelById.current.get(id) ?? "" : "");
              }}
              emptyLabel="All"
              loadOptions={loadUserOptions}
              loadMoreOptions={loadMoreUserOptions}
              prefetchKey={tenantId}
            />
            <Hq6FilterSelect
              label="Contact"
              value={contactFilter}
              selectedLabel={contactLabel}
              onChange={(id) => {
                setContactFilter(id);
                setContactLabel(
                  id ? customerLabelById.current.get(id) ?? "" : "",
                );
              }}
              emptyLabel="All"
              loadOptions={loadCustomerOptions}
              loadMoreOptions={loadMoreCustomerOptions}
              prefetchKey={tenantId}
            />
            <Hq6FilterSelect
              label="Expense Category"
              value={categoryFilter}
              selectedLabel={categoryLabel}
              onChange={(id) => {
                setCategoryFilter(id);
                setCategoryLabel(
                  id ? categoryLabelById.current.get(id) ?? "" : "",
                );
              }}
              emptyLabel="All"
              loadOptions={loadCategoryOptions}
              loadMoreOptions={loadMoreCategoryOptions}
              prefetchKey={tenantId}
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
        isSearching,
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
          <Hq6PayExpenseModal
            open={Boolean(payExpense)}
            expense={payExpense}
            tenantId={tenantId}
            onClose={() => setPayExpense(null)}
            onPaid={(expenseId) => {
              void queryClient.invalidateQueries({
                queryKey: ["expenses", tenantId],
              });
              void queryClient.invalidateQueries({
                queryKey: modalKeys.expense(tenantId, expenseId),
              });
              void queryClient.invalidateQueries({
                queryKey: ["payments", tenantId],
              });
            }}
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
            size="2xl"
            title={
              paymentsView
                ? `View Payments ( Reference No: ${paymentsView.refNo ?? paymentsView.id} )`
                : "View Payments"
            }
            footer={
              <Hq6ModalSaveClose
                onClose={() => setPaymentsExpense(null)}
                closeLabel="Close"
                {...(paymentsView &&
                canAddPaymentForStatus(
                  paymentsView.paymentStatus,
                  paymentsView.paymentDue,
                )
                  ? {
                      onSave: () => {
                        const row = paymentsView;
                        setPaymentsExpense(null);
                        setPayExpense(row);
                      },
                      saveLabel: "Add Payment",
                    }
                  : {})}
              />
            }
          >
            {paymentsView ? (
              <ExpensePaymentsViewBody
                expense={paymentsView}
                onUpdated={(next) => {
                  setPaymentsExpense(next);
                  void queryClient.invalidateQueries({
                    queryKey: ["expenses", tenantId],
                  });
                  void queryClient.invalidateQueries({
                    queryKey: modalKeys.expense(tenantId, next.id),
                  });
                  void queryClient.invalidateQueries({
                    queryKey: ["payments", tenantId],
                  });
                }}
              />
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

/** HQ6 View Payments — status, amount paid, method, note, payment account. */
function ExpensePaymentsViewBody({
  expense,
  onUpdated,
}: {
  expense: Expense;
  onUpdated?: (next: Expense) => void;
}) {
  const tenantId = useTenantId();
  const { config, tenantName } = useRouteTenant();
  const notes = parseExpenseNotes(expense.note);
  const due = expense.paymentDue ?? 0;
  const paid = Math.max(0, (expense.totalAmount ?? 0) - due);
  const isPaid = expense.paymentStatus === "paid" || Boolean(expense.accountId);
  const status = isPaid ? "paid" : expense.paymentStatus;
  const locationLabel = businessLocationName(
    expense.locationCode ?? null,
    config?.businessLocations,
  );
  const hasPaymentRow = isPaid || paid > 0;

  const [editing, setEditing] = useState(false);
  const [editMethod, setEditMethod] = useState(expense.paymentMethod ?? "cash");
  const [editAccountId, setEditAccountId] = useState(expense.accountId ?? "");
  const [editNote, setEditNote] = useState(notes.paymentNote);
  const [editAmount, setEditAmount] = useState(
    String(isPaid ? expense.totalAmount : paid || expense.totalAmount),
  );

  useEffect(() => {
    if (editing) return;
    const nextNotes = parseExpenseNotes(expense.note);
    setEditMethod(expense.paymentMethod ?? "cash");
    setEditAccountId(expense.accountId ?? "");
    setEditNote(nextNotes.paymentNote);
    const nextDue = expense.paymentDue ?? 0;
    const nextPaid = Math.max(0, (expense.totalAmount ?? 0) - nextDue);
    const nextIsPaid =
      expense.paymentStatus === "paid" || Boolean(expense.accountId);
    setEditAmount(
      String(nextIsPaid ? expense.totalAmount : nextPaid || expense.totalAmount),
    );
  }, [expense, editing]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Missing tenant");
      const amount = Number(editAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Enter a valid amount");
      }
      const accountId = editAccountId.trim() || null;
      if (amount > 0 && !accountId) {
        throw new Error(
          "Select a Payment Account so this expense payment posts to the account book",
        );
      }
      const nextNotes = parseExpenseNotes(expense.note);
      const noteBlob = buildExpenseNoteBlob(
        nextNotes.expenseNote,
        editNote,
        {
          repetitions: nextNotes.repetitions,
          applicableTax: nextNotes.applicableTax,
        },
      );
      // Edit payment amount — do not overwrite the expense total.
      const total = expense.totalAmount ?? 0;
      const paid = amount;
      const paymentDue = Math.max(0, total - paid);
      const paymentStatus =
        paid <= 0 ? "due" : paid + 0.0001 >= total ? "paid" : "partial";
      return updateExpense(tenantId, expense.id, {
        accountId,
        paymentMethod: editMethod || null,
        paymentStatus,
        paymentDue,
        note: noteBlob ?? null,
        paymentNote: editNote.trim() || null,
      });
    },
    successMessage: "Payment updated",
    onSuccess: (next) => {
      setEditing(false);
      onUpdated?.(next);
    },
  });

  return (
    <div className="hq6-purchase-view hq6-expense-view space-y-4 text-sm text-[#374151]">
      <div className="hq6-purchase-view-meta grid gap-4 sm:grid-cols-3">
        <div>
          <div className="hq6-purchase-view-meta-label font-semibold">
            Expense for:
          </div>
          <div>{expense.expenseFor || expense.contactName || "—"}</div>
        </div>
        <div>
          <div className="hq6-purchase-view-meta-label font-semibold">
            Business:
          </div>
          <div>{tenantName || "—"}</div>
          <div className="text-[#6b7280]">
            {locationLabel || expense.locationCode || ""}
          </div>
        </div>
        <div className="space-y-1">
          <div>
            <span className="font-semibold">Reference No:</span> #
            {expense.refNo ?? expense.id.slice(-8)}
          </div>
          <div>
            <span className="font-semibold">Date:</span>{" "}
            {formatHq6Date(expense.expenseDate)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Payment Status:</span>
            <span className={cn("hq6-pay-badge", hq6PaymentBadgeClass(status))}>
              {formatHq6PaymentStatus(status)}
            </span>
          </div>
        </div>
      </div>

      {hasPaymentRow ? (
        <div className="hq6-product-view-table-wrap overflow-x-auto">
          <table className="hq6-product-view-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th>Reference No</th>
                <th className="text-right">Amount</th>
                <th>Payment Method</th>
                <th>Payment Note</th>
                <th>Payment Account</th>
                <th className="w-[88px]">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{expense.refNo ?? expense.id.slice(-8)}</td>
                <td className="text-right tabular-nums">
                  {formatHq6Currency(paid || expense.totalAmount, "NGN")}
                </td>
                <td>
                  {formatHq6PaymentMethod(expense.paymentMethod) || "—"}
                </td>
                <td>{notes.paymentNote || notes.expenseNote || "—"}</td>
                <td>{expense.accountName || "—"}</td>
                <td>
                  <button
                    type="button"
                    className="hq6-payment-action-btn"
                    title="Edit payment"
                    aria-label="Edit payment"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[#6b7280]">No payments recorded for this expense.</p>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-primary tw-dw-btn-sm"
            onClick={() => setEditing(true)}
          >
            Record / edit payment
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-6 border-t border-[#e5e7eb] pt-3">
        <div>
          <span className="font-semibold">Total:</span>{" "}
          {formatHq6Currency(expense.totalAmount, "NGN")}
        </div>
        <div>
          <span className="font-semibold">Total paid:</span>{" "}
          {formatHq6Currency(isPaid ? expense.totalAmount : paid, "NGN")}
        </div>
        <div>
          <span className="font-semibold">Payment due:</span>{" "}
          {formatHq6Currency(isPaid ? 0 : due, "NGN")}
        </div>
      </div>

      <Hq6Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit payment"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="tw-dw-btn"
              disabled={saveMutation.isPending}
              onClick={() => setEditing(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="tw-dw-btn tw-dw-btn-primary"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Update"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Amount *">
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Payment Method *">
            <select
              className="form-control"
              value={editMethod}
              onChange={(e) => setEditMethod(e.target.value)}
            >
              {HQ6_PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Hq6Field>
          <Hq6Field label="Payment Account">
            <PaymentAccountSelect
              value={editAccountId}
              onChange={setEditAccountId}
              emptyLabel="None (mark due)"
            />
            <p className="mt-1 text-xs text-[#6b7280]">
              Keep or change the account for paid corrections. Clear it to mark
              the expense due again.
            </p>
          </Hq6Field>
          <Hq6Field label="Payment note">
            <textarea
              className="form-control"
              rows={3}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
    </div>
  );
}
