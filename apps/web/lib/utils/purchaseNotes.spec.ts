import { describe, expect, it } from "vitest";
import { parsePurchaseNotes } from "./purchaseNotes";

describe("parsePurchaseNotes", () => {
  it("restores every structured field written by the purchase form", () => {
    const notes = [
      "Call supplier before delivery",
      "Pay term: 30 days",
      "Purchase order: PO-88",
      "Discount: 5 (%)",
      "Purchase tax: 7.5",
      "Shipping details: Dock 2",
      "Shipping charges: 800.00",
      "Extra expense: Offloading = 200.00",
      "Payment: 12000.00 via cash on 2026-08-01T10:00",
      "Payment account id: acc_1",
      "Payment note: Paid at counter",
    ].join("\n");

    expect(parsePurchaseNotes(notes)).toMatchObject({
      additionalNotes: "Call supplier before delivery",
      payTermValue: "30",
      payTermUnit: "days",
      purchaseOrder: "PO-88",
      discountType: "percentage",
      discountAmount: "5",
      purchaseTax: "7.5",
      shippingDetails: "Dock 2",
      shippingCharges: "800.00",
      extraExpenses: [{ name: "Offloading", amount: "200.00" }],
      paymentAmount: "12000.00",
      paymentMethod: "cash",
      paidOn: "2026-08-01T10:00",
      paymentAccountId: "acc_1",
      paymentNote: "Paid at counter",
    });
  });
});
