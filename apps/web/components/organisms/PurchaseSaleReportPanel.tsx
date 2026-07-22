"use client";

import type { ReportsDashboard } from "@vonos/types";
import { TaxReportPanel } from "@/components/organisms/TaxReportPanel";

/**
 * HQ6 Purchase & Sale report uses the same Purchases / Sales / Overall
 * summary cards as Tax Report (taxReport payload), kept concise and detailed.
 */
export function PurchaseSaleReportPanel({
  report,
  tenantId,
  from,
  to,
  onPrint,
}: {
  report: ReportsDashboard;
  tenantId?: string;
  from?: string;
  to?: string;
  onPrint?: () => void;
}) {
  return (
    <TaxReportPanel
      report={report}
      reportId="purchase-sale"
      tenantId={tenantId}
      from={from}
      to={to}
      onPrint={onPrint}
    />
  );
}
