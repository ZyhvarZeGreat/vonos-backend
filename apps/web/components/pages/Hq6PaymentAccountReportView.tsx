"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { UposFiltersPanel } from "@/components/upos/UposFiltersPanel";
import { getAllPaymentAccounts } from "@/lib/api/paymentAccounts";
import { runReport } from "@/lib/api/reports";
import { useOffsetPage } from "@/lib/hooks/useOffsetPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency } from "@/lib/utils/hq6Format";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** HQ6 Payment Account Report — ui-audit/43_account__payment-account-report */
export function Hq6PaymentAccountReportView() {
  const tenantId = useTenantId();
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState(monthStartInputValue);
  const [dateTo, setDateTo] = useState(todayInputValue);
  const [search, setSearch] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["payment-accounts", tenantId, "par-filter"],
    queryFn: () => getAllPaymentAccounts(tenantId!),
    enabled: Boolean(tenantId),
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "payment-account-report",
      tenantId,
      "payment-account-report",
      dateFrom,
      dateTo,
      accountId,
    ],
    queryFn: () =>
      runReport({
        reportId: "payment-account-report",
        from: dateFrom || undefined,
        to: dateTo || undefined,
        tenantId: tenantId ?? undefined,
        accountId: accountId || undefined,
      }),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const table = data?.table;
  const currency =
    (typeof table?.rows[0]?.currency === "string"
      ? table.rows[0].currency
      : null) ?? "NGN";

  const filteredRows = useMemo(() => {
    const rows = table?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.date,
        row.paymentRef,
        row.invoiceRef,
        row.paymentType,
        row.account,
        row.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [table?.rows, search]);

  const pagination = useOffsetPage(filteredRows, {
    defaultPageSize: 25,
    resetKey: `${search}:${accountId}:${dateFrom}:${dateTo}`,
  });

  const totalAmount =
    table?.columnTotals?.amount ??
    filteredRows.reduce(
      (sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0),
      0,
    );

  return (
    <div className="hq6-page">
      <Hq6PageHeader title="Payment Account Report" />
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
                      <option value="none">None</option>
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
              </div>
            </UposFiltersPanel>
          </div>
        </div>

        <br />

        <div className="box box-solid">
          <div className="box-body">
            {isLoading || (isFetching && !table) ? (
              <p className="text-sm text-[#6b7280]">Loading report…</p>
            ) : error ? (
              <p className="text-sm text-[#dc2626]">Failed to load report.</p>
            ) : (
              <UposDataTablesShell
                tableId="payment_account_report"
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
                  id="payment_account_report"
                  role="grid"
                >
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Payment Ref No.</th>
                      <th>Invoice No./Ref. No.</th>
                      <th>Amount</th>
                      <th>Payment Type</th>
                      <th>Account</th>
                      <th>Description</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageRows.length === 0 ? (
                      <tr className="odd">
                        <td
                          colSpan={8}
                          className="dataTables_empty"
                          style={{ textAlign: "center" }}
                        >
                          No data available in table
                        </td>
                      </tr>
                    ) : (
                      pagination.pageRows.map((row, index) => (
                        <tr key={String(row.id ?? index)}>
                          <td>{String(row.date ?? "—")}</td>
                          <td>{String(row.paymentRef ?? "—")}</td>
                          <td>
                            <span className="label bg-light-blue">
                              {String(row.invoiceRef ?? "—")}
                            </span>
                          </td>
                          <td className="text-right">
                            {typeof row.amount === "number"
                              ? formatHq6Currency(row.amount, currency)
                              : "—"}
                          </td>
                          <td>{String(row.paymentType ?? "—")}</td>
                          <td>{String(row.account ?? "—")}</td>
                          <td>
                            <span className="whitespace-pre-line">
                              {String(row.description ?? "—")}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-info"
                              title="View"
                              disabled
                            >
                              <i className="fa fa-eye" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {pagination.pageRows.length > 0 ? (
                    <tfoot>
                      <tr className="bg-gray">
                        <td colSpan={3}>
                          <strong>Total</strong>
                        </td>
                        <td className="text-right">
                          {formatHq6Currency(totalAmount, currency)}
                        </td>
                        <td colSpan={4} />
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
