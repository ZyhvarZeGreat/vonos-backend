"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountTransaction } from "@vonos/types";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { PaymentAccountFormModal } from "@/components/organisms/PaymentAccountModals";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { UposFiltersPanel } from "@/components/upos/UposFiltersPanel";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
import {
  getAccountBookPage,
  getAllAccountBook,
} from "@/lib/api/payments";
import {
  getPaymentAccount,
  updatePaymentAccount,
} from "@/lib/api/paymentAccounts";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { operationDateListCursor } from "@/lib/utils/pagination";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentMethod,
} from "@/lib/utils/hq6Format";
import {
  amountCellClassName,
  formatCreditCell,
  formatDebitCell,
} from "@/lib/utils/ledgerAmountStyles";
import { cn } from "@/lib/utils/cn";
import { toast } from "@/stores/toastStore";
import { tenantBasePath } from "@/lib/utils/tenantMount";

function humanizeSubType(subType: string | null | undefined): string {
  if (!subType?.trim()) return "—";
  return subType
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface BookRow {
  id: string;
  date: string;
  description: string;
  paymentMethod: string;
  paymentDetails: string;
  note: string;
  addedBy: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

/** HQ6 Account Book — mirrors Ultimate POS account/show.blade.php */
export function AccountBookView({ accountId }: { accountId?: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const exportList = useListExport();

  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "last_7_days",
    isolateDateRange: true,
  });

  const [typeFilter, setTypeFilter] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const { data: account, isLoading: accountLoading } = useQuery({
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
    [bounds?.from, bounds?.to, typeFilter],
  );

  const listPage = useServerListPage<AccountTransaction>({
    queryKey: ["account-book", tenantId, accountId],
    enabled: Boolean(accountId),
    search,
    searchMode: "hybrid",
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

  const rows: BookRow[] = useMemo(
    () =>
      data.map((txn: AccountTransaction & { accountBalance?: number }) => ({
        id: txn.id,
        date: txn.operationDate,
        description: humanizeSubType(txn.subType),
        paymentMethod: formatHq6PaymentMethod(txn.paymentMethod) || "—",
        paymentDetails: txn.paymentDetails?.trim() || txn.refNo?.trim() || "",
        note: txn.note?.trim() || "",
        addedBy: txn.createdByName?.trim() || "—",
        debit: txn.type === "debit" ? txn.amount : null,
        credit: txn.type === "credit" ? txn.amount : null,
        balance: txn.accountBalance ?? 0,
      })),
    [data],
  );

  const pageTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const row of rows) {
      if (row.debit != null) debit += row.debit;
      if (row.credit != null) credit += row.credit;
    }
    return { debit, credit };
  }, [rows]);

  const currency = account?.currency ?? "NGN";
  const accountsHref = tenantCode
    ? `${tenantBasePath(tenantCode)}/payment-accounts`
    : "/payment-accounts";

  const handleExport = async () => {
    if (!accountId) return;
    const all = await getAllAccountBook(accountId);
    exportList(
      "account-book",
      [
        { key: "date", header: "Date" },
        { key: "description", header: "Description" },
        { key: "paymentMethod", header: "Payment Method" },
        { key: "paymentDetails", header: "Payment details" },
        { key: "note", header: "Note" },
        { key: "addedBy", header: "Added By" },
        { key: "debit", header: "Debit" },
        { key: "credit", header: "Credit" },
        { key: "balance", header: "Balance" },
      ],
      all.map((txn) => ({
        date: txn.operationDate,
        description: humanizeSubType(txn.subType),
        paymentMethod: txn.paymentMethod ?? "",
        paymentDetails: txn.paymentDetails ?? txn.refNo ?? "",
        note: txn.note ?? "",
        addedBy: txn.createdByName ?? "",
        debit: txn.type === "debit" ? txn.amount : "",
        credit: txn.type === "credit" ? txn.amount : "",
        balance:
          (txn as AccountTransaction & { accountBalance?: number })
            .accountBalance ?? "",
      })),
      "Export Account Book",
    );
  };

  return (
    <div className="hq6-page">
      <Hq6PageHeader title="Account Book" />

      <section className="content">
        <div className="row tw-mb-4">
          <div className="col-sm-4 col-xs-6">
            <div className="box box-solid">
              <div className="box-body">
                {accountLoading && !account ? (
                  <p className="text-sm text-[#6b7280]">Loading account…</p>
                ) : account ? (
                  <table className="table">
                    <tbody>
                      <tr>
                        <th>Account Name:</th>
                        <td>{account.name}</td>
                      </tr>
                      <tr>
                        <th>Account Type:</th>
                        <td>
                          {[account.accountType, account.accountSubType]
                            .filter(Boolean)
                            .join(" - ") || "—"}
                        </td>
                      </tr>
                      <tr>
                        <th>Account Number:</th>
                        <td>{account.accountNumber || "—"}</td>
                      </tr>
                      <tr>
                        <th>Balance:</th>
                        <td>
                          <span
                            className={cn(
                              amountCellClassName("balance", account.balance),
                            )}
                          >
                            {formatHq6Currency(account.balance, currency)}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-[#6b7280]">
                    {accountId
                      ? "Account not found."
                      : "Select an account from Payment Accounts."}
                  </p>
                )}
                <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                  <button
                    type="button"
                    className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline"
                    onClick={() => router.push(accountsHref)}
                  >
                    <i className="fa fa-arrow-left" aria-hidden /> Payment
                    Accounts
                  </button>
                  {account ? (
                    <UposGradientActionButton
                      label="Edit Account"
                      onClick={() => setEditOpen(true)}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="col-sm-8 col-xs-12">
            <UposFiltersPanel>
              <div className="row">
                <div className="col-sm-6">
                  <div className="form-group">
                    <label>Date Range:</label>
                    <div className="input-group">
                      <span className="input-group-addon">
                        <i className="fa fa-calendar" aria-hidden />
                      </span>
                      <DateRangeDropdown
                        value={dateRange}
                        onChange={setDateRange}
                        customValue={customDateRange}
                        onCustomChange={setCustomDateRange}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="form-group">
                    <label>Transaction Type:</label>
                    <div className="input-group">
                      <span className="input-group-addon">
                        <i className="fas fa-exchange-alt" aria-hidden />
                      </span>
                      <select
                        className="form-control"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </UposFiltersPanel>
          </div>
        </div>

        <div className="box box-solid">
          <div className="box-body">
            {!accountId ? (
              <p className="text-sm text-[#6b7280]">
                Select an account from Payment Accounts to view its book.
              </p>
            ) : isLoading && rows.length === 0 ? (
              <p className="text-sm text-[#6b7280]">Loading account book…</p>
            ) : error ? (
              <p className="text-sm text-[#dc2626]">
                Failed to load account book.
              </p>
            ) : (
              <UposDataTablesShell
                tableId="account_book"
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search ..."
                onExportCsv={() => void handleExport()}
                onExportExcel={() => void handleExport()}
                pageIndex={pageIndex}
                itemCount={rows.length}
                totalItems={totalCount}
                hasMore={hasMore}
                canGoPrev={canGoPrev}
                onPrev={goPrev}
                onNext={goNext}
                onPageSelect={goToPage}
                canSelectPage={canSelectPage}
                isBusy={isPaging || (isFetching && rows.length > 0)}
                isSearching={isSearching}
              >
                <table
                  className="table table-bordered table-striped dataTable"
                  id="account_book"
                  role="grid"
                >
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Payment Method</th>
                      <th>Payment details</th>
                      <th>Note</th>
                      <th>Added By</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr className="odd">
                        <td
                          colSpan={9}
                          className="dataTables_empty"
                          style={{ textAlign: "center" }}
                        >
                          No data available in table
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const debit = formatDebitCell(row.debit, currency);
                        const credit = formatCreditCell(row.credit, currency);
                        return (
                          <tr key={row.id}>
                            <td>{formatHq6DateTime(row.date)}</td>
                            <td>{row.description}</td>
                            <td>{row.paymentMethod}</td>
                            <td>{row.paymentDetails || "—"}</td>
                            <td>
                              <span className="whitespace-pre-line">
                                {row.note || "—"}
                              </span>
                            </td>
                            <td>{row.addedBy}</td>
                            <td className={cn(debit.className)}>{debit.text}</td>
                            <td className={cn(credit.className)}>
                              {credit.text}
                            </td>
                            <td
                              className={cn(
                                amountCellClassName("balance", row.balance),
                              )}
                            >
                              {formatHq6Currency(row.balance, currency)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {rows.length > 0 ? (
                    <tfoot>
                      <tr className="bg-gray font-17 footer-total text-center">
                        <td colSpan={6}>
                          <strong>Total:</strong>
                        </td>
                        <td>
                          <span className="display_currency">
                            {formatHq6Currency(pageTotals.debit, currency)}
                          </span>
                        </td>
                        <td>
                          <span className="display_currency">
                            {formatHq6Currency(pageTotals.credit, currency)}
                          </span>
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </UposDataTablesShell>
            )}
          </div>
        </div>
      </section>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>

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
    </div>
  );
}
