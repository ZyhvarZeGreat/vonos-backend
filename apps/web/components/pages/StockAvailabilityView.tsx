"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { Spinner } from "@/components/atoms/Spinner";
import { getStockAvailability } from "@/lib/api/items";
import { AUTOS_GROUP_ENTITIES } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  isVagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";

type AvailabilityFilter = "all" | "available" | "unavailable";

/** Map VAG module unit (SP) → API tenant code (VSP). */
function entityCodeFromViewing(code: string | null): string {
  if (!code) return "";
  if (isVagViewUnitId(code)) return getVagViewUnit(code).enterCode;
  return code;
}

/**
 * Cross-entity stock lookup for the Autos Group.
 * Loads a small first page; search runs on button / Enter.
 */
export function StockAvailabilityView() {
  const isHq6 = useIsVaHq6();
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const [query, setQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState(
    () => entityCodeFromViewing(viewingCode),
  );
  const [availability, setAvailability] =
    useState<AvailabilityFilter>("all");

  useEffect(() => {
    setEntityFilter(entityCodeFromViewing(viewingCode));
  }, [viewingCode]);

  const { data, isFetching, isLoading, isFetched } = useQuery({
    queryKey: [
      "stock-availability",
      appliedSearch,
      entityFilter || "all",
      availability,
    ],
    queryFn: () =>
      getStockAvailability({
        search: appliedSearch || undefined,
        limit: 10,
        entityCode: entityFilter || undefined,
        availability,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const groups = data?.groups ?? [];
  const showResultsLoading = isLoading || (isFetching && isFetched);
  const entityOptions = useMemo(
    () => [
      { value: "", label: "All entities" },
      ...AUTOS_GROUP_ENTITIES.map((e) => ({
        value: e.code,
        label: `${e.code} — ${e.name}`,
      })),
    ],
    [],
  );

  const runSearch = () => {
    setAppliedSearch(query.trim());
  };

  const fieldClass = isHq6
    ? "form-control"
    : "w-full rounded-lg border border-border bg-card py-2.5 px-3 text-sm text-foreground outline-none focus:border-[var(--color-brand-primary)] focus:ring-1";
  const cardClass = isHq6
    ? "hq6-card p-4"
    : "rounded-xl border border-border bg-card p-4 shadow-sm";
  const muted = isHq6 ? "text-[#6b7280]" : "text-muted";
  const fg = isHq6 ? "text-[#111827]" : "text-foreground";
  const rowBorder = isHq6
    ? "border-b border-[var(--hq6-border,#e5e7eb)]"
    : "border-b border-border";

  return (
    <div className="space-y-4">
      {!isHq6 ? (
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Stock Availability
          </h2>
          <p className="mt-1 text-sm text-muted">
            First 10 products load immediately. Search by name or SKU across the
            Autos Group — available = on hand minus Approved requisition holds.
          </p>
        </div>
      ) : (
        <p className={`text-sm ${muted}`}>
          First 10 products load immediately. Search by name or SKU — available =
          on hand minus Approved requisition holds. Module entity above scopes
          the filter when set.
        </p>
      )}

      <form
        className={
          isHq6
            ? "hq6-card flex flex-wrap items-end gap-3 p-4"
            : "flex flex-wrap items-end gap-3"
        }
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
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
            placeholder="Search by product name or SKU…"
            className={
              isHq6 ? fieldClass : `${fieldClass} pl-9`
            }
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
        <button
          type="submit"
          className={
            isHq6
              ? "hq6-btn hq6-btn-blue shrink-0"
              : "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-[var(--color-brand-primary)] px-4 text-sm font-medium text-white"
          }
          disabled={showResultsLoading}
        >
          {showResultsLoading ? (
            <Spinner size="sm" className="text-current" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showResultsLoading ? "Searching…" : "Search"}
        </button>
      </form>

      {showResultsLoading ? (
        <div
          className={`${cardClass} flex items-center gap-2 text-sm ${muted}`}
          role="status"
          aria-live="polite"
        >
          <Spinner size="sm" className={muted} />
          {appliedSearch
            ? `Searching for “${appliedSearch}”…`
            : "Loading stock…"}
        </div>
      ) : null}

      <div
        className={
          showResultsLoading && groups.length > 0
            ? "pointer-events-none opacity-60 transition-opacity"
            : undefined
        }
        aria-busy={showResultsLoading}
      >
        {isLoading && groups.length === 0 ? (
          <p className={`text-sm ${muted}`}>Loading stock…</p>
        ) : groups.length === 0 && !showResultsLoading ? (
          <p className={`text-sm ${muted}`}>
            {appliedSearch
              ? "No matching products for these filters."
              : "No products in the first page — try searching."}
          </p>
        ) : groups.length === 0 ? null : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.sku} className={cardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
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
          </div>
        )}
      </div>

      <p className={`text-xs ${muted}`}>
        Showing up to 10 products
        {appliedSearch
          ? ` matching “${appliedSearch}”`
          : " (browse / search for more)"}
        .
      </p>
    </div>
  );
}
