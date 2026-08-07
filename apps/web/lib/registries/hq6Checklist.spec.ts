import { describe, expect, it } from "vitest";
import { HQ6_CHECKLIST } from "./hq6Checklist";

describe("HQ6 checklist (ui-audit)", () => {
  it("covers all 71 audit folders", () => {
    expect(HQ6_CHECKLIST).toHaveLength(71);
    const audits = HQ6_CHECKLIST.map((row) => row.audit);
    expect(new Set(audits).size).toBe(71);
    expect(audits[0]).toBe("00_home");
    expect(audits.at(-1)).toBe("70_essentials__todo");
  });

  it("keeps money / contact / purchase routes that the walkthrough broke", () => {
    const byAudit = Object.fromEntries(
      HQ6_CHECKLIST.map((row) => [row.audit, row.route]),
    );
    expect(byAudit["21_purchases"]).toBe("/VA/purchases");
    expect(byAudit["22_purchases__create"]).toBe("/VA/add-purchase");
    expect(byAudit["24_sells"]).toBe("/VA/sales");
    expect(byAudit["36_expenses"]).toBe("/VA/expenses");
    expect(byAudit["39_account__account"]).toBe("/VA/payment-accounts");
    expect(byAudit["04_contacts__type=supplier"]).toBe("/VA/suppliers");
  });

  it("only uses /VA/* routes", () => {
    for (const row of HQ6_CHECKLIST) {
      expect(row.route.startsWith("/VA/")).toBe(true);
    }
  });
});
