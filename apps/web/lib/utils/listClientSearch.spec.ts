import { describe, expect, it } from "vitest";
import {
  filterRowsBySearch,
  matchSearchRows,
  rowMatchesListSearch,
} from "./listClientSearch";

describe("listClientSearch", () => {
  const rows = [
    { id: "1", name: "Brake Pad", sku: "BP-01", meta: { nested: "ignore" } },
    { id: "2", name: "Oil Filter", sku: "OF-22", tags: ["engine", "oil"] },
    { id: "3", name: "Café Blend", sku: "CB-9", qty: 12 },
  ];

  it("returns all rows when the query is empty", () => {
    expect(filterRowsBySearch(rows, "   ")).toEqual(rows);
    expect(matchSearchRows(rows, "", ["name"])).toEqual(rows);
  });

  it("matches CONTAINS on explicit keys", () => {
    const hits = matchSearchRows(rows, "filter", ["name", "sku"]);
    expect(hits.map((r) => r.id)).toEqual(["2"]);
  });

  it("keeps diacritics-friendly matching for Café", () => {
    const hits = matchSearchRows(rows, "cafe", ["name"]);
    expect(hits.map((r) => r.id)).toEqual(["3"]);
  });

  it("indexes top-level arrays but skips nested objects", () => {
    expect(rowMatchesListSearch(rows[1], "engine")).toBe(true);
    expect(rowMatchesListSearch(rows[0], "ignore")).toBe(false);
  });

  it("searches ~2k synthetic rows under an elapsed budget", () => {
    const big = Array.from({ length: 2000 }, (_, i) => ({
      id: `id-${i}`,
      name: `Part ${i}`,
      sku: `SKU-${i}`,
      brand: i % 7 === 0 ? "Bosch" : "Generic",
    }));

    const start = performance.now();
    const hits = matchSearchRows(big, "Bosch", ["name", "sku", "brand"]);
    const elapsedMs = performance.now() - start;

    expect(hits.length).toBeGreaterThan(200);
    expect(elapsedMs).toBeLessThan(50);
  });
});
