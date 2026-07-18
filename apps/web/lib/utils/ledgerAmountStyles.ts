import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export function debitCreditClass(
  kind: "debit" | "credit" | "neutral",
): string {
  if (kind === "credit") return "font-medium tabular-nums text-emerald-600";
  if (kind === "debit") return "font-medium tabular-nums text-red-600";
  return "tabular-nums text-foreground";
}

export function signedAmountClass(amount: number): string {
  if (amount > 0) return "font-medium tabular-nums text-emerald-600";
  if (amount < 0) return "font-medium tabular-nums text-red-600";
  return "tabular-nums text-foreground";
}

export function formatDebitCell(
  amount: number | null | undefined,
  currency: string,
): { text: string; className: string } {
  if (amount == null || amount === 0) {
    return { text: "—", className: "tabular-nums text-muted" };
  }
  return {
    text: formatCurrency(amount, currency),
    className: debitCreditClass("debit"),
  };
}

export function formatCreditCell(
  amount: number | null | undefined,
  currency: string,
): { text: string; className: string } {
  if (amount == null || amount === 0) {
    return { text: "—", className: "tabular-nums text-muted" };
  }
  return {
    text: formatCurrency(amount, currency),
    className: debitCreditClass("credit"),
  };
}

export function amountCellClassName(
  kind: "debit" | "credit" | "balance",
  amount?: number | null,
): string {
  if (kind === "debit") return debitCreditClass("debit");
  if (kind === "credit") return debitCreditClass("credit");
  if (amount != null) return signedAmountClass(amount);
  return "tabular-nums text-foreground";
}

export function ledgerTableClass(...parts: Array<string | false | undefined>) {
  return cn("text-sm", ...parts);
}
