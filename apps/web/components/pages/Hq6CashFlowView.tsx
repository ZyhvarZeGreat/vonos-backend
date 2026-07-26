"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { UposFiltersPanel } from "@/components/upos/UposFiltersPanel";
import { getAllPaymentAccounts } from "@/lib/api/paymentAccounts";
import { runReport } from "@/lib/api/reports";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import {
  formatCreditCell,
  formatDebitCell,
} from "@/lib/utils/ledgerAmountStyles";
import { cn } from "@/lib/utils/cn";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** HQ6 Cash Flow — ui-audit/42_account__cash-flow */
export function Hq6CashFlowView() {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const [accountId, setAccountId] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [dateFrom, setDateFrom] = useState(monthStartInputValue);
  const [dateTo, setDateTo] = useState(todayInputValue);
  const [txnType, setTxnType] = useState("");
  const [search, setSearch] = useState("");

  const locations = config?.businessLocations ?? [];

  const { data: accounts = [] } = useQuery({
    queryKey: ["payment-accounts", tenantId, "cash-flow-filter"],
    queryFn: () => getAllPaymentAccounts(tenantId!),
    enabled: Boolean(tenantId),
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "payment-account-report",
      tenantId,
      "cash-flow",
      dateFrom,
      dateTo,
      locationCode,
      accountId,
    ],
    queryFn: () =>
      runReport({
        reportId: "cash-flow",
        from: dateFrom || undefined,
        to: dateTo || undefined,
        tenantId: tenantId ?? undefined,
        locationCode: locationCode || undefined,
        accountId: accountId || undefined,
      }),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const report = data?.cashFlow;
  const currency = report?.currency ?? "NGN";

  const filteredRows = useMemo(() => {
    let rows = report?.rows ?? [];
    if (accountId) {
      const name = accounts.find((a) => a.id === accountId)?.name;
      if (name) rows = rows.filter((r) => r.account === name);
    }
    if (txnType === "debit") {
      rows = rows.filter((r) => r.debit != null && r.debit !== 0);
    } else if (txnType === "credit") {
      rows = rows.filter((r) => r.credit != null && r.credit !== 0);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.date, r.account, r.description, r.paymentMethod, r.receiptVoucher]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return rows;
  }, [report?.rows, accountId, accounts, txnType, search]);

  const pagination = useOffsetPage(filteredRows, {
    defaultPageSize: 50,
    resetKey: `${search}:${txnType}:${accountId}:${dateFrom}:${dateTo}`,
  });

  const totals = report?.totals ?? { debit: 0, credit: 0, balance: 0 };

  return (
    <div className="hq6-page">
      <Hq6PageHeader title="Cash Flow" />
      <section className="content">
        <div className="row">
          <div className="col-md-12">
            <UposFiltersPanel>
              <div className="row">
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Account:</label>
                    <select
                      className="form-control"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">All</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Business Location:</label>
                    <select
                      className="form-control"
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
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Date Range:</label>
                    <div className="input-group" style={{ gap: 4 }}>
                      <input
                        type="date"
                        className="form-control"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                      <input
                        type="date"
                        className="form-control"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Transaction Type:</label>
                    <select
                      className="form-control"
                      value={txnType}
                      onChange={(e) => setTxnType(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>
              </div>
            </UposFiltersPanel>
          </div>
        </div>

        <br />

        <div className="box box-solid">
          <div className="box-body">
            {isLoading || (isFetching && !report) ? (
              <p className="text-sm text-[#6b7280]">Loading cash flow…</p>
            ) : error ? (
              <p className="text-sm text-[#dc2626]">Failed to load report.</p>
            ) : (
              <UposDataTablesShell
                tableId="cash_flow_table"
                pageSize={pagination.pageSize}
                onPageSizeChange={(size) => {
                  pagination.setPageSize(size > 0 ? size : 1000);
                  pagination.setPageIndex(0);
                }}
                searchValue={search}
                onSearchChange={setSearch}
                pageIndex={pagination.pageIndex}
                itemCount={pagination.pageRows.length}
                totalItems={pagination.totalItems}
                hasMore={pagination.hasMore}
                canGoPrev={pagination.canGoPrev}
                onPrev={pagination.goPrev}
                onNext={pagination.goNext}
                onPageSelect={pagination.setPageIndex}
              >
                <table
                  className="table table-bordered table-striped dataTable"
                  id="cash_flow_table"
                  role="grid"
                >
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th>Description</th>
                      <th>Payment Method</th>
                      <th>Payment details</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Account Balance</th>
                      <th>Total Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageRows.length === 0 ? (
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
                      pagination.pageRows.map((row) => {
                        const debit = formatDebitCell(row.debit, currency);
                        const credit = formatCreditCell(row.credit, currency);
                        return (
                          <tr key={row.id}>
                            <td>{row.date}</td>
                            <td>{row.account}</td>
                            <td>
                              <span className="whitespace-pre-line">
                                {row.description || "—"}
                              </span>
                            </td>
                            <td>{row.paymentMethod}</td>
                            <td>{row.receiptVoucher}</td>
                            <td className={cn(debit.className)}>{debit.text}</td>
                            <td className={cn(credit.className)}>
                              {credit.text}
                            </td>
                            <td>
                              {formatHq6Currency(row.previousBalance, currency)}
                            </td>
                            <td>
                              {formatHq6Currency(row.totalBalance, currency)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {pagination.pageRows.length > 0 ? (
                    <tfoot>
                      <tr className="bg-gray font-17 footer-total text-center">
                        <td colSpan={5}>
                          <strong>Total:</strong>
                        </td>
                        <td>
                          <span className="display_currency">
                            {formatHq6Currency(totals.debit, currency)}
                          </span>
                        </td>
                        <td>
                          <span className="display_currency">
                            {formatHq6Currency(totals.credit, currency)}
                          </span>
                        </td>
                        <td colSpan={2} />
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
    </div>
  );
}
