import { describe, expect, it } from "vitest";
import {
  computePosTotals,
  discountAmount,
  EMPTY_POS_TOTALS,
  lineSubtotal,
  round2,
  taxAmount,
} from "./posTotals";

describe("lineSubtotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineSubtotal(2, 1500)).toBe(3000);
  });

  it("clamps negatives and non-finite input to zero", () => {
    expect(lineSubtotal(-1, 1500)).toBe(0);
    expect(lineSubtotal(2, -50)).toBe(0);
    expect(lineSubtotal(Number.NaN, 1500)).toBe(0);
  });
});

describe("discountAmount", () => {
  it("applies fixed discounts capped at the subtotal", () => {
    expect(discountAmount(1000, { kind: "fixed", amount: 200 })).toBe(200);
    expect(discountAmount(1000, { kind: "fixed", amount: 5000 })).toBe(1000);
  });

  it("applies percent discounts", () => {
    expect(discountAmount(1000, { kind: "percent", amount: 10 })).toBe(100);
  });

  it("ignores missing or invalid discounts", () => {
    expect(discountAmount(1000)).toBe(0);
    expect(discountAmount(1000, { kind: "fixed", amount: -5 })).toBe(0);
    expect(discountAmount(1000, { kind: "percent", amount: Number.NaN })).toBe(0);
  });
});

describe("taxAmount", () => {
  it("applies percent tax to the post-discount base", () => {
    expect(taxAmount(900, { kind: "percent", amount: 10 })).toBe(90);
  });

  it("applies fixed tax", () => {
    expect(taxAmount(900, { kind: "fixed", amount: 50 })).toBe(50);
  });
});

describe("round2", () => {
  it("rounds half-cents and guards non-finite input", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(Number.NaN)).toBe(0);
  });
});

describe("computePosTotals", () => {
  it("returns zeros for an empty cart", () => {
    expect(computePosTotals({ lines: [] })).toEqual(EMPTY_POS_TOTALS);
  });

  it("sums lines into subtotal and payable", () => {
    expect(
      computePosTotals({
        lines: [
          { quantity: 1, unitPrice: 1500 },
          { quantity: 2, unitPrice: 250 },
        ],
      }),
    ).toEqual({
      itemCount: 3,
      subtotal: 2000,
      discount: 0,
      tax: 0,
      shipping: 0,
      totalPayable: 2000,
    });
  });

  it("applies percent discount, percent order tax, and shipping", () => {
    // Mirrors the audited till: discount on subtotal, tax on post-discount base.
    expect(
      computePosTotals({
        lines: [{ quantity: 2, unitPrice: 500 }],
        discount: { kind: "percent", amount: 10 },
        orderTax: { kind: "percent", amount: 5 },
        shipping: 100,
      }),
    ).toEqual({
      itemCount: 2,
      subtotal: 1000,
      discount: 100,
      tax: 45,
      shipping: 100,
      totalPayable: 1045,
    });
  });

  it("never goes negative", () => {
    const totals = computePosTotals({
      lines: [{ quantity: 1, unitPrice: 100 }],
      discount: { kind: "fixed", amount: 9999 },
      shipping: -50,
    });
    expect(totals.totalPayable).toBe(0);
    expect(totals.shipping).toBe(0);
  });
});
