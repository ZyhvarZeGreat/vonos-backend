import type { BusinessLocation } from "./tenantConfig";

/**
 * Stock-holding business locations for the product catalog.
 * Products live at VW / VISP / VSP (any one, or several, based on stock).
 * VA / VP only receive stock via moves — they are not product home locations.
 */
export const PRODUCT_STOCK_LOCATION_CODES = ["VW", "VISP", "VSP"] as const;

export type ProductStockLocationCode =
  (typeof PRODUCT_STOCK_LOCATION_CODES)[number];

/**
 * Job/service tenants that consume group stock (VW/VISP/VSP) or purchase —
 * they do not maintain their own sellable product catalog.
 */
export const GROUP_STOCK_CONSUMER_CODES = ["VA", "VP"] as const;

export type GroupStockConsumerCode =
  (typeof GROUP_STOCK_CONSUMER_CODES)[number];

export const PRODUCT_STOCK_BUSINESS_LOCATIONS: BusinessLocation[] = [
  { code: "VW", name: "Vonos Warehouse" },
  { code: "VISP", name: "Vonos Institute Spare Parts" },
  { code: "VSP", name: "Vonos SP Marketplace" },
];

export function isProductStockLocationCode(
  code: string | null | undefined,
): code is ProductStockLocationCode {
  if (!code?.trim()) return false;
  const upper = code.trim().toUpperCase();
  return (PRODUCT_STOCK_LOCATION_CODES as readonly string[]).includes(upper);
}

export function isProductStockTenant(code: string | null | undefined): boolean {
  return isProductStockLocationCode(code);
}

/** VA / VP — source parts from VW/VISP/VSP or purchases, not a local catalog. */
export function isGroupStockConsumerTenant(
  code: string | null | undefined,
): boolean {
  if (!code?.trim()) return false;
  const upper = code.trim().toUpperCase();
  return (GROUP_STOCK_CONSUMER_CODES as readonly string[]).includes(upper);
}

/** Legacy WordPress `business_locations` — branch / POS sites per entity. */
export const BUSINESS_LOCATION_PRESETS: Record<string, BusinessLocation[]> = {
  /** Shared product stock locations — not VA/VP. */
  VW: [...PRODUCT_STOCK_BUSINESS_LOCATIONS],
  VISP: [...PRODUCT_STOCK_BUSINESS_LOCATIONS],
  VSP: [...PRODUCT_STOCK_BUSINESS_LOCATIONS],
  VC: [{ code: "BL0001", name: "Vonos Cafe" }],
  VM: [
    { code: "BL0001", name: "VONOS AUTOS WAREHOUSE" },
    { code: "BL0002", name: "Mainshop" },
    { code: "BL0004", name: "OTHER SUPPLIERS" },
    { code: "BL004", name: "VONOS HEAD OFFICE" },
  ],
  VMS: [
    { code: "BL0002", name: "Mainshop" },
    { code: "BL005", name: "VONOS PAINTING MATERIALS" },
    { code: "BL006", name: "PAINTING WORKS" },
    { code: "BL0008", name: "LABOUR/CONSUMABLES" },
  ],
  VS: [{ code: "BL0003", name: "Vonos saloon" }],
  /** Mechanic own branch only — sister entities are not sale/expense locations. */
  VA: [{ code: "VA", name: "Vonos Mechanic" }],
  /** Painting own branch only. */
  VP: [{ code: "VP", name: "Vonos Painting" }],
  /** Group / payroll primary locations — VISP + All. */
  VAG: [
    { code: "ALL", name: "All Locations" },
    { code: "VISP", name: "Vonos Institute Spare Parts" },
    { code: "VA", name: "Vonos Mechanic" },
    { code: "VP", name: "Vonos Painting" },
    { code: "VW", name: "Vonos Warehouse" },
    { code: "VSP", name: "Vonos SP Marketplace" },
  ],
};

export const ITEM_CATEGORY_PRESETS: Record<string, string[]> = {
  VW: ["Packaging", "Brakes", "Lubricants", "Filters", "Suspension", "Storage", "Supplies"],
  VKW: ["Tops", "Bottoms", "Accessories", "Seasonal"],
  VISP: ["Brakes", "Filters", "Electrical", "Lubricants", "Suspension", "Performance"],
  VSP: ["Brakes", "Filters", "Electrical", "Body Parts", "Accessories"],
  VC: ["Hot Drinks", "Cold Drinks", "Pastries", "Snacks"],
  VM: ["Labour", "Parts", "Consumables", "Subcontract"],
  VMS: ["Labour", "Parts", "Consumables", "Subcontract", "Fabrication"],
  VS: ["Hair", "Nails", "Spa", "Retail"],
};

/** Warehouse bin / rack codes (separate from branch locations). */
export const STORAGE_LOCATION_PRESETS: Record<string, string[]> = {
  VW: ["R1-S1-B3", "R2-S3-B4", "R2-S4-B1", "R2-S4-B2", "R2-S5-B1", "R3-S2-B1", "A-12-03", "B-04-01", "C-02-07", "D-08-02"],
  VKW: ["A-01", "A-02", "B-01", "B-02"],
};

export function catalogPresetsForCode(code: string | undefined) {
  const key = code ?? "VW";
  return {
    itemCategories: ITEM_CATEGORY_PRESETS[key] ?? [],
    businessLocations: BUSINESS_LOCATION_PRESETS[key] ?? [],
    storageLocations: STORAGE_LOCATION_PRESETS[key] ?? [],
  };
}
