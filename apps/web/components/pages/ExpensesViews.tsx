"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import type { Expense, ExpenseCategory } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ExpenseViewModal } from "@/components/organisms/ExpenseViewModal";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6ExpenseCategoriesListView } from "@/components/pages/Hq6ExpenseCategoriesListView";
import { Hq6ExpensesListView } from "@/components/pages/Hq6ExpensesListView";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useTenantId, useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useExpensePageTabs } from "@/lib/hooks/useExpensePageTabs";
import { useListExport } from "@/lib/hooks/useListExport";
import { expensePageRoute } from "@/lib/registries/expenseNav";
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  deleteExpenseCategory,
  getAllExpenses,
  getExpense,
  getExpenseCategories,
  getExpenseCategoriesPage,
  getExpensesPage,
  updateExpense,
  updateExpenseCategory,
} from "@/lib/api/expenses";

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
  const qc = useQueryClient();
  const exportList = useListExport();
  const { tabs, activeTab, onTabChange } = useExpensePageTabs("expenses");
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
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
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<Expense>({
    queryKey: ["expenses", tenantId],
    enabled: Boolean(tenantId),
    search,
    filters: listFilters,
    fetchPage: (cursor, limit) =>
      getExpensesPage(tenantId!, cursor, limit, {
        ...listFilters,
        search: search.trim() || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(tenantId!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses", tenantId] });
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
        search: search.trim() || undefined,
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
  refNo: string;
  subCategory: string;
  totalAmount: string;
  taxAmount: string;
  note: string;
  expenseDate: string;
  locationCode: string;
  expenseFor: string;
  contactName: string;
  paymentStatus: string;
  isRecurring: boolean;
  recurInterval: string;
  recurIntervalType: string;
};

const emptyForm = (): ExpenseFormState => ({
  categoryId: "",
  refNo: "",
  subCategory: "",
  totalAmount: "",
  taxAmount: "",
  note: "",
  expenseDate: new Date().toISOString().slice(0, 16),
  locationCode: "",
  expenseFor: "",
  contactName: "",
  paymentStatus: "due",
  isRecurring: false,
  recurInterval: "",
  recurIntervalType: "months",
});

function expenseToForm(expense: Expense): ExpenseFormState {
  return {
    categoryId: expense.categoryId ?? "",
    refNo: expense.refNo ?? "",
    subCategory: expense.subCategory ?? "",
    totalAmount: String(expense.totalAmount),
    taxAmount: String(expense.taxAmount),
    note: expense.note ?? "",
    expenseDate: expense.expenseDate.slice(0, 16),
    locationCode: expense.locationCode ?? "",
    expenseFor: expense.expenseFor ?? "",
    contactName: expense.contactName ?? "",
    paymentStatus: expense.paymentStatus,
    isRecurring: expense.isRecurring,
    recurInterval: expense.recurInterval != null ? String(expense.recurInterval) : "",
    recurIntervalType: expense.recurIntervalType ?? "months",
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
  const qc = useQueryClient();
  const { tabs, activeTab, onTabChange } = useExpensePageTabs("add-expense");

  const [form, setForm] = useState<ExpenseFormState>(emptyForm);

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories", tenantId],
    queryFn: () => getExpenseCategories(tenantId!),
    enabled: Boolean(tenantId),
  });

  const { data: existing, isLoading: loadingExpense } = useQuery({
    queryKey: ["expense", tenantId, editId],
    queryFn: () => getExpense(tenantId!, editId!),
    enabled: Boolean(tenantId && editId),
  });

  useEffect(() => {
    if (existing) setForm(expenseToForm(existing));
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        categoryId: form.categoryId || undefined,
        refNo: form.refNo || undefined,
        subCategory: form.subCategory || undefined,
        totalAmount: Number(form.totalAmount),
        taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
        note: form.note || undefined,
        expenseDate: form.expenseDate || undefined,
        locationCode: form.locationCode || undefined,
        expenseFor: form.expenseFor || undefined,
        contactName: form.contactName || undefined,
        paymentStatus: form.paymentStatus || undefined,
        isRecurring: form.isRecurring,
        recurInterval: form.isRecurring && form.recurInterval
          ? Number(form.recurInterval)
          : undefined,
        recurIntervalType: form.isRecurring ? form.recurIntervalType : undefined,
      };
      if (isEdit && editId) {
        return updateExpense(tenantId!, editId, payload);
      }
      return createExpense(tenantId!, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses", tenantId] });
      if (editId) {
        void qc.invalidateQueries({ queryKey: ["expense", tenantId, editId] });
      }
      if (tenantCode) {
        router.push(expensePageRoute(tenantCode, "expenses"));
      }
    },
  });

  const handleCancel = () => {
    if (tenantCode) {
      router.push(expensePageRoute(tenantCode, "expenses"));
    }
  };

  const locations = config?.businessLocations ?? [];
  const paymentDue = Math.max(
    0,
    (Number(form.totalAmount) || 0) - (Number(form.taxAmount) || 0),
  );

  return (
    <ListPageShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      showImport={false}
      showDateRange={false}
      showSearch={false}
    >
      {isHq6 ? (
        <div className="space-y-4">
          {isEdit && loadingExpense ? (
            <div className="hq6-form-card text-sm text-[#555]">Loading expense…</div>
          ) : (
            <>
              <section className="hq6-form-card">
                <div className="hq6-form-grid hq6-form-grid-3">
                  <label className="hq6-form-label">
                    <span>
                      Business Location <span className="req">*</span>
                    </span>
                    <select
                      className="hq6-form-input"
                      value={form.locationCode}
                      onChange={(e) =>
                        setForm({ ...form, locationCode: e.target.value })
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
                    <span>Expense Category</span>
                    <select
                      className="hq6-form-input"
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm({ ...form, categoryId: e.target.value })
                      }
                    >
                      <option value="">Please Select</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="hq6-form-label">
                    <span>Sub category</span>
                    <input
                      className="hq6-form-input"
                      value={form.subCategory}
                      onChange={(e) =>
                        setForm({ ...form, subCategory: e.target.value })
                      }
                    />
                  </label>
                  <label className="hq6-form-label">
                    <span>Reference No</span>
                    <input
                      className="hq6-form-input"
                      value={form.refNo}
                      onChange={(e) => setForm({ ...form, refNo: e.target.value })}
                    />
                    <p className="hq6-form-hint">Leave empty to autogenerate</p>
                  </label>
                  <label className="hq6-form-label">
                    <span>
                      Date <span className="req">*</span>
                    </span>
                    <input
                      type="datetime-local"
                      className="hq6-form-input"
                      value={form.expenseDate}
                      onChange={(e) =>
                        setForm({ ...form, expenseDate: e.target.value })
                      }
                    />
                  </label>
                  <label className="hq6-form-label">
                    <span>Expense for</span>
                    <input
                      className="hq6-form-input"
                      value={form.expenseFor}
                      onChange={(e) =>
                        setForm({ ...form, expenseFor: e.target.value })
                      }
                      placeholder="None"
                    />
                  </label>
                  <label className="hq6-form-label">
                    <span>Expense for contact</span>
                    <input
                      className="hq6-form-input"
                      value={form.contactName}
                      onChange={(e) =>
                        setForm({ ...form, contactName: e.target.value })
                      }
                    />
                  </label>
                  <label className="hq6-form-label">
                    <span>Attach Document</span>
                    <div className="hq6-form-file">
                      <input type="file" accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png" />
                    </div>
                    <p className="hq6-form-hint">
                      Max File size: 5MB · Allowed: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png
                    </p>
                  </label>
                  <label className="hq6-form-label">
                    <span>Applicable Tax</span>
                    <select className="hq6-form-input" defaultValue="none">
                      <option value="none">None</option>
                    </select>
                  </label>
                  <label className="hq6-form-label">
                    <span>
                      Total amount <span className="req">*</span>
                    </span>
                    <input
                      type="number"
                      className="hq6-form-input"
                      placeholder="Total amount"
                      value={form.totalAmount}
                      onChange={(e) =>
                        setForm({ ...form, totalAmount: e.target.value })
                      }
                    />
                  </label>
                  <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
                    <span>Expense note</span>
                    <textarea
                      className="hq6-form-input"
                      rows={3}
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
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
                      setForm({ ...form, isRecurring: e.target.checked })
                    }
                  />
                  Is Recurring?
                </label>
                {form.isRecurring ? (
                  <div className="hq6-form-grid hq6-form-grid-2">
                    <label className="hq6-form-label">
                      <span>
                        Recurring interval <span className="req">*</span>
                      </span>
                      <div className="hq6-form-pay-term">
                        <input
                          type="number"
                          className="hq6-form-input"
                          value={form.recurInterval}
                          onChange={(e) =>
                            setForm({ ...form, recurInterval: e.target.value })
                          }
                        />
                        <select
                          className="hq6-form-input"
                          value={form.recurIntervalType}
                          onChange={(e) =>
                            setForm({
                              ...form,
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
                      <span>No. of Repetitions</span>
                      <input className="hq6-form-input" placeholder="" />
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
                      Amount <span className="req">*</span>
                    </span>
                    <input
                      type="number"
                      className="hq6-form-input"
                      value={form.totalAmount || "0.00"}
                      onChange={(e) =>
                        setForm({ ...form, totalAmount: e.target.value })
                      }
                    />
                  </label>
                  <label className="hq6-form-label">
                    <span>
                      Paid on <span className="req">*</span>
                    </span>
                    <input
                      type="datetime-local"
                      className="hq6-form-input"
                      value={form.expenseDate}
                      onChange={(e) =>
                        setForm({ ...form, expenseDate: e.target.value })
                      }
                    />
                  </label>
                  <label className="hq6-form-label">
                    <span>
                      Payment Method <span className="req">*</span>
                    </span>
                    <select
                      className="hq6-form-input"
                      value={form.paymentStatus === "paid" ? "cash" : "cash"}
                      onChange={() => undefined}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="transfer">Bank Transfer</option>
                    </select>
                  </label>
                  <label className="hq6-form-label">
                    <span>Payment Account</span>
                    <select className="hq6-form-input" defaultValue="">
                      <option value="">None</option>
                    </select>
                  </label>
                  <label className="hq6-form-label" style={{ gridColumn: "1 / -1" }}>
                    <span>Payment note</span>
                    <textarea className="hq6-form-input" rows={2} />
                  </label>
                </div>
                <div className="hq6-form-total-row">
                  Payment due: {paymentDue.toFixed(2)}
                </div>
              </section>

              <div className="hq6-form-save-row">
                <button
                  type="button"
                  className="hq6-modal-btn hq6-modal-btn-close"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="hq6-btn-purple"
                  disabled={saveMutation.isPending || !form.totalAmount}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
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
                  <select
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
                    onChange={(e) => setForm({ ...form, refNo: e.target.value })}
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
                      setForm({ ...form, expenseDate: e.target.value })
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
                      setForm({ ...form, locationCode: e.target.value })
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
                      setForm({ ...form, totalAmount: e.target.value })
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
                      setForm({ ...form, taxAmount: e.target.value })
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
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !form.totalAmount}
                >
                  {saveMutation.isPending
                    ? "Saving…"
                    : isEdit
                      ? "Update Expense"
                      : "Save Expense"}
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
      )}
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
  const qc = useQueryClient();
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
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<ExpenseCategory>({
    queryKey: ["expense-categories", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit) => getExpenseCategoriesPage(tenantId!, cursor, limit),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createExpenseCategory(tenantId!, { name: newName, code: newCode || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-categories", tenantId] });
      setNewName("");
      setNewCode("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; name: string; code?: string }) =>
      updateExpenseCategory(tenantId!, vars.id, {
        name: vars.name,
        code: vars.code,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-categories", tenantId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tenantId!, id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["expense-categories", tenantId] }),
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
        error={error ? "Failed to load expense categories" : null}
        emptyState={{
          message: "No expense categories yet. Create one to classify business expenses.",
        }}
      />
    </ListPageShell>
  );
}
