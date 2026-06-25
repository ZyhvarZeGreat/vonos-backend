import { formatDate, formatDateTime } from "@/lib/utils/formatDate";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const DATE_ONLY_KEYS = new Set(["date", "duedate"]);

const DATE_TIME_KEYS = new Set([
  "createdat",
  "updatedat",
  "starttime",
  "endtime",
]);

const CURRENCY_KEYS = new Set([
  "total",
  "amount",
  "costprice",
  "quoteprice",
  "quoteamount",
  "totalspend",
  "price",
  "unitprice",
  "openpovalue",
  "stockvalue",
  "revenue",
  "costs",
  "net",
  "outstanding",
  "subtotal",
  "unit",
  "rate",
  "base",
  "delta",
]);

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function isDateOnlyKey(key: string): boolean {
  return DATE_ONLY_KEYS.has(normalizeKey(key));
}

function isDateTimeKey(key: string): boolean {
  return DATE_TIME_KEYS.has(normalizeKey(key));
}

function isCurrencyKey(key: string): boolean {
  return CURRENCY_KEYS.has(normalizeKey(key));
}

function rowCurrency(row: Record<string, unknown>): string {
  const currency = row.currency;
  return typeof currency === "string" && currency.length > 0 ? currency : "NGN";
}

/** Default DataTable cell formatting for dates and money. */
export function formatTableCellValue(
  key: string,
  row: Record<string, unknown>,
): string {
  const value = row[key];

  if (value == null || value === "") {
    return "—";
  }

  if (isDateOnlyKey(key)) {
    return formatDate(String(value));
  }

  if (isDateTimeKey(key)) {
    return formatDateTime(String(value));
  }

  if (isCurrencyKey(key) && typeof value === "number") {
    return formatCurrency(value, rowCurrency(row));
  }

  return String(value);
}
