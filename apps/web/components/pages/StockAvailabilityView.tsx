"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { Select } from "@/components/atoms/Select";
import { getStockAvailability } from "@/lib/api/items";
import { AUTOS_GROUP_ENTITIES } from "@/lib/registries/tenants";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { Spinner } from "@/components/atoms/Spinner";

type AvailabilityFilter = "all" | "available" | "unavailable";

/**
 * Cross-entity stock lookup for the Autos Group.
 * Loads a small first page, then searches as the user types.
 */
export function StockAvailabilityView() {
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [entityFilter, setEntityFilter] = useState(viewingCode ?? "");
  const [availability, setAvailability] =
    useState<AvailabilityFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (viewingCode) setEntityFilter(viewingCode);
  }, [viewingCode]);

  const { data, isFetching, isLoading } = useQuery({
    queryKey: [
      "stock-availability",
      debounced,
      entityFilter || "all",
      availability,
    ],
    queryFn: () =>
      getStockAvailability({
        search: debounced || undefined,
        limit: 10,
        entityCode: entityFilter || undefined,
        availability,
      }),
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const groups = data?.groups ?? [];
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Stock Availability
        </h2>
        <p className="mt-1 text-sm text-muted">
          First 10 products load immediately. Type to search across the Autos
          Group — available = on hand minus Approved requisition holds.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name or SKU…"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-[var(--color-brand-primary)] focus:ring-1"
          />
        </div>
        <div className="w-48">
          <Select
            label="Entity"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            options={entityOptions}
          />
        </div>
        <div className="w-44">
          <Select
            label="Availability"
            value={availability}
            onChange={(e) =>
              setAvailability(e.target.value as AvailabilityFilter)
            }
            options={[
              { value: "all", label: "All" },
              { value: "available", label: "Available" },
              { value: "unavailable", label: "Unavailable" },
            ]}
          />
        </div>
        {isFetching ? <Spinner className="mb-2.5 text-muted" /> : null}
      </div>

      {isLoading && groups.length === 0 ? (
        <p className="text-sm text-muted">Loading stock…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted">
          {debounced
            ? "No matching products for these filters."
            : "No products in the first page — try searching."}
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
        Showing up to 10 products
        {debounced ? ` matching “${debounced}”` : " (browse / search for more)"}.
      </p>
    </div>
  );
}
