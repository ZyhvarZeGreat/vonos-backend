"use client";

import type { ReportsDashboard, ReportRowAction, ReportsTableRow } from "@vonos/types";
import type { ReactNode } from "react";
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
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";

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
  tableSearch?: string;
  onTableSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  tableSearch,
  onTableSearchChange,
  searchPlaceholder,
}: HqReportPageLayoutProps) {
  const variant = layoutVariantForReport(reportId);
  const isHq6 = useIsVaHq6();

  const wrap = (panel: ReactNode) => {
    if (isHq6) {
      return (
        <Hq6PageFrame title={title} subtitle={subtitle}>
          <div className="space-y-[var(--hq6-section-gap)]">{panel}</div>
        </Hq6PageFrame>
      );
    }
    return (
      <div className="space-y-6 p-1 sm:p-2">
        <div className="px-1 sm:px-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {panel}
      </div>
    );
  };

  if (reportId === "profit-loss" && data.profitLoss) {
    return wrap(
      <ProfitLossReportPanel
        report={data.profitLoss}
        tenantId={tenantId}
        from={from}
        to={to}
        summaryLoading={summaryLoading}
        onPrint={() => window.print()}
      />,
    );
  }

  if (reportId === "purchase-sale") {
    return wrap(
      <PurchaseSaleReportPanel
        report={data}
        tenantId={tenantId}
        from={from}
        to={to}
        onPrint={() => window.print()}
      />,
    );
  }

  if (reportId === "register") {
    return wrap(
      <RegisterReportPanel report={data} onPrint={() => window.print()} />,
    );
  }

  if (reportId === "tax") {
    return wrap(
      <TaxReportPanel
        report={data}
        reportId="tax"
        tenantId={tenantId}
        from={from}
        to={to}
        onPrint={() => window.print()}
      />,
    );
  }

  if (reportId === "service-staff") {
    return wrap(
      <ServiceStaffReportPanel report={data} onPrint={() => window.print()} />,
    );
  }

  if (reportId === "balance-sheet" && data.balanceSheet) {
    return wrap(<BalanceSheetReportPanel report={data.balanceSheet} />);
  }

  if (reportId === "cash-flow" && data.cashFlow) {
    return wrap(<CashFlowReportPanel report={data.cashFlow} />);
  }

  if (reportId === "trial-balance" && data.table) {
    const currency =
      data.kpis.find((kpi) => kpi.currency)?.currency ?? "NGN";
    return wrap(
      <TrialBalanceReportPanel table={data.table} currency={currency} />,
    );
  }

  if (reportId === "payment-account-report" && data.table) {
    const currency =
      data.kpis.find((kpi) => kpi.currency)?.currency ?? "NGN";
    return wrap(
      <PaymentAccountDetailReportPanel
        table={data.table}
        currency={currency}
      />,
    );
  }

  return wrap(
    <ReportDetailSheet
      title={title}
      subtitle={subtitle}
      data={data}
      showCharts
      onRowClick={onRowClick}
      onRowAction={onRowAction}
      tablePagination={tablePagination}
      tableSearch={tableSearch}
      onTableSearchChange={onTableSearchChange}
      searchPlaceholder={searchPlaceholder}
      chartGridClassName={
        variant === "chartHero"
          ? "grid gap-6 lg:grid-cols-1"
          : variant === "kpiSummary"
            ? "grid gap-6 lg:grid-cols-2"
            : "grid gap-6 lg:grid-cols-2"
      }
      kpiClassName={variant === "kpiSummary" ? "border-b border-border pb-2" : undefined}
      tableFirst={variant === "tableFocus" && data.charts.length === 0}
    />,
  );
}
