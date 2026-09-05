"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { BusinessLocation, Item, StockStatus } from "@vonos/types";
import { isOutsideOrServiceCatalogItem, isProductStockLocationCode } from "@vonos/types";
import {
  formatItemLocationLine,
  formatLocationStockSummary,
} from "@/lib/utils/locationLabels";
import { getItemRoster, getStockAvailability } from "@/lib/api/items";
import { itemSellPrice } from "@/lib/utils/itemPricing";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";
import { matchSorter, rankings } from "match-sorter";
import { IN_MEMORY_FILTER_CATALOG_LIMIT } from "@/lib/api/fetchAllPages";
import type { StockAvailabilityGroup } from "@vonos/types";
import { MenuListSkeleton } from "@/components/molecules/MenuListSkeleton";

const BROWSE_PREVIEW_LIMIT = 12;

/** Normalized pick from the product catalog. */
export interface CatalogPartPick {
  /** Existing catalog item id when known. */
  itemId?: string;
  sku: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  /** Remaining sellable qty at the source (hidden for VA/VP and OT/services). */
  availableQty?: number;
  status?: StockStatus;
  /** Where the part was found — shown in the UI. */
  sourceLabel: string;
  sourceTenantCode?: string;
  /** @deprecated Custom / ad-hoc lines are no longer offered in the picker. */
  isCustom?: boolean;
  locationStockSummary?: string;
  /** Outside purchase / labour / service — no stock balance. */
  isOutsideOrService?: boolean;
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
   * When false, skip this tenant’s local Item catalog (rare — prefer own
   * synced catalog for fast match-sorter search).
   */
  ownCatalog?: boolean;
  /**
   * When includeWarehouse is on: pick product first, then choose which entity
   * (VW / VISP / VSP / Own) to source from when multiple hold the SKU.
   */
  pickSourceAfterSelect?: boolean;
  /**
   * @deprecated Custom / ad-hoc parts are not offered — catalog picks only.
   * Kept so older call sites compile; ignored when false (default).
   */
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
  const outside = isOutsideOrServiceCatalogItem(item);
  const available = item.availableQuantity ?? item.quantity;
  return {
    itemId: item.id,
    sku: item.sku,
    name: item.name,
    costPrice: item.costPrice,
    sellPrice: itemSellPrice(item),
    availableQty: outside ? undefined : available,
    status: outside ? undefined : item.status,
    sourceLabel: outside ? "Outside / service" : sourceLabel,
    sourceTenantCode,
    isOutsideOrService: outside || item.isOutsideOrService,
    locationStockSummary:
      outside
        ? undefined
        : (item.locationStock?.length ?? 0) > 0
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
  isOutsideOrService: boolean;
};

function pickShowsStock(
  showStockQty: boolean,
  pick: {
    isOutsideOrService?: boolean;
    availableQty?: number;
  },
): boolean {
  return Boolean(
    showStockQty && !pick.isOutsideOrService && pick.availableQty != null,
  );
}

export function ProductItemSearch({
  tenantId,
  tenantCode,
  placeholder = "Enter product name / SKU / scan barcode",
  retailOnly = false,
  includeWarehouse = false,
  ownCatalog = true,
  pickSourceAfterSelect = false,
  allowCustom: _allowCustom = false,
  showStockQty = true,
  businessLocations,
  onSelect,
  className,
  showLeadingIcon = true,
  showSearchButton = true,
}: ProductItemSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingGroup, setPendingGroup] = useState<SkuGroup | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const useSourceFlow = includeWarehouse && pickSourceAfterSelect;

  // Instant typedown — no debounce / no per-keystroke Neon.
  const searchQ = query.trim();
  // 1+ chars searches the warm roster; empty focus shows a browse preview.
  const readyToSearch = searchQ.length >= 1;
  const canBrowseLocal =
    ownCatalog && Boolean(tenantId) && open && searchQ.length === 0;
  const canSearchLocal = ownCatalog && Boolean(tenantId) && readyToSearch;
  const canSearchWarehouse = includeWarehouse && readyToSearch;

  const localRosterQuery = useQuery({
    queryKey: ["item-roster", tenantId, retailOnly],
    queryFn: async () => {
      if (!tenantId) return [];
      return getItemRoster(
        tenantId,
        retailOnly ? { availableForRetail: true } : undefined,
      );
    },
    // Prefetch with the page (same pattern as AsyncMenuSelect dropdowns).
    enabled: ownCatalog && Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  // Cross-entity stock roster — prefetch when warehouse search is enabled so
  // typing feels instant (VA/VP keep includeWarehouse=false, so this stays off).
  const warehouseRosterQuery = useQuery({
    queryKey: ["item-search-warehouse-roster", tenantCode, ownCatalog],
    queryFn: async () => {
      const result = await getStockAvailability({
        limit: IN_MEMORY_FILTER_CATALOG_LIMIT,
        stockHomesOnly: true,
      });
      return result.groups;
    },
    enabled: includeWarehouse,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const matchedLocal = useMemo(() => {
    const roster = localRosterQuery.data ?? [];
    if (canBrowseLocal) return roster.slice(0, BROWSE_PREVIEW_LIMIT);
    if (!canSearchLocal) return [];
    return matchSorter(roster, searchQ, {
      keys: ["name", "sku", "category", "brandName", "carModel", "description"],
      threshold: rankings.CONTAINS,
      keepDiacritics: true,
    }).slice(0, 25);
  }, [canBrowseLocal, canSearchLocal, localRosterQuery.data, searchQ]);

  const matchedWarehouse = useMemo(() => {
    if (!canSearchWarehouse) return [] as StockAvailabilityGroup[];
    const groups = warehouseRosterQuery.data ?? [];
    return matchSorter(groups, searchQ, {
      keys: ["sku", "name"],
      threshold: rankings.CONTAINS,
      keepDiacritics: true,
    }).slice(0, 20);
  }, [canSearchWarehouse, searchQ, warehouseRosterQuery.data]);

  const flatPicks = useMemo(() => {
    const rows: CatalogPartPick[] = [];
    const seen = new Set<string>();

    if (ownCatalog) {
      for (const item of matchedLocal) {
        const pick = itemToPick(
          item,
          businessLocations,
          "Own products",
          // Own catalog is same-tenant — never treat as a cross-entity stock source.
          undefined,
        );
        const key = `local:${pick.itemId}`;
        seen.add(key);
        rows.push(pick);
      }
    }

    if (includeWarehouse) {
      for (const group of matchedWarehouse) {
        for (const entity of group.entities) {
          const code = entity.tenantCode.toUpperCase();
          if (!ownCatalog && !isProductStockLocationCode(code)) {
            continue;
          }
          if (tenantCode && code === tenantCode.toUpperCase()) {
            continue;
          }
          const key = `entity:${entity.itemId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const outside = isOutsideOrServiceCatalogItem({
            name: group.name,
            sku: group.sku,
          });
          rows.push({
            itemId: entity.itemId,
            sku: group.sku,
            name: group.name,
            costPrice: entity.costPrice ?? 0,
            sellPrice: itemSellPrice(entity),
            availableQty: outside ? undefined : entity.available,
            status: outside ? undefined : entity.status,
            sourceLabel: outside
              ? "Outside / service"
              : entitySourceLabel(entity.tenantCode, entity.tenantName),
            sourceTenantCode: entity.tenantCode,
            isOutsideOrService: outside,
            locationStockSummary: outside
              ? undefined
              : entity.locations
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
    matchedLocal,
    matchedWarehouse,
    ownCatalog,
    tenantCode,
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
          totalAvailable: pick.availableQty ?? 0,
          bestSellPrice: pick.sellPrice || 0,
          isOutsideOrService: Boolean(pick.isOutsideOrService),
        });
      } else {
        existing.sources.push(pick);
        existing.totalAvailable += pick.availableQty ?? 0;
        existing.bestSellPrice = Math.max(
          existing.bestSellPrice,
          pick.sellPrice || 0,
        );
        existing.isOutsideOrService =
          existing.isOutsideOrService || Boolean(pick.isOutsideOrService);
        if (!existing.name && pick.name) existing.name = pick.name;
      }
    }
    return Array.from(bySku.values());
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

  const showDropdown = open;
  const rosterWarming =
    (ownCatalog && localRosterQuery.isLoading) ||
    (includeWarehouse && warehouseRosterQuery.isLoading);
  const rosterRefreshing =
    (localRosterQuery.isFetching || warehouseRosterQuery.isFetching) &&
    !rosterWarming;
  const showCustom = false;
  const listRows = useSourceFlow ? skuGroups : flatPicks;
  const showSkeleton = rosterWarming && listRows.length === 0;

  const finishSelect = (pick: CatalogPartPick) => {
    onSelect(pick);
    setQuery("");
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
    const sorted = showStockQty
      ? [...group.sources].sort(
          (a, b) => (b.availableQty ?? 0) - (a.availableQty ?? 0),
        )
      : [...group.sources].sort((a, b) =>
          a.sourceLabel.localeCompare(b.sourceLabel),
        );
    setPendingGroup({ ...group, sources: sorted });
  };

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
          className="hq6-product-search-dropdown absolute z-20 mt-1 max-h-96 w-full overflow-y-auto overscroll-contain rounded-lg border border-border bg-card py-1 shadow-lg"
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
                      {pickShowsStock(showStockQty, pick) ? (
                        <span
                          className={cn(
                            "hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums",
                            stockTone(pick.status, pick.availableQty ?? 0),
                          )}
                        >
                          {pick.availableQty} left
                        </span>
                      ) : (
                        <span className="hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums text-foreground">
                          {pick.isOutsideOrService
                            ? "Service / outside"
                            : formatCurrency(pick.sellPrice || 0)}
                        </span>
                      )}
                    </span>
                    {pickShowsStock(showStockQty, pick) &&
                    pick.locationStockSummary ? (
                      <span className="hq6-product-search-option-source text-xs text-muted">
                        {pick.locationStockSummary}
                      </span>
                    ) : !pickShowsStock(showStockQty, pick) ? (
                      <span className="hq6-product-search-option-source text-xs text-muted">
                        {pick.isOutsideOrService
                          ? "No stock balance — pick freely"
                          : "Catalog source — no stock balance required"}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </>
          ) : (
            <>
              {canBrowseLocal && listRows.length > 0 ? (
                <li className="hq6-product-search-empty px-3 py-1.5 text-[11px] text-muted">
                  Catalog ready — type to filter
                </li>
              ) : null}
              {rosterRefreshing && listRows.length > 0 ? (
                <li className="hq6-product-search-empty px-3 py-1 text-[11px] text-muted">
                  Updating…
                </li>
              ) : null}
              {showSkeleton ? (
                <li className="list-none">
                  <MenuListSkeleton rows={6} className="px-1" />
                </li>
              ) : null}
              {!showSkeleton && listRows.length === 0 && !showCustom ? (
                <li className="hq6-product-search-empty px-3 py-2 text-sm text-muted">
                  {readyToSearch
                    ? "No products found"
                    : "Start typing a product name or SKU"}
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
                          {pickShowsStock(showStockQty, {
                            isOutsideOrService: group.isOutsideOrService,
                            availableQty: group.isOutsideOrService
                              ? undefined
                              : group.totalAvailable,
                          }) ? (
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
                              {group.isOutsideOrService
                                ? "Service / outside"
                                : formatCurrency(group.bestSellPrice)}
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
                : flatPicks.map((pick) => (
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
                          {pickShowsStock(showStockQty, pick) ? (
                            <span
                              className={cn(
                                "hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums",
                                stockTone(pick.status, pick.availableQty ?? 0),
                              )}
                            >
                              {pick.availableQty} left
                            </span>
                          ) : (
                            <span className="hq6-product-search-option-meta shrink-0 text-xs font-semibold tabular-nums text-foreground">
                              {pick.isOutsideOrService
                                ? "Service / outside"
                                : formatCurrency(pick.sellPrice || 0)}
                            </span>
                          )}
                        </span>
                        <span className="hq6-product-search-option-source text-xs text-muted">
                          {pick.sourceLabel}
                          {pickShowsStock(showStockQty, pick) &&
                          pick.locationStockSummary
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
                        name: searchQ,
                        costPrice: 0,
                        sellPrice: 0,
                        availableQty: 0,
                        sourceLabel: "Custom — will add to Purchases",
                        isCustom: true,
                      })
                    }
                  >
                    <span className="hq6-product-search-option-name font-medium text-foreground">
                      Add “{searchQ}” as custom part
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
