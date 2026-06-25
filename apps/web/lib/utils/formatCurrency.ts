import millify from "millify";

const MILLIFY_OPTS = { precision: 1, lowercase: false } as const;

const CURRENCY_SYMBOL: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

function currencyPrefix(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? `${currency} `;
}

/** Exact amount for lists, ledger rows, line items. */
export function formatCurrency(amount: number, currency = "NGN"): string {
  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Abbreviated amount for KPI cards and dashboards (millify). */
export function formatCurrencyCompact(amount: number, currency = "NGN"): string {
  if (!Number.isFinite(amount)) return "—";

  const prefix = currencyPrefix(currency);
  return `${prefix}${millify(amount, MILLIFY_OPTS)}`;
}

/** Exact count for tables and detail rows. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-NG").format(value);
}

/** Abbreviated count for KPIs, stats, and summary tiles (millify). */
export function formatNumberCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return millify(value, MILLIFY_OPTS);
}
