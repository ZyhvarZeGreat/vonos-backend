import { describe, expect, it } from "vitest";
import {
  patchFromMarginPercent,
  patchFromPurchaseExcTax,
  patchFromSellingPrice,
  sellingFromMargin,
} from "./productPriceForm";

const base = {
  purchaseExcTax: "30000",
  purchaseIncTax: "30000",
  sellingExcTax: "",
  marginPercent: "0",
};

describe("sellingFromMargin", () => {
  it("does not overwrite selling at 0% margin (unit vs sell snap-back)", () => {
    expect(sellingFromMargin("30000", "0")).toBeNull();
    expect(sellingFromMargin("30000", "0", false)).toBeNull();
  });

  it("forces sell = cost when margin field is set to 0%", () => {
    expect(sellingFromMargin("30000", "0", true)).toBe("30000.00");
  });

  it("applies non-zero margin to selling", () => {
    expect(sellingFromMargin("30000", "16.67")).toBe("35001.00");
  });
});

describe("patchFromPurchaseExcTax", () => {
  it("updates cost without inventing a selling price at 0% margin", () => {
    const next = patchFromPurchaseExcTax(base, "35000");
    expect(next).toEqual({
      ...base,
      purchaseExcTax: "35000",
      purchaseIncTax: "35000",
    });
    expect(next?.sellingExcTax).toBe("");
  });

  it("recalculates selling when margin is already set", () => {
    const next = patchFromPurchaseExcTax(
      { ...base, marginPercent: "10", sellingExcTax: "33000" },
      "30000",
    );
    expect(next?.sellingExcTax).toBe("33000.00");
  });
});

describe("patchFromSellingPrice", () => {
  it("keeps a higher selling price and updates margin (30k → 35k)", () => {
    const next = patchFromSellingPrice(base, "35000");
    expect(next?.sellingExcTax).toBe("35000");
    expect(next?.marginPercent).toBe("16.67");
    expect(next?.purchaseExcTax).toBe("30000");
  });
});

describe("patchFromMarginPercent", () => {
  it("recalculates selling when margin is edited", () => {
    const next = patchFromMarginPercent(base, "10");
    expect(next?.marginPercent).toBe("10");
    expect(next?.sellingExcTax).toBe("33000.00");
  });
});
