"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { PaymentRecord } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6Field, Hq6Modal } from "@/components/hq6/Hq6Modal";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
import {
  bulkLinkPayments,
  getAllPayments,
  getPaymentsPage,
} from "@/lib/api/payments";
import { updateSalePayment } from "@/lib/api/sales";
import { updateStockMovementPayment } from "@/lib/api/stockMovements";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { createdAtListCursor } from "@/lib/utils/pagination";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentMethod,
} from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";
import { tenantBasePath } from "@/lib/utils/tenantMount";

interface PaymentRow {
  id: string;
  date: string;
  paymentRef: string;
  invoiceRef: string;
  amount: number;
  paymentType: string;
  account: string;
  linked: boolean;
  description: string;
  method: string;
}

/** HQ6 List Payments — matches Payment Accounts shell chrome. */
export function Hq6PaymentsListView() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const chrome = useHq6ListChrome("payments");
  const exportList = useListExport();

  const unlinkedOnly =
    searchParams.get("unlinked") === "1" ||
    searchParams.get("unlinked") === "true";

  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "all_time",
    isolateDateRange: true,
  });

  const [typeFilter, setTypeFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [editing, setEditing] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("cash");
  const [editNote, setEditNote] = useState("");
  const [editPaidOn, setEditPaidOn] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAccountId, setBulkAccountId] = useState("");
  const [bulkPaymentIds, setBulkPaymentIds] = useState<string[] | null>(null);

  const apiFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
      unlinkedOnly: unlinkedOnly || undefined,
    }),
    [bounds?.from, bounds?.to, unlinkedOnly],
  );

  const listPage = useServerListPage<PaymentRecord>({
    queryKey: ["payments", tenantId, unlinkedOnly ? "unlinked" : "all"],
    enabled: Boolean(tenantId),
    search,
    searchMode: "hybrid",
    filters: {
      ...apiFilters,
      type: typeFilter || undefined,
      account: accountFilter || undefined,
    },
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getPaymentsPage(
        tenantId!,
        {
          ...apiFilters,
          search: opts?.search,
          includeSummary: opts?.includeSummary,
        },
        cursor,
        limit,
      ),
    getCursor: (row) => createdAtListCursor(row),
  });

  const {

    items: data,
    isLoading,
    isFetching,
    error,
    pageIndex,
    pageSize,
    setPageSize,
    hasMore,
    canGoPrev,
    goPrev,
    goNext,
    goToPage,
    canSelectPage,
    totalCount,
    isPaging,
    isSearching,
  } = listPage;

  const rows: PaymentRow[] = useMemo(
    () =>
      data.map((payment) => ({
        id: payment.id,
        date: payment.paidOn ?? payment.createdAt,
        paymentRef: payment.paymentRefNo ?? "—",
        invoiceRef: payment.saleReference ?? "—",
        amount: payment.amount,
        paymentType: payment.isReturn ? "Return" : "Payment",
        account: payment.accountName?.trim() || "",
        linked: Boolean(payment.accountId && payment.accountName),
        description: payment.paymentFor ?? payment.note ?? "—",
        method: payment.method ?? "",
      })),
    [data],
  );

  const accountOptions = useMemo(
    () => uniqueFieldOptions(rows.filter((r) => r.linked), "account"),
    [rows],
  );

  const filtered = useMemo(() => {
    let next = rows;
    if (typeFilter) next = next.filter((row) => row.paymentType === typeFilter);
    if (accountFilter) {
      next = next.filter((row) => row.account === accountFilter);
    }
    return next;
  }, [accountFilter, rows, typeFilter]);

  const invalidatePaymentQueries = useCallback(async () => {
    void queryClient.invalidateQueries({ queryKey: ["payments", tenantId] });
    void queryClient.invalidateQueries({
      queryKey: ["payment-accounts", tenantId],
    });
  }, [queryClient, tenantId]);

  const saveMutation = useAppMutation({
    mutationFn: async (vars: {
      saleId: string | null;
      stockMovementId: string | null;
      paymentId: string;
      amount: number;
      method: string;
      note: string | null;
      paidOn: string | null;
      accountId: string;
    }) => {
      if (!tenantId) {
        throw new Error("No tenant");
      }
      if (vars.saleId) {
        return updateSalePayment(tenantId, vars.saleId, vars.paymentId, {
          amount: vars.amount,
          method: vars.method,
          note: vars.note,
          paidOn: vars.paidOn,
          accountId: vars.accountId,
        });
      }
      if (vars.stockMovementId) {
        return updateStockMovementPayment(
          tenantId,
          vars.stockMovementId,
          vars.paymentId,
          {
            amount: vars.amount,
            method: vars.method,
            note: vars.note,
            paidOn: vars.paidOn,
            accountId: vars.accountId,
          },
        );
      }
      throw new Error(
        "Only sale or purchase payments can be edited here. Edit expenses from the Expenses list.",
      );
    },
    progressLabel: "Updating payment",
    successMessage: "Payment updated",
    onSuccess: () => {
      void invalidatePaymentQueries();
    },
  });

  const handleSavePayment = () => {
    if (saveMutation.isPending || !editing) return;
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!editAccountId.trim()) {
      toast.error(
        "Select a Payment Account so this payment stays on the account book",
      );
      return;
    }
    if (!editing.saleId && !editing.stockMovementId) {
      toast.error(
        "Expense payments: use Edit on the Expenses list (View Payments → Edit payment).",
      );
      return;
    }
    const vars = {
      saleId: editing.saleId,
      stockMovementId: editing.stockMovementId ?? null,
      paymentId: editing.id,
      amount,
      method: editMethod,
      note: editNote.trim() || null,
      paidOn: editPaidOn ? new Date(editPaidOn).toISOString() : null,
      accountId: editAccountId,
    };
    setEditing(null);
    saveMutation.mutate(vars);
  };

  const bulkLinkMutation = useAppMutation({
    mutationFn: async (vars: {
      accountId: string;
      paymentIds: string[] | null;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      if (!vars.accountId.trim()) {
        throw new Error("Select a Payment Account");
      }
      if (vars.paymentIds && vars.paymentIds.length > 0) {
        return bulkLinkPayments(tenantId, {
          accountId: vars.accountId,
          paymentIds: vars.paymentIds,
        });
      }
      let totalLinked = 0;
      let remaining = Number.POSITIVE_INFINITY;
      let accountName = "";
      while (remaining > 0) {
        const result = await bulkLinkPayments(tenantId, {
          accountId: vars.accountId,
          allUnlinked: true,
          limit: 200,
        });
        totalLinked += result.linked;
        remaining = result.remaining;
        accountName = result.accountName;
        if (result.linked === 0) break;
      }
      return {
        linked: totalLinked,
        skipped: 0,
        remaining,
        accountId: vars.accountId,
        accountName,
      };
    },
    progressLabel: "Linking payments",
    successMessage: (result) =>
      `Linked ${result.linked} to ${result.accountName}` +
      (result.remaining > 0 ? ` (${result.remaining} still unlinked)` : ""),
    onSuccess: async () => {
      void invalidatePaymentQueries();
    },
  });

  const handleBulkLink = () => {
    if (!bulkAccountId.trim()) {
      toast.error("Select a Payment Account");
      return;
    }
    const vars = {
      accountId: bulkAccountId,
      paymentIds: bulkPaymentIds,
    };
    setBulkOpen(false);
    setBulkPaymentIds(null);
    setBulkAccountId("");
    bulkLinkMutation.mutate(vars);
  };

  const openEdit = useCallback((record: PaymentRecord) => {
    if (!record.saleId && !record.stockMovementId) {
      toast.error(
        "Expense payments: open Expenses → Edit (or View Payments → Edit payment).",
      );
      return;
    }
    setEditing(record);
    setEditAmount(String(record.amount));
    setEditMethod(record.method ?? "cash");
    setEditNote(record.note ?? "");
    setEditPaidOn(
      record.paidOn
        ? record.paidOn.slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    );
    setEditAccountId(record.accountId ?? "");
  }, []);

  const openBulk = (paymentIds: string[] | null) => {
    setBulkPaymentIds(paymentIds);
    setBulkAccountId("");
    setBulkOpen(true);
  };

  const paymentsBase = tenantCode ? `${tenantBasePath(tenantCode)}/payments` : "/payments";

  const columns: ColumnConfig<PaymentRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortValue: (row) => new Date(row.date).getTime(),
        render: (row) => formatHq6DateTime(row.date),
      },
      { key: "paymentRef", header: "Payment Ref No." },
      { key: "invoiceRef", header: "Invoice No." },
      {
        key: "amount",
        header: "Amount",
        numeric: true,
        sortValue: (row) => row.amount,
        render: (row) => formatHq6Currency(row.amount),
      },
      {
        key: "method",
        header: "Payment Method",
        render: (row) => formatHq6PaymentMethod(row.method) || "—",
      },
      { key: "paymentType", header: "Payment Type" },
      {
        key: "linked",
        header: "Link status",
        sortable: false,
        render: (row) =>
          row.linked ? (
            <span className="label bg-green">Linked</span>
          ) : (
            <span className="label bg-red">Not linked</span>
          ),
      },
      {
        key: "account",
        header: "Payment account",
        render: (row) =>
          row.linked ? (
            row.account
          ) : (
            <span className="text-[#b91c1c] italic">None</span>
          ),
      },
      {
        key: "description",
        header: "Description",
        sortable: false,
        render: (row) => (
          <span className="whitespace-pre-line">{row.description}</span>
        ),
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => {
          const record = data.find((p) => p.id === row.id);
          const canEdit = Boolean(record?.saleId || record?.stockMovementId);
          return (
            <button
              type="button"
              className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-primary btn-modal"
              disabled={!canEdit}
              onClick={() => {
                if (record) openEdit(record);
              }}
            >
              <i className="glyphicon glyphicon-edit" aria-hidden />{" "}
              {row.linked ? "Edit" : "Link account"}
            </button>
          );
        },
      },
    ],
    [data, openEdit],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  const handleExport = useCallback(async () => {
    if (!tenantId) return;
    const all = await getAllPayments(tenantId, {
      ...apiFilters,
      search: search || undefined,
    });
    exportList(
      "payments",
      [
        { key: "date", header: "Date" },
        { key: "paymentRef", header: "Payment Ref No." },
        { key: "invoiceRef", header: "Invoice No." },
        { key: "amount", header: "Amount" },
        { key: "method", header: "Payment Method" },
        { key: "paymentType", header: "Payment Type" },
        { key: "account", header: "Payment account" },
        { key: "description", header: "Description" },
      ],
      all.map((payment) => ({
        date: payment.paidOn ?? payment.createdAt,
        paymentRef: payment.paymentRefNo ?? "",
        invoiceRef: payment.saleReference ?? "",
        amount: payment.amount,
        method: payment.method ?? "",
        paymentType: payment.isReturn ? "Return" : "Payment",
        account: payment.accountName ?? "",
        description: payment.paymentFor ?? payment.note ?? "",
      })),
      "Export Payments Spreadsheet",
    );
  }, [apiFilters, exportList, search, tenantId]);

  return (
    <Hq6StandardListShell
      slug="payments"
      title="Payments"
      tabLabel={unlinkedOnly ? "Not linked to account" : "All payments"}
      boxTitle=""
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search ..."
      columnOptions={columnOptions}
      onExport={() => void handleExport()}
      hidePrimaryAction
      tabs={[
        {
          id: "all",
          label: "All payments",
          active: !unlinkedOnly,
          iconClass: "fa fa-list",
          onClick: () => {
            if (tenantCode) router.push(paymentsBase);
          },
        },
        {
          id: "unlinked",
          label: "Not linked to account",
          active: unlinkedOnly,
          iconClass: "fa fa-unlink",
          onClick: () => {
            if (tenantCode) router.push(`${paymentsBase}?unlinked=1`);
          },
        },
      ]}
      tabActions={
        unlinkedOnly ? (
          <UposGradientActionButton
            label="Bulk link all unlinked…"
            onClick={() => openBulk(null)}
          />
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
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            emptyLabel="All"
            options={[
              { value: "Payment", label: "Payment" },
              { value: "Return", label: "Return" },
            ]}
          />
          {!unlinkedOnly ? (
            <Hq6FilterSelect
              label="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              emptyLabel="All"
              options={accountOptions}
            />
          ) : null}
        </Hq6FilterGrid>
      }
      summaryStrip={
        unlinkedOnly ? (
          <div className="callout callout-warning mb-0" role="status">
            <p className="mb-0">
              These sale payments have <strong>no Payment Account</strong>. They
              match the count on Payment Accounts. Select rows and use{" "}
              <strong>Assign account</strong>, or bulk-link everything from the
              tab action.
            </p>
          </div>
        ) : undefined
      }
      pagination={{
        pageIndex,
        pageSize,
        itemCount: filtered.length,
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
          <Hq6Modal
            open={Boolean(editing)}
            onClose={() => setEditing(null)}
            title="Edit payment"
            size="md"
            footer={
              <>
                <button
                  type="button"
                  className="tw-dw-btn"
                  onClick={() => setEditing(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-primary"
                  disabled={saveMutation.isPending}
                  onClick={handleSavePayment}
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
              <Hq6Field label="Paid on *">
                <Hq6DateTimeInput
                  className="form-control"
                  value={editPaidOn}
                  onChange={(v) => setEditPaidOn(v)}
                />
              </Hq6Field>
              <Hq6Field label="Payment Method *">
                <select
                  className="form-control"
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </Hq6Field>
              <Hq6Field label="Payment Account">
                <PaymentAccountSelect
                  value={editAccountId}
                  onChange={setEditAccountId}
                />
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

          <Hq6Modal
            open={bulkOpen}
            onClose={() => {
              setBulkOpen(false);
            }}
            title="Assign payment account"
            size="md"
            footer={
              <>
                <button
                  type="button"
                  className="tw-dw-btn"
                  onClick={() => setBulkOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-primary"
                  disabled={!bulkAccountId.trim()}
                  onClick={handleBulkLink}
                >
                  {bulkPaymentIds
                    ? `Link ${bulkPaymentIds.length} selected`
                    : "Link all unlinked (batches)"}
                </button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-[#4b5563]">
                {bulkPaymentIds
                  ? `Assign a till/bank to ${bulkPaymentIds.length} selected payment(s). Credits will post to that account book.`
                  : "Assign one till/bank to every unlinked sale payment (in batches of 200 until none remain)."}
              </p>
              <Hq6Field label="Payment Account *">
                <PaymentAccountSelect
                  value={bulkAccountId}
                  onChange={setBulkAccountId}
                />
              </Hq6Field>
            </div>
          </Hq6Modal>
        </>
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        stickyFirstColumn
        density={chrome.density}
        onDensityChange={chrome.setDensity}
        showDensityControl={false}
        selectable={unlinkedOnly}
        bulkActions={
          unlinkedOnly
            ? [
                {
                  id: "assign-account",
                  label: "Assign account",
                  onClick: (selectedIds) => openBulk(selectedIds),
                },
              ]
            : undefined
        }
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Could not load payments." : null}
        emptyState={{
          message: unlinkedOnly
            ? "No unlinked payments — every sale payment has an account."
            : "No data available in table",
        }}
      />
    </Hq6StandardListShell>
  );
}

/** @deprecated Prefer Hq6PaymentsListView — kept for lazy import name stability. */
export const PaymentsListView = Hq6PaymentsListView;
