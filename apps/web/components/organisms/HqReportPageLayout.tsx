"use client";

import type { ReportsDashboard, ReportRowAction, ReportsTableRow } from "@vonos/types";
import { ReportDetailSheet } from "@/components/organisms/ReportDetailSheet";
import { ProfitLossReportPanel } from "@/components/organisms/ProfitLossReportPanel";
import { PurchaseSaleReportPanel } from "@/components/organisms/PurchaseSaleReportPanel";
import { RegisterReportPanel } from "@/components/organisms/RegisterReportPanel";

export type HqReportLayoutVariant =
  | "default"
  | "chartHero"
  | "kpiSummary"
  | "tableFocus";

const REPORT_LAYOUT: Record<string, HqReportLayoutVariant> = {
  "profit-loss": "chartHero",
  trending: "chartHero",
  "purchase-sale": "kpiSummary",
  expense: "kpiSummary",
  "activity-log": "tableFocus",
  register: "tableFocus",
  "supplier-customer": "tableFocus",
  "customer-groups": "tableFocus",
  stock: "default",
  items: "tableFocus",
  "product-purchase": "tableFocus",
  "product-sell": "tableFocus",
  "purchase-payment": "tableFocus",
  "sell-payment": "tableFocus",
  "sales-rep": "kpiSummary",
  tax: "kpiSummary",
};

export interface HqReportPageLayoutProps {
  reportId: string;
  title: string;
  subtitle: string;
  data: ReportsDashboard;
  tenantId?: string;
  from?: string;
  to?: string;
  summaryLoading?: boolean;
  onRowClick?: (row: ReportsTableRow & { id: string }) => void;
  onRowAction?: (action: ReportRowAction) => void;
}

export function layoutVariantForReport(reportId: string): HqReportLayoutVariant {
  return REPORT_LAYOUT[reportId] ?? "default";
}

export function HqReportPageLayout({
  reportId,
  title,
  subtitle,
  data,
  tenantId,
  from,
  to,
  summaryLoading,
  onRowClick,
  onRowAction,
}: HqReportPageLayoutProps) {
  const variant = layoutVariantForReport(reportId);

  if (reportId === "profit-loss" && data.profitLoss) {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <ProfitLossReportPanel
          report={data.profitLoss}
          tenantId={tenantId}
          from={from}
          to={to}
          summaryLoading={summaryLoading}
          onPrint={() => window.print()}
        />
      </div>
    );
  }

  if (reportId === "purchase-sale") {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <PurchaseSaleReportPanel report={data} onPrint={() => window.print()} />
      </div>
    );
  }

  if (reportId === "register") {
    return (
      <div className="space-y-4">
        <div className="px-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <RegisterReportPanel report={data} onPrint={() => window.print()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportDetailSheet
        title={title}
        subtitle={subtitle}
        data={data}
        showCharts
        onRowClick={onRowClick}
        onRowAction={onRowAction}
        chartGridClassName={
          variant === "chartHero"
            ? "grid gap-6 lg:grid-cols-1"
            : variant === "kpiSummary"
              ? "grid gap-6 lg:grid-cols-2"
              : "grid gap-6 lg:grid-cols-2"
        }
        kpiClassName={variant === "kpiSummary" ? "border-b border-border pb-2" : undefined}
        tableFirst={variant === "tableFocus" && data.charts.length === 0}
      />
    </div>
  );
}
