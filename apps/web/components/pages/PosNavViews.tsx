"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getPaymentAccounts } from "@/lib/api/paymentAccounts";
import { getAccountBook, getPayments } from "@/lib/api/payments";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useUiStore } from "@/stores/uiStore";
import type { AccountTransaction, PaymentAccount, PaymentRecord } from "@vonos/types";
import { CatalogMetaListView } from "@/components/pages/CatalogMetaListView";
import { PosTerminalView } from "@/components/pages/PosTerminalView";

export function createPosPlaceholderView(title: string, message?: string) {
  return function PosPlaceholderView() {
    return (
      <EmptyState
        title={title}
        message={
          message ??
          "This screen matches the legacy POS menu. Data import and full workflows are coming next."
        }
      />
    );
  };
}

interface PaymentAccountRow extends PaymentAccount {
  accountSubType: string;
  addedBy: string;
}

export function PaymentAccountsListView() {
  const router = useRouter();
  const { tenantCode, tenantId } = useRouteTenant();
  const openExportModal = useUiStore((state) => state.openExportModal);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["payment-accounts", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getPaymentAccounts(tenantId);
    },
    enabled: Boolean(tenantId),
  });

  const rows: PaymentAccountRow[] = useMemo(
    () =>
      data.map((account) => ({
        ...account,
        accountSubType: account.accountSubType ?? "",
        addedBy: account.createdByName ?? "—",
      })),
    [data],
  );

  const columns: ColumnConfig<PaymentAccountRow>[] = useMemo(
    () => [
      { key: "name", header: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "accountType", header: "Account Type" },
      { key: "accountSubType", header: "Account Sub Type" },
      { key: "accountNumber", header: "Account Number" },
      { key: "note", header: "Note" },
      {
        key: "balance",
        header: "Balance",
        sortValue: (row) => row.balance,
        render: (row) => formatCurrency(row.balance, "NGN"),
      },
      { key: "addedBy", header: "Added By" },
      {
        key: "actions",
        header: "Action",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button variant="secondary" size="sm" className="text-violet-600">
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-amber-600"
              onClick={() => router.push(`/${tenantCode}/account-book/${row.id}`)}
            >
              Account Book
            </Button>
            <Button variant="secondary" size="sm" className="text-sky-600">
              Fund Transfer
            </Button>
            <Button variant="secondary" size="sm" className="text-emerald-600">
              Deposit
            </Button>
            <Button variant="secondary" size="sm" className="text-red-600">
              Close
            </Button>
          </div>
        ),
      },
    ],
    [router, tenantCode],
  );

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "All Accounts" }]}
      activeTab="all"
      onTabChange={() => {}}
      showImport={false}
      showDateRange={false}
      onExport={() =>
        openExportModal({
          title: "Export Payment Accounts",
          subtitle: "Download account list as CSV",
        })
      }
    >
      <DataTable<PaymentAccountRow>
        data={rows}
        columns={columns}
        displayMode="table"
        isLoading={isLoading}
        error={error ? "Failed to load payment accounts" : null}
        disablePagination={rows.length <= 50}
        emptyState={{ message: "No payment accounts yet. Import from legacy POS or add manually." }}
      />
    </ListPageShell>
  );
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
}

interface AccountBookViewProps {
  accountId?: string;
}

export function AccountBookView({ accountId }: AccountBookViewProps) {
  const openExportModal = useUiStore((state) => state.openExportModal);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["account-book", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      return getAccountBook(accountId);
    },
    enabled: Boolean(accountId),
  });

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
    }));
  }, [data]);

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
        render: (row) => (row.debit != null ? formatCurrency(row.debit, "NGN") : "—"),
      },
      {
        key: "credit",
        header: "Credit",
        render: (row) => (row.credit != null ? formatCurrency(row.credit, "NGN") : "—"),
      },
      {
        key: "accountBalance",
        header: "Account Balance",
        render: (row) => formatCurrency(row.accountBalance, "NGN"),
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
      showDateRange={false}
      onExport={() =>
        openExportModal({
          title: "Export Account Book",
          subtitle: "Download ledger lines as CSV",
        })
      }
    >
      <DataTable<AccountBookRow>
        data={rows}
        columns={columns}
        displayMode="table"
        isLoading={isLoading}
        error={error ? "Failed to load account book" : null}
        disablePagination={rows.length <= 100}
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

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["payments", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getPayments(tenantId);
    },
    enabled: Boolean(tenantId),
  });

  const rows: PaymentRow[] = useMemo(
    () =>
      data.map((payment: PaymentRecord) => ({
        id: payment.id,
        date: payment.paidOn?.slice(0, 16).replace("T", " ") ?? payment.createdAt.slice(0, 16).replace("T", " "),
        paymentRef: payment.paymentRefNo ?? "—",
        invoiceRef: payment.saleReference ?? "—",
        amount: payment.amount,
        paymentType: payment.isReturn ? "Return" : "Payment",
        account: payment.accountName ?? "—",
        description: payment.paymentFor ?? payment.note ?? "—",
      })),
    [data],
  );

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
      showDateRange={false}
      onExport={() =>
        openExportModal({
          title: "Export Payments",
          subtitle: "Download payment list as CSV",
        })
      }
    >
      <DataTable<PaymentRow>
        data={rows}
        columns={columns}
        displayMode="table"
        isLoading={isLoading}
        error={error ? "Failed to load payments" : null}
        disablePagination={rows.length <= 100}
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
  "import-sales": createPosPlaceholderView("Import Sales", "Bulk import will connect to the migration pipeline."),
  "add-product": createPosPlaceholderView("Add Product"),
  "update-price": createPosPlaceholderView("Update Price"),
  "print-labels": createPosPlaceholderView("Print Labels"),
  variations: createPosPlaceholderView("Variations"),
  "import-products": createPosPlaceholderView("Import Products", "Use the migration scripts for bulk product import."),
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
