import { marginFromFormPrices } from "@/lib/utils/productFormFromItem";

const MONEY_INPUT = /^\d*\.?\d*$/;
const MARGIN_INPUT = /^-?\d*\.?\d*$/;

export function isMoneyInputValue(raw: string): boolean {
  return raw === "" || MONEY_INPUT.test(raw);
}

export function isMarginInputValue(raw: string): boolean {
  return raw === "" || MARGIN_INPUT.test(raw);
}

/**
 * Recalculate selling from cost × (1 + margin/100).
 *
 * At 0% margin, do NOT copy cost into selling unless `force` (margin field
 * edited) — that overwrite is what made sell snap back to unit/cost price.
 */
export function sellingFromMargin(
  purchase: string,
  margin: string,
  force = false,
): string | null {
  const base = Number(purchase);
  const pct = Number(margin);
  if (!Number.isFinite(base) || !Number.isFinite(pct)) return null;
  if (!force && pct === 0) return null;
  return (base * (1 + pct / 100)).toFixed(2);
}

/** Patch when the user types selling price — margin follows, selling is never rewritten. */
export function patchFromSellingPrice<T extends {
  purchaseExcTax: string;
  sellingExcTax: string;
  marginPercent: string;
}>(prev: T, next: string): T | null {
  if (!isMoneyInputValue(next)) return null;
  return {
    ...prev,
    sellingExcTax: next,
    marginPercent: marginFromFormPrices(prev.purchaseExcTax, next),
  };
}

/** Patch when purchase (exc. tax) changes — keep inc. tax in sync; maybe update sell. */
export function patchFromPurchaseExcTax<T extends {
  purchaseExcTax: string;
  purchaseIncTax: string;
  sellingExcTax: string;
  marginPercent: string;
}>(prev: T, next: string): T | null {
  if (!isMoneyInputValue(next)) return null;
  const selling = sellingFromMargin(next, prev.marginPercent);
  return {
    ...prev,
    purchaseExcTax: next,
    purchaseIncTax: next,
    ...(selling != null ? { sellingExcTax: selling } : {}),
  };
}

/** Patch when margin % changes — always recalculate selling. */
export function patchFromMarginPercent<T extends {
  purchaseExcTax: string;
  sellingExcTax: string;
  marginPercent: string;
}>(prev: T, next: string): T | null {
  if (!isMarginInputValue(next)) return null;
  const selling = sellingFromMargin(prev.purchaseExcTax, next, true);
  return {
    ...prev,
    marginPercent: next,
    ...(selling != null ? { sellingExcTax: selling } : {}),
  };
}
