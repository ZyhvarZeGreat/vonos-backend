"use client";

import type { ReportsDashboard, ReportRowAction, ReportsTableRow } from "@vonos/types";
import {
  ReportDetailSheet,
  type ReportTablePagination,
} from "@/components/organisms/ReportDetailSheet";
import { ProfitLossReportPanel } from "@/components/organisms/ProfitLossReportPanel";
import { PurchaseSaleReportPanel } from "@/components/organisms/PurchaseSaleReportPanel";
import { RegisterReportPanel } from "@/components/organisms/RegisterReportPanel";
import { TaxReportPanel } from "@/components/organisms/TaxReportPanel";
import { ServiceStaffReportPanel } from "@/components/organisms/ServiceStaffReportPanel";
import {
  BalanceSheetReportPanel,
  CashFlowReportPanel,
  PaymentAccountDetailReportPanel,
  TrialBalanceReportPanel,
} from "@/components/organisms/PaymentAccountReportPanels";
import { ReportPageSkeleton } from "@/components/organisms/skeletons";

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
  "service-staff": "kpiSummary",
  tax: "kpiSummary",
  "balance-sheet": "tableFocus",
  "trial-balance": "tableFocus",
  "cash-flow": "tableFocus",
  "payment-account-report": "tableFocus",
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
  tablePagination?: ReportTablePagination;
}

export function layoutVariantForReport(reportId: string): HqReportLayoutVariant {
  return REPORT_LAYOUT[reportId] ?? "default";
}

/** Skeleton matching the layout used for a given report id. */
export function HqReportPageSkeleton({ reportId }: { reportId: string }) {
  if (reportId === "profit-loss") {
    return <ReportPageSkeleton variant="profitLoss" />;
  }
  return <ReportPageSkeleton variant={layoutVariantForReport(reportId)} />;
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
  tablePagination,
}: HqReportPageLayoutProps) {
  const variant = layoutVariantForReport(reportId);

  if (reportId === "profit-loss" && data.profitLoss) {
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
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
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <PurchaseSaleReportPanel report={data} onPrint={() => window.print()} />
      </div>
    );
  }

  if (reportId === "register") {
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <RegisterReportPanel report={data} onPrint={() => window.print()} />
      </div>
    );
  }

  if (reportId === "tax") {
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <TaxReportPanel report={data} onPrint={() => window.print()} />
      </div>
    );
  }

  if (reportId === "service-staff") {
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <ServiceStaffReportPanel report={data} onPrint={() => window.print()} />
      </div>
    );
  }

  if (reportId === "balance-sheet" && data.balanceSheet) {
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <BalanceSheetReportPanel report={data.balanceSheet} />
      </div>
    );
  }

  if (reportId === "cash-flow" && data.cashFlow) {
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <CashFlowReportPanel report={data.cashFlow} />
      </div>
    );
  }

  if (reportId === "trial-balance" && data.table) {
    const currency =
      data.kpis.find((kpi) => kpi.currency)?.currency ?? "NGN";
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <TrialBalanceReportPanel table={data.table} currency={currency} />
      </div>
    );
  }

  if (reportId === "payment-account-report" && data.table) {
    const currency =
      data.kpis.find((kpi) => kpi.currency)?.currency ?? "NGN";
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <PaymentAccountDetailReportPanel
          table={data.table}
          currency={currency}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 sm:p-2">
      <ReportDetailSheet
        title={title}
        subtitle={subtitle}
        data={data}
        showCharts
        onRowClick={onRowClick}
        onRowAction={onRowAction}
        tablePagination={tablePagination}
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
