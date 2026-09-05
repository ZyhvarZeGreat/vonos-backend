import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

/**
 * Guards Save → list redirect so forms don't stay stuck after create/update.
 * Prefer hard goToList() after the write succeeds (soft App Router leaves were flaky).
 */
describe("list redirect on Save (source contracts)", () => {
  it("product save navigates to list on success", () => {
    const view = read("components/pages/AddProductView.tsx");
    expect(view).toContain("goToList");
    expect(view).toContain("onSuccess=");
    expect(view).toMatch(/if \(mode === "saveAnother"\) return;/);
    expect(view).toMatch(/goToList\(catalogListPath\)/);
    expect(view).not.toContain("onOptimisticLeave");
    expect(view).not.toContain("announceRedirect");
  });

  it("purchase save shows progress then navigates on success", () => {
    const src = read("components/pages/AddPurchaseView.tsx");
    expect(src).toContain("handleSave");
    expect(src).toContain("goToList");
    expect(src).toContain("progressLabel");
    expect(src).toContain("Hq6LoadProgress");
    expect(src).toMatch(
      /onSuccess: \(\) => \{[\s\S]*goToList\([\s\S]*purchases/,
    );
    expect(src).not.toMatch(
      /handleSave[\s\S]*mutation\.mutate\(\)[\s\S]*goToList/,
    );
    expect(src).toContain("onClick={handleSave}");
    expect(src).toMatch(/void Promise\.allSettled\(/);
    expect(src).not.toContain("announceRedirect");
  });

  it("expense save navigates to expenses on success", () => {
    const src = read("components/pages/ExpensesViews.tsx");
    expect(src).toContain("handleSave");
    expect(src).toContain("goToList");
    expect(src).toMatch(
      /onSuccess: \(\) => \{[\s\S]*goToList\(expensePageRoute\(tenantCode, "expenses"\)\)/,
    );
    expect(src).toContain("onClick={handleSave}");
    expect(src).not.toContain("announceRedirect");
  });

  it("payments list editor captures ids then closes before mutate(vars)", () => {
    const src = read("components/pages/Hq6PaymentsListView.tsx");
    expect(src).toContain("handleSavePayment");
    expect(src).toMatch(
      /saleId:\s*editing\.saleId[\s\S]*?setEditing\(null\);[\s\S]*?saveMutation\.mutate\(vars\)/,
    );
    expect(src).toContain("onClick={handleSavePayment}");
    // Must not call bare mutate() after clearing editing (Missing sale / empty write).
    expect(src).not.toMatch(/setEditing\(null\);\s*\n\s*saveMutation\.mutate\(\)/);
  });

  it("view-payments update captures paymentId before clearing editing", () => {
    const src = read("components/hq6/Hq6ViewPaymentsModal.tsx");
    expect(src).toContain("handleUpdatePayment");
    expect(src).toMatch(
      /paymentId:\s*editing\.id[\s\S]*?setEditing\(null\);[\s\S]*?saveMutation\.mutate\(vars\)/,
    );
    expect(src).toMatch(/mutationFn: async \(vars:/);
    expect(src).toMatch(/update: \(qc, vars\) =>/);
  });

  it("payroll pay/deduction capture ids before closePay/closeDeduction", () => {
    const src = read("components/pages/PayrollView.tsx");
    expect(src).toMatch(
      /const batches = \[\.\.\.batchMap\.values\(\)\];[\s\S]*?closePayModal\(\);[\s\S]*?payMutation\.mutate\(\{ batches \}\)/,
    );
    expect(src).toMatch(
      /payrollId:\s*deductionTarget\.id[\s\S]*?setDeductionTarget\(null\);[\s\S]*?addDeductionMutation\.mutate\(vars\)/,
    );
    // Must not reset() the mutation after capturing — that cancelled applies.
    expect(src).not.toMatch(
      /closeDeductionModal\(\);\s*\n\s*addDeductionMutation\.mutate/,
    );
  });

  it("sale convert dismisses before finalize settles", () => {
    const src = read("components/pages/Hq6SalesListView.tsx");
    expect(src).toContain("dismissFirstWrite");
    expect(src).toContain("finalizeSale");
    expect(src).toContain("Converting & opening sales");
    // Modal closes / navigates in dismiss; finalize runs as the write.
    expect(src).toMatch(
      /dismissFirstWrite\(\{[\s\S]*?write:\s*\(\)\s*=>\s*[\s\S]*?finalizeSale/,
    );
  });

  it("sale add-payment captures saleId before dismiss (no Missing sale)", () => {
    const modal = read("components/hq6/Hq6PaySaleModal.tsx");
    expect(modal).toContain("captureSalePaymentWrite");
    expect(modal).toContain("dismissFirstWrite");
    // Must not call mutate() after onClose while closing over live sale prop.
    expect(modal).not.toMatch(/onClose\(\);\s*\n\s*payMutation\.mutate\(\)/);
    expect(modal).toMatch(
      /captureSalePaymentWrite\([\s\S]*?dismissFirstWrite\(\{[\s\S]*?addSalePayment/,
    );
  });

  it("new quotations save with route preset status (not Final)", () => {
    const src = read("components/organisms/AddSaleForm.tsx");
    // Create path must lock to presetStatus so add-quotation cannot drift to Final.
    expect(src).toMatch(
      /const statusToSave = \(\s*editSaleId \? form\.status : presetStatus/,
    );
    expect(src).toContain("pendingSaveStatusRef");
    expect(src).toMatch(/status: statusToSave as "final" \| "draft" \| "quotation"/);
    expect(src).toContain("assertBusinessLocationSelected");
  });

  it("sale save navigates to list on success", () => {
    const form = read("components/organisms/AddSaleForm.tsx");
    const view = read("components/pages/AddSaleView.tsx");
    expect(form).toContain("kickSave");
    expect(view).toContain("goToList");
    expect(view).toMatch(/goToList\(`\/\$\{tenantCode\}\/\$\{listSlugForSaleStatus/);
    expect(view).not.toContain("onOptimisticLeave");
    expect(view).not.toContain("announceRedirect");
  });

  it("user save leaves before write settles", () => {
    const src = read("components/pages/Hq6UserDetailView.tsx");
    expect(src).toContain("goToList");
    expect(src).toContain("void withWriteProgress");
    const leave = src.indexOf("goToList(isCreate");
    const write = src.indexOf("void withWriteProgress", leave);
    expect(leave).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(leave);
  });

  it("role save navigates before mutate", () => {
    const src = read("components/pages/Hq6RoleDetailView.tsx");
    const leave = src.indexOf("goToList(");
    const mutate = src.indexOf("saveMutation.mutate()", leave);
    expect(leave).toBeGreaterThan(-1);
    expect(mutate).toBeGreaterThan(leave);
  });

  it("printer save navigates before mutate", () => {
    const src = read("components/pages/Hq6ReceiptPrinterCreateView.tsx");
    expect(src).toContain("handleSave");
    const leave = src.indexOf("Saving & returning to printers");
    const mutate = src.indexOf("createMutation.mutate()", leave);
    expect(leave).toBeGreaterThan(-1);
    expect(mutate).toBeGreaterThan(leave);
  });
});
