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

function BalanceSheetBladeTable({ report }: { report: BalanceSheetReport }) {
  const { currency } = report;
  return (
    <table className="table table-border-center no-border table-pl-12">
      <thead>
        <tr className="bg-gray">
          <th>Liability</th>
          <th>Assets</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="align-top">
            <table className="table">
              <tbody>
                {report.liabilities.map((line) => (
                  <tr key={line.key}>
                    <th>{line.label}:</th>
                    <td>
                      <span className="remote-data">
                        {formatHq6Currency(line.amount, currency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
          <td className="align-top">
            <table className="table" id="assets_table">
              <tbody>
                {report.assets.map((line) => (
                  <tr key={line.key}>
                    <th>{line.label}:</th>
                    <td>
                      <span className="remote-data">
                        {formatHq6Currency(line.amount, currency)}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <th colSpan={2}>Account Balances:</th>
                </tr>
              </tbody>
              <tbody id="account_balances" className="pl-20-td">
                {report.accountBalances.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-muted">
                      No accounts
                    </td>
                  </tr>
                ) : (
                  report.accountBalances.map((account) => (
                    <tr key={account.id}>
                      <td className="pl-20-td">{account.name}:</td>
                      <td>
                        {formatHq6Currency(account.balance, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td>
            <table className="table bg-gray mb-0 no-border">
              <tbody>
                <tr>
                  <th>Total Liability:</th>
                  <td>
                    <span id="total_liabilty">
                      {formatHq6Currency(report.totalLiability, currency)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
          <td>
            <table className="table bg-gray mb-0 no-border">
              <tbody>
                <tr>
                  <th>Total Assets:</th>
                  <td>
                    <span id="total_assets">
                      {formatHq6Currency(report.totalAssets, currency)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** HQ6 Balance Sheet — ui-audit/40_account__balance-sheet */
export function Hq6BalanceSheetView() {
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
      "balance-sheet",
      endDate,
      locationCode,
    ],
    queryFn: () =>
      runReport({
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
      <Hq6PageHeader title="Balance Sheet" />
      <section className="content">
        <div className="row">
          <div className="col-md-12">
            <UposFiltersPanel>
              <div className="row">
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
                    <label>Filter by date:</label>
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
              </div>
            </UposFiltersPanel>
          </div>
        </div>

        <br />

        <div className="box box-solid">
          <div className="box-header">
            <h3 className="box-title">
              {businessName} - Balance Sheet -{" "}
              <span id="hidden_date">{asOfLabel}</span>
            </h3>
          </div>
          <div className="box-body">
            {isLoading || (isFetching && !report) ? (
              <p className="text-sm text-[#6b7280]">Loading balance sheet…</p>
            ) : error ? (
              <p className="text-sm text-[#dc2626]">Failed to load report.</p>
            ) : report ? (
              <BalanceSheetBladeTable report={report} />
            ) : (
              <p className="text-sm text-[#6b7280]">No balance sheet data.</p>
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
