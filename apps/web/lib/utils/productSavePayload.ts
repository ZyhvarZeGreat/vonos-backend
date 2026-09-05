import type { ItemLocationStockInput } from "@vonos/types";

export type ProductSaveMode = "save" | "saveAnother" | "saveOpeningStock";

export type ProductSaveFormSlice = {
  name: string;
  sku: string;
  barcodeType: string;
  unit: string;
  brand: string;
  category: string;
  subCategory: string;
  description: string;
  weight: string;
  carModel: string;
  enableImei: boolean;
  preparationMinutes: string;
  purchaseExcTax: string;
  sellingExcTax: string;
  alertQuantity: string;
  manageStock: boolean;
  notForSelling: boolean;
};

export type ProductLocationDetailSlice = {
  locationCode: string;
  rack: string;
  row: string;
  position: string;
  quantity: string;
};

export type ProductSavePayload = {
  sku: string;
  name: string;
  category?: string;
  subCategory?: string;
  description?: string;
  barcodeType?: string;
  unit?: string;
  weight?: string;
  carModel?: string;
  enableImei: boolean;
  preparationMinutes?: number;
  quantity?: number;
  costPrice: number;
  sellPrice?: number;
  reorderPoint?: number;
  locationCode?: string;
  locationStock?: ItemLocationStockInput[];
  brandName?: string;
  availableForRetail: boolean;
  imageUrl?: string | null;
  /** Catalog-only tenants (VA/VP): keep Active even at qty 0. */
  status?: "in_stock" | "low_stock" | "out_of_stock";
};

export function encodeProductBin(
  rack: string,
  row: string,
  position: string,
): string | undefined {
  const parts = [
    rack.trim() ? `Rack ${rack.trim()}` : "",
    row.trim() ? `Row ${row.trim()}` : "",
    position.trim() ? `Pos ${position.trim()}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** Build the POST/PATCH body for add / edit product. */
export function buildProductSavePayload(input: {
  form: ProductSaveFormSlice;
  mode: ProductSaveMode;
  isEdit: boolean;
  retailMode?: boolean;
  /** VA/VP job catalog: no stock rows; blank prices become 0 on create. */
  priceCatalogOnly?: boolean;
  /** Own-home location code stamped on catalog-only creates (VA/VP). */
  homeLocationCode?: string;
  /**
   * Edit path: rewrite sister-entity location codes (e.g. VP on a VISP row)
   * onto the selected home locations without changing normal edit behavior.
   */
  rehomeForeignLocation?: boolean;
  selectedLocationCodes: string[];
  locationDetails: ProductLocationDetailSlice[];
  skuFallback?: string;
  imageUrl?: string | null;
}): ProductSavePayload {
  const {
    form,
    mode,
    isEdit,
    retailMode = false,
    priceCatalogOnly = false,
    homeLocationCode,
    rehomeForeignLocation = false,
    selectedLocationCodes,
    locationDetails,
    skuFallback,
    imageUrl,
  } = input;

  const costPrice = Number(form.purchaseExcTax || 0);
  const sellRaw = form.sellingExcTax.trim();
  const sellParsed = sellRaw === "" ? NaN : Number(sellRaw);
  const sellPrice = Number.isFinite(sellParsed)
    ? sellParsed
    : priceCatalogOnly && !isEdit
      ? 0
      : undefined;

  const activeLocations = priceCatalogOnly
    ? []
    : locationDetails.filter((row) =>
        selectedLocationCodes.includes(row.locationCode),
      );

  const touchStock =
    !priceCatalogOnly &&
    (mode === "saveOpeningStock" ||
      !isEdit ||
      (rehomeForeignLocation && activeLocations.length > 0));
  let locationStock: ItemLocationStockInput[] | undefined;
  if (touchStock && activeLocations.length > 0) {
    locationStock = activeLocations.map((row) => {
      const qty =
        mode === "saveOpeningStock" || rehomeForeignLocation
          ? Number(row.quantity) || 0
          : 0;
      return {
        locationCode: row.locationCode,
        binLocation: encodeProductBin(row.rack, row.row, row.position),
        quantity: Number.isFinite(qty) ? qty : 0,
      };
    });
  }

  const openingQty = (() => {
    if (priceCatalogOnly) return isEdit ? undefined : 0;
    if (locationStock) return undefined;
    if (mode === "saveOpeningStock") {
      const fromAlert = Number(form.alertQuantity);
      return Number.isFinite(fromAlert) ? fromAlert : 0;
    }
    return isEdit ? undefined : 0;
  })();

  const sku =
    form.sku.trim() ||
    skuFallback ||
    `PRD-${Date.now().toString(36).toUpperCase()}`;

  const catalogHome =
    homeLocationCode?.trim() ||
    selectedLocationCodes[0] ||
    undefined;

  return {
    sku,
    name: form.name.trim(),
    category: form.category.trim() || undefined,
    subCategory: form.subCategory.trim() || undefined,
    description: form.description.trim() || undefined,
    barcodeType: form.barcodeType || undefined,
    unit: form.unit.trim() || undefined,
    weight: form.weight.trim() || undefined,
    carModel: form.carModel.trim() || undefined,
    enableImei: form.enableImei,
    preparationMinutes: form.preparationMinutes
      ? Number(form.preparationMinutes)
      : undefined,
    ...(openingQty !== undefined ? { quantity: openingQty } : {}),
    costPrice: Number.isFinite(costPrice) ? costPrice : 0,
    sellPrice,
    ...(priceCatalogOnly ? { status: "in_stock" as const } : {}),
    reorderPoint:
      !priceCatalogOnly && form.manageStock
        ? Number(form.alertQuantity) || undefined
        : undefined,
    ...(activeLocations[0]?.locationCode && touchStock
      ? { locationCode: activeLocations[0].locationCode }
      : priceCatalogOnly && catalogHome && !isEdit
        ? { locationCode: catalogHome }
        : {}),
    ...(locationStock ? { locationStock } : {}),
    brandName: form.brand.trim() || undefined,
    availableForRetail: retailMode ? true : !form.notForSelling,
    ...(imageUrl !== undefined
      ? { imageUrl: imageUrl?.trim() ? imageUrl.trim() : null }
      : {}),
  };
}
