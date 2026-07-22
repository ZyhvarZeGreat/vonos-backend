"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  BalanceSheetReport,
  CashFlowReport,
  ReportsTable,
} from "@vonos/types";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { ReportTableSearchBar } from "@/components/molecules/ReportTableSearchBar";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  amountCellClassName,
  debitCreditClass,
  formatCreditCell,
  formatDebitCell,
  signedAmountClass,
} from "@/lib/utils/ledgerAmountStyles";
import { cn } from "@/lib/utils/cn";

function offsetPaginationProps<T>(pagination: ReturnType<typeof useOffsetPage<T>>) {
  return {
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    itemCount: pagination.pageRows.length,
    hasMore: pagination.hasMore,
    canGoPrev: pagination.canGoPrev,
    onPrev: pagination.goPrev,
    onNext: pagination.goNext,
    onPageSizeChange: pagination.setPageSize,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems,
    onPageSelect: pagination.setPageIndex,
  };
}

function BalanceSheetSide({
  title,
  children,
  totalLabel,
  totalAmount,
  currency,
}: {
  title: string;
  children: ReactNode;
  totalLabel: string;
  totalAmount: number;
  currency: string;
}) {
  return (
    <div className="flex min-h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-[var(--color-surface-muted)]/70 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      <div className="flex-1 px-4 py-4">{children}</div>
      <div className="mt-auto border-t border-border bg-[var(--color-surface-muted)]/50 px-4 py-3">
        <div className="flex items-center justify-between gap-4 text-sm font-semibold">
          <span className="text-foreground">{totalLabel}</span>
          <span className={cn("tabular-nums", signedAmountClass(totalAmount))}>
            {formatCurrency(totalAmount, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetLineItem({
  label,
  amount,
  currency,
  indent = false,
}: {
  label: string;
  amount: number;
  currency: string;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0",
        indent && "pl-3",
      )}
    >
      <span className={cn("text-sm text-muted", indent && "text-foreground/80")}>
        {label}
      </span>
      <span className={cn("shrink-0 text-sm tabular-nums", signedAmountClass(amount))}>
        {formatCurrency(amount, currency)}
      </span>
    </div>
  );
}

export function BalanceSheetReportPanel({
  report,
}: {
  report: BalanceSheetReport;
}) {
  const { currency } = report;

  return (
    <div className="space-y-4" data-print-root>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <BalanceSheetSide
          title="Liability"
          totalLabel="Total Liability:"
          totalAmount={report.totalLiability}
          currency={currency}
        >
          {report.liabilities.length === 0 ? (
            <p className="text-sm text-muted">No liabilities recorded.</p>
          ) : (
            report.liabilities.map((line) => (
              <BalanceSheetLineItem
                key={line.key}
                label={`${line.label}:`}
                amount={line.amount}
                currency={currency}
              />
            ))
          )}
        </BalanceSheetSide>

        <BalanceSheetSide
          title="Assets"
          totalLabel="Total Assets:"
          totalAmount={report.totalAssets}
          currency={currency}
        >
          {report.assets.map((line) => (
            <BalanceSheetLineItem
              key={line.key}
              label={`${line.label}:`}
              amount={line.amount}
              currency={currency}
            />
          ))}

          {report.accountBalances.length > 0 ? (
            <div className="mt-4 border-t border-border/70 pt-3">
              <p className="mb-2 text-sm font-semibold text-foreground">
                Account Balances:
              </p>
              <div className="max-h-[28rem] overflow-y-auto pr-1">
                {report.accountBalances.map((account) => (
                  <BalanceSheetLineItem
                    key={account.id}
                    label={`${account.name}:`}
                    amount={account.balance}
                    currency={currency}
                    indent
                  />
                ))}
              </div>
            </div>
          ) : null}
        </BalanceSheetSide>
      </div>
    </div>
  );
}

export function CashFlowReportPanel({ report }: { report: CashFlowReport }) {
  const { currency } = report;
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return report.rows;
    return report.rows.filter((row) =>
      [
        row.date,
        row.account,
        row.description,
        row.paymentMethod,
        row.receiptVoucher,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [report.rows, search]);

  const pagination = useOffsetPage(filteredRows, { resetKey: search });

  return (
    <div className="space-y-4" data-print-root>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Cash In
          </p>
          <p className={cn("mt-1 text-lg font-semibold", debitCreditClass("credit"))}>
            {formatCurrency(report.totals.credit, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Cash Out
          </p>
          <p className={cn("mt-1 text-lg font-semibold", debitCreditClass("debit"))}>
            {formatCurrency(report.totals.debit, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Net Cash
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-semibold tabular-nums",
              signedAmountClass(report.totals.balance),
            )}
          >
            {formatCurrency(report.totals.balance, currency)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <CursorPaginationBar
          {...offsetPaginationProps(pagination)}
          className="border-b border-t-0 border-[var(--color-border-subtle)]"
        />
        <ReportTableSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search cash flow…"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Payment Method</th>
                <th className="px-4 py-2.5 font-medium">Receipt/Voucher</th>
                <th className="px-4 py-2.5 text-right font-medium">Debit</th>
                <th className="px-4 py-2.5 text-right font-medium">Credit</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Previous Balance
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Total Balance</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    {search.trim()
                      ? "No rows match your search."
                      : "No cash flow entries for this period."}
                  </td>
                </tr>
              ) : (
                pagination.pageRows.map((row) => {
                  const debit = formatDebitCell(row.debit, currency);
                  const credit = formatCreditCell(row.credit, currency);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/60 align-top last:border-b-0 hover:bg-[var(--color-surface-muted)]/40"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-foreground">
                        {row.date}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {row.account}
                      </td>
                      <td className="max-w-xs px-4 py-2.5">
                        <span className="whitespace-pre-line text-muted">
                          {row.description || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {row.paymentMethod}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {row.receiptVoucher}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right", debit.className)}>
                        {debit.text}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right", credit.className)}>
                        {credit.text}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right",
                          amountCellClassName("balance", row.previousBalance),
                        )}
                      >
                        {formatCurrency(row.previousBalance, currency)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-medium",
                          amountCellClassName("balance", row.totalBalance),
                        )}
                      >
                        {formatCurrency(row.totalBalance, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {pagination.pageRows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-border bg-[var(--color-surface-muted)]/70 text-sm font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-foreground">
                    Total
                  </td>
                  <td className={cn("px-4 py-3 text-right", debitCreditClass("debit"))}>
                    {formatCurrency(report.totals.debit, currency)}
                  </td>
                  <td className={cn("px-4 py-3 text-right", debitCreditClass("credit"))}>
                    {formatCurrency(report.totals.credit, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">—</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right",
                      signedAmountClass(report.totals.balance),
                    )}
                  >
                    {formatCurrency(report.totals.balance, currency)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        <CursorPaginationBar {...offsetPaginationProps(pagination)} />
      </div>
    </div>
  );
}

export function TrialBalanceReportPanel({
  table,
  currency,
}: {
  table: ReportsTable;
  currency: string;
}) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return table.rows;
    return table.rows.filter((row) =>
      String(row.account ?? "")
        .toLowerCase()
        .includes(query),
    );
  }, [table.rows, search]);

  const pagination = useOffsetPage(filteredRows, { resetKey: search });

  const totalDebit =
    table.columnTotals?.debit ??
    filteredRows.reduce(
      (sum, row) => sum + (typeof row.debit === "number" ? row.debit : 0),
      0,
    );
  const totalCredit =
    table.columnTotals?.credit ??
    filteredRows.reduce(
      (sum, row) => sum + (typeof row.credit === "number" ? row.credit : 0),
      0,
    );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card" data-print-root>
      <CursorPaginationBar
        {...offsetPaginationProps(pagination)}
        className="border-b border-t-0 border-[var(--color-border-subtle)]"
      />
      <ReportTableSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search accounts…"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-4 py-2.5 text-right font-medium">Debit</th>
              <th className="px-4 py-2.5 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  No trial balance entries for this period.
                </td>
              </tr>
            ) : (
              pagination.pageRows.map((row, index) => {
                const debit = formatDebitCell(
                  typeof row.debit === "number" ? row.debit : null,
                  currency,
                );
                const credit = formatCreditCell(
                  typeof row.credit === "number" ? row.credit : null,
                  currency,
                );
                return (
                  <tr
                    key={String(row.id ?? index)}
                    className="border-b border-border/60 last:border-b-0 hover:bg-[var(--color-surface-muted)]/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {String(row.account ?? "—")}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right", debit.className)}>
                      {debit.text}
                    </td>
                    <td className={cn("px-4 py-2.5 text-right", credit.className)}>
                      {credit.text}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {pagination.pageRows.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-border bg-[var(--color-surface-muted)]/70 text-sm font-semibold">
                <td className="px-4 py-3 text-foreground">Total</td>
                <td className={cn("px-4 py-3 text-right", debitCreditClass("debit"))}>
                  {formatCurrency(totalDebit, currency)}
                </td>
                <td className={cn("px-4 py-3 text-right", debitCreditClass("credit"))}>
                  {formatCurrency(totalCredit, currency)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <CursorPaginationBar {...offsetPaginationProps(pagination)} />
    </div>
  );
}

export function PaymentAccountDetailReportPanel({
  table,
  currency,
}: {
  table: ReportsTable;
  currency: string;
}) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return table.rows;
    return table.rows.filter((row) =>
      [
        row.date,
        row.paymentRef,
        row.invoiceRef,
        row.paymentType,
        row.account,
        row.createdBy,
        row.description,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [table.rows, search]);

  const pagination = useOffsetPage(filteredRows, { resetKey: search });

  const totalAmount =
    table.columnTotals?.amount ??
    filteredRows.reduce(
      (sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0),
      0,
    );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card" data-print-root>
      <CursorPaginationBar
        {...offsetPaginationProps(pagination)}
        className="border-b border-t-0 border-[var(--color-border-subtle)]"
      />
      <ReportTableSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search transactions…"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Payment Ref No.</th>
              <th className="px-4 py-2.5 font-medium">Invoice No./Ref. No.</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Payment Type</th>
              <th className="px-4 py-2.5 font-medium">Account</th>
              <th className="px-4 py-2.5 font-medium">Added By</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  {search.trim()
                    ? "No rows match your search."
                    : "No payment account transactions for this period."}
                </td>
              </tr>
            ) : (
              pagination.pageRows.map((row, index) => (
                <tr
                  key={String(row.id ?? index)}
                  className="border-b border-border/60 align-top last:border-b-0 hover:bg-[var(--color-surface-muted)]/40"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-foreground">
                    {String(row.date ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {String(row.paymentRef ?? "—")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded border border-sky-300 px-2 py-0.5 text-xs font-semibold text-sky-700">
                      {String(row.invoiceRef ?? "—")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                    {typeof row.amount === "number"
                      ? formatCurrency(row.amount, currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {String(row.paymentType ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {String(row.account ?? "—")}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {String(row.createdBy ?? "—")}
                  </td>
                  <td className="max-w-sm px-4 py-2.5">
                    <span className="whitespace-pre-line text-muted">
                      {String(row.description ?? "—")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {pagination.pageRows.length > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-border bg-[var(--color-surface-muted)]/70 text-sm font-semibold">
                <td colSpan={3} className="px-4 py-3 text-foreground">
                  Total
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {formatCurrency(totalAmount, currency)}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <CursorPaginationBar {...offsetPaginationProps(pagination)} />
    </div>
  );
}
