import { describe, expect, it } from "vitest";
import {
  captureSalePaymentWrite,
  paymentStatusFromPaid,
} from "./salePaymentWrite";

describe("paymentStatusFromPaid", () => {
  it("maps unpaid / partial / paid", () => {
    expect(paymentStatusFromPaid(100, 0)).toBe("due");
    expect(paymentStatusFromPaid(100, 40)).toBe("partial");
    expect(paymentStatusFromPaid(100, 100)).toBe("paid");
    expect(paymentStatusFromPaid(100, 100.00005)).toBe("paid");
  });
});

describe("captureSalePaymentWrite", () => {
  const sale = {
    id: "sale_1",
    total: 10_000,
    totalPaid: 2_000,
    sellDue: 8_000,
    currency: "NGN",
    customerName: "Ada",
    reference: "SI2026/1",
  };

  it("captures saleId before dismiss so later null sale props cannot break the write", () => {
    const captured = captureSalePaymentWrite({
      tenantId: "tenant_va",
      sale,
      amount: 3_000,
      method: "cash",
      accountId: "acct_cash",
      note: " partial ",
      paidOnIso: "2026-08-07T10:00:00.000Z",
    });

    // Simulate modal dismiss clearing the live sale prop.
    const liveSaleAfterDismiss = null;
    expect(liveSaleAfterDismiss).toBeNull();

    expect(captured.saleId).toBe("sale_1");
    expect(captured.tenantId).toBe("tenant_va");
    expect(captured.apply).toBe(3_000);
    expect(captured.nextPaid).toBe(5_000);
    expect(captured.remaining).toBe(5_000);
    expect(captured.paymentStatus).toBe("partial");
    expect(captured.body).toEqual({
      amount: 3_000,
      method: "cash",
      accountId: "acct_cash",
      note: "partial",
      paidOn: "2026-08-07T10:00:00.000Z",
    });
  });

  it("caps apply at remaining due", () => {
    const captured = captureSalePaymentWrite({
      tenantId: "tenant_va",
      sale,
      amount: 99_000,
      method: "cash",
      accountId: "acct_cash",
      paidOnIso: "2026-08-07T10:00:00.000Z",
    });
    expect(captured.apply).toBe(8_000);
    expect(captured.remaining).toBe(0);
    expect(captured.paymentStatus).toBe("paid");
  });

  it("throws Missing sale when sale is null (guard before dismiss)", () => {
    expect(() =>
      captureSalePaymentWrite({
        tenantId: "tenant_va",
        sale: null,
        amount: 100,
        method: "cash",
        accountId: "acct_cash",
        paidOnIso: "2026-08-07T10:00:00.000Z",
      }),
    ).toThrow("Missing sale");
  });

  it("throws when payment account is blank", () => {
    expect(() =>
      captureSalePaymentWrite({
        tenantId: "tenant_va",
        sale,
        amount: 100,
        method: "cash",
        accountId: "   ",
        paidOnIso: "2026-08-07T10:00:00.000Z",
      }),
    ).toThrow(/Payment Account/);
  });
});
