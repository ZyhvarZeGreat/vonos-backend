import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "../..");
const apiRoot = join(webRoot, "../api");

function readWeb(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

function readApi(rel: string): string {
  return readFileSync(join(apiRoot, rel), "utf8");
}

const ADJUST_KEYS = ["product.opening_stock", "purchase.update"];

describe("adjust stock permission gating (source contracts)", () => {
  it("products list Adjust stock accepts opening-stock OR purchase update", () => {
    const src = readWeb("components/pages/Hq6ProductsListView.tsx");
    expect(src).toContain('id: "adjust_stock"');
    for (const key of ADJUST_KEYS) {
      expect(src).toContain(`"${key}"`);
    }
    expect(src).toContain("requireCanAny");
  });

  it("backend adjust-stock endpoint enforces the same key pair", () => {
    const src = readApi("src/modules/items/items.controller.ts");
    expect(src).toContain("adjustStock");
    expect(src).toContain("userHasAnyPermission");
    for (const key of ADJUST_KEYS) {
      expect(src).toContain(`'${key}'`);
    }
  });

  it("opening stock stays on product.opening_stock only", () => {
    const list = readWeb("components/pages/Hq6ProductsListView.tsx");
    expect(list).toContain('id: "opening_stock"');
    const api = readApi("src/modules/items/items.controller.ts");
    expect(api).toContain("saveOpeningStock");
    // Opening stock must not inherit the purchase.update fallback.
    expect(api).toContain(
      "userHasPermission(req.user, 'product.opening_stock')",
    );
  });
});
