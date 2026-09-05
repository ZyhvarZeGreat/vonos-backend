import { describe, expect, it } from "vitest";
import type { Item } from "@vonos/types";
import {
  itemHasForeignLocation,
  locationDetailsFromItem,
  marginFromFormPrices,
  productFormFromItem,
  productImageFileName,
  selectedLocationCodesFromItem,
} from "./productFormFromItem";

const item: Item = {
  id: "item_1",
  tenantId: "tenant_visp_001",
  sku: "OF-100",
  name: "Oil filter",
  category: "Filters",
  subCategory: "Engine",
  description: "OEM filter",
  imageUrl: "https://cdn.example.com/parts/oil-filter.png",
  barcodeType: "C39",
  unit: "Piece",
  weight: "0.4kg",
  carModel: "Camry 2018",
  enableImei: true,
  preparationMinutes: 12,
  quantity: 42,
  binLocation: "Rack A · Row 2 · Pos 4",
  locationCode: "VISP",
  reorderPoint: 5,
  costPrice: 2500,
  sellPrice: 4000,
  currency: "NGN",
  status: "in_stock",
  availableForRetail: false,
  brandId: "brand_1",
  brandName: "Bosch",
  locationStock: [
    {
      locationCode: "VISP",
      binLocation: "Rack A · Row 2 · Pos 4",
      quantity: 30,
    },
    {
      locationCode: "VSP",
      binLocation: "Rack B · Row 1 · Pos 1",
      quantity: 12,
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const locations = [
  { code: "VISP", name: "Institute" },
  { code: "VSP", name: "Marketplace" },
  { code: "VW", name: "Warehouse" },
];

describe("productFormFromItem", () => {
  it("copies every persisted field so edit is in-place", () => {
    const form = productFormFromItem(item);

    expect(form.name).toBe("Oil filter");
    expect(form.sku).toBe("OF-100");
    expect(form.barcodeType).toBe("C39");
    expect(form.unit).toBe("Piece");
    expect(form.brand).toBe("Bosch");
    expect(form.category).toBe("Filters");
    expect(form.subCategory).toBe("Engine");
    expect(form.description).toBe("OEM filter");
    expect(form.weight).toBe("0.4kg");
    expect(form.carModel).toBe("Camry 2018");
    expect(form.purchaseExcTax).toBe("2500");
    expect(form.purchaseIncTax).toBe("2500");
    expect(form.sellingExcTax).toBe("4000");
    expect(form.marginPercent).toBe("60.00");
    expect(form.alertQuantity).toBe("5");
    expect(form.enableImei).toBe(true);
    expect(form.preparationMinutes).toBe("12");
    expect(form.notForSelling).toBe(true);
    expect(form.manageStock).toBe(true);
  });

  it("keeps sell price independent of cost when sell is missing", () => {
    const form = productFormFromItem({ ...item, sellPrice: null });
    expect(form.purchaseExcTax).toBe("2500");
    expect(form.sellingExcTax).toBe("");
    expect(form.marginPercent).toBe("0");
  });

  it("prefixes name/sku only when duplicating", () => {
    const form = productFormFromItem(item, { isDuplicate: true });
    expect(form.name).toBe("Copy Oil filter");
    expect(form.sku).toBe("OF-100-COPY");
  });
});

describe("locationDetailsFromItem", () => {
  it("checks every stocked location and restores bin + qty", () => {
    expect(selectedLocationCodesFromItem(item, locations)).toEqual([
      "VISP",
      "VSP",
    ]);
    expect(locationDetailsFromItem(item, locations)).toEqual([
      {
        locationCode: "VISP",
        locationName: "Institute",
        rack: "A",
        row: "2",
        position: "4",
        quantity: "30",
      },
      {
        locationCode: "VSP",
        locationName: "Marketplace",
        rack: "B",
        row: "1",
        position: "1",
        quantity: "12",
      },
      {
        locationCode: "VW",
        locationName: "Warehouse",
        rack: "",
        row: "",
        position: "",
        quantity: "",
      },
    ]);
  });

  it("remaps sister-entity VP stock onto the tenant home for edit", () => {
    const vispOnly = [{ code: "VISP", name: "Institute" }];
    const vpItem: Item = {
      ...item,
      locationCode: "VP",
      binLocation: "Rack P · Row 1 · Pos 3",
      quantity: 8,
      locationStock: [
        {
          locationCode: "VP",
          binLocation: "Rack P · Row 1 · Pos 3",
          quantity: 8,
        },
      ],
    };

    expect(itemHasForeignLocation(vpItem, vispOnly)).toBe(true);
    expect(selectedLocationCodesFromItem(vpItem, vispOnly)).toEqual(["VISP"]);
    expect(locationDetailsFromItem(vpItem, vispOnly)).toEqual([
      {
        locationCode: "VISP",
        locationName: "Institute",
        rack: "P",
        row: "1",
        position: "3",
        quantity: "8",
      },
    ]);
  });

  it("treats Ultimate POS BL005 painting-materials stock as foreign on VISP", () => {
    const vispOnly = [{ code: "VISP", name: "Institute" }];
    const blItem: Item = {
      ...item,
      locationCode: "VISP",
      locationStock: [
        { locationCode: "BL005", binLocation: null, quantity: 0 },
      ],
    };
    expect(itemHasForeignLocation(blItem, vispOnly)).toBe(true);
    expect(selectedLocationCodesFromItem(blItem, vispOnly)).toEqual(["VISP"]);
  });
});

describe("productImageFileName", () => {
  it("uses the stored image basename", () => {
    expect(productImageFileName(item.imageUrl)).toBe("oil-filter.png");
  });
});

describe("marginFromFormPrices", () => {
  it("keeps sell above cost as a positive margin (30k → 35k)", () => {
    expect(marginFromFormPrices("30000", "35000")).toBe("16.67");
  });

  it("returns 0 when selling is blank so cost edits do not invent a sell", () => {
    expect(marginFromFormPrices("30000", "")).toBe("0");
  });
});
