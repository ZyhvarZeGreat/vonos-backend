import { describe, expect, it } from "vitest";
import { hq6ActionIcon } from "@/lib/utils/hq6ActionIcon";
import {
  allCatalogActionIds,
  customerRowActions,
  expenseRowActions,
  productRowActions,
  purchaseRowActions,
  returnRowActions,
  saleRowActions,
  supplierRowActions,
} from "./rowActionCatalog";

describe("saleRowActions (audit: Add Payment in Actions)", () => {
  it("puts Add Payment near the top for due finalized sales", () => {
    const ids = saleRowActions("finalized", { canAddPayment: true }).map(
      (a) => a.id,
    );
    expect(ids.slice(0, 4)).toEqual([
      "view",
      "edit",
      "add_payment",
      "view_payments",
    ]);
    expect(ids.indexOf("add_payment")).toBeLessThan(ids.indexOf("delete"));
    expect(ids.indexOf("add_payment")).toBeLessThan(ids.indexOf("print"));
  });

  it("hides Add Payment on paid finalized sales but keeps View Payments", () => {
    const ids = saleRowActions("finalized", { canAddPayment: false }).map(
      (a) => a.id,
    );
    expect(ids).not.toContain("add_payment");
    expect(ids).toContain("view_payments");
  });

  it("does not offer Add Payment on drafts/quotations", () => {
    expect(
      saleRowActions("draft", { canAddPayment: true }).map((a) => a.id),
    ).not.toContain("add_payment");
    expect(
      saleRowActions("quotation", { canAddPayment: true }).map((a) => a.id),
    ).not.toContain("add_payment");
  });

  it("includes convert + copy on provisional sales", () => {
    const draft = saleRowActions("draft", { canAddPayment: false }).map(
      (a) => a.id,
    );
    expect(draft).toEqual(
      expect.arrayContaining(["convert", "copy_quotation", "view_payments"]),
    );
  });
});

describe("purchaseRowActions", () => {
  it("exposes Add Payment before View Payments when due", () => {
    const ids = purchaseRowActions({ canAddPayment: true }).map((a) => a.id);
    expect(ids.indexOf("add_payment")).toBeGreaterThan(-1);
    expect(ids.indexOf("add_payment")).toBeLessThan(ids.indexOf("view_payments"));
    expect(ids.indexOf("add_payment")).toBeLessThan(ids.indexOf("delete"));
  });

  it("still lists View Payments when fully paid", () => {
    const ids = purchaseRowActions({ canAddPayment: false }).map((a) => a.id);
    expect(ids).not.toContain("add_payment");
    expect(ids).toContain("view_payments");
  });
});

describe("other HQ6 action catalogs", () => {
  it("expenses always include Add Payment + View Payments", () => {
    const ids = expenseRowActions().map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining(["view", "edit", "add_payment", "view_payments", "delete"]),
    );
  });

  it("products include stock actions unless price-catalog-only", () => {
    expect(
      productRowActions({ priceCatalogOnly: false }).map((a) => a.id),
    ).toEqual(
      expect.arrayContaining([
        "labels",
        "view",
        "edit",
        "delete",
        "opening_stock",
        "move_product",
        "stock_history",
        "duplicate",
      ]),
    );
    expect(
      productRowActions({ priceCatalogOnly: true }).map((a) => a.id),
    ).not.toContain("opening_stock");
  });

  it("customers and suppliers start with Pay", () => {
    expect(customerRowActions().map((a) => a.id)[0]).toBe("pay");
    expect(supplierRowActions().map((a) => a.id)[0]).toBe("pay");
    expect(supplierRowActions().map((a) => a.id)).toEqual(
      expect.arrayContaining(["ledger", "purchases", "stock_report", "documents"]),
    );
  });

  it("returns keep print / packing / delivery actions", () => {
    expect(returnRowActions().map((a) => a.id)).toEqual([
      "view",
      "print",
      "packing_slip",
      "delivery_note",
    ]);
  });
});

describe("action icon coverage", () => {
  it("maps every catalog action id to a default icon", () => {
    for (const id of allCatalogActionIds()) {
      expect(hq6ActionIcon(id), `missing icon for ${id}`).toBeTruthy();
    }
  });
});
