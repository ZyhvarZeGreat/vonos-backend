import { describe, expect, it } from "vitest";
import {
  businessLocationName,
  formatProductStockLocations,
  productStockLocationFilterOptions,
} from "./locationLabels";

describe("businessLocationName", () => {
  it("resolves entity codes to entity names when config locations are empty", () => {
    expect(businessLocationName("VA", [])).toBe("Vonos Mechanic");
    expect(businessLocationName("VP", undefined)).toBe("Vonos Painting");
    expect(businessLocationName("VW", [])).toBe("Vonos Warehouse");
    expect(businessLocationName("VISP", [])).toBe(
      "Vonos Institute Spare Parts",
    );
  });

  it("prefers configured location names", () => {
    expect(
      businessLocationName("VA", [{ code: "VA", name: "Main Shop" }]),
    ).toBe("Main Shop");
  });
});

describe("product stock location labels", () => {
  it("uses this tenant's own home in filter options", () => {
    expect(productStockLocationFilterOptions("VISP")).toEqual([
      { value: "VISP", label: "Vonos Institute Spare Parts" },
    ]);
    expect(productStockLocationFilterOptions("VP")).toEqual([
      { value: "VP", label: "Vonos Painting" },
    ]);
    expect(productStockLocationFilterOptions("VA")).toEqual([
      { value: "VA", label: "Vonos Mechanic" },
    ]);
  });

  it("falls back to stock homes when tenant is unknown", () => {
    expect(productStockLocationFilterOptions()).toEqual([
      { value: "VW", label: "Vonos Warehouse" },
      { value: "VISP", label: "Vonos Institute Spare Parts" },
      { value: "VSP", label: "Vonos SP Marketplace" },
    ]);
  });

  it("formats product stock column with entity names", () => {
    expect(
      formatProductStockLocations({
        locationCode: "VW",
        binLocation: null,
        quantity: 1,
        locationStock: [
          { locationCode: "VW", binLocation: null, quantity: 2 },
          { locationCode: "VISP", binLocation: null, quantity: 1 },
        ],
      }),
    ).toBe("Vonos Warehouse · Vonos Institute Spare Parts");
  });

  it("shows VSP marketplace home when legacy rows still say VW", () => {
    expect(
      formatProductStockLocations(
        {
          locationCode: "VW",
          binLocation: null,
          quantity: 1,
          locationStock: [
            { locationCode: "VW", binLocation: null, quantity: 1 },
          ],
        },
        [{ code: "VSP", name: "Vonos SP Marketplace" }],
        "VSP",
      ),
    ).toBe("Vonos SP Marketplace");
  });

  it("shows VISP home when legacy stock still says BL005 painting materials", () => {
    expect(
      formatProductStockLocations(
        {
          locationCode: "VISP",
          binLocation: null,
          quantity: 0,
          locationStock: [
            { locationCode: "BL005", binLocation: null, quantity: 0 },
          ],
        },
        [{ code: "VISP", name: "Vonos Institute Spare Parts" }],
        "VISP",
      ),
    ).toBe("Vonos Institute Spare Parts");
  });

  it("shows VA/VP catalog home and fallback when row has no location", () => {
    expect(
      formatProductStockLocations(
        {
          locationCode: "VP",
          binLocation: null,
          quantity: 0,
          locationStock: [],
        },
        [{ code: "VP", name: "Vonos Painting" }],
      ),
    ).toBe("Vonos Painting");

    expect(
      formatProductStockLocations(
        {
          locationCode: null,
          binLocation: null,
          quantity: 0,
          locationStock: [],
        },
        [{ code: "VISP", name: "Vonos Institute Spare Parts" }],
        "VISP",
      ),
    ).toBe("Vonos Institute Spare Parts");
  });
});
