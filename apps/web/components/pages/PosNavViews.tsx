"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getAccountBookPage, getPaymentsPage } from "@/lib/api/payments";
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
import { useUiStore } from "@/stores/uiStore";
import type { AccountTransaction, PaymentRecord } from "@vonos/types";
import { CatalogMetaListView } from "@/components/pages/CatalogMetaListView";
import { PosTerminalView } from "@/components/pages/PosTerminalView";

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
  const openExportModal = useUiStore((state) => state.openExportModal);
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [typeFilter, setTypeFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
      search: search.trim() || undefined,
      type: typeFilter || undefined,
    }),
    [bounds?.from, bounds?.to, search, typeFilter],
  );

  const listPage = useServerListPage<AccountTransaction>({
    queryKey: ["account-book", accountId],
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
      onExport={() =>
        openExportModal({
          title: "Export Account Book",
          subtitle: "Download ledger lines as CSV",
        })
      }
    >
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
  );
}

interface PaymentRow {
  id: string;
  date: string;
  paymentRef: string;
  invoiceRef: string;
  amount: number;
  paymentType: string;
  account: string;
  description: string;
}

export function PaymentsListView() {
  const { tenantId } = useRouteTenant();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [typeFilter, setTypeFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      from: bounds?.from,
      to: bounds?.to,
      search: search.trim() || undefined,
    }),
    [bounds?.from, bounds?.to, search],
  );

  const listPage = useServerListPage<PaymentRecord>({
    queryKey: ["payments", tenantId],
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
        account: payment.accountName ?? "—",
        description: payment.paymentFor ?? payment.note ?? "—",
      })),
    [data],
  );

  const accountOptions = useMemo(
    () => uniqueFieldOptions(rows, "account").filter((o) => o.value !== "—"),
    [rows],
  );

  const filtered = useMemo(() => {
    let next = rows;
    if (typeFilter) next = next.filter((row) => row.paymentType === typeFilter);
    if (accountFilter) next = next.filter((row) => row.account === accountFilter);
    return next;
  }, [accountFilter, rows, typeFilter]);

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
      { key: "account", header: "Account" },
      {
        key: "description",
        header: "Description",
        render: (row) => <span className="whitespace-pre-line">{row.description}</span>,
      },
      {
        key: "action",
        header: "Action",
        render: () => (
          <Button variant="secondary" size="sm" className="text-sky-600">
            Link Account
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Payments" }]}
      activeTab="all"
      onTabChange={() => {}}
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
        {
          id: "account",
          label: "Account",
          value: accountFilter,
          onChange: setAccountFilter,
          options: accountOptions,
        },
      ]}
      onExport={() =>
        openExportModal({
          title: "Export Payments",
          subtitle: "Download payment list as CSV",
        })
      }
    >
      <ServerPaginatedTable
        items={filtered}
        columns={columns}
        pagination={serverPaginationBarProps(listPage)}
        isLoading={isLoading}
        error={error ? "Failed to load payments" : null}
        emptyState={{ message: "No payments recorded yet." }}
      />
    </ListPageShell>
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
  "import-products": createPosPlaceholderView("Import Products", "Bulk product import is not available yet."),
  "import-opening-stock": createPosPlaceholderView("Import Opening Stock"),
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
