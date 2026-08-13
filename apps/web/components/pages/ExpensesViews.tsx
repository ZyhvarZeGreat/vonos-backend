"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import type { Expense, ExpenseCategory } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ExpenseViewModal } from "@/components/organisms/ExpenseViewModal";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { getPaymentAccountsForPicker } from "@/lib/api/paymentAccounts";
import { Hq6ExpenseCategoriesListView } from "@/components/pages/Hq6ExpenseCategoriesListView";
import { Hq6ExpensesListView } from "@/components/pages/Hq6ExpensesListView";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { buildExpenseNoteBlob, parseExpenseNotes } from "@/lib/utils/expenseNotes";
import { useTenantId, useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { entitySaleLocations, defaultEntityLocationCode } from "@/lib/hooks/useBusinessLocationOptions";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { expenseListCursor, nameListCursor } from "@/lib/utils/pagination";

import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useExpensePageTabs } from "@/lib/hooks/useExpensePageTabs";
import { useListExport } from "@/lib/hooks/useListExport";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { expensePageRoute } from "@/lib/registries/expenseNav";
import { goToList } from "@/lib/utils/goToList";
import { toast } from "@/stores/toastStore";
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  deleteExpenseCategory,
  getAllExpenses,
  getExpense,
  getExpenseCategoriesForPicker,
  getExpenseCategoriesPage,
  getExpensesPage,
  expenseCategoriesPickerHasMore,
  loadMoreExpenseCategoriesForPicker,
  prefetchExpenseCategoriesForPicker,
  updateExpense,
  updateExpenseCategory,
} from "@/lib/api/expenses";
import { hq6TaxSelectOptions } from "@/lib/utils/hq6TaxOptions";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";

const EXPORT_COLUMNS = [
  { key: "expenseDate", header: "Date" },
  { key: "refNo", header: "Ref No" },
  { key: "categoryName", header: "Category" },
  { key: "subCategory", header: "Sub Category" },
  { key: "locationCode", header: "Location" },
  { key: "paymentStatus", header: "Payment Status" },
  { key: "taxAmount", header: "Tax" },
  { key: "totalAmount", header: "Total Amount" },
  { key: "paymentDue", header: "Payment Due" },
  { key: "expenseFor", header: "Expense For" },
  { key: "contactName", header: "Contact" },
  { key: "createdByName", header: "Added By" },
  { key: "note", header: "Note" },
] as const;

function expenseExportRows(rows: Expense[]) {
  return rows.map((row) => ({
    expenseDate: new Date(row.expenseDate).toLocaleDateString(),
    refNo: row.refNo ?? "",
    categoryName: row.categoryName ?? "",
    subCategory: row.subCategory ?? "",
    locationCode: row.locationCode ?? "",
    paymentStatus: row.paymentStatus,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    paymentDue: row.paymentDue,
    expenseFor: row.expenseFor ?? "",
    contactName: row.contactName ?? "",
    createdByName: row.createdByName ?? "",
    note: row.note ?? "",
  }));
}

export function ExpensesListView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) {
    return <Hq6ExpensesListView />;
  }
  return <ExpensesListViewBody />;
}

function ExpensesListViewBody() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const exportList = useListExport();
  const { tabs, activeTab, onTabChange } = useExpensePageTabs("expenses");
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters({
    defaultDateRange: "last_7_days",
    isolateDateRange: true,
  });
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [exporting, setExporting] = useState(false);

  const listFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
    }),
    [bounds?.from, bounds?.to],
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
    isPaging,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<Expense>({
    queryKey: ["expenses", tenantId],
    enabled: Boolean(tenantId),
    search,
    searchMode: "hybrid",
    filters: listFilters,
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

  const columns: ColumnConfig<Expense>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <RowActionsMenu
            actions={[
              {
                id: "view",
                label: "View",
                onClick: () => setViewExpense(row),
              },
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
                destructive: true,
                onClick: () => {
                  if (
                    window.confirm(
                      `Delete expense ${row.refNo ?? row.id}? This cannot be undone.`,
                    )
                  ) {
                    deleteMutation.mutate(row.id);
                  }
                },
              },
            ]}
          />
        ),
      },
      {
        key: "expenseDate",
        header: "Date",
        render: (r) => new Date(r.expenseDate).toLocaleDateString(),
      },
      { key: "refNo", header: "Ref No", render: (r) => r.refNo ?? "—" },
      {
        key: "isRecurring",
        header: "Recurring",
        render: (r) =>
          r.isRecurring
            ? `Every ${r.recurInterval ?? ""} ${r.recurIntervalType ?? ""}`.trim()
            : "—",
      },
      {
        key: "categoryName",
        header: "Expense Category",
        render: (r) => r.categoryName ?? "—",
      },
      { key: "subCategory", header: "Sub Category", render: (r) => r.subCategory ?? "—" },
      { key: "locationCode", header: "Location", render: (r) => r.locationCode ?? "—" },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (r) => (
          <StatusPill status={r.paymentStatus} vocabulary="movementStatus" />
        ),
      },
      {
        key: "taxAmount",
        header: "Tax",
        sortValue: (r) => r.taxAmount,
        render: (r) => formatCurrency(r.taxAmount, "NGN"),
      },
      {
        key: "totalAmount",
        header: "Total Amount",
        sortValue: (r) => r.totalAmount,
        render: (r) => formatCurrency(r.totalAmount, "NGN"),
      },
      {
        key: "paymentDue",
        header: "Payment Due",
        sortValue: (r) => r.paymentDue,
        render: (r) => formatCurrency(r.paymentDue, "NGN"),
      },
      { key: "expenseFor", header: "Expense For", render: (r) => r.expenseFor ?? "—" },
      { key: "contactName", header: "Contact", render: (r) => r.contactName ?? "—" },
      {
        key: "createdByName",
        header: "Added By",
        render: (r) => r.createdByName ?? "—",
      },
      { key: "note", header: "Expense Note", render: (r) => r.note ?? "—" },
    ],
    [deleteMutation, router, tenantCode],
  );

  const handleExport = async () => {
    if (!tenantId) return;
    setExporting(true);
    try {
      const rows = await getAllExpenses(tenantId, {
        ...listFilters,
      });
      exportList(
        "expenses",
        EXPORT_COLUMNS.map((col) => ({ key: col.key, header: col.header })),
        expenseExportRows(rows),
        "Export expenses",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ListPageShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search expenses…"
        showImport={false}
        showExport
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={handleExport}
        primaryAction={
          tenantCode ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2 print:hidden"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={() =>
                  router.push(expensePageRoute(tenantCode, "add-expense"))
                }
              >
                Add Expense
              </Button>
            </div>
          ) : undefined
        }
      >
        <ServerPaginatedTable
          items={items}
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
          isLoading={isLoading || exporting}
          isFetching={isFetching}
          isPaging={isPaging}
          error={error ? "Failed to load expenses" : null}
          emptyState={{
            message: "No expenses recorded yet. Add an expense to start tracking.",
          }}
        />
      </ListPageShell>

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
    </>
  );
}

type ExpenseFormState = {
  categoryId: string;
  categoryName: string;
  refNo: string;
  subCategory: string;
  totalAmount: string;
  paymentAmount: string;
  taxAmount: string;
  note: string;
  expenseDate: string;
  locationCode: string;
  expenseFor: string;
  contactName: string;
  paymentStatus: string;
  isRecurring: boolean;
  isRefund: boolean;
  recurInterval: string;
  recurIntervalType: string;
  paymentMethod: string;
  paymentAccountId: string;
  paymentNote: string;
  applicableTax: string;
  recurRepetitions: string;
};

const emptyForm = (): ExpenseFormState => ({
  categoryId: "",
  categoryName: "",
  refNo: "",
  subCategory: "",
  totalAmount: "",
  paymentAmount: "",
  taxAmount: "",
  note: "",
  expenseDate: new Date().toISOString().slice(0, 16),
  locationCode: "",
  expenseFor: "",
  contactName: "",
  paymentStatus: "due",
  isRecurring: false,
  isRefund: false,
  recurInterval: "",
  recurIntervalType: "days",
  paymentMethod: "cash",
  paymentAccountId: "",
  paymentNote: "",
  applicableTax: "none",
  recurRepetitions: "",
});

function taxRatePercent(
  value: string,
  options: Array<{ value: string; label: string }>,
): number {
  if (!value || value === "none") return 0;
  if (value === "vat") return 7.5;
  if (value === "wht-vat") return 15.5;
  const opt = options.find((o) => o.value === value);
  const match = opt?.label.match(/\(([\d.]+)%\)/);
  return match ? Number(match[1]) : 0;
}

function expenseToForm(expense: Expense): ExpenseFormState {
  const parsed = parseExpenseNotes(expense.note);
  return {
    categoryId: expense.categoryId ?? "",
    categoryName: expense.categoryName ?? "",
    refNo: expense.refNo ?? "",
    subCategory: expense.subCategory ?? "",
    totalAmount: String(expense.totalAmount),
    paymentAmount: String(
      Math.max(0, expense.totalAmount - (expense.paymentDue ?? 0)),
    ),
    taxAmount: String(expense.taxAmount),
    note: parsed.expenseNote,
    expenseDate: expense.expenseDate.slice(0, 16),
    locationCode: expense.locationCode ?? "",
    expenseFor: expense.expenseFor ?? "",
    contactName: expense.contactName ?? "",
    paymentStatus: expense.paymentStatus,
    isRecurring: expense.isRecurring,
    isRefund: false,
    recurInterval: expense.recurInterval != null ? String(expense.recurInterval) : "",
    recurIntervalType: expense.recurIntervalType ?? "days",
    paymentMethod: expense.paymentMethod?.trim() || "cash",
    paymentAccountId: expense.accountId ?? "",
    paymentNote: parsed.paymentNote,
    applicableTax: parsed.applicableTax || "none",
    recurRepetitions: parsed.repetitions,
  };
}

export function AddExpenseView() {
  const isHq6 = useIsVaHq6();
  const tenantId = useTenantId();
  const { tenantCode, config } = useRouteTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);
  const { tabs, activeTab, onTabChange } = useExpensePageTabs("add-expense");

  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const patchForm = (patch: Partial<ExpenseFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const categoryLabel = (c: { name: string; code?: string | null }) =>
    c.code ? `${c.name} (${c.code})` : c.name;

  const loadCategoryOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getExpenseCategoriesForPicker(
        tenantId,
        query || undefined,
      );
      return {
        options: rows.map((c) => ({
          value: c.id,
          label: categoryLabel(c),
        })),
        hasMore: !query.trim() && expenseCategoriesPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreCategoryOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreExpenseCategoriesForPicker(tenantId);
    return {
      options: page.appended.map((c) => ({
        value: c.id,
        label: categoryLabel(c),
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const categorySelectedLabel = form.categoryName.trim() || undefined;

  // Warm first 25 categories + payment accounts with the form (sale-picker pattern).
  useEffect(() => {
    if (!tenantId) return;
    void prefetchExpenseCategoriesForPicker(tenantId);
    void getPaymentAccountsForPicker(tenantId);
  }, [tenantId]);

  const taxOptions = useMemo(
    () => hq6TaxSelectOptions(tenantId),
    [tenantId],
  );

  const { data: existing, isLoading: loadingExpense } = useQuery({
    queryKey: ["expense", tenantId, editId],
    queryFn: () => getExpense(tenantId!, editId!),
    enabled: Boolean(tenantId && editId),
  });

  useEffect(() => {
    if (existing) setForm(expenseToForm(existing));
  }, [existing]);

  useEffect(() => {
    if (existing || form.locationCode) return;
    const code = defaultEntityLocationCode(
      entitySaleLocations(config),
      config?.code ?? tenantCode,
    );
    if (code) setForm((prev) => ({ ...prev, locationCode: code }));
  }, [config, existing, form.locationCode, tenantCode]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      const amount = Number(form.totalAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid expense amount");
      }
      const paid = Math.max(0, Number(form.paymentAmount) || 0);
      const paymentDue = Math.max(0, amount - paid);
      const paymentStatus =
        paid <= 0 ? "due" : paid + 0.0001 >= amount ? "paid" : "partial";
      const hasPaymentAccount = Boolean(form.paymentAccountId.trim());
      if (paid > 0 && !hasPaymentAccount) {
        throw new Error(
          "Select a Payment Account so this expense is posted to the account book",
        );
      }
      const payload = {
        categoryId: form.categoryId || undefined,
        refNo: form.refNo || undefined,
        subCategory: form.subCategory || undefined,
        totalAmount: amount,
        taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
        note: buildExpenseNoteBlob(form.note, form.paymentNote, {
          applicableTax: form.applicableTax,
          repetitions: form.recurRepetitions,
        }),
        paymentNote: form.paymentNote.trim() || undefined,
        expenseDate: form.expenseDate || undefined,
        locationCode: form.locationCode || undefined,
        expenseFor: form.expenseFor || undefined,
        contactName: form.contactName || undefined,
        paymentStatus,
        paymentDue,
        accountId: form.paymentAccountId || undefined,
        paymentMethod: form.paymentMethod || undefined,
        isRecurring: form.isRecurring,
        recurInterval: form.isRecurring && form.recurInterval
          ? Number(form.recurInterval)
          : undefined,
        recurIntervalType: form.isRecurring ? form.recurIntervalType : undefined,
      };
      if (isEdit && editId) {
        return updateExpense(tenantId!, editId, {
          ...payload,
          accountId: form.paymentAccountId || null,
        });
      }
      return createExpense(tenantId!, payload);
    },
    successMessage: isEdit ? "Expense updated" : "Expense created",
    invalidateKeys: [
      ["expenses", tenantId],
      ["payment-accounts", tenantId],
      ...(editId ? [["expense", tenantId, editId] as const] : []),
    ],
    onSuccess: () => {
      if (tenantCode) goToList(expensePageRoute(tenantCode, "expenses"));
    },
  });

  const handleCancel = () => {
    if (tenantCode) goToList(expensePageRoute(tenantCode, "expenses"));
  };

  const handleSave = () => {
    if (saveMutation.isPending) return;
    const amount = Number(form.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid expense amount");
      return;
    }
    const paid = Math.max(0, Number(form.paymentAmount) || 0);
    if (paid > 0 && !form.paymentAccountId.trim()) {
      toast.error(
        "Select a Payment Account so this expense is posted to the account book",
      );
      return;
    }
    saveMutation.mutate();
  };

  const locations = entitySaleLocations(config);
  const amountTotal = Number(form.totalAmount) || 0;
  const paidNow = Math.max(0, Number(form.paymentAmount) || 0);
  const hasPaymentAccount = Boolean(form.paymentAccountId.trim());
  const effectivePaymentStatus =
    paidNow <= 0 ? "due" : paidNow + 0.0001 >= amountTotal ? "paid" : "partial";
  const paymentDue = Math.max(0, amountTotal - paidNow);

  const hq6FormBody =
    isEdit && loadingExpense ? (
      <div className="hq6-form-card text-sm text-[#555]">Loading expense…</div>
    ) : (
      <>
        <section className="hq6-form-card">
          <div className="hq6-form-grid hq6-form-grid-3">
            <label className="hq6-form-label">
              <span>
                Business Location: <span className="req">*</span>
              </span>
              <select
                className="hq6-form-input"
                value={form.locationCode}
                onChange={(e) =>
                  patchForm({ locationCode: e.target.value })
                }
              >
                <option value="">Please Select</option>
                {locations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Expense Category:</span>
              <AsyncMenuSelect
                value={form.categoryId}
                selectedLabel={categorySelectedLabel}
                onChange={(id, option) =>
                  patchForm({
                    categoryId: id,
                    categoryName: option?.label ?? "",
                  })
                }
                loadOptions={loadCategoryOptions}
                loadMoreOptions={loadMoreCategoryOptions}
                placeholder="Please Select"
                emptyMessage="No categories found"
                className="hq6-form-input !h-auto min-h-[2.25rem] px-0 py-0"
                prefetchKey={tenantId}
              />
            </label>
            <label className="hq6-form-label">
              <span>Sub category:</span>
              <input
                className="hq6-form-input"
                value={form.subCategory}
                onChange={(e) =>
                  patchForm({ subCategory: e.target.value })
                }
                placeholder="Optional"
              />
            </label>
            <label className="hq6-form-label">
              <span>Reference No:</span>
              <input
                className="hq6-form-input"
                value={form.refNo}
                onChange={(e) => patchForm({ refNo: e.target.value })}
              />
              <p className="hq6-form-hint">Leave empty to autogenerate</p>
            </label>
            <label className="hq6-form-label">
              <span>
                Expense for:{" "}
                <i className="fa fa-info-circle text-info" aria-hidden />
              </span>
              <input
                className="hq6-form-input"
                value={form.expenseFor}
                onChange={(e) =>
                  patchForm({ expenseFor: e.target.value })
                }
                placeholder="None"
              />
            </label>
            <label className="hq6-form-label">
              <span>Expense for contact:</span>
              <input
                className="hq6-form-input"
                value={form.contactName}
                onChange={(e) =>
                  patchForm({ contactName: e.target.value })
                }
              />
            </label>
            <label className="hq6-form-label">
              <span>
                Date: <span className="req">*</span>
              </span>
              <div className="input-group" style={{ width: "100%" }}>
                <span className="input-group-addon">
                  <i className="fa fa-calendar" aria-hidden />
                </span>
                <Hq6DateTimeInput
                  className="hq6-form-input"
                  value={form.expenseDate}
                  onChange={(v) => patchForm({ expenseDate: v })}
                />
              </div>
            </label>
            <label className="hq6-form-label">
              <span>
                Applicable Tax:{" "}
                <i className="fa fa-info-circle text-info" aria-hidden />
              </span>
              <select
                className="hq6-form-input"
                value={form.applicableTax}
                onChange={(e) => {
                  const applicableTax = e.target.value;
                  const rate = taxRatePercent(applicableTax, taxOptions);
                  const total = Number(form.totalAmount) || 0;
                  patchForm({
                    applicableTax,
                    taxAmount:
                      total > 0 && rate > 0
                        ? ((total * rate) / 100).toFixed(2)
                        : form.taxAmount && applicableTax === "none"
                          ? "0"
                          : form.taxAmount,
                  });
                }}
              >
                {taxOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq6-form-label">
              <span>
                Total amount: <span className="req">*</span>
              </span>
              <input
                type="number"
                className="hq6-form-input"
                placeholder="Total amount"
                value={form.totalAmount}
                onChange={(e) => {
                  const totalAmount = e.target.value;
                  const rate = taxRatePercent(form.applicableTax, taxOptions);
                  const total = Number(totalAmount) || 0;
                  const syncPay =
                    form.paymentAmount === "" ||
                    form.paymentAmount === form.totalAmount;
                  patchForm({
                    totalAmount,
                    ...(syncPay ? { paymentAmount: totalAmount } : {}),
                    ...(rate > 0
                      ? {
                          taxAmount:
                            total > 0
                              ? ((total * rate) / 100).toFixed(2)
                              : "0",
                        }
                      : {}),
                  });
                }}
              />
            </label>
            <label className="hq6-form-label">
              <span>Attach Document:</span>
              <div
                className="input-group file-caption-main"
                style={{ width: "100%" }}
              >
                <div className="form-control file-caption kv-fileinput-caption">
                  <span className="file-caption-name" />
                </div>
                <div className="input-group-btn">
                  <div className="btn btn-primary btn-file">
                    <i className="glyphicon glyphicon-folder-open" aria-hidden />
                    &nbsp; <span className="hidden-xs">Browse..</span>
                    <input
                      type="file"
                      accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png,.avif"
                    />
                  </div>
                </div>
              </div>
              <p className="hq6-form-hint">
                Max File size: 5MB
                <br />
                Allowed File: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png, .avif
              </p>
            </label>
            <div />
            <label className="hq6-form-label flex flex-row items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={form.isRefund}
                onChange={(e) =>
                  patchForm({ isRefund: e.target.checked })
                }
              />
              <span>
                Is refund?{" "}
                <i className="fa fa-info-circle text-info" aria-hidden />
              </span>
            </label>
            <label
              className="hq6-form-label"
              style={{ gridColumn: "1 / -1" }}
            >
              <span>Expense note:</span>
              <textarea
                className="hq6-form-input"
                rows={3}
                value={form.note}
                onChange={(e) => patchForm({ note: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="hq6-form-card">
          <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) =>
                patchForm({ isRecurring: e.target.checked })
              }
            />
            Is Recurring?{" "}
            <i className="fa fa-info-circle text-info" aria-hidden />
          </label>
          {form.isRecurring ? (
            <div className="hq6-form-grid hq6-form-grid-2">
              <label className="hq6-form-label">
                <span>
                  Recurring interval: <span className="req">*</span>
                </span>
                <div className="hq6-form-pay-term">
                  <input
                    type="number"
                    className="hq6-form-input"
                    value={form.recurInterval}
                    onChange={(e) =>
                      patchForm({ recurInterval: e.target.value })
                    }
                  />
                  <select
                    className="hq6-form-input"
                    value={form.recurIntervalType}
                    onChange={(e) =>
                      patchForm({
                        recurIntervalType: e.target.value as
                          | "days"
                          | "months"
                          | "years",
                      })
                    }
                  >
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </label>
              <label className="hq6-form-label">
                <span>No. of Repetitions:</span>
                <input
                  type="number"
                  min={1}
                  className="hq6-form-input"
                  value={form.recurRepetitions}
                  onChange={(e) =>
                    patchForm({ recurRepetitions: e.target.value })
                  }
                  placeholder=""
                />
                <p className="hq6-form-hint">
                  If blank expense will be generated infinite times
                </p>
              </label>
            </div>
          ) : null}
        </section>

        <section className="hq6-form-card">
          <h2 className="hq6-form-card-title">Add payment</h2>
          <div className="hq6-form-grid hq6-form-grid-3">
            <label className="hq6-form-label">
              <span>
                Amount: <span className="req">*</span>
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="hq6-form-input"
                value={form.paymentAmount}
                placeholder="0.00"
                onChange={(e) => patchForm({ paymentAmount: e.target.value })}
              />
              <p className="hq6-form-hint">
                Enter how much is paid now. Leave 0 to keep the expense due.
              </p>
            </label>
            <label className="hq6-form-label">
              <span>
                Paid on: <span className="req">*</span>
              </span>
                <Hq6DateTimeInput
                  className="hq6-form-input"
                value={form.expenseDate}
                onChange={(v) => patchForm({ expenseDate: v })}
              />
            </label>
            <label className="hq6-form-label">
              <span>
                Payment Method: <span className="req">*</span>
              </span>
              <select
                className="hq6-form-input"
                value={form.paymentMethod}
                onChange={(e) =>
                  patchForm({ paymentMethod: e.target.value })
                }
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="hq6-form-label">
              <span>Payment Status:</span>
              <select
                className="hq6-form-input"
                value={effectivePaymentStatus}
                onChange={(e) => {
                  const paymentStatus = e.target.value;
                  if (paymentStatus === "due") {
                    patchForm({
                      paymentStatus,
                      paymentAmount: "0",
                      paymentAccountId: "",
                    });
                    return;
                  }
                  if (paymentStatus === "paid") {
                    patchForm({
                      paymentStatus,
                      paymentAmount: form.totalAmount || "0",
                    });
                    return;
                  }
                  patchForm({ paymentStatus });
                }}
              >
                <option value="due">Due</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="hq6-form-label">
              <span>
                Payment Account:
                {effectivePaymentStatus !== "due" ? (
                  <span className="req"> *</span>
                ) : null}
              </span>
              <PaymentAccountSelect
                value={form.paymentAccountId}
                onChange={(id) =>
                  patchForm({
                    paymentAccountId: id,
                  })
                }
                emptyLabel="None"
              />
            </label>
            <label
              className="hq6-form-label"
              style={{ gridColumn: "1 / -1" }}
            >
              <span>Payment note:</span>
              <textarea
                className="hq6-form-input"
                rows={2}
                value={form.paymentNote}
                onChange={(e) =>
                  patchForm({ paymentNote: e.target.value })
                }
              />
            </label>
          </div>
          <div className="hq6-form-total-row">
            Payment due: {paymentDue.toFixed(2)}
          </div>
        </section>

        <div className="hq6-form-save-row">
          <Hq6BusyButton
            className="tw-dw-btn tw-dw-btn-primary tw-dw-btn-lg tw-text-white"
            busy={saveMutation.isPending}
            busyLabel={isEdit ? "Updating…" : "Saving…"}
            disabled={!form.totalAmount}
            onClick={handleSave}
          >
            {isEdit ? "Update" : "Save"}
          </Hq6BusyButton>
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-lg"
            disabled={saveMutation.isPending}
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </>
    );

  if (isHq6) {
    return (
      <Hq6FormShell
        multiCard
        title={isEdit ? "Edit Expense" : "Add Expense"}
      >
        {isEdit && existing ? (
          <div className="hq6-form-card text-sm text-[#555]">
            Editing expense{" "}
            <strong>{existing.refNo?.trim() || existing.id.slice(-8)}</strong>.
            Changes update this record in place.
          </div>
        ) : null}
        {hq6FormBody}
      </Hq6FormShell>
    );
  }

  return (
    <ListPageShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      showImport={false}
      showDateRange={false}
      showSearch={false}
    >
      <div className="mx-auto max-w-2xl space-y-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? "Edit Expense" : "Add Expense"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isEdit
                ? "Update this business expense."
                : "Record a new business expense."}
            </p>
          </div>

          {isEdit && loadingExpense ? (
            <p className="text-sm text-muted">Loading expense…</p>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Expense Category
                  </label>
                  <AsyncMenuSelect
                    value={form.categoryId}
                    selectedLabel={categorySelectedLabel}
                    onChange={(id, option) =>
                      patchForm({
                        categoryId: id,
                        categoryName: option?.label ?? "",
                      })
                    }
                    loadOptions={loadCategoryOptions}
                    loadMoreOptions={loadMoreCategoryOptions}
                    placeholder="Select category…"
                    emptyMessage="No categories found"
                    prefetchKey={tenantId}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Ref No
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="Reference number"
                    value={form.refNo}
                    onChange={(e) => patchForm({ refNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={form.expenseDate}
                    onChange={(e) =>
                      patchForm({ expenseDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Location
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="Location code"
                    value={form.locationCode}
                    onChange={(e) =>
                      patchForm({ locationCode: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="0.00"
                    value={form.totalAmount}
                    onChange={(e) =>
                      patchForm({ totalAmount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Tax Amount
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="0.00"
                    value={form.taxAmount}
                    onChange={(e) =>
                      patchForm({ taxAmount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Expense Note
                </label>
                <textarea
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  rows={3}
                  value={form.note}
                  onChange={(e) => patchForm({ note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  isLoading={saveMutation.isPending}
                  loadingText={isEdit ? "Updating…" : "Saving…"}
                  disabled={!form.totalAmount}
                >
                  {isEdit ? "Update Expense" : "Save Expense"}
                </Button>
              </div>

              {saveMutation.isError ? (
                <p className="text-sm text-red-600">
                  Failed to save expense. Please try again.
                </p>
              ) : null}
            </div>
          )}
      </div>
    </ListPageShell>
  );
}

export function ExpenseCategoriesListView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6ExpenseCategoriesListView />;
  return <ExpenseCategoriesListViewBody />;
}

function ExpenseCategoriesListViewBody() {
  const tenantId = useTenantId();
  const { tabs, activeTab, onTabChange } = useExpensePageTabs("expense-categories");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  const {
    items: data,
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
  } = useServerListPage<ExpenseCategory>({
    queryKey: ["expense-categories", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit, _sort, opts) => getExpenseCategoriesPage(tenantId!, cursor, limit, { includeSummary: opts?.includeSummary }),
    getCursor: (row) => nameListCursor(row),
  });

  const createMutation = useAppMutation({
    mutationFn: () =>
      createExpenseCategory(tenantId!, { name: newName, code: newCode || undefined }),
    successMessage: "Category created",
    optimistic: {
      keys: [["expense-categories", tenantId]],
      update: (qc) => {
        if (!tenantId) return;
        const now = new Date().toISOString();
        prependEntityInQueries(qc, ["expense-categories", tenantId], {
          id: optimisticTempId("expense-cat"),
          tenantId,
          name: newName.trim(),
          code: newCode.trim() || null,
          createdAt: now,
          updatedAt: now,
        } satisfies ExpenseCategory);
      },
      commit: (qc, data) => {
        if (!data || !tenantId) return;
        const entries = qc.getQueriesData({
          queryKey: ["expense-categories", tenantId],
        });
        for (const [queryKey, cached] of entries) {
          if (
            cached &&
            typeof cached === "object" &&
            Array.isArray((cached as { items?: ExpenseCategory[] }).items)
          ) {
            const list = cached as {
              items: ExpenseCategory[];
              totalCount?: number;
            };
            const nextItems = list.items.filter(
              (row) => !row.id.startsWith("expense-cat-"),
            );
            qc.setQueryData(queryKey, {
              ...list,
              items: nextItems,
            });
          }
        }
        prependEntityInQueries(qc, ["expense-categories", tenantId], data);
      },
    },
    onSuccess: () => {
      setNewName("");
      setNewCode("");
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: (vars: { id: string; name: string; code?: string }) =>
      updateExpenseCategory(tenantId!, vars.id, {
        name: vars.name,
        code: vars.code,
      }),
    successMessage: "Category updated",
    optimistic: {
      keys: [["expense-categories", tenantId]],
      update: (qc, vars) => {
        patchEntityInQueries(qc, ["expense-categories", tenantId], vars.id, {
          name: vars.name,
          code: vars.code ?? null,
        });
      },
    },
    onSuccess: () => {
      setEditingId(null);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tenantId!, id),
    successMessage: "Category deleted",
    optimistic: {
      keys: [["expense-categories", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["expense-categories", tenantId], id);
      },
    },
  });

  const categoryColumns: ColumnConfig<ExpenseCategory>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) =>
        editingId === r.id ? (
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        ) : (
          <span className="font-medium">{r.name}</span>
        ),
    },
    {
      key: "code",
      header: "Code",
      render: (r) =>
        editingId === r.id ? (
          <input
            className="w-full rounded border border-border px-2 py-1 text-sm"
            value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
          />
        ) : (
          r.code ?? "—"
        ),
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (r) =>
        editingId === r.id ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={() =>
                updateMutation.mutate({
                  id: r.id,
                  name: editName,
                  code: editCode || undefined,
                })
              }
            >
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <RowActionsMenu
            actions={[
              {
                id: "edit",
                label: "Edit",
                onClick: () => {
                  setEditingId(r.id);
                  setEditName(r.name);
                  setEditCode(r.code ?? "");
                },
              },
              {
                id: "delete",
                label: "Delete",
                destructive: true,
                onClick: () => {
                  if (
                    window.confirm(`Delete category "${r.name}"? Expenses keep their data.`)
                  ) {
                    deleteMutation.mutate(r.id);
                  }
                },
              },
            ]}
          />
        ),
    },
  ];

  return (
    <ListPageShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      showImport={false}
      showDateRange={false}
      showSearch={false}
    >
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">
            New category name
          </label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-muted">Code</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
          />
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!newName || createMutation.isPending}
        >
          Add Category
        </Button>
      </div>
      <ServerPaginatedTable
        items={data}
        columns={categoryColumns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        onPageSelect={goToPage}
        canSelectPage={canSelectPage}
        isLoading={isLoading}
        isFetching={isFetching}
          isPaging={isPaging}
        error={error ? "Failed to load expense categories" : null}
        emptyState={{
          message: "No expense categories yet. Create one to classify business expenses.",
        }}
      />
    </ListPageShell>
  );
}
