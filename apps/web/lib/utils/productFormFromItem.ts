import type { Item } from "@vonos/types";

export type ProductFormState = {
  name: string;
  sku: string;
  barcodeType: string;
  unit: string;
  relatedSubUnit: string;
  brand: string;
  category: string;
  subCategory: string;
  manageStock: boolean;
  alertQuantity: string;
  description: string;
  enableImei: boolean;
  notForSelling: boolean;
  weight: string;
  carModel: string;
  preparationMinutes: string;
  applicableTax: string;
  sellingPriceTaxType: string;
  productType: string;
  purchaseExcTax: string;
  purchaseIncTax: string;
  marginPercent: string;
  sellingExcTax: string;
};

export type ProductLocationDetailState = {
  locationCode: string;
  locationName: string;
  rack: string;
  row: string;
  position: string;
  quantity: string;
};

export function emptyProductForm(
  manageStock = true,
  options?: { zeroPrices?: boolean },
): ProductFormState {
  const zeroPrices = Boolean(options?.zeroPrices);
  return {
    name: "",
    sku: "",
    barcodeType: "C128",
    unit: "Single",
    relatedSubUnit: "",
    brand: "",
    category: "",
    subCategory: "",
    manageStock,
    alertQuantity: "",
    description: "",
    enableImei: false,
    notForSelling: false,
    weight: "",
    carModel: "",
    preparationMinutes: "",
    applicableTax: "none",
    sellingPriceTaxType: "exclusive",
    productType: "single",
    purchaseExcTax: zeroPrices ? "0" : "",
    purchaseIncTax: zeroPrices ? "0" : "",
    marginPercent: "0",
    sellingExcTax: zeroPrices ? "0" : "",
  };
}

export function decodeProductBin(bin?: string | null): {
  rack: string;
  row: string;
  position: string;
} {
  const text = bin ?? "";
  return {
    rack: text.match(/Rack\s+([^·]+)/i)?.[1]?.trim() ?? "",
    row: text.match(/Row\s+([^·]+)/i)?.[1]?.trim() ?? "",
    position: text.match(/Pos(?:ition)?\s+([^·]+)/i)?.[1]?.trim() ?? "",
  };
}

export function productImageFileName(imageUrl?: string | null): string {
  if (!imageUrl?.trim()) return "";
  const path = imageUrl.split("?")[0] ?? imageUrl;
  const part = path.split("/").pop() ?? "";
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function moneyString(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "";
  return String(value);
}

/** Margin % from cost → sell (UPOS: sell = cost × (1 + margin/100)). */
export function marginFromPrices(
  costPrice: number | null | undefined,
  sellPrice: number | null | undefined,
): string {
  const cost = Number(costPrice);
  const sell = Number(sellPrice);
  if (
    sellPrice == null ||
    !Number.isFinite(cost) ||
    cost <= 0 ||
    !Number.isFinite(sell)
  ) {
    return "0";
  }
  return (((sell - cost) / cost) * 100).toFixed(2);
}

/** Same as marginFromPrices but for in-progress form string fields. */
export function marginFromFormPrices(costRaw: string, sellRaw: string): string {
  const sellTrim = sellRaw.trim();
  if (!sellTrim) return "0";
  return marginFromPrices(Number(costRaw), Number(sellTrim));
}

/** Map a persisted item into the add/edit product form. */
export function productFormFromItem(
  source: Item,
  options: { isDuplicate?: boolean; priceCatalogOnly?: boolean } = {},
): ProductFormState {
  const isDuplicate = Boolean(options.isDuplicate);
  const priceCatalogOnly = Boolean(options.priceCatalogOnly);
  return {
    ...emptyProductForm(!priceCatalogOnly, { zeroPrices: priceCatalogOnly }),
    name: isDuplicate ? `Copy ${source.name}` : source.name,
    sku: isDuplicate ? `${source.sku}-COPY` : source.sku,
    barcodeType: source.barcodeType?.trim() || "C128",
    brand: source.brandName?.trim() || "",
    category: source.category?.trim() || "",
    subCategory: source.subCategory?.trim() || "",
    description: source.description ?? "",
    unit: source.unit?.trim() || "Single",
    weight: source.weight ?? "",
    carModel: source.carModel ?? "",
    purchaseExcTax: moneyString(source.costPrice),
    purchaseIncTax: moneyString(source.costPrice),
    sellingExcTax: moneyString(source.sellPrice),
    marginPercent: marginFromPrices(source.costPrice, source.sellPrice),
    manageStock: priceCatalogOnly ? false : true,
    alertQuantity:
      source.reorderPoint != null ? String(source.reorderPoint) : "",
    enableImei: Boolean(source.enableImei),
    preparationMinutes:
      source.preparationMinutes != null
        ? String(source.preparationMinutes)
        : "",
    notForSelling: source.availableForRetail === false,
  };
}

/** True when the item carries a sister-entity location not in this tenant's list. */
export function itemHasForeignLocation(
  source: Item | null | undefined,
  locations: Array<{ code: string }>,
): boolean {
  if (!source || locations.length === 0) return false;
  const allowed = new Set(
    locations.map((loc) => loc.code.trim().toUpperCase()),
  );
  const codes = [
    source.locationCode,
    ...(source.locationStock?.map((row) => row.locationCode) ?? []),
  ]
    .map((c) => c?.trim().toUpperCase())
    .filter((c): c is string => Boolean(c));
  if (codes.length === 0) return false;
  return codes.some((code) => !allowed.has(code));
}

export function selectedLocationCodesFromItem(
  source: Item | null | undefined,
  locations: Array<{ code: string }>,
): string[] {
  if (!source || locations.length === 0) return [];
  const allowed = new Set(
    locations.map((loc) => loc.code.trim().toUpperCase()),
  );
  const fromStock =
    source.locationStock
      ?.map((row) => row.locationCode)
      .filter((code): code is string => Boolean(code)) ?? [];
  const fromPrimary = source.locationCode ? [source.locationCode] : [];
  const matched = [...new Set([...fromStock, ...fromPrimary])].filter((code) =>
    allowed.has(code.trim().toUpperCase()),
  );
  if (matched.length > 0) return matched;

  // Legacy rows often carry sister-entity codes (e.g. VP on a VISP product).
  // Fall back to this tenant's configured homes so edit/opening-stock work.
  const hasAnyLocation =
    Boolean(source.locationCode?.trim()) ||
    (source.locationStock?.length ?? 0) > 0;
  if (!hasAnyLocation) return [];
  return locations.map((loc) => loc.code);
}

export function locationDetailsFromItem(
  source: Item | null | undefined,
  locations: Array<{ code: string; name: string }>,
): ProductLocationDetailState[] {
  const allowed = new Set(
    locations.map((loc) => loc.code.trim().toUpperCase()),
  );

  let orphanQty = 0;
  let orphanBin: string | null = null;
  for (const row of source?.locationStock ?? []) {
    const code = row.locationCode?.trim().toUpperCase() ?? "";
    if (!code || allowed.has(code)) continue;
    orphanQty += Number(row.quantity) || 0;
    if (!orphanBin && row.binLocation?.trim()) {
      orphanBin = row.binLocation;
    }
  }

  const primaryCode = source?.locationCode?.trim().toUpperCase() ?? "";
  const primaryIsForeign = Boolean(primaryCode) && !allowed.has(primaryCode);
  if (primaryIsForeign && orphanQty === 0 && source?.quantity != null) {
    orphanQty = Number(source.quantity) || 0;
  }
  if (primaryIsForeign && !orphanBin && source?.binLocation?.trim()) {
    orphanBin = source.binLocation;
  }

  return locations.map((loc, index) => {
    const stock = source?.locationStock?.find(
      (row) =>
        row.locationCode.trim().toUpperCase() === loc.code.trim().toUpperCase(),
    );
    const foldOrphan = index === 0 && !stock && orphanQty > 0;
    const bin = decodeProductBin(
      stock?.binLocation ??
        (foldOrphan ? orphanBin : null) ??
        (source?.locationCode === loc.code ? source?.binLocation : null),
    );
    const qty =
      stock != null
        ? String(stock.quantity)
        : foldOrphan
          ? String(orphanQty)
          : source?.locationCode === loc.code && source.quantity != null
            ? String(source.quantity)
            : "";
    return {
      locationCode: loc.code,
      locationName: loc.name,
      rack: bin.rack,
      row: bin.row,
      position: bin.position,
      quantity: qty,
    };
  });
}
