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
import { formatCurrency } from "@/lib/utils/formatCurrency";
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
  /**
   * When includeWarehouse is on: pick product first, then choose which entity
   * (VW / VISP / VSP / Own) to source from when multiple hold the SKU.
   */
  pickSourceAfterSelect?: boolean;
  /** Offer “Add as custom part” when nothing matches (creates a purchase on save). */
  allowCustom?: boolean;
  /** When false, show sell price instead of remaining qty (job / price-list tenants). */
  showStockQty?: boolean;
  businessLocations?: BusinessLocation[];
  onSelect: (pick: CatalogPartPick) => void;
  className?: string;
  /** Leading magnifier inside the field (default true). Off when parent already has an addon icon. */
  showLeadingIcon?: boolean;
  /** Trailing Search button (default true). Off when parent uses input-group actions. */
  showSearchButton?: boolean;
}

function stockTone(status: StockStatus | undefined, qty: number): string {
  if (status === "out_of_stock" || qty <= 0) return "text-error";
  if (status === "low_stock" || qty <= 5) return "text-amber-600";
  return "text-emerald-700";
}

function entitySourceLabel(code: string, name: string): string {
  if (code === "VW") return "Warehouse (VW)";
  if (code === "VISP") return `Institute (${code})`;
  if (code === "VSP") return `Marketplace (${code})`;
  return `${name} (${code})`;
}

function itemToPick(
  item: Item,
  businessLocations?: BusinessLocation[],
  sourceLabel = "Own stock",
  sourceTenantCode?: string,
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
    sourceTenantCode,
    locationStockSummary:
      (item.locationStock?.length ?? 0) > 0
        ? formatLocationStockSummary(item, businessLocations)
        : formatItemLocationLine(item, businessLocations),
  };
}

type SkuGroup = {
  sku: string;
  name: string;
  sources: CatalogPartPick[];
  totalAvailable: number;
  bestSellPrice: number;
};

export function ProductItemSearch({
  tenantId,
  tenantCode,
  placeholder = "Enter product name / SKU / scan barcode",
  retailOnly = false,
  includeWarehouse = false,
  pickSourceAfterSelect = false,
  allowCustom = false,
  showStockQty = true,
  businessLocations,
  onSelect,
  className,
  showLeadingIcon = true,
  showSearchButton = true,
}: ProductItemSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingGroup, setPendingGroup] = useState<SkuGroup | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const useSourceFlow = includeWarehouse && pickSourceAfterSelect;

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

  const flatPicks = useMemo(() => {
    const rows: CatalogPartPick[] = [];
    const seen = new Set<string>();

    for (const item of localQuery.data ?? []) {
      const pick = itemToPick(
        item,
        businessLocations,
        "Own products",
        tenantCode ?? undefined,
      );
      const key = `local:${pick.itemId}`;
      seen.add(key);
      rows.push(pick);
    }

    if (includeWarehouse) {
      for (const group of warehouseQuery.data ?? []) {
        for (const entity of group.entities) {
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
            sourceLabel: entitySourceLabel(entity.tenantCode, entity.tenantName),
            sourceTenantCode: entity.tenantCode,
            locationStockSummary: entity.locations
              .map((loc) => `${loc.locationCode}: ${loc.quantity}`)
              .join(" · "),
          });
        }
      }
    }

    return rows;
  }, [
    businessLocations,
    includeWarehouse,
    localQuery.data,
    tenantCode,
    warehouseQuery.data,
  ]);

  const skuGroups = useMemo(() => {
    const bySku = new Map<string, SkuGroup>();
    for (const pick of flatPicks) {
      const key = pick.sku.toUpperCase();
      const existing = bySku.get(key);
      if (!existing) {
        bySku.set(key, {
          sku: pick.sku,
          name: pick.name,
          sources: [pick],
          totalAvailable: pick.availableQty,
          bestSellPrice: pick.sellPrice || pick.costPrice,
        });
      } else {
        existing.sources.push(pick);
        existing.totalAvailable += pick.availableQty;
        existing.bestSellPrice = Math.max(
          existing.bestSellPrice,
          pick.sellPrice || pick.costPrice,
        );
        if (!existing.name && pick.name) existing.name = pick.name;
      }
    }
    return Array.from(bySku.values()).slice(0, 40);
  }, [flatPicks]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setPendingGroup(null);
      }
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
    !pendingGroup &&
    flatPicks.every((row) => row.name.toLowerCase() !== debounced.toLowerCase());

  const finishSelect = (pick: CatalogPartPick) => {
    onSelect(pick);
    setQuery("");
    setDebounced("");
    setOpen(false);
    setPendingGroup(null);
  };

  const selectFlatPick = (pick: CatalogPartPick) => {
    finishSelect(pick);
  };

  const selectGroup = (group: SkuGroup) => {
    if (group.sources.length === 1) {
      finishSelect(group.sources[0]!);
      return;
    }
    // Prefer sources with stock when opening chooser.
    const sorted = [...group.sources].sort(
      (a, b) => b.availableQty - a.availableQty,
    );
    setPendingGroup({ ...group, sources: sorted });
  };

  const listRows = useSourceFlow ? skuGroups : flatPicks;

  return (
    <div
      ref={wrapRef}
      className={cn("hq6-product-search relative w-full min-w-0", className)}
    >
      <div className="hq6-product-search-field flex w-full min-w-0 items-stretch">
        <label
          className={cn(
            "hq6-product-search-control flex min-w-0 flex-1 items-center gap-2 border border-border bg-card px-3 py-0",
            showSearchButton
              ? "rounded-l-lg rounded-r-none border-r-0"
              : "rounded-lg",
            "focus-within:border-[var(--color-brand-primary)] focus-within:ring-1 focus-within:ring-[var(--color-brand-primary)]",
          )}
        >
          {showLeadingIcon ? (
            <Search
              className="h-4 w-4 shrink-0 text-muted"
              aria-hidden
              strokeWidth={2}
            />
          ) : null}
          <input
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setPendingGroup(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setDebounced(query.trim());
                setOpen(true);
              }
              if (e.key === "Escape" && pendingGroup) {
                e.preventDefault();
                setPendingGroup(null);
              }
            }}
            placeholder={placeholder}
            className="hq6-product-search-input min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted"
          />
        </label>
        {showSearchButton ? (
          <button
            type="button"
            className="hq6-product-search-btn inline-flex shrink-0 items-center justify-center rounded-r-lg border border-[#2563eb] bg-[#2563eb] px-3 text-sm font-semibold text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
            aria-label="Search"
            onClick={() => {
              setDebounced(query.trim());
              setOpen(true);
            }}
          >
            Search
          </button>
        ) : null}
      </div>
      {showDropdown ? (
        <ul
          id={listId}
          role="listbox"
          className="hq6-product-search-dropdown absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {pendingGroup ? (
            <>
              <li className="hq6-product-search-empty border-b border-border px-3 py-2">
                <button
                  type="button"
                  className="text-xs font-medium text-[#2563eb] hover:underline"
                  onClick={() => setPendingGroup(null)}
                >
                  ← Back
                </button>
                <div className="mt-1 font-medium text-foreground">
                  {pendingGroup.sku} — {pendingGroup.name}
                </div>
                <div className="text-xs text-muted">
                  Select where this product is coming from
                </div>
              </li>
              {pendingGroup.sources.map((pick) => (
                <li
                  key={`${pick.sourceTenantCode ?? "local"}:${pick.itemId ?? pick.sku}`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="hq6-product-search-option flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                    onClick={() => finishSelect(pick)}
                  >
                    <span className="hq6-product-search-option-row flex items-start justify-between gap-2">
                      <span className="hq6-product-search-option-name font-medium text-foreground">
                        {pick.sourceLabel}
                      </span>
                      <span
                        className={cn(
                          "hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums",
                          stockTone(pick.status, pick.availableQty),
                        )}
                      >
                        {pick.availableQty} left
                      </span>
                    </span>
                    {pick.locationStockSummary ? (
                      <span className="hq6-product-search-option-source text-xs text-muted">
                        {pick.locationStockSummary}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </>
          ) : (
            <>
              {isFetching ? (
                <li className="hq6-product-search-empty px-3 py-2 text-sm text-muted">
                  Searching…
                </li>
              ) : null}
              {!isFetching && listRows.length === 0 && !showCustom ? (
                <li className="hq6-product-search-empty px-3 py-2 text-sm text-muted">
                  No products found
                </li>
              ) : null}
              {useSourceFlow
                ? skuGroups.map((group) => (
                    <li key={group.sku.toUpperCase()}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="hq6-product-search-option flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                        onClick={() => selectGroup(group)}
                      >
                        <span className="hq6-product-search-option-row flex items-start justify-between gap-2">
                          <span className="hq6-product-search-option-name font-medium text-foreground">
                            {group.sku} — {group.name}
                          </span>
                          {showStockQty ? (
                            <span
                              className={cn(
                                "hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums",
                                stockTone(undefined, group.totalAvailable),
                              )}
                            >
                              {group.totalAvailable} left
                            </span>
                          ) : (
                            <span className="hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums text-foreground">
                              {formatCurrency(group.bestSellPrice)}
                            </span>
                          )}
                        </span>
                        <span className="hq6-product-search-option-source text-xs text-muted">
                          {group.sources.length === 1
                            ? group.sources[0]!.sourceLabel
                            : `${group.sources.length} sources — choose entity`}
                        </span>
                      </button>
                    </li>
                  ))
                : flatPicks.slice(0, 40).map((pick) => (
                    <li
                      key={`${pick.sourceTenantCode ?? "local"}:${pick.itemId ?? pick.sku}`}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="hq6-product-search-option flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                        onClick={() => selectFlatPick(pick)}
                      >
                        <span className="hq6-product-search-option-row flex items-start justify-between gap-2">
                          <span className="hq6-product-search-option-name font-medium text-foreground">
                            {pick.sku} — {pick.name}
                          </span>
                          {showStockQty ? (
                            <span
                              className={cn(
                                "hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums",
                                stockTone(pick.status, pick.availableQty),
                              )}
                            >
                              {pick.availableQty} left
                            </span>
                          ) : (
                            <span className="hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums text-foreground">
                              {formatCurrency(pick.sellPrice || pick.costPrice)}
                            </span>
                          )}
                        </span>
                        <span className="hq6-product-search-option-source text-xs text-muted">
                          {pick.sourceLabel}
                          {showStockQty && pick.locationStockSummary
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
                    className="hq6-product-search-option flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                    onClick={() =>
                      finishSelect({
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
                    <span className="hq6-product-search-option-name font-medium text-foreground">
                      Add “{debounced}” as custom part
                    </span>
                    <span className="hq6-product-search-option-source text-xs text-muted">
                      Not in catalog — sale line + purchase will be created
                    </span>
                  </button>
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
    </div>
  );
}
