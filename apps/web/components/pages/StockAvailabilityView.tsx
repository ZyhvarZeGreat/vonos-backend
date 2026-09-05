"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { Spinner } from "@/components/atoms/Spinner";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { DataTableSkeleton } from "@/components/organisms/skeletons";
import { getStockAvailability } from "@/lib/api/items";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/search";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { AUTOS_GROUP_ENTITIES } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { PRODUCT_STOCK_BUSINESS_LOCATIONS } from "@vonos/types";

type AvailabilityFilter = "all" | "available" | "unavailable";

/** First paint + each “warm more” step — not a 10k roster dump. */
const STOCK_FETCH_PAGE = 50;
const STOCK_UI_PAGE_SIZE = HQ6_TABLE_PAGE_SIZE;

/** Map VAG module unit (SP) → API tenant code (VSP). */
function entityCodeFromViewing(code: string | null): string {
  if (!code) return "";
  if (isVagViewUnitId(code)) return getVagViewUnit(code).enterCode;
  return code;
}

export function stockAvailabilityQueryKey(options: {
  entityCode: string;
  availability: AvailabilityFilter;
  search: string;
  fetchLimit: number;
}) {
  return [
    "stock-availability-roster",
    options.entityCode || "all",
    options.availability,
    options.search.trim() || "",
    options.fetchLimit,
  ] as const;
}

/**
 * Cross-entity stock lookup for the Autos Group.
 * Page-sized API fetches + sliding window (same feel as entity list tables).
 */
export function StockAvailabilityView({
  stockHomesOnly = false,
}: {
  /** Limit entity filter + API scope to VW / VISP / VSP (entity Group Stock page). */
  stockHomesOnly?: boolean;
} = {}) {
  const isHq6 = useIsVaHq6();
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState(
    () => (stockHomesOnly ? "" : entityCodeFromViewing(viewingCode)),
  );
  const [availability, setAvailability] =
    useState<AvailabilityFilter>("all");
  const [fetchLimit, setFetchLimit] = useState(STOCK_FETCH_PAGE);
  const [pageIndex, setPageIndex] = useState(0);

  const debouncedSearch = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (stockHomesOnly) return;
    setEntityFilter(entityCodeFromViewing(viewingCode));
  }, [viewingCode, stockHomesOnly]);

  useEffect(() => {
    setFetchLimit(STOCK_FETCH_PAGE);
    setPageIndex(0);
  }, [entityFilter, availability, debouncedSearch]);

  const { data, isFetching, isLoading, isFetched } = useQuery({
    queryKey: stockAvailabilityQueryKey({
      entityCode: entityFilter,
      availability,
      search: debouncedSearch,
      fetchLimit,
    }).concat(stockHomesOnly ? ["homes"] : []),
    queryFn: () =>
      getStockAvailability({
        limit: fetchLimit,
        entityCode: entityFilter || undefined,
        availability,
        search: debouncedSearch.trim() || undefined,
        stockHomesOnly: stockHomesOnly || undefined,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const roster = data?.groups ?? [];
  const hasMoreOnServer = roster.length >= fetchLimit;
  const pageCount = Math.max(
    1,
    Math.ceil(Math.max(roster.length, 1) / STOCK_UI_PAGE_SIZE),
  );
  const safePage = Math.min(pageIndex, pageCount - 1);

  const visible = useMemo(() => {
    const start = safePage * STOCK_UI_PAGE_SIZE;
    return roster.slice(start, start + STOCK_UI_PAGE_SIZE);
  }, [roster, safePage]);

  const showResultsLoading = isLoading || (isFetching && isFetched);

  const goNext = () => {
    const next = safePage + 1;
    if (next < pageCount) {
      setPageIndex(next);
      return;
    }
    if (hasMoreOnServer) {
      setFetchLimit((n) => n + STOCK_FETCH_PAGE);
      setPageIndex(next);
    }
  };

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));

  const entityOptions = useMemo(
    () => [
      { value: "", label: stockHomesOnly ? "All (VW / VISP / VSP)" : "All entities" },
      ...(stockHomesOnly
        ? PRODUCT_STOCK_BUSINESS_LOCATIONS.map((e) => ({
            value: e.code,
            label: e.name,
          }))
        : AUTOS_GROUP_ENTITIES.map((e) => ({
            value: e.code,
            label: e.name,
          }))),
    ],
    [stockHomesOnly],
  );

  const fieldClass = isHq6
    ? "form-control"
    : "w-full rounded-lg border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none focus:border-[var(--color-brand-primary)] focus:ring-1";
  const cardClass = isHq6
    ? "hq6-card p-5"
    : "rounded-xl border border-border bg-card p-4 shadow-sm";
  const muted = isHq6 ? "text-[#6b7280]" : "text-muted";
  const fg = isHq6 ? "text-[#111827]" : "text-foreground";
  const rowBorder = isHq6
    ? "border-b border-[var(--hq6-border,#e5e7eb)]"
    : "border-b border-border";

  return (
    <div className={isHq6 ? "hq6-page space-y-4 p-4 md:p-6" : "space-y-4"}>
      {!isHq6 ? (
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {stockHomesOnly ? "Group Stock" : "Stock Availability"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {stockHomesOnly
              ? "On-hand quantities across Warehouse, Institute, and Marketplace. View only — edit stock on your own entity."
              : "Loads a sliding window of products (not the full catalog). Search hits the server. Available = on hand minus Approved requisition holds."}
          </p>
        </div>
      ) : (
        <p className={`text-sm ${muted}`}>
          {stockHomesOnly
            ? "VW / VISP / VSP on-hand — view only. Edit quantities only on your own entity (Opening Stock)."
            : "Sliding window list — same pacing as entity tables. Search is server-side. “Show info for” scopes the entity filter when set."}
        </p>
      )}

      <div
        className={
          isHq6
            ? "hq6-card flex flex-wrap items-end gap-4 p-5"
            : "flex flex-wrap items-end gap-3"
        }
      >
        <div className="relative min-w-[220px] flex-1 max-w-xl">
          <label
            htmlFor="stock-availability-search"
            className={
              isHq6
                ? "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]"
                : "sr-only"
            }
          >
            Search products
          </label>
          {!isHq6 ? (
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          ) : null}
          <input
            id="stock-availability-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SKU…"
            className={isHq6 ? fieldClass : `${fieldClass} pl-9`}
            autoComplete="off"
          />
        </div>
        <div className="min-w-[10rem]">
          <label
            htmlFor="stock-entity-filter"
            className={
              isHq6
                ? "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]"
                : "mb-1.5 block text-sm font-medium text-foreground"
            }
          >
            Entity
          </label>
          <select
            id="stock-entity-filter"
            className={isHq6 ? "form-control select2" : fieldClass}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          >
            {entityOptions.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[9rem]">
          <label
            htmlFor="stock-availability-filter"
            className={
              isHq6
                ? "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]"
                : "mb-1.5 block text-sm font-medium text-foreground"
            }
          >
            Availability
          </label>
          <select
            id="stock-availability-filter"
            className={isHq6 ? "form-control select2" : fieldClass}
            value={availability}
            onChange={(e) =>
              setAvailability(e.target.value as AvailabilityFilter)
            }
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {isLoading && roster.length === 0 ? (
        <DataTableSkeleton rows={8} columns={4} withPagination embedded />
      ) : null}

      <div
        className={
          showResultsLoading && roster.length > 0
            ? "pointer-events-none opacity-60 transition-opacity"
            : undefined
        }
        aria-busy={showResultsLoading}
      >
        {roster.length === 0 && !isLoading ? (
          <p className={`text-sm ${muted}`}>
            {debouncedSearch.trim()
              ? "No matching products for these filters."
              : "No products in this window for these filters."}
          </p>
        ) : roster.length === 0 ? null : (
          <div className="space-y-4">
            {showResultsLoading ? (
              <div
                className={`${cardClass} flex items-center gap-2 text-sm ${muted}`}
                role="status"
                aria-live="polite"
              >
                <Spinner size="sm" className={muted} />
                Updating stock…
              </div>
            ) : null}
            {visible.map((group) => (
              <div key={group.sku} className={cardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className={`font-semibold ${fg}`}>
                      {group.sku} — {group.name}
                    </p>
                    {group.category ? (
                      <p className={`text-xs ${muted}`}>{group.category}</p>
                    ) : null}
                  </div>
                  <p className={`text-sm font-semibold ${fg}`}>
                    {group.totalAvailable.toLocaleString()} available
                    <span className={`ml-2 font-normal ${muted}`}>
                      ({group.totalQuantity.toLocaleString()} on hand)
                    </span>
                  </p>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${rowBorder} text-left ${muted}`}>
                        <th className="py-1.5 pr-3 font-medium">Entity</th>
                        <th className="py-1.5 pr-3 font-medium">Locations</th>
                        <th className="py-1.5 pr-3 font-medium">Status</th>
                        <th className="py-1.5 pr-3 font-medium text-right">
                          On hand
                        </th>
                        <th className="py-1.5 pr-3 font-medium text-right">
                          Reserved
                        </th>
                        <th className="py-1.5 font-medium text-right">
                          Available
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.entities.map((entity) => (
                        <tr
                          key={`${group.sku}-${entity.tenantCode}`}
                          className={rowBorder}
                        >
                          <td className="py-1.5 pr-3">
                            <EntityColorBadge code={entity.tenantCode} />
                          </td>
                          <td className={`py-1.5 pr-3 ${muted}`}>
                            {entity.locations.length > 0
                              ? entity.locations
                                  .map((loc) =>
                                    loc.binLocation
                                      ? `${loc.locationCode}·${loc.binLocation}: ${loc.quantity}`
                                      : `${loc.locationCode}: ${loc.quantity}`,
                                  )
                                  .join(", ")
                              : "—"}
                          </td>
                          <td className={`py-1.5 pr-3 ${muted}`}>
                            {entity.status.replace(/_/g, " ")}
                          </td>
                          <td className={`py-1.5 pr-3 text-right ${fg}`}>
                            {entity.quantity.toLocaleString()}
                          </td>
                          <td className={`py-1.5 pr-3 text-right ${muted}`}>
                            {entity.reserved.toLocaleString()}
                          </td>
                          <td className={`py-1.5 text-right font-medium ${fg}`}>
                            {entity.available.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <CursorPaginationBar
              pageIndex={safePage}
              pageSize={STOCK_UI_PAGE_SIZE}
              itemCount={visible.length}
              hasMore={safePage + 1 < pageCount || hasMoreOnServer}
              canGoPrev={safePage > 0}
              onPrev={goPrev}
              onNext={goNext}
              onPageSizeChange={() => undefined}
              totalPages={hasMoreOnServer ? undefined : pageCount}
              totalItems={hasMoreOnServer ? undefined : roster.length}
              onPageSelect={(idx) => setPageIndex(idx)}
              canSelectPage={(idx) => idx < pageCount}
              isBusy={isFetching}
            />
          </div>
        )}
      </div>
    </div>
  );
}
