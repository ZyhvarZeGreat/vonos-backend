import { describe, expect, it } from "vitest";
import {
  filterSelectablePaymentAccounts,
  isSelectablePaymentAccount,
} from "./paymentAccountPicker";

const JUNK = [
  "Assets",
  "Asset",
  "Liabilities",
  "Liability",
  "Equity",
  "Income",
  "Expense",
  "Address to new bill",
  "Accounts Payable",
  "Account Receivable",
  "Accounts Receivable",
  "Cash express payment",
  "Cash payment received",
];

const REAL = [
  "Cash Expense",
  "Cash Received",
  "Discount",
  "Moniepoint",
  "Providus Bank",
  "Fidelity",
];

describe("isSelectablePaymentAccount (audit: junk chart accounts)", () => {
  it.each(JUNK)("hides junk account %s", (name) => {
    expect(isSelectablePaymentAccount({ name })).toBe(false);
  });

  it.each(REAL)("keeps real till/bank %s", (name) => {
    expect(isSelectablePaymentAccount({ name })).toBe(true);
  });

  it("hides closed and deleted accounts", () => {
    expect(
      isSelectablePaymentAccount({ name: "Moniepoint", isClosed: true }),
    ).toBe(false);
    expect(
      isSelectablePaymentAccount({
        name: "Moniepoint",
        deletedAt: "2026-01-01",
      }),
    ).toBe(false);
  });

  it("filters a mixed roster down to real open tills", () => {
    const filtered = filterSelectablePaymentAccounts([
      { name: "Assets" },
      { name: "Address to new bill" },
      { name: "Moniepoint", accountNumber: "001" },
      { name: "Providus", isClosed: true },
      { name: "Cash Received" },
    ]);
    expect(filtered.map((a) => a.name)).toEqual(["Moniepoint", "Cash Received"]);
  });
});
