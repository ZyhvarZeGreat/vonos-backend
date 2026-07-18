"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { BusinessLocation, Item, StockStatus } from "@vonos/types";
import {
  formatItemLocationLine,
  formatLocationStockSummary,
} from "@/lib/utils/locationLabels";
import { getItems, getStockAvailability } from "@/lib/api/items";
import { itemSellPrice } from "@/lib/utils/itemPricing";
import { cn } from "@/lib/utils/cn";

/** Normalized pick from catalog search (own stock, warehouse, or custom). */
export interface CatalogPartPick {
  /** Existing catalog item id when known. */
  itemId?: string;
  sku: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  /** Remaining sellable qty at the source. */
  availableQty: number;
  status?: StockStatus;
  /** Where the part was found — shown in the UI. */
  sourceLabel: string;
  sourceTenantCode?: string;
  /** True when the user chose "add as custom / purchase". */
  isCustom?: boolean;
  locationStockSummary?: string;
}

export interface ProductItemSearchProps {
  tenantId: string | null;
  /** Current tenant code (e.g. VA) — used to label own vs warehouse rows. */
  tenantCode?: string | null;
  placeholder?: string;
  retailOnly?: boolean;
  /** Also search Autos Group stock (warehouse + sister entities). */
  includeWarehouse?: boolean;
  /** Offer “Add as custom part” when nothing matches (creates a purchase on save). */
  allowCustom?: boolean;
  businessLocations?: BusinessLocation[];
  onSelect: (pick: CatalogPartPick) => void;
  className?: string;
}

function stockTone(status: StockStatus | undefined, qty: number): string {
  if (status === "out_of_stock" || qty <= 0) return "text-error";
  if (status === "low_stock" || qty <= 5) return "text-amber-600";
  return "text-emerald-700";
}

function itemToPick(
  item: Item,
  businessLocations?: BusinessLocation[],
  sourceLabel = "Own stock",
): CatalogPartPick {
  const available = item.availableQuantity ?? item.quantity;
  return {
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    costPrice: item.costPrice,
    sellPrice: itemSellPrice(item),
    availableQty: available,
    status: item.status,
    sourceLabel,
    locationStockSummary:
      (item.locationStock?.length ?? 0) > 0
        ? formatLocationStockSummary(item, businessLocations)
        : formatItemLocationLine(item, businessLocations),
  };
}

export function ProductItemSearch({
  tenantId,
  tenantCode,
  placeholder = "Enter product name / SKU / scan barcode",
  retailOnly = false,
  includeWarehouse = false,
  allowCustom = false,
  businessLocations,
  onSelect,
  className,
}: ProductItemSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const localQuery = useQuery({
    queryKey: ["item-search", tenantId, debounced, retailOnly],
    queryFn: async () => {
      if (!tenantId || debounced.length < 1) return [];
      const rows = await getItems(tenantId, { search: debounced, limit: 25 });
      return retailOnly
        ? rows.filter((row) => row.availableForRetail !== false)
        : rows;
    },
    enabled: Boolean(tenantId) && debounced.length >= 1,
  });

  const warehouseQuery = useQuery({
    queryKey: ["item-search-warehouse", debounced, tenantCode],
    queryFn: async () => {
      if (debounced.length < 1) return [];
      const result = await getStockAvailability(debounced);
      return result.groups;
    },
    enabled: includeWarehouse && debounced.length >= 1,
    retry: false,
  });

  const picks = useMemo(() => {
    const rows: CatalogPartPick[] = [];
    const seen = new Set<string>();

    for (const item of localQuery.data ?? []) {
      const pick = itemToPick(item, businessLocations, "Own products");
      const key = `local:${pick.itemId}`;
      seen.add(key);
      seen.add(`sku:${pick.sku.toUpperCase()}`);
      rows.push(pick);
    }

    if (includeWarehouse) {
      for (const group of warehouseQuery.data ?? []) {
        for (const entity of group.entities) {
          // Skip current tenant — already covered by local search.
          if (
            tenantCode &&
            entity.tenantCode.toUpperCase() === tenantCode.toUpperCase()
          ) {
            continue;
          }
          const key = `entity:${entity.itemId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            itemId: entity.itemId,
            sku: group.sku,
            name: group.name,
            costPrice: 0,
            sellPrice: 0,
            availableQty: entity.available,
            status: entity.status,
            sourceLabel:
              entity.tenantCode === "VW"
                ? "Warehouse"
                : `${entity.tenantName} (${entity.tenantCode})`,
            sourceTenantCode: entity.tenantCode,
            locationStockSummary: entity.locations
              .map((loc) => `${loc.locationCode}: ${loc.quantity}`)
              .join(" · "),
          });
        }
      }
    }

    return rows.slice(0, 40);
  }, [
    businessLocations,
    includeWarehouse,
    localQuery.data,
    tenantCode,
    warehouseQuery.data,
  ]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showDropdown = open && debounced.length >= 1;
  const isFetching = localQuery.isFetching || warehouseQuery.isFetching;
  const showCustom =
    allowCustom &&
    debounced.length >= 2 &&
    !isFetching &&
    picks.every(
      (row) => row.name.toLowerCase() !== debounced.toLowerCase(),
    );

  const selectPick = (pick: CatalogPartPick) => {
    onSelect(pick);
    setQuery("");
    setDebounced("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none ring-[var(--color-brand-primary)] focus:border-[var(--color-brand-primary)] focus:ring-1"
        />
      </div>
      {showDropdown ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {isFetching ? (
            <li className="px-3 py-2 text-sm text-muted">Searching…</li>
          ) : null}
          {!isFetching && picks.length === 0 && !showCustom ? (
            <li className="px-3 py-2 text-sm text-muted">No products found</li>
          ) : null}
          {picks.map((pick) => (
            <li key={`${pick.sourceTenantCode ?? "local"}:${pick.itemId ?? pick.sku}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                onClick={() => selectPick(pick)}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {pick.sku} — {pick.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-semibold tabular-nums",
                      stockTone(pick.status, pick.availableQty),
                    )}
                  >
                    {pick.availableQty} left
                  </span>
                </span>
                <span className="text-xs text-muted">
                  {pick.sourceLabel}
                  {pick.locationStockSummary
                    ? ` · ${pick.locationStockSummary}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
          {showCustom ? (
            <li className="border-t border-border">
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                onClick={() =>
                  selectPick({
                    sku: `ADHOC-${Date.now().toString(36).toUpperCase()}`,
                    name: debounced,
                    costPrice: 0,
                    sellPrice: 0,
                    availableQty: 0,
                    sourceLabel: "Custom — will add to Purchases",
                    isCustom: true,
                  })
                }
              >
                <span className="font-medium text-foreground">
                  Add “{debounced}” as custom part
                </span>
                <span className="text-xs text-muted">
                  Not in catalog — sale line + purchase will be created
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
