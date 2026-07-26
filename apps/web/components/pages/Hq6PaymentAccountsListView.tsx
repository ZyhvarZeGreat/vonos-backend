"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation, withOptimistic } from "@/lib/hooks/useAppMutation";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";
import type { PaymentAccount } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import {
  PaymentAccountDepositModal,
  PaymentAccountFormModal,
  PaymentAccountTransferModal,
} from "@/components/organisms/PaymentAccountModals";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import {
  closePaymentAccount,
  createPaymentAccount,
  depositPaymentAccount,
  getAllPaymentAccounts,
  getPaymentAccountsPage,
  transferPaymentAccounts,
  updatePaymentAccount,
} from "@/lib/api/paymentAccounts";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";

const EXPORT_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "accountType", header: "Account Type" },
  { key: "accountSubType", header: "Account Sub Type" },
  { key: "accountNumber", header: "Account Number" },
  { key: "note", header: "Note" },
  { key: "balance", header: "Balance" },
  { key: "accountDetails", header: "Account details" },
  { key: "addedBy", header: "Added By" },
] as const;

/** HQ6 Payment Accounts — ui-audit/39_account__account */
export function Hq6PaymentAccountsListView() {
  const router = useRouter();
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const exportList = useListExport();
  const chrome = useHq6ListChrome("payment-accounts");
  const [pane, setPane] = useState<"accounts" | "types">("accounts");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed">("active");
  const [localSearch, setLocalSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PaymentAccount | null>(null);
  const [depositAccount, setDepositAccount] = useState<PaymentAccount | null>(
    null,
  );
  const [transferAccount, setTransferAccount] =
    useState<PaymentAccount | null>(null);
  const [closeTarget, setCloseTarget] = useState<PaymentAccount | null>(null);

  const listPage = useServerListPage<PaymentAccount>({
    queryKey: ["payment-accounts", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getPaymentAccountsPage(tenantId!, cursor, limit, {
        includeSummary: opts?.includeSummary,
      }),
  });

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
    totalCount,
  } = listPage;

  const filteredItems = useMemo(() => {
    let rows = items;
    if (statusFilter === "active") rows = rows.filter((row) => !row.isClosed);
    if (statusFilter === "closed") rows = rows.filter((row) => row.isClosed);
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.accountNumber.toLowerCase().includes(q) ||
          (row.accountType ?? "").toLowerCase().includes(q) ||
          (row.note ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [items, localSearch, statusFilter]);

  const accountTypes = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of items) {
      const key = row.accountType?.trim() || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({
      id: name,
      name,
      count,
    }));
  }, [items]);

  const queryClient = useQueryClient();

  const depositMutation = useAppMutation({
    mutationFn: (vars: {
      id: string;
      amount: number;
      note?: string;
      operationDate?: string;
      paymentMethod?: string;
    }) =>
      depositPaymentAccount(tenantId!, vars.id, {
        amount: vars.amount,
        note: vars.note,
        operationDate: vars.operationDate,
        paymentMethod: vars.paymentMethod,
      }),
    invalidateKeys: [["payment-accounts", tenantId]],
  });

  const transferMutation = useAppMutation({
    mutationFn: (payload: Parameters<typeof transferPaymentAccounts>[1]) =>
      transferPaymentAccounts(tenantId!, payload),
    invalidateKeys: [["payment-accounts", tenantId]],
  });

  const closeMutation = useAppMutation({
    mutationFn: (id: string) => closePaymentAccount(tenantId!, id),
    optimistic: {
      keys: [["payment-accounts", tenantId]],
      update: (qc, id) => {
        patchEntityInQueries(qc, ["payment-accounts", tenantId], id, {
          isClosed: true,
        });
      },
    },
    onSuccess: () => {
      setCloseTarget(null);
    },
  });

  const handleExport = async () => {
    if (!tenantId) return;
    const rows = await getAllPaymentAccounts(tenantId);
    exportList(
      "payment-accounts",
      EXPORT_COLUMNS.map((col) => ({ key: col.key, header: col.header })),
      rows.map((row) => ({
        name: row.name,
        accountType: row.accountType ?? "",
        accountSubType: row.accountSubType ?? "",
        accountNumber: row.accountNumber,
        note: row.note ?? "",
        balance: row.balance,
        accountDetails: row.isClosed ? "Closed" : "",
        addedBy: row.createdByName ?? "",
      })),
      "Export payment accounts",
    );
  };

  const columns: ColumnConfig<PaymentAccount>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => (
          <span className="font-medium text-[#111827]">{row.name}</span>
        ),
      },
      {
        key: "accountType",
        header: "Account Type",
        render: (r) => r.accountType ?? "",
      },
      {
        key: "accountSubType",
        header: "Account Sub Type",
        render: (r) => r.accountSubType ?? "",
      },
      { key: "accountNumber", header: "Account Number" },
      { key: "note", header: "Note", render: (r) => r.note ?? "" },
      {
        key: "balance",
        header: "Balance",
        sortValue: (r) => r.balance,
        render: (r) => formatHq6Currency(r.balance, r.currency ?? "NGN"),
      },
      {
        key: "accountDetails",
        header: "Account details",
        sortable: false,
        render: (r) =>
          r.isClosed ? <span className="label bg-gray">Closed</span> : "",
      },
      {
        key: "addedBy",
        header: "Added By",
        render: (r) => r.createdByName ?? "",
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <div className="hq6-inline-actions hq6-payment-account-actions">
            <button
              type="button"
              className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-primary btn-modal"
              onClick={() => {
                setEditAccount(row);
                setFormOpen(true);
              }}
            >
              <i className="glyphicon glyphicon-edit" aria-hidden /> Edit
            </button>
            <button
              type="button"
              className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-warning btn-xs"
              onClick={() => {
                if (!tenantCode) return;
                router.push(`/${tenantCode}/account-book/${row.id}`);
              }}
            >
              <i className="fa fa-book" aria-hidden /> Account Book
            </button>
            {!row.isClosed ? (
              <>
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-info btn-modal"
                  onClick={() => setTransferAccount(row)}
                >
                  <i className="fas fa-calculator" aria-hidden /> Fund Transfer
                </button>
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-success btn-modal"
                  onClick={() => setDepositAccount(row)}
                >
                  <i className="fas fa-money-bill-alt" aria-hidden /> Deposit
                </button>
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-error close_account"
                  onClick={() => setCloseTarget(row)}
                >
                  <i className="fa fa-power-off" aria-hidden /> Close
                </button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [router, tenantCode],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  const typeColumns: ColumnConfig<{ id: string; name: string; count: number }>[] = [
    { key: "name", header: "Name" },
    {
      key: "count",
      header: "Accounts",
      render: (r) => String(r.count),
    },
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: () => "",
    },
  ];

  return (
    <>
      <Hq6StandardListShell
        slug="payment-accounts"
        title="Payment Accounts"
        tabLabel="Accounts"
        boxTitle=""
        chrome={chrome}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        searchPlaceholder="Search ..."
        columnOptions={pane === "accounts" ? columnOptions : [{ key: "name", label: "Name" }]}
        onExport={() => void handleExport()}
        hidePrimaryAction
        hideToolbar={pane === "types"}
        summaryStrip={undefined}
        tabs={[
          {
            id: "accounts",
            label: "Accounts",
            active: pane === "accounts",
            iconClass: "fa fa-book",
            onClick: () => setPane("accounts"),
          },
          {
            id: "types",
            label: "Account Types",
            active: pane === "types",
            iconClass: "fa fa-list",
            onClick: () => setPane("types"),
          },
        ]}
        tabActions={
          pane === "accounts" ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="form-control"
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "active" | "closed")
                }
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
              <UposGradientActionButton
                label="Add"
                onClick={() => {
                  setEditAccount(null);
                  setFormOpen(true);
                }}
              />
            </div>
          ) : (
            <UposGradientActionButton
              label="Add"
              onClick={() => {
                setEditAccount(null);
                setFormOpen(true);
              }}
            />
          )
        }
        pagination={
          pane === "accounts"
            ? {
                pageIndex,
                pageSize,
                itemCount: filteredItems.length,
                hasMore,
                canGoPrev,
                onPrev: goPrev,
                onNext: goNext,
                onPageSizeChange: setPageSize,
                onPageSelect: goToPage,
                canSelectPage,
                totalItems: totalCount,
                isBusy: isPaging,
              }
            : undefined
        }
        modals={
          <>
            <PaymentAccountFormModal
              open={formOpen}
              account={editAccount}
              onClose={() => {
                setFormOpen(false);
                setEditAccount(null);
              }}
              onSave={async (payload) => {
                if (!tenantId) return;
                const now = new Date().toISOString();
                if (editAccount) {
                  const opt = withOptimistic(queryClient, {
                    keys: [["payment-accounts", tenantId]],
                    update: (qc) => {
                      patchEntityInQueries(
                        qc,
                        ["payment-accounts", tenantId],
                        editAccount.id,
                        { ...payload } as Record<string, unknown>,
                      );
                    },
                  });
                  const ctx = await opt.onMutate(undefined);
                  try {
                    await updatePaymentAccount(tenantId, editAccount.id, payload);
                    opt.onSuccess(undefined, undefined);
                    setFormOpen(false);
                    setEditAccount(null);
                  } catch (err) {
                    opt.onError(err, undefined, ctx);
                    throw err;
                  } finally {
                    await opt.onSettled();
                  }
                  return;
                }
                const createPayload =
                  payload as Parameters<typeof createPaymentAccount>[1];
                const tempId = optimisticTempId("payment-account");
                const opt = withOptimistic<PaymentAccount, void>(queryClient, {
                  keys: [["payment-accounts", tenantId]],
                  update: (qc) => {
                    prependEntityInQueries(qc, ["payment-accounts", tenantId], {
                      id: tempId,
                      tenantId,
                      name: createPayload.name,
                      accountNumber: createPayload.accountNumber ?? "",
                      accountType: createPayload.accountType ?? null,
                      accountSubType: createPayload.accountSubType ?? null,
                      accountDetails: createPayload.accountDetails ?? null,
                      note: createPayload.note ?? null,
                      isClosed: false,
                      balance: 0,
                      currency: "NGN",
                      createdAt: now,
                      updatedAt: now,
                    } satisfies PaymentAccount);
                  },
                  commit: (qc, data) => {
                    removeEntityFromQueries(
                      qc,
                      ["payment-accounts", tenantId],
                      tempId,
                    );
                    prependEntityInQueries(
                      qc,
                      ["payment-accounts", tenantId],
                      data,
                    );
                  },
                });
                const ctx = await opt.onMutate(undefined);
                try {
                  const created = await createPaymentAccount(
                    tenantId,
                    createPayload,
                  );
                  opt.onSuccess(created, undefined);
                  setFormOpen(false);
                  setEditAccount(null);
                } catch (err) {
                  opt.onError(err, undefined, ctx);
                  throw err;
                } finally {
                  await opt.onSettled();
                }
              }}
            />
            <PaymentAccountDepositModal
              account={depositAccount}
              onClose={() => setDepositAccount(null)}
              onSave={async (vars) => {
                if (!depositAccount) return;
                await depositMutation.mutateAsync({
                  id: depositAccount.id,
                  ...vars,
                });
                setDepositAccount(null);
              }}
            />
            <PaymentAccountTransferModal
              fromAccount={transferAccount}
              accounts={items}
              onClose={() => setTransferAccount(null)}
              onSave={async (payload) => {
                await transferMutation.mutateAsync(payload);
                setTransferAccount(null);
              }}
            />
            <Hq6ConfirmModal
              open={Boolean(closeTarget)}
              title="Close account"
              message={
                closeTarget
                  ? `Close account "${closeTarget.name}"? No new transactions will be allowed.`
                  : ""
              }
              confirmLabel="Close"
              danger
              onConfirm={() => {
                if (closeTarget) closeMutation.mutate(closeTarget.id);
              }}
              onClose={() => setCloseTarget(null)}
              confirming={closeMutation.isPending}
            />
          </>
        }
      >
        {pane === "accounts" ? (
          <>
            <div className="alert alert-danger" role="alert">
              <ul>
                <li>
                  Total <b>0</b> payments not linked with any account. View
                  Details
                </li>
              </ul>
            </div>
            <DataTable
              data={filteredItems}
              columns={columns}
              displayMode="table"
              embedded
              disablePagination
              isLoading={isLoading}
              isFetching={isFetching && !isLoading}
              error={error ? "Failed to load payment accounts" : null}
              emptyState={{ message: "No data available in table" }}
            />
          </>
        ) : (
          <DataTable
            data={accountTypes}
            columns={typeColumns}
            displayMode="table"
            embedded
            disablePagination
            emptyState={{ message: "No data available in table" }}
          />
        )}
      </Hq6StandardListShell>
    </>
  );
}
