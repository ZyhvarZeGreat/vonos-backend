"use client";

import type { BusinessLocation, Item } from "@vonos/types";
import { formatItemLocationLine } from "@/lib/utils/locationLabels";

export function ItemLocationCell({
  item,
  locations,
}: {
  item: Pick<Item, "locationCode" | "binLocation">;
  locations?: BusinessLocation[];
}) {
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
