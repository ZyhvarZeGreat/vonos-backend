import { describe, expect, it } from "vitest";
import {
  purchaseAdditionalPaymentAmount,
  purchaseAlreadyPaid,
  purchaseSaveReference,
} from "./purchaseEditPayment";

describe("purchaseEditPayment", () => {
  it("uses max of totalPaid cache and payment rows on edit", () => {
    expect(
      purchaseAlreadyPaid("m1", 0, [{ amount: 5000 }, { amount: 2000 }]),
    ).toBe(7000);
    expect(purchaseAlreadyPaid("m1", 4000, [{ amount: 5000 }])).toBe(5000);
    expect(purchaseAlreadyPaid(null, 5000, [{ amount: 5000 }])).toBe(0);
  });

  it("only posts incremental payment on edit", () => {
    expect(purchaseAdditionalPaymentAmount("m1", 5000, 5000)).toBe(0);
    expect(purchaseAdditionalPaymentAmount("m1", 6000, 5000)).toBe(1000);
    expect(purchaseAdditionalPaymentAmount(null, 3000, 0)).toBe(3000);
  });

  it("preserves existing reference on edit when form reference is blank", () => {
    expect(purchaseSaveReference("", "m1", "PO-2024-001")).toBe("PO-2024-001");
    expect(purchaseSaveReference("  PO-NEW  ", "m1", "PO-OLD")).toBe("PO-NEW");
    expect(purchaseSaveReference("", null, "PO-OLD")).toMatch(/^PO-/);
  });
});
