"use client";

import type { ReportsKpi } from "@vonos/types";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { Hq6UposCard } from "@/components/hq6/Hq6UposCard";

function formatKpi(kpi: ReportsKpi): string {
  if (kpi.currency) return formatCurrencyCompact(kpi.value, kpi.currency);
  return formatNumberCompact(kpi.value);
}

/**
 * HQ6 report KPI strip — labels row + h3 values in `table.no-border`
 * (stock report closing-stock summary pattern).
 */
export function Hq6ReportKpiSummary({ kpis }: { kpis: ReportsKpi[] }) {
  if (kpis.length === 0) return null;

  return (
    <div className="row">
      <div className="col-md-12">
        <Hq6UposCard>
          <div className="hq6-report-kpi-scroll">
            <table className="table no-border hq6-report-kpi-table">
              <tbody>
                <tr>
                  {kpis.map((kpi) => (
                    <td key={`label-${kpi.metricKey}`}>{kpi.label}</td>
                  ))}
                </tr>
                <tr>
                  {kpis.map((kpi) => (
                    <td key={`value-${kpi.metricKey}`}>
                      <h3 className="mb-0 mt-0">{formatKpi(kpi)}</h3>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Hq6UposCard>
      </div>
    </div>
  );
}
