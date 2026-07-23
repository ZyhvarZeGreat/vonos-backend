"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import type { PaymentAccount } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { HqReportPageLayout, HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
import {
  PaymentAccountDepositModal,
  PaymentAccountFormModal,
  PaymentAccountTransferModal,
} from "@/components/organisms/PaymentAccountModals";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import {
  closePaymentAccount,
  createPaymentAccount,
  depositPaymentAccount,
  getAllPaymentAccounts,
  getPaymentAccountsPage,
  transferPaymentAccounts,
  updatePaymentAccount,
} from "@/lib/api/paymentAccounts";
import { runReport } from "@/lib/api/reports";
import { useServerListPage, serverPaginationBarProps } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { usePaymentAccountPageTabs } from "@/lib/hooks/usePaymentAccountPageTabs";
import { useListExport } from "@/lib/hooks/useListExport";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import type { PaymentAccountPageSlug } from "@/lib/registries/paymentAccountNav";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import { useUiStore } from "@/stores/uiStore";
import type { ReportsDashboard } from "@vonos/types";

const EXPORT_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "accountType", header: "Account Type" },
  { key: "accountSubType", header: "Account Sub Type" },
  { key: "accountNumber", header: "Account Number" },
  { key: "balance", header: "Balance" },
  { key: "status", header: "Status" },
  { key: "note", header: "Note" },
  { key: "addedBy", header: "Added By" },
] as const;

export function PaymentAccountsListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const exportList = useListExport();
  const { tabs, activeTab, onTabChange } = usePaymentAccountPageTabs(
    "payment-accounts",
  );
  const { search, setSearch } = useListPageFilters();
  const [formOpen, setFormOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PaymentAccount | null>(null);
  const [depositAccount, setDepositAccount] = useState<PaymentAccount | null>(
    null,
  );
  const [transferAccount, setTransferAccount] =
    useState<PaymentAccount | null>(null);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const listPage = useServerListPage<PaymentAccount>({
    queryKey: ["payment-accounts", tenantId],
    enabled: Boolean(tenantId),
    search,
    filters: {
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    },
    fetchPage: (cursor, limit, _sort, opts) =>
      getPaymentAccountsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
        includeSummary: opts?.includeSummary,
      }),
  });

  const { items, isLoading, isFetching, error } = listPage;

  const typeOptions = useMemo(
    () => uniqueFieldOptions(items, (row) => row.accountType),
    [items],
  );

  const filteredItems = useMemo(() => {
    let rows = items;
    if (statusFilter === "open") rows = rows.filter((row) => !row.isClosed);
    if (statusFilter === "closed") rows = rows.filter((row) => row.isClosed);
    if (typeFilter) rows = rows.filter((row) => row.accountType === typeFilter);
    return rows;
  }, [items, statusFilter, typeFilter]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["payment-accounts", tenantId] });
  };

  const depositMutation = useMutation({
    mutationFn: (vars: { id: string; amount: number; note?: string; operationDate?: string; paymentMethod?: string }) =>
      depositPaymentAccount(tenantId!, vars.id, {
        amount: vars.amount,
        note: vars.note,
        operationDate: vars.operationDate,
        paymentMethod: vars.paymentMethod,
      }),
    onSuccess: invalidate,
  });

  const transferMutation = useMutation({
    mutationFn: (payload: Parameters<typeof transferPaymentAccounts>[1]) =>
      transferPaymentAccounts(tenantId!, payload),
    onSuccess: invalidate,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closePaymentAccount(tenantId!, id),
    onSuccess: invalidate,
  });

  const columns: ColumnConfig<PaymentAccount>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <RowActionsMenu
            actions={[
              {
                id: "edit",
                label: "Edit",
                onClick: () => {
                  setEditAccount(row);
                  setFormOpen(true);
                },
              },
              {
                id: "book",
                label: "Account Book",
                onClick: () => {
                  if (!tenantCode) return;
                  router.push(`/${tenantCode}/account-book/${row.id}`);
                },
              },
              ...(row.isClosed
                ? []
                : [
                    {
                      id: "transfer",
                      label: "Fund Transfer",
                      onClick: () => setTransferAccount(row),
                    },
                    {
                      id: "deposit",
                      label: "Deposit",
                      onClick: () => setDepositAccount(row),
                    },
                    {
                      id: "close",
                      label: "Close",
                      destructive: true,
                      onClick: () => {
                        if (
                          window.confirm(
                            `Close account "${row.name}"? No new transactions will be allowed.`,
                          )
                        ) {
                          closeMutation.mutate(row.id);
                        }
                      },
                    },
                  ]),
            ]}
          />
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <span className="font-medium text-foreground">{row.name}</span>
        ),
      },
      { key: "accountType", header: "Account Type", render: (r) => r.accountType ?? "—" },
      {
        key: "accountSubType",
        header: "Account Sub Type",
        render: (r) => r.accountSubType ?? "—",
      },
      { key: "accountNumber", header: "Account Number" },
      { key: "note", header: "Note", render: (r) => r.note ?? "—" },
      {
        key: "balance",
        header: "Balance",
        sortValue: (r) => r.balance,
        render: (r) => formatCurrency(r.balance, r.currency ?? "NGN"),
      },
      {
        key: "status",
        header: "Status",
        render: (r) =>
          r.isClosed ? (
            <span className="text-xs font-medium text-red-600">Closed</span>
          ) : (
            <span className="text-xs font-medium text-green-600">Open</span>
          ),
      },
      {
        key: "addedBy",
        header: "Added By",
        render: (r) => r.createdByName ?? "—",
      },
    ],
    [closeMutation, router, tenantCode],
  );

  const handleExport = async () => {
    if (!tenantId) return;
    setExporting(true);
    try {
      const rows = await getAllPaymentAccounts(tenantId, {
        search: search.trim() || undefined,
      });
      exportList(
        "payment-accounts",
        EXPORT_COLUMNS.map((col) => ({ key: col.key, header: col.header })),
        rows.map((row) => ({
          name: row.name,
          accountType: row.accountType ?? "",
          accountSubType: row.accountSubType ?? "",
          accountNumber: row.accountNumber,
          balance: row.balance,
          status: row.isClosed ? "Closed" : "Active",
          note: row.note ?? "",
          addedBy: row.createdByName ?? "",
        })),
        "Export payment accounts",
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
        searchPlaceholder="Search accounts…"
        showImport={false}
        showExport
        showDateRange={false}
        filterDropdowns={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ],
          },
          {
            id: "type",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: typeOptions,
          },
        ]}
        onExport={handleExport}
        primaryAction={
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
              onClick={() => {
                setEditAccount(null);
                setFormOpen(true);
              }}
            >
              Add Account
            </Button>
          </div>
        }
      >
        <ServerPaginatedTable
          items={filteredItems}
          columns={columns}
          pagination={serverPaginationBarProps(listPage)}
          isLoading={isLoading || exporting}
          error={error ? "Failed to load payment accounts" : null}
          emptyState={{
            message: "No payment accounts yet. Add one to get started.",
          }}
        />
      </ListPageShell>

      <PaymentAccountFormModal
        open={formOpen}
        account={editAccount}
        onClose={() => {
          setFormOpen(false);
          setEditAccount(null);
        }}
        onSave={async (payload) => {
          if (editAccount) {
            await updatePaymentAccount(tenantId!, editAccount.id, payload);
          } else {
            await createPaymentAccount(
              tenantId!,
              payload as Parameters<typeof createPaymentAccount>[1],
            );
          }
          invalidate();
        }}
      />

      <PaymentAccountDepositModal
        account={depositAccount}
        onClose={() => setDepositAccount(null)}
        onSave={async (payload) => {
          if (!depositAccount) return;
          await depositMutation.mutateAsync({
            id: depositAccount.id,
            ...payload,
          });
        }}
      />

      <PaymentAccountTransferModal
        fromAccount={transferAccount}
        accounts={items}
        onClose={() => setTransferAccount(null)}
        onSave={async (payload) => {
          await transferMutation.mutateAsync(payload);
        }}
      />
    </>
  );
}

export function PaymentAccountReportView({ slug }: { slug: PaymentAccountPageSlug }) {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const { tabs, activeTab, onTabChange } = usePaymentAccountPageTabs(slug);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const periodLabel = ledgerChartSubtitle(dateRange);
  const entry = reportEntryBySlug(slug);
  const [locationCode, setLocationCode] = useState("");
  const [accountId, setAccountId] = useState("");
  const isPaymentAccountReport = slug === "payment-account-report";
  const locations = config?.businessLocations ?? [];

  const { data: accounts = [] } = useQuery({
    queryKey: ["payment-accounts", tenantId, "filter-options"],
    queryFn: () => getAllPaymentAccounts(tenantId!),
    enabled: Boolean(tenantId && isPaymentAccountReport),
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "payment-account-report",
      tenantId,
      entry?.id,
      bounds?.from,
      bounds?.to,
      locationCode,
      accountId,
    ],
    queryFn: () =>
      runReport({
        reportId: entry!.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId: tenantId ?? undefined,
        locationCode: locationCode || undefined,
        accountId: accountId && accountId !== "none" ? accountId : undefined,
      }),
    enabled: Boolean(tenantId && entry),
    staleTime: 5 * 60_000,
  });

  if (!entry) {
    return <p className="p-6 text-sm text-muted-foreground">Unknown report.</p>;
  }

  const exportPayload =
    entry.exportable && data
      ? buildPaymentAccountReportExport(entry.id, entry.slug, data)
      : null;

  return (
    <ListPageShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      showImport={false}
      showDateRange
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      contentClassName="p-6 sm:p-8"
      primaryAction={
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
      }
      onExport={
        exportPayload
          ? () =>
              openExportModal(
                {
                  title: `Export ${entry.label}`,
                  subtitle: "Download report data as CSV",
                },
                exportPayload,
              )
          : undefined
      }
    >
      <div className="mb-4 rounded-lg border border-border bg-card p-4 print:hidden">
        <p className="mb-3 text-sm font-semibold text-foreground">Filters</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Business Location</span>
            <select
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name}
                </option>
              ))}
            </select>
          </label>
          {isPaymentAccountReport ? (
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Account</span>
              <select
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">All</option>
                <option value="none">None</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {isLoading || (isFetching && !data) ? (
        <HqReportPageSkeleton reportId={entry.id} />
      ) : error ? (
        <p className="text-sm text-red-600">Failed to load report.</p>
      ) : data ? (
        <HqReportPageLayout
          reportId={entry.id}
          title={entry.label}
          subtitle={periodLabel}
          data={data}
        />
      ) : null}
    </ListPageShell>
  );
}

function buildPaymentAccountReportExport(
  reportId: string,
  slug: string,
  data: ReportsDashboard,
) {

  if (reportId === "balance-sheet" && data.balanceSheet) {
    const { balanceSheet } = data;
    return {
      filename: slug,
      columns: [
        { key: "section", header: "Section" },
        { key: "name", header: "Account" },
        { key: "amount", header: "Amount" },
      ],
      rows: [
        ...balanceSheet.liabilities.map((line) => ({
          section: "Liability",
          name: line.label,
          amount: line.amount,
        })),
        ...balanceSheet.assets.map((line) => ({
          section: "Asset",
          name: line.label,
          amount: line.amount,
        })),
        ...balanceSheet.accountBalances.map((line) => ({
          section: "Asset",
          name: line.name,
          amount: line.balance,
        })),
      ],
    };
  }

  if (reportId === "cash-flow" && data.cashFlow) {
    return {
      filename: slug,
      columns: [
        { key: "date", header: "Date" },
        { key: "account", header: "Account" },
        { key: "description", header: "Description" },
        { key: "paymentMethod", header: "Payment Method" },
        { key: "receiptVoucher", header: "Receipt/Voucher" },
        { key: "debit", header: "Debit" },
        { key: "credit", header: "Credit" },
        { key: "previousBalance", header: "Previous Balance" },
        { key: "totalBalance", header: "Total Balance" },
      ],
      rows: data.cashFlow.rows.map((row) => ({
        date: row.date,
        account: row.account,
        description: row.description,
        paymentMethod: row.paymentMethod,
        receiptVoucher: row.receiptVoucher,
        debit: row.debit ?? "",
        credit: row.credit ?? "",
        previousBalance: row.previousBalance,
        totalBalance: row.totalBalance,
      })),
    };
  }

  if (!data.table) return null;

  return {
    filename: slug,
    columns: data.table.columns.map((col) => ({
      key: col.key,
      header: col.header,
    })),
    rows: data.table.rows.map((row) => {
      const out: Record<string, string | number | null | undefined> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key === "actions" || Array.isArray(value)) continue;
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          value == null
        ) {
          out[key] = value;
        }
      }
      return out;
    }),
  };
}
