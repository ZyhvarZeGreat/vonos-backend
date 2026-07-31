"use client";

import type { BusinessLocation, Item } from "@vonos/types";
import { PRODUCT_STOCK_BUSINESS_LOCATIONS } from "@vonos/types";
import {
  formatItemLocationLine,
  formatProductStockLocations,
} from "@/lib/utils/locationLabels";

export function ItemLocationCell({
  item,
  locations,
  /** Products list: show VW / VISP / VSP stock homes only. */
  productStockMode = false,
}: {
  item: Pick<
    Item,
    "locationCode" | "binLocation" | "locationStock" | "quantity"
  >;
  locations?: BusinessLocation[];
  productStockMode?: boolean;
}) {
  if (productStockMode) {
    const line = formatProductStockLocations(
      item,
      locations?.length ? locations : PRODUCT_STOCK_BUSINESS_LOCATIONS,
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
