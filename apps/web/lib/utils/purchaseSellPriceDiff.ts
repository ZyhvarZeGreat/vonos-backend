/** Client-side purchase edit diff — skip redundant sell-price writes. */

export type PurchaseSellLine = {
  itemId: string;
  unitSellingPrice: number;
};

export function sellPriceChanges(
  baseline: PurchaseSellLine[],
  next: PurchaseSellLine[],
): Array<{ itemId: string; sellPrice: number }> {
  const prevById = new Map(
    baseline.map((line) => [line.itemId, Number(line.unitSellingPrice) || 0]),
  );
  const out: Array<{ itemId: string; sellPrice: number }> = [];
  for (const line of next) {
    if (!line.itemId) continue;
    const nextPrice = Math.round((Number(line.unitSellingPrice) || 0) * 100) / 100;
    const prev = prevById.get(line.itemId);
    if (prev === undefined || Math.abs(nextPrice - prev) > 0.009) {
      out.push({ itemId: line.itemId, sellPrice: nextPrice });
    }
  }
  return out;
}
