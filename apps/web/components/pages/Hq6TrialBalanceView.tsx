"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BalanceSheetReport } from "@vonos/types";
import { Hq6PageHeader } from "@/components/hq6/Hq6Chrome";
import { UposFiltersPanel } from "@/components/upos/UposFiltersPanel";
import { runReport } from "@/lib/api/reports";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency, formatHq6Date } from "@/lib/utils/hq6Format";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function TrialBalanceBladeTable({ report }: { report: BalanceSheetReport }) {
  const { currency } = report;
  const supplierDue =
    report.liabilities.find((l) => l.key === "supplier-due")?.amount ??
    report.totalLiability;
  const customerDue =
    report.assets.find((l) => l.key === "customer-due")?.amount ?? 0;
  const debitTotal =
    customerDue +
    report.accountBalances.reduce((sum, a) => sum + a.balance, 0);
  const creditTotal = supplierDue;

  return (
    <table
      className="table table-border-center-col no-border table-pl-12"
      id="trial_balance_table"
    >
      <thead>
        <tr className="bg-gray">
          <th>Trial Balance</th>
          <th>Debit</th>
          <th>Credit</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Supplier Due:</th>
          <td>&nbsp;</td>
          <td>
            <span className="remote-data" id="supplier_due">
              {formatHq6Currency(supplierDue, currency)}
            </span>
          </td>
        </tr>
        <tr>
          <th>Customer Due:</th>
          <td>
            <span className="remote-data" id="customer_due">
              {formatHq6Currency(customerDue, currency)}
            </span>
          </td>
          <td>&nbsp;</td>
        </tr>
        <tr>
          <th>Account Balances:</th>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      </tbody>
      <tbody id="account_balances_details" className="pl-20-td">
        {report.accountBalances.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-muted">
              No accounts
            </td>
          </tr>
        ) : (
          report.accountBalances.map((account) => (
            <tr key={account.id}>
              <td className="pl-20-td">{account.name}:</td>
              <td>{formatHq6Currency(account.balance, currency)}</td>
              <td>&nbsp;</td>
            </tr>
          ))
        )}
      </tbody>
      <tfoot>
        <tr className="bg-gray">
          <th>Total</th>
          <td>
            <span className="remote-data" id="total_credit">
              {formatHq6Currency(debitTotal, currency)}
            </span>
          </td>
          <td>
            <span className="remote-data" id="total_debit">
              {formatHq6Currency(creditTotal, currency)}
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** HQ6 Trial Balance — ui-audit/41_account__trial-balance */
export function Hq6TrialBalanceView() {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const [locationCode, setLocationCode] = useState("");
  const [endDate, setEndDate] = useState(todayInputValue);
  const locations = config?.businessLocations ?? [];
  const businessName = config?.name?.trim() || "Vonos Automotive";

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "payment-account-report",
      tenantId,
      "trial-balance-hq6",
      endDate,
      locationCode,
    ],
    queryFn: () =>
      runReport({
        // HQ6 trial balance is an as-of snapshot (same inputs as balance sheet).
        reportId: "balance-sheet",
        to: endDate || undefined,
        tenantId: tenantId ?? undefined,
        locationCode: locationCode || undefined,
      }),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const asOfLabel = useMemo(
    () => formatHq6Date(endDate || new Date().toISOString()),
    [endDate],
  );

  const report = data?.balanceSheet;

  return (
    <div className="hq6-page">
      <Hq6PageHeader title="Trial Balance" />
      <section className="content">
        <div className="row">
          <div className="col-md-12">
            <UposFiltersPanel>
              <div className="row">
                <div className="col-md-3">
                  <div className="form-group">
                    <label htmlFor="trial_bal_location_id">
                      Business Location:
                    </label>
                    <select
                      id="trial_bal_location_id"
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
                <div className="col-sm-3 col-xs-6">
                  <label htmlFor="end_date">Filter by date:</label>
                  <div className="input-group">
                    <span className="input-group-addon">
                      <i className="fa fa-calendar" aria-hidden />
                    </span>
                    <input
                      type="date"
                      id="end_date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </UposFiltersPanel>
          </div>
        </div>

        <br />

        <div className="box box-solid">
          <div className="box-header print_section">
            <h3 className="box-title">
              {businessName} - Trial Balance -{" "}
              <span id="hidden_date">{asOfLabel}</span>
            </h3>
          </div>
          <div className="box-body">
            {isLoading || (isFetching && !report) ? (
              <p className="text-sm text-[#6b7280]">Loading trial balance…</p>
            ) : error ? (
              <p className="text-sm text-[#dc2626]">Failed to load report.</p>
            ) : report ? (
              <TrialBalanceBladeTable report={report} />
            ) : (
              <p className="text-sm text-[#6b7280]">No trial balance data.</p>
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
