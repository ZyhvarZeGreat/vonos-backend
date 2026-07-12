import type { Item } from "@vonos/types";

/** Selling price for POS — uses sellPrice when set, otherwise costPrice. */
export function itemSellPrice(item: {
  costPrice: number;
  sellPrice?: number | null;
}): number {
  return item.sellPrice ?? item.costPrice;
}
