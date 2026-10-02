import type { Payroll } from "@vonos/types";
import {
  arePayRowsReady,
  buildPayPayrollBatches,
  emptyPayRowForm,
  selectedPayRows,
  type PayRowForm,
} from "./PayrollGroupPayForm";

function payrollRow(overrides: Partial<Payroll> & { id: string }): Payroll {
  return {
    tenantId: "t1",
    employeeName: `Employee ${overrides.id}`,
    grossPay: 100_000,
    totalAllowance: 10_000,
    totalDeduction: 5_000,
    netPay: 105_000,
    paymentStatus: "unpaid",
    ...overrides,
  } as Payroll;
}

function formWith(patch: Partial<PayRowForm>): PayRowForm {
  return { ...emptyPayRowForm(), ...patch };
}

const rows = [payrollRow({ id: "p1" }), payrollRow({ id: "p2" })];

function forms(
  entries: Record<string, Partial<PayRowForm>>,
): Record<string, PayRowForm> {
  const out: Record<string, PayRowForm> = {};
  for (const row of rows) {
    out[row.id] = formWith(entries[row.id] ?? {});
  }
  return out;
}

describe("payroll group partial payment", () => {
  it("defaults every unpaid row to selected", () => {
    expect(selectedPayRows(rows, {})).toHaveLength(2);
  });

  it("is not ready while a selected row is missing account/method", () => {
    const ready = arePayRowsReady(
      rows,
      forms({
        p1: { accountId: "a1", method: "bank" },
        p2: { method: "bank" }, // no account yet
      }),
    );
    expect(ready).toBe(false);
  });

  it("lets the group submit when the incomplete row is unticked", () => {
    const ready = arePayRowsReady(
      rows,
      forms({
        p1: { accountId: "a1", method: "bank" },
        p2: { selected: false },
      }),
    );
    expect(ready).toBe(true);
    expect(buildPayPayrollBatches(rows, forms({
      p1: { accountId: "a1", method: "bank" },
      p2: { selected: false },
    }))).toHaveLength(1);
  });

  it("batches only the ticked employees", () => {
    const batches = buildPayPayrollBatches(
      rows,
      forms({
        p1: { accountId: "a1", method: "bank" },
        p2: { accountId: "a1", method: "bank", selected: false },
      }),
    );
    expect(batches).toHaveLength(1);
    expect(batches[0]?.payrollIds).toEqual(["p1"]);
  });

  it("is not ready when nothing is ticked", () => {
    const ready = arePayRowsReady(
      rows,
      forms({
        p1: { selected: false },
        p2: { selected: false },
      }),
    );
    expect(ready).toBe(false);
    expect(selectedPayRows(rows, forms({ p1: { selected: false }, p2: { selected: false } }))).toHaveLength(0);
  });
});
