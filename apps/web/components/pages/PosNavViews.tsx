"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { PaymentAccountFormModal } from "@/components/organisms/PaymentAccountModals";
import { getAccountBookPage } from "@/lib/api/payments";
import {
  getPaymentAccount,
  updatePaymentAccount,
} from "@/lib/api/paymentAccounts";
import { serverPaginationBarProps, useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { operationDateListCursor } from "@/lib/utils/pagination";

import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { toast } from "@/stores/toastStore";
import {
  amountCellClassName,
  formatCreditCell,
  formatDebitCell,
} from "@/lib/utils/ledgerAmountStyles";
import { cn } from "@/lib/utils/cn";
import type { AccountTransaction } from "@vonos/types";
import { CatalogMetaListView } from "@/components/pages/CatalogMetaListView";
import { PosTerminalView } from "@/components/pages/PosTerminalView";
import { Hq6ImportContactsView } from "@/components/pages/Hq6ImportContactsView";
import { Hq6ImportProductsView } from "@/components/pages/Hq6ImportProductsView";
import { Hq6ImportOpeningStockView } from "@/components/pages/Hq6ImportOpeningStockView";

export { PaymentsListView, Hq6PaymentsListView } from "@/components/pages/Hq6PaymentsListView";

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
    searchMode: "server",
    filters: apiFilters,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getAccountBookPage(accountId!, cursor, limit, {
        ...apiFilters,
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => operationDateListCursor(row),
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
          void queryClient.invalidateQueries({
            queryKey: ["payment-account", tenantId, accountId],
          });
          void queryClient.invalidateQueries({
            queryKey: ["payment-accounts", tenantId],
          });
          toast.success("Account updated");
          setEditOpen(false);
        }}
      />
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
