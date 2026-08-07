import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  customerRowActions,
  expenseRowActions,
  productRowActions,
  purchaseRowActions,
  returnRowActions,
  saleRowActions,
  supplierRowActions,
  type Hq6RowActionSpec,
} from "./rowActionCatalog";

const webRoot = join(__dirname, "../..");

function readView(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

function assertIdsDeclared(source: string, specs: Hq6RowActionSpec[]) {
  for (const spec of specs) {
    expect(source, `missing action id ${spec.id}`).toContain(`id: "${spec.id}"`);
  }
}

function firstIndex(source: string, id: string): number {
  const needle = `id: "${id}"`;
  const idx = source.indexOf(needle);
  expect(idx, `action ${id} not in source`).toBeGreaterThan(-1);
  return idx;
}

describe("HQ6 list views declare catalog action ids", () => {
  it("sales list keeps Add Payment in the Actions dropdown", () => {
    const src = readView("components/pages/Hq6SalesListView.tsx");
    assertIdsDeclared(
      src,
      saleRowActions("finalized", { canAddPayment: true }),
    );
    expect(firstIndex(src, "add_payment")).toBeLessThan(
      firstIndex(src, "sell_return"),
    );
    expect(src).toMatch(/label:\s*"Add Payment"/);
  });

  it("purchases list keeps Add Payment in the Actions dropdown", () => {
    const src = readView("components/pages/Hq6PurchasesListView.tsx");
    assertIdsDeclared(src, purchaseRowActions({ canAddPayment: true }));
    expect(firstIndex(src, "add_payment")).toBeLessThan(
      firstIndex(src, "purchase_return"),
    );
    expect(src).toMatch(/label:\s*"Add Payment"/);
  });

  it("expenses / products / contacts / returns declare their actions", () => {
    assertIdsDeclared(
      readView("components/pages/Hq6ExpensesListView.tsx"),
      expenseRowActions(),
    );
    assertIdsDeclared(
      readView("components/pages/Hq6ProductsListView.tsx"),
      productRowActions({ priceCatalogOnly: false }),
    );
    assertIdsDeclared(
      readView("components/pages/Hq6CustomersListView.tsx"),
      customerRowActions(),
    );
    assertIdsDeclared(
      readView("components/pages/Hq6SuppliersListView.tsx"),
      supplierRowActions(),
    );
    assertIdsDeclared(
      readView("components/pages/Hq6ReturnsListView.tsx"),
      returnRowActions(),
    );
  });
});

describe("audit regressions encoded in source", () => {
  it("supplier typeahead skips summary aggregates", () => {
    const src = readView("lib/api/suppliers.ts");
    expect(src).toContain("includeSummary: false");
    expect(src).toMatch(/export async function getSuppliers\(/);
  });

  it("payment-account picker requests openOnly tills", () => {
    const src = readView("lib/api/paymentAccounts.ts");
    expect(src).toContain("openOnly: true");
    expect(src).toContain("export async function getPaymentAccountsForPicker");
  });

  it("floating menus sit above HQ6 modals (z >= 2300)", () => {
    const src = readView("components/molecules/FloatingMenuPanel.tsx");
    expect(src).toMatch(/FLOATING_MENU_Z\s*=\s*(\d+)/);
    const match = src.match(/FLOATING_MENU_Z\s*=\s*(\d+)/);
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(2300);
  });

  it("DataTables All page size is capped (never Prisma take: -1)", () => {
    const src = readView("components/upos/UposDataTablesShell.tsx");
    expect(src).toContain("export const UPOS_PAGE_SIZE_ALL = 1000");
    expect(src).not.toMatch(/PAGE_SIZE_OPTIONS\s*=\s*\[[^\]]*-\s*1/);
  });
});
