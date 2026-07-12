"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { getStockAvailability } from "@/lib/api/items";
import { AUTOS_GROUP_ENTITIES } from "@/lib/registries/tenants";

/**
 * Cross-entity stock lookup for the Autos Group. Search a SKU / product name and
 * see how much each auto entity (VW, VA, VISP, VSP) holds, with per-location
 * breakdown. Read-only.
 */
export function StockAvailabilityView() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["stock-availability", debounced],
    queryFn: () => getStockAvailability(debounced || undefined),
  });

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Stock Availability
        </h2>
        <p className="mt-1 text-sm text-muted">
          Look up a part across the Autos Group. Available = on hand minus
          Approved requisition holds. Warehouse, Automotive, VISP and VSP.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or SKU…"
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-[var(--color-brand-primary)] focus:ring-1"
        />
      </div>

      {isFetching ? (
        <p className="text-sm text-muted">Searching…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">
          {debounced
            ? "No matching products across the group."
            : "Start typing to search group-wide stock."}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.sku}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    {group.sku} — {group.name}
                  </p>
                  {group.category ? (
                    <p className="text-xs text-muted">{group.category}</p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {group.totalAvailable.toLocaleString()} available
                  <span className="ml-2 font-normal text-muted">
                    ({group.totalQuantity.toLocaleString()} on hand)
                  </span>
                </p>
              </div>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-1.5 pr-3 font-medium">Entity</th>
                    <th className="py-1.5 pr-3 font-medium">Locations</th>
                    <th className="py-1.5 pr-3 font-medium">Status</th>
                    <th className="py-1.5 pr-3 font-medium text-right">On hand</th>
                    <th className="py-1.5 pr-3 font-medium text-right">Reserved</th>
                    <th className="py-1.5 font-medium text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entities.map((entity) => (
                    <tr
                      key={`${group.sku}-${entity.tenantCode}`}
                      className="border-b border-border/50"
                    >
                      <td className="py-1.5 pr-3">
                        <EntityColorBadge code={entity.tenantCode} />
                      </td>
                      <td className="py-1.5 pr-3 text-muted">
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
                      <td className="py-1.5 pr-3 text-muted">
                        {entity.status.replace(/_/g, " ")}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-foreground">
                        {entity.quantity.toLocaleString()}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-muted">
                        {entity.reserved.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-medium text-foreground">
                        {entity.available.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Covered entities:{" "}
        {AUTOS_GROUP_ENTITIES.map((e) => e.code).join(", ")}.
      </p>
    </div>
  );
}
