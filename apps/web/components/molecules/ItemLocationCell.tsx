"use client";

import type { BusinessLocation, Item } from "@vonos/types";
import {
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
  productHomeLocationsForTenant,
} from "@vonos/types";
import {
  formatItemLocationLine,
  formatProductStockLocations,
} from "@/lib/utils/locationLabels";

export function ItemLocationCell({
  item,
  locations,
  /** Products list: show stock / catalog home location names. */
  productStockMode = false,
  /** When the row has no location yet (legacy catalog), show this tenant home. */
  fallbackLocationCode,
}: {
  item: Pick<
    Item,
    "locationCode" | "binLocation" | "locationStock" | "quantity"
  >;
  locations?: BusinessLocation[];
  productStockMode?: boolean;
  fallbackLocationCode?: string | null;
}) {
  if (productStockMode) {
    const home = productHomeLocationsForTenant(fallbackLocationCode);
    const line = formatProductStockLocations(
      item,
      locations?.length
        ? locations
        : home.length > 0
          ? home
          : PRODUCT_STOCK_BUSINESS_LOCATIONS,
      fallbackLocationCode,
    );
    if (line === "—") {
      return <span className="text-muted">—</span>;
    }
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{line}</p>
      </div>
    );
  }

  const line = formatItemLocationLine(item, locations);
  if (line === "—") {
    return <span className="text-muted">—</span>;
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground">{line}</p>
      {item.locationCode && item.binLocation ? (
        <p className="truncate text-xs text-muted">
          {item.locationCode} · {item.binLocation}
        </p>
      ) : null}
    </div>
  );
}
