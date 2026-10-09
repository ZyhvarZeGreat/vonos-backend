/**
 * Till-side totals math for the Cafe POS.
 *
 * Mirrors the backend (`apps/api/src/modules/sales/saleTotals.ts`):
 * payable = subtotal − discount + tax + shipping.
 * Keep the two in sync — the backend recomputes on finalize and wins.
 */

export type PosPercentOrFixed = {
  kind: "fixed" | "percent";
  amount: number;
};

export interface PosTotalsLine {
  quantity: number;
  unitPrice: number;
}

export interface PosTotalsInput {
  lines: PosTotalsLine[];
  discount?: PosPercentOrFixed;
  orderTax?: PosPercentOrFixed;
  shipping?: number;
}

export interface PosTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  totalPayable: number;
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineSubtotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return round2(Math.max(0, quantity) * Math.max(0, unitPrice));
}

/** Fixed amount or percent-of-base, clamped to [0, base]. */
export function discountAmount(
  subtotal: number,
  discount?: PosPercentOrFixed,
): number {
  const base = Math.max(0, subtotal);
  if (!discount) return 0;
  const raw = Number(discount.amount);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const value =
    discount.kind === "percent" ? (base * raw) / 100 : raw;
  return round2(Math.min(base, Math.max(0, value)));
}

/** Fixed amount or percent-of-post-discount-base. Never negative. */
export function taxAmount(
  baseAfterDiscount: number,
  tax?: PosPercentOrFixed,
): number {
  const base = Math.max(0, baseAfterDiscount);
  if (!tax) return 0;
  const raw = Number(tax.amount);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return round2(discountAmount(base, tax));
}

export const EMPTY_POS_TOTALS: PosTotals = {
  itemCount: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  totalPayable: 0,
};

export function computePosTotals(input: PosTotalsInput): PosTotals {
  const lines = input.lines ?? [];
  const itemCount = lines.reduce(
    (sum, line) => sum + (Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0),
    0,
  );
  const subtotal = round2(
    lines.reduce((sum, line) => sum + lineSubtotal(line.quantity, line.unitPrice), 0),
  );
  const discount = discountAmount(subtotal, input.discount);
  const afterDiscount = round2(subtotal - discount);
  const tax = taxAmount(afterDiscount, input.orderTax);
  const shippingRaw = Number(input.shipping ?? 0);
  const shipping = round2(
    Number.isFinite(shippingRaw) ? Math.max(0, shippingRaw) : 0,
  );
  return {
    itemCount: round2(itemCount),
    subtotal,
    discount,
    tax,
    shipping,
    totalPayable: round2(afterDiscount + tax + shipping),
  };
}
