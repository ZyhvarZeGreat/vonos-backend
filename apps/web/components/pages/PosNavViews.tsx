"use client";

import { useMemo } from "react";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getAccountBookPage, getPaymentsPage } from "@/lib/api/payments";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
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
}

export function AccountBookView({ accountId }: { accountId?: string }) {
  const openExportModal = useUiStore((state) => state.openExportModal);

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
  } = useServerListPage<AccountTransaction>({
    queryKey: ["account-book", accountId],
    enabled: Boolean(accountId),
    fetchPage: (cursor, limit) => getAccountBookPage(accountId!, cursor, limit),
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
      <ServerPaginatedTable
        items={rows}
        columns={columns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        isFetching={isFetching}
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
  } = useServerListPage<PaymentRecord>({
    queryKey: ["payments", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit) => getPaymentsPage(tenantId!, undefined, cursor, limit),
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
      <ServerPaginatedTable
        items={rows}
        columns={columns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        isFetching={isFetching}
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
