import { describe, expect, it } from "vitest";
import {
  canAddPaymentForStatus,
  hq6PaymentBadgeClass,
} from "./hq6PaymentBadge";

describe("canAddPaymentForStatus", () => {
  it("shows Add Payment when remaining due > 0", () => {
    expect(canAddPaymentForStatus("paid", 50)).toBe(true);
    expect(canAddPaymentForStatus("due", 10)).toBe(true);
  });

  it("hides Add Payment when paid and nothing due", () => {
    expect(canAddPaymentForStatus("paid", 0)).toBe(false);
    expect(canAddPaymentForStatus("paid", null)).toBe(false);
  });

  it("shows Add Payment for due / partial / overdue even if amount is briefly 0", () => {
    expect(canAddPaymentForStatus("due", 0)).toBe(true);
    expect(canAddPaymentForStatus("partial", 0)).toBe(true);
    expect(canAddPaymentForStatus("overdue", 0)).toBe(true);
  });

  it("does not treat unknown statuses as payable without a due amount", () => {
    expect(canAddPaymentForStatus("refunded", 0)).toBe(false);
    expect(canAddPaymentForStatus("", null)).toBe(true);
  });
});

describe("hq6PaymentBadgeClass", () => {
  it("maps paid / partial / due", () => {
    expect(hq6PaymentBadgeClass("paid")).toBe("hq6-pay-paid");
    expect(hq6PaymentBadgeClass("partial")).toBe("hq6-pay-partial");
    expect(hq6PaymentBadgeClass("due")).toBe("hq6-pay-due");
    expect(hq6PaymentBadgeClass("overdue")).toBe("hq6-pay-due");
  });
});
