/** Catalog selling price only — never falls back to cost. */
export function itemSellPrice(item: {
  costPrice?: number;
  sellPrice?: number | null;
}): number {
  if (item.sellPrice != null && Number.isFinite(item.sellPrice)) {
    return item.sellPrice;
  }
  return 0;
}
