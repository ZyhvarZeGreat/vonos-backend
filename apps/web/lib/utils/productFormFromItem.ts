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

export function selectedLocationCodesFromItem(
  source: Item | null | undefined,
  locations: Array<{ code: string }>,
): string[] {
  if (!source || locations.length === 0) return [];
  const fromStock =
    source.locationStock
      ?.map((row) => row.locationCode)
      .filter((code): code is string => Boolean(code)) ?? [];
  const fromPrimary = source.locationCode ? [source.locationCode] : [];
  return [...new Set([...fromStock, ...fromPrimary])].filter((code) =>
    locations.some((loc) => loc.code === code),
  );
}

export function locationDetailsFromItem(
  source: Item | null | undefined,
  locations: Array<{ code: string; name: string }>,
): ProductLocationDetailState[] {
  return locations.map((loc) => {
    const stock = source?.locationStock?.find(
      (row) => row.locationCode === loc.code,
    );
    const bin = decodeProductBin(
      stock?.binLocation ??
        (source?.locationCode === loc.code ? source?.binLocation : null),
    );
    const qty =
      stock != null
        ? String(stock.quantity)
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
