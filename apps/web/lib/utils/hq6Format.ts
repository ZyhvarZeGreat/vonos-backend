/** HQ6 Ultimate POS display formats (ui-audit / ui-table-rows reference). */

export function formatHq6Currency(
  amount: number,
  currency = "NGN",
): string {
  const symbol = currency === "NGN" ? "₦" : currency;
  const formatted = Math.abs(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${amount < 0 ? "-" : ""}${formatted}`;
}

/** DD-MM-YYYY (HQ6 DataTables date cells). */
export function formatHq6Date(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatHq6DateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatHq6PaymentMethod(method?: string | null): string {
  if (!method) return "—";
  return method
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatHq6PaymentStatus(status?: string | null): string {
  if (!status) return "—";
  if (status === "paid") return "Paid";
  if (status === "due") return "Due";
  if (status === "partial") return "Partial";
  if (status === "overdue") return "Overdue";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** HQ6 leaves empty cells blank (not an em dash). */
export function hq6Cell(value: string | null | undefined): string {
  if (value == null) return "";
  return value.trim();
}
