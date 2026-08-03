"use client";

import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { PaymentAccountFormModal } from "@/components/organisms/PaymentAccountModals";
import {
  bulkLinkPayments,
  getAccountBookPage,
  getPaymentsPage,
} from "@/lib/api/payments";
import {
  getPaymentAccount,
  updatePaymentAccount,
} from "@/lib/api/paymentAccounts";
import { updateSalePayment } from "@/lib/api/sales";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { serverPaginationBarProps, useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  amountCellClassName,
  formatCreditCell,
  formatDebitCell,
} from "@/lib/utils/ledgerAmountStyles";
import { cn } from "@/lib/utils/cn";
import type {
  AccountTransaction,
  PaymentRecord,
} from "@vonos/types";
import { CatalogMetaListView } from "@/components/pages/CatalogMetaListView";
import { PosTerminalView } from "@/components/pages/PosTerminalView";
import { Hq6ImportContactsView } from "@/components/pages/Hq6ImportContactsView";
import { Hq6ImportProductsView } from "@/components/pages/Hq6ImportProductsView";
import { Hq6ImportOpeningStockView } from "@/components/pages/Hq6ImportOpeningStockView";
import { Hq6Field, Hq6Modal } from "@/components/hq6/Hq6Modal";
import { toast } from "@/stores/toastStore";

export function createPosPlaceholderView(title: string, message?: string) {
  return function PosPlaceholderView() {
    return (
      <EmptyState
        title={title}
        message={
          message ??
          "This section is not available yet. Contact your administrator if you need access."
        }
      />
    );
  };
}

interface AccountBookRow {
  id: string;
  date: string;
  account: string;
  description: string;
  paymentMethod: string;
  paymentDetails: string;
  debit: number | null;
  credit: number | null;
  accountBalance: number;
  type: "debit" | "credit";
}

export function AccountBookView({ accountId }: { accountId?: string }) {
  const { tenantId } = useRouteTenant();
  const queryClient = useQueryClient();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters({
    defaultDateRange: "last_7_days",
    isolateDateRange: true,
  });
  const [typeFilter, setTypeFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const { data: account } = useQuery({
    queryKey: ["payment-account", tenantId, accountId],
    queryFn: () => getPaymentAccount(tenantId!, accountId!),
    enabled: Boolean(tenantId && accountId),
  });

  const apiFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
      type: typeFilter || undefined,
    }),
    [bounds?.from, bounds?.to, search, typeFilter],
  );

  const listPage = useServerListPage<AccountTransaction>({
    queryKey: ["account-book", tenantId, accountId],
    enabled: Boolean(accountId),
    search,
    filters: apiFilters,
    fetchPage: (cursor, limit, _sort, opts) =>
      getAccountBookPage(accountId!, cursor, limit, { ...apiFilters, includeSummary: opts?.includeSummary }),
  });

  const { items: data, isLoading, error } = listPage;

  const rows: AccountBookRow[] = useMemo(() => {
    return data.map((txn: AccountTransaction & { accountBalance?: number }) => ({
      id: txn.id,
      date: txn.operationDate.slice(0, 16).replace("T", " "),
      account: txn.accountName ?? "—",
      description: [txn.subType, txn.note, txn.refNo ? `Ref: ${txn.refNo}` : null]
        .filter(Boolean)
        .join("\n"),
      paymentMethod: txn.paymentMethod ?? "—",
      paymentDetails: txn.paymentDetails ?? "",
      debit: txn.type === "debit" ? txn.amount : null,
      credit: txn.type === "credit" ? txn.amount : null,
      accountBalance: txn.accountBalance ?? 0,
      type: txn.type,
    }));
  }, [data]);

  const filtered = rows;

  const columns: ColumnConfig<AccountBookRow>[] = useMemo(
    () => [
      { key: "date", header: "Date" },
      { key: "account", header: "Account" },
      {
        key: "description",
        header: "Description",
        render: (row) => (
          <span className="whitespace-pre-line text-sm text-muted">{row.description}</span>
        ),
      },
      { key: "paymentMethod", header: "Payment Method" },
      { key: "paymentDetails", header: "Payment details" },
      {
        key: "debit",
        header: "Debit",
        render: (row) => {
          const cell = formatDebitCell(row.debit, "NGN");
          return <span className={cell.className}>{cell.text}</span>;
        },
      },
      {
        key: "credit",
        header: "Credit",
        render: (row) => {
          const cell = formatCreditCell(row.credit, "NGN");
          return <span className={cell.className}>{cell.text}</span>;
        },
      },
      {
        key: "accountBalance",
        header: "Account Balance",
        render: (row) => (
          <span className={cn(amountCellClassName("balance", row.accountBalance))}>
            {formatCurrency(row.accountBalance, "NGN")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPageShell
        tabs={[{ id: "ledger", label: "Account Book" }]}
        activeTab="ledger"
        onTabChange={() => {}}
        showImport={false}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ledger…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        primaryAction={
          account ? (
            <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
              Edit Account
            </Button>
          ) : null
        }
        filterDropdowns={[
          {
            id: "type",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: "debit", label: "Debit" },
              { value: "credit", label: "Credit" },
            ],
          },
        ]}
      >
        {account ? (
          <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">{account.name}</p>
            <p className="text-muted">
              Account Type: {account.accountType ?? "—"} · Account Number:{" "}
              {account.accountNumber}
            </p>
            <p
              className={cn(
                "mt-1 font-medium",
                amountCellClassName("balance", account.balance),
              )}
            >
              Balance: {formatCurrency(account.balance, account.currency)}
            </p>
          </div>
        ) : null}
        <ServerPaginatedTable
          items={filtered}
          columns={columns}
          pagination={serverPaginationBarProps(listPage)}
          isLoading={isLoading}
          error={error ? "Failed to load account book" : null}
          emptyState={{
            message: accountId
              ? "No ledger entries for this account."
              : "Select an account from Payment Accounts to view its book.",
          }}
        />
      </ListPageShell>
      <PaymentAccountFormModal
        open={editOpen && Boolean(account)}
        account={account ?? null}
        onClose={() => setEditOpen(false)}
        onSave={async (payload) => {
          if (!tenantId || !accountId) return;
          await updatePaymentAccount(tenantId, accountId, payload);
          await queryClient.invalidateQueries({
            queryKey: ["payment-account", tenantId, accountId],
          });
          await queryClient.invalidateQueries({
            queryKey: ["payment-accounts", tenantId],
          });
          toast.success("Account updated");
          setEditOpen(false);
        }}
      />
    </>
  );
}

interface PaymentRow {
  id: string;
  date: string;
  paymentRef: string;
  invoiceRef: string;
  amount: number;
  paymentType: string;
  /** Display name, or empty when not linked */
  account: string;
  linked: boolean;
  description: string;
}

export function PaymentsListView() {
  const { tenantId, tenantCode } = useRouteTenant();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const unlinkedOnly =
    searchParams.get("unlinked") === "1" ||
    searchParams.get("unlinked") === "true";
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
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
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const apiFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
      unlinkedOnly: unlinkedOnly || undefined,
    }),
    [bounds?.from, bounds?.to, search, unlinkedOnly],
  );

  const listPage = useServerListPage<PaymentRecord>({
    queryKey: ["payments", tenantId, unlinkedOnly ? "unlinked" : "all"],
    enabled: Boolean(tenantId),
    search,
    filters: {
      ...apiFilters,
      type: typeFilter || undefined,
      account: accountFilter || undefined,
    },
    fetchPage: (cursor, limit, _sort, opts) =>
      getPaymentsPage(tenantId!, { ...apiFilters, includeSummary: opts?.includeSummary }, cursor, limit),
  });

  const { items: data, isLoading, error } = listPage;

  const rows: PaymentRow[] = useMemo(
    () =>
      data.map((payment: PaymentRecord) => ({
        id: payment.id,
        date:
          payment.paidOn?.slice(0, 16).replace("T", " ") ??
          payment.createdAt.slice(0, 16).replace("T", " "),
        paymentRef: payment.paymentRefNo ?? "—",
        invoiceRef: payment.saleReference ?? "—",
        amount: payment.amount,
        paymentType: payment.isReturn ? "Return" : "Payment",
        account: payment.accountName?.trim() || "",
        linked: Boolean(payment.accountId && payment.accountName),
        description: payment.paymentFor ?? payment.note ?? "—",
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
    if (accountFilter) next = next.filter((row) => row.account === accountFilter);
    return next;
  }, [accountFilter, rows, typeFilter]);

  const invalidatePaymentQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["payments", tenantId] });
    await queryClient.invalidateQueries({
      queryKey: ["payment-accounts", tenantId],
    });
  };

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId || !editing?.saleId) {
        throw new Error("Only sale-linked payments can be edited here");
      }
      const amount = Number(editAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount");
      }
      if (!editAccountId.trim()) {
        throw new Error(
          "Select a Payment Account so this payment stays on the account book",
        );
      }
      return updateSalePayment(tenantId, editing.saleId, editing.id, {
        amount,
        method: editMethod,
        note: editNote.trim() || null,
        paidOn: editPaidOn ? new Date(editPaidOn).toISOString() : null,
        accountId: editAccountId || null,
      });
    },
    successMessage: "Payment linked to account",
    onSuccess: async () => {
      await invalidatePaymentQueries();
      setEditing(null);
    },
  });

  const bulkLinkMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      if (!bulkAccountId.trim()) {
        throw new Error("Select a Payment Account");
      }
      // Selected rows: one request. All unlinked: keep batching until done.
      if (bulkPaymentIds && bulkPaymentIds.length > 0) {
        setBulkProgress(`Linking ${bulkPaymentIds.length} selected…`);
        return bulkLinkPayments(tenantId, {
          accountId: bulkAccountId,
          paymentIds: bulkPaymentIds,
        });
      }
      let totalLinked = 0;
      let remaining = Number.POSITIVE_INFINITY;
      let accountName = "";
      while (remaining > 0) {
        setBulkProgress(
          remaining === Number.POSITIVE_INFINITY
            ? "Linking batch…"
            : `Linked ${totalLinked} so far — ${remaining} left…`,
        );
        const result = await bulkLinkPayments(tenantId, {
          accountId: bulkAccountId,
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
        accountId: bulkAccountId,
        accountName,
      };
    },
    successMessage: (result) =>
      `Linked ${result.linked} to ${result.accountName}` +
      (result.remaining > 0 ? ` (${result.remaining} still unlinked)` : ""),
    onSuccess: async () => {
      await invalidatePaymentQueries();
      setBulkOpen(false);
      setBulkPaymentIds(null);
      setBulkAccountId("");
      setBulkProgress(null);
    },
    onError: () => {
      setBulkProgress(null);
    },
  });

  const openEdit = (record: PaymentRecord) => {
    if (!record.saleId) {
      toast.error("Expense / non-sale payments edit from Expenses.");
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
  };

  const openBulk = (paymentIds: string[] | null) => {
    setBulkPaymentIds(paymentIds);
    setBulkAccountId("");
    setBulkProgress(null);
    setBulkOpen(true);
  };

  const columns: ColumnConfig<PaymentRow>[] = useMemo(
    () => [
      { key: "date", header: "Date" },
      { key: "paymentRef", header: "Payment Ref No." },
      { key: "invoiceRef", header: "Invoice No./Ref. No." },
      {
        key: "amount",
        header: "Amount",
        sortValue: (row) => row.amount,
        render: (row) => formatCurrency(row.amount, "NGN"),
      },
      { key: "paymentType", header: "Payment Type" },
      {
        key: "linked",
        header: "Link status",
        render: (row) =>
          row.linked ? (
            <span className="text-emerald-700 font-medium">Linked</span>
          ) : (
            <span className="text-red-700 font-medium">Not linked</span>
          ),
      },
      {
        key: "account",
        header: "Payment account",
        render: (row) =>
          row.linked ? (
            <span>{row.account}</span>
          ) : (
            <span className="text-red-600 italic">None — pick account via Edit</span>
          ),
      },
      {
        key: "description",
        header: "Description",
        render: (row) => <span className="whitespace-pre-line">{row.description}</span>,
      },
      {
        key: "action",
        header: "Action",
        render: (row) => {
          const record = data.find((p) => p.id === row.id);
          const canEdit = Boolean(record?.saleId);
          return (
            <Button
              variant="secondary"
              size="sm"
              className="text-sky-600"
              disabled={!canEdit}
              onClick={() => {
                if (record) openEdit(record);
              }}
            >
              {row.linked ? "Edit" : "Link account"}
            </Button>
          );
        },
      },
    ],
    [data],
  );

  const paymentsBase = tenantCode ? `/${tenantCode}/payments` : "/payments";

  return (
    <>
      <ListPageShell
        tabs={[
          { id: "all", label: "All payments" },
          { id: "unlinked", label: "Not linked to account" },
        ]}
        activeTab={unlinkedOnly ? "unlinked" : "all"}
        onTabChange={(tabId) => {
          if (!tenantCode) return;
          if (tabId === "unlinked") {
            router.push(`${paymentsBase}?unlinked=1`);
          } else {
            router.push(paymentsBase);
          }
        }}
        showImport={false}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payments…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterDropdowns={[
          {
            id: "type",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: "Payment", label: "Payment" },
              { value: "Return", label: "Return" },
            ],
          },
          ...(unlinkedOnly
            ? []
            : [
                {
                  id: "account",
                  label: "Account",
                  value: accountFilter,
                  onChange: setAccountFilter,
                  options: accountOptions,
                },
              ]),
        ]}
      >
        {unlinkedOnly ? (
          <div className="alert alert-warning mb-3" role="status">
            <p className="mb-2">
              These sale payments have <b>no Payment Account</b>. They match the
              red count on Payment Accounts. Select rows and use{" "}
              <b>Assign account</b>, or link everything in batches:
            </p>
            <button
              type="button"
              className="tw-dw-btn tw-dw-btn-primary tw-dw-btn-sm"
              onClick={() => openBulk(null)}
            >
              Bulk link all unlinked…
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-600 mb-3">
            <b>Linked</b> = Payment account shows a till/bank name.{" "}
            <b>Not linked</b> = None. Use the{" "}
            <button
              type="button"
              className="text-sky-700 underline font-medium"
              onClick={() =>
                tenantCode && router.push(`${paymentsBase}?unlinked=1`)
              }
            >
              Not linked to account
            </button>{" "}
            tab (same list as View Details on Payment Accounts).
          </div>
        )}
        <ServerPaginatedTable
          items={filtered}
          columns={columns}
          pagination={serverPaginationBarProps(listPage)}
          isLoading={isLoading}
          error={error ? "Failed to load payments" : null}
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
          emptyState={{
            message: unlinkedOnly
              ? "No unlinked payments — every sale payment has an account."
              : "No payments recorded yet.",
          }}
        />
      </ListPageShell>

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
          if (bulkLinkMutation.isPending) return;
          setBulkOpen(false);
          setBulkProgress(null);
        }}
        title="Assign payment account"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="tw-dw-btn"
              disabled={bulkLinkMutation.isPending}
              onClick={() => setBulkOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tw-dw-btn tw-dw-btn-primary"
              disabled={bulkLinkMutation.isPending || !bulkAccountId.trim()}
              onClick={() => bulkLinkMutation.mutate()}
            >
              {bulkLinkMutation.isPending
                ? "Linking…"
                : bulkPaymentIds
                  ? `Link ${bulkPaymentIds.length} selected`
                  : "Link all unlinked (batches)"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {bulkPaymentIds
              ? `Assign a till/bank to ${bulkPaymentIds.length} selected payment(s). Credits will post to that account book.`
              : "Assign one till/bank to every unlinked sale payment (in batches of 200 until none remain). Pick the account that should have received these payments historically — usually Cash or your main POS bank."}
          </p>
          <Hq6Field label="Payment Account *">
            <PaymentAccountSelect
              value={bulkAccountId}
              onChange={setBulkAccountId}
            />
          </Hq6Field>
          {bulkProgress ? (
            <p className="text-sm text-sky-800" role="status">
              {bulkProgress}
            </p>
          ) : null}
        </div>
      </Hq6Modal>
    </>
  );
}

export const PosPlaceholderViews = {
  pos: createPosPlaceholderView("List POS"),
  "pos-terminal": PosTerminalView,
  "add-draft": createPosPlaceholderView("Add Draft"),
  drafts: createPosPlaceholderView("List Drafts"),
  "add-quotation": createPosPlaceholderView("Add Quotation"),
  quotations: createPosPlaceholderView("List Quotations"),
  shipments: createPosPlaceholderView("Shipments"),
  discounts: createPosPlaceholderView("Discounts"),
  "import-sales": createPosPlaceholderView("Import Sales", "Bulk sales import is not available yet."),
  "add-product": createPosPlaceholderView("Add Product"),
  "update-price": createPosPlaceholderView("Update Price"),
  "print-labels": createPosPlaceholderView("Print Labels"),
  variations: createPosPlaceholderView("Variations"),
  "import-products": Hq6ImportProductsView,
  "import-opening-stock": Hq6ImportOpeningStockView,
  "import-contacts": Hq6ImportContactsView,
  "price-groups": () => <CatalogMetaListView kind="price-groups" />,
  units: () => <CatalogMetaListView kind="units" />,
  categories: () => <CatalogMetaListView kind="categories" />,
  brands: () => <CatalogMetaListView kind="brands" />,
  warranties: () => <CatalogMetaListView kind="warranties" />,
  "balance-sheet": createPosPlaceholderView("Balance Sheet"),
  "trial-balance": createPosPlaceholderView("Trial Balance"),
  "cash-flow": createPosPlaceholderView("Cash Flow"),
  "payment-account-report": createPosPlaceholderView("Payment Account Report"),
};
