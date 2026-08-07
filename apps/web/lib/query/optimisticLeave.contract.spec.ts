import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

/**
 * Guards the "leave before Neon finishes" Save UX so we don't regress to
 * awaiting invalidate/PATCH before router.push.
 */
describe("optimistic leave on Save (source contracts)", () => {
  it("product save leaves before create/update settles", () => {
    const form = read("components/organisms/AddProductForm.tsx");
    const view = read("components/pages/AddProductView.tsx");
    expect(form).toContain("onOptimisticLeave");
    expect(form).toMatch(
      /if \(variant === "page" && mode === "save"\)[\s\S]*onOptimisticLeave/,
    );
    expect(view).toContain("Saving & returning to products");
    expect(view).toContain("onOptimisticLeave=");
    // Must not re-await list invalidation before leave on save.
    expect(view).not.toMatch(
      /await Promise\.all\(\[\s*queryClient\.invalidateQueries/,
    );
  });

  it("purchase save navigates before mutation.mutate()", () => {
    const src = read("components/pages/AddPurchaseView.tsx");
    expect(src).toContain("handleSave");
    expect(src).toContain("Saving & returning to purchases");
    const leave = src.indexOf("Saving & returning to purchases");
    const mutate = src.indexOf("mutation.mutate()", leave);
    expect(leave).toBeGreaterThan(-1);
    expect(mutate).toBeGreaterThan(leave);
    expect(src).toContain("onClick={handleSave}");
    // Sell-price sync must not block the create/update response path.
    expect(src).toMatch(/void Promise\.allSettled\(/);
  });

  it("expense save navigates before saveMutation.mutate()", () => {
    const src = read("components/pages/ExpensesViews.tsx");
    expect(src).toContain("handleSave");
    expect(src).toContain("Saving & returning to expenses");
    const leave = src.indexOf("Saving & returning to expenses");
    const mutate = src.indexOf("saveMutation.mutate()", leave);
    expect(leave).toBeGreaterThan(-1);
    expect(mutate).toBeGreaterThan(leave);
    expect(src).toContain("onClick={handleSave}");
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
      /payrollIds:\s*\[\.\.\.payTargetIds\][\s\S]*?closePayModal\(\);[\s\S]*?payMutation\.mutate\(vars\)/,
    );
    expect(src).toMatch(
      /payrollId:\s*deductionTarget\.id[\s\S]*?closeDeductionModal\(\);[\s\S]*?addDeductionMutation\.mutate\(vars\)/,
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
    // Validate before optimistic leave so failed quotations don't vanish from the form.
    expect(src).toMatch(
      /assertBusinessLocationSelected[\s\S]*?onOptimisticLeave\?\.\(statusToSave\)/,
    );
  });

  it("sale save navigates before mutation settles", () => {
    const form = read("components/organisms/AddSaleForm.tsx");
    const view = read("components/pages/AddSaleView.tsx");
    expect(form).toContain("onOptimisticLeave");
    expect(form).toContain("kickSave");
    expect(view).toContain("onOptimisticLeave=");
    expect(view).toContain("Saving & returning to sales");
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
