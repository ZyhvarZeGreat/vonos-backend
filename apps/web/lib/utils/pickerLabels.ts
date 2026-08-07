import type { Customer, PaymentAccount } from "@vonos/types";

/** Payment-account option label with optional live book balance. */
export function paymentAccountPickerLabel(account: PaymentAccount): string {
  const base = account.accountNumber
    ? `${account.name} (${account.accountNumber})`
    : account.name;
  if (typeof account.balance === "number") {
    return `${base} · Bal ${account.balance.toLocaleString()}`;
  }
  return base;
}

/** Customer option label with plate / due / advance hints when present. */
export function customerPickerLabel(row: Customer): string {
  const name = row.name?.trim() || "";
  const business = row.businessName?.trim() || "";
  const plate = row.contactId?.trim() || row.details?.contactId?.trim() || "";
  let label =
    business && business.toLowerCase() !== name.toLowerCase()
      ? `${name} · ${business}`
      : name || business || "Customer";
  if (plate) {
    label = `${label} · ${plate}`;
  }
  const hints: string[] = [];
  if ((row.totalAdvance ?? 0) > 0) {
    hints.push(`Adv ${row.totalAdvance!.toLocaleString()}`);
  }
  if ((row.totalSellDue ?? 0) > 0) {
    hints.push(`Due ${row.totalSellDue!.toLocaleString()}`);
  }
  if (hints.length > 0) {
    label = `${label} · ${hints.join(" · ")}`;
  }
  return label;
}
