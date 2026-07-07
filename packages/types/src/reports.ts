export interface ReportsKpi {
  label: string;
  icon: string;
  metricKey: string;
  color: string;
  value: number;
  currency?: string;
  delta?: number;
  deltaLabel?: string;
  deltaPercent?: string;
}

export interface ReportsChartSeries {
  name: string;
  dataKey: string;
  color: string;
}

export interface ReportsChart {
  id: string;
  title: string;
  subtitle?: string;
  type: "bar" | "line" | "pie";
  horizontal?: boolean;
  series: ReportsChartSeries[];
  data: Array<{ label: string } & Record<string, string | number>>;
}

export interface ReportsTableColumn {
  key: string;
  header: string;
}

/** HQ6-style row action (fix stock, edit expiry, view linked record). */
export type ReportRowActionKind =
  | "view-record"
  | "fix-stock"
  | "edit-expiry"
  | "edit-payment";

export interface ReportRowAction {
  kind: ReportRowActionKind;
  label: string;
  payload: Record<string, string | number>;
}

export interface ReportsTableRow {
  id?: string;
  recordType?: string;
  actions?: ReportRowAction[];
  [key: string]: string | number | ReportRowAction[] | undefined;
}

export interface ReportsTable {
  columns: ReportsTableColumn[];
  rows: ReportsTableRow[];
}

/** HQ6-style P&L line (debit = left column, credit = right column). */
export interface ProfitLossLine {
  key: string;
  label: string;
  amount: number;
}

export type ProfitLossBreakdownTab =
  | "product"
  | "category"
  | "brand"
  | "location"
  | "invoice"
  | "date"
  | "customer"
  | "day"
  | "service-staff";

export interface ProfitLossSummary {
  currency: string;
  debits: ProfitLossLine[];
  credits: ProfitLossLine[];
  cogs: number;
  grossProfit: number;
  netProfit: number;
}

export interface ProfitLossReport {
  summary: ProfitLossSummary;
  breakdowns: Partial<Record<ProfitLossBreakdownTab, ReportsTable>>;
}

export interface GroupReportEntityRollup {
  code: string;
  rows: Record<string, string | number>[];
}

export interface ReportsDashboard {
  kpis: ReportsKpi[];
  charts: ReportsChart[];
  table?: ReportsTable | null;
  /** Present for profit-loss report — HQ6 two-column layout + breakdown tabs. */
  profitLoss?: ProfitLossReport;
  /** VAG group roll-up: per-entity rows for the active report. */
  byEntity?: GroupReportEntityRollup[];
}
