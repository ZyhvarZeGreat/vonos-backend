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
import { HqReportPageLayout } from "@/components/organisms/HqReportPageLayout";
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
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { usePaymentAccountPageTabs } from "@/lib/hooks/usePaymentAccountPageTabs";
import { useListExport } from "@/lib/hooks/useListExport";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import type { PaymentAccountPageSlug } from "@/lib/registries/paymentAccountNav";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useUiStore } from "@/stores/uiStore";

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
    error,
  } = useServerListPage<PaymentAccount>({
    queryKey: ["payment-accounts", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit) =>
      getPaymentAccountsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
      }),
  });

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
          items={items}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          hasMore={hasMore}
          canGoPrev={canGoPrev}
          onNext={goNext}
          onPrev={goPrev}
          onPageSizeChange={setPageSize}
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
  const openExportModal = useUiStore((state) => state.openExportModal);
  const { tabs, activeTab, onTabChange } = usePaymentAccountPageTabs(slug);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const periodLabel = ledgerChartSubtitle(dateRange);
  const entry = reportEntryBySlug(slug);

  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-account-report", tenantId, entry?.id, bounds?.from, bounds?.to],
    queryFn: () =>
      runReport({
        reportId: entry!.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId: tenantId ?? undefined,
      }),
    enabled: Boolean(tenantId && entry),
  });

  if (!entry) {
    return <p className="p-6 text-sm text-muted-foreground">Unknown report.</p>;
  }

  const exportPayload =
    data?.table && entry.exportable
      ? {
          filename: entry.slug,
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
        }
      : null;

  return (
    <ListPageShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      showImport={false}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
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
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
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
