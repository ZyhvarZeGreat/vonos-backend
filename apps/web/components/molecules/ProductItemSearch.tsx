"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { BusinessLocation, Item } from "@vonos/types";
import {
  formatItemLocationLine,
  formatLocationStockSummary,
} from "@/lib/utils/locationLabels";
import { getItems } from "@/lib/api/items";
import { cn } from "@/lib/utils/cn";

export interface ProductItemSearchProps {
  tenantId: string | null;
  placeholder?: string;
  retailOnly?: boolean;
  businessLocations?: BusinessLocation[];
  onSelect: (item: Item) => void;
  className?: string;
}

export function ProductItemSearch({
  tenantId,
  placeholder = "Enter product name / SKU / scan barcode",
  retailOnly = false,
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

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["item-search", tenantId, debounced, retailOnly],
    queryFn: async () => {
      if (!tenantId || debounced.length < 1) return [];
      const rows = await getItems(tenantId, { search: debounced, limit: 25 });
      return retailOnly ? rows.filter((row) => row.availableForRetail !== false) : rows;
    },
    enabled: Boolean(tenantId) && debounced.length >= 1,
  });

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showDropdown = open && debounced.length >= 1;

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
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {isFetching ? (
            <li className="px-3 py-2 text-sm text-muted">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No products found</li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                  onClick={() => {
                    onSelect(item);
                    setQuery("");
                    setDebounced("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-foreground">
                    {item.sku} — {item.name}
                  </span>
                  <span className="text-xs text-muted">
                    {(item.locationStock?.length ?? 0) > 0
                      ? formatLocationStockSummary(item, businessLocations)
                      : formatItemLocationLine(item, businessLocations)}
                    {item.category ? ` · ${item.category}` : ""}
                  </span>
                  <span className="text-xs text-muted">
                    Available: {item.quantity}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
