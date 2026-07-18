import type { ReportsTableColumn, ReportsTableRow } from "@vonos/types";

/** Line / aggregate money columns — not unit prices. */
const CURRENCY_TOTAL_KEYS = new Set([
  "amount",
  "total",
  "revenue",
  "subtotal",
  "discount",
  "tax",
  "priceinctax",
  "cost",
  "costs",
  "stockvalue",
  "moneyin",
  "moneyout",
  "debit",
  "credit",
  "grossprofit",
  "margin",
  "openpovalue",
  "outstanding",
  "totalspend",
  "quoteamount",
  "quoteprice",
  "totalsale",
]);

/** Display-as-currency including unit prices (not footered). */
const CURRENCY_DISPLAY_KEYS = new Set([
  ...CURRENCY_TOTAL_KEYS,
  "unitprice",
  "sellingprice",
  "purchaseprice",
  "costprice",
  "avgticket",
  "price",
]);

/** Quantity / count columns. */
const NUMBER_TOTAL_KEYS = new Set([
  "quantity",
  "qty",
  "units",
  "unitssold",
  "sellquantity",
  "locationqty",
  "itemtotal",
  "calculatedtotal",
  "lines",
  "transactions",
  "priorunits",
  "jobs",
]);

/** Unit / average fields that must never be footered. */
const NEVER_TOTAL_KEYS = new Set([
  "unitprice",
  "sellingprice",
  "purchaseprice",
  "costprice",
  "avgticket",
  "reorderpoint",
  "rate",
  "unit",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ReportTotalKind = "currency" | "number";

export function isReportCurrencyDisplayKey(key: string): boolean {
  return CURRENCY_DISPLAY_KEYS.has(normalizeKey(key));
}

export function reportColumnTotalKind(
  column: ReportsTableColumn,
): ReportTotalKind | null {
  if (column.totalAs) return column.totalAs;

  const key = normalizeKey(column.key);
  if (NEVER_TOTAL_KEYS.has(key)) return null;
  if (CURRENCY_TOTAL_KEYS.has(key)) return "currency";
  if (NUMBER_TOTAL_KEYS.has(key)) return "number";

  const header = column.header.toLowerCase();
  if (
    /unit\s*price|selling\s*price|purchase\s*price|avg|average|reorder/.test(
      header,
    )
  ) {
    return null;
  }
  if (
    /\b(amount|subtotal|discount|tax|revenue|cost|value)\b/.test(header) ||
    /^total\b/.test(header) ||
    /\btotal\b/.test(header)
  ) {
    return "currency";
  }
  if (/\b(qty|quantity|units?|lines?|transactions?)\b/.test(header)) {
    return "number";
  }
  return null;
}

export function parseReportNumericCell(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return null;
  const cleaned = trimmed.replace(/[₦$,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Prefer server `columnTotals`; otherwise sum visible rows for summable columns. */
export function resolveReportColumnTotals(
  columns: ReportsTableColumn[],
  rows: ReportsTableRow[],
  columnTotals?: Record<string, number> | null,
): Record<string, { kind: ReportTotalKind; value: number }> {
  const out: Record<string, { kind: ReportTotalKind; value: number }> = {};

  for (const col of columns) {
    const kind = reportColumnTotalKind(col);
    if (!kind) continue;

    if (columnTotals && col.key in columnTotals) {
      const serverVal = columnTotals[col.key];
      if (typeof serverVal === "number" && Number.isFinite(serverVal)) {
        out[col.key] = { kind, value: serverVal };
        continue;
      }
    }

    let sum = 0;
    let any = false;
    for (const row of rows) {
      const n = parseReportNumericCell(row[col.key]);
      if (n == null) continue;
      sum += n;
      any = true;
    }
    if (any) out[col.key] = { kind, value: sum };
  }

  return out;
}

export function reportHasColumnTotals(
  columns: ReportsTableColumn[],
  rows: ReportsTableRow[],
  columnTotals?: Record<string, number> | null,
): boolean {
  return (
    Object.keys(resolveReportColumnTotals(columns, rows, columnTotals)).length >
    0
  );
}
