"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import { MenuListSkeleton } from "@/components/molecules/MenuListSkeleton";
import type { MenuSelectOption } from "@/components/molecules/MenuSelect";
import { cn } from "@/lib/utils/cn";

export type AsyncMenuLoadResult = {
  options: MenuSelectOption[];
  /** When true, scrolling to the bottom will request another batch. */
  hasMore?: boolean;
  /**
   * When true, `options` are appended to the current list.
   * When false/undefined, `options` replace the list (open / new search).
   */
  append?: boolean;
};

function normalizeLoadResult(
  result: MenuSelectOption[] | AsyncMenuLoadResult,
): AsyncMenuLoadResult {
  if (Array.isArray(result)) {
    return { options: result, hasMore: false, append: false };
  }
  return result;
}

function mergeOptions(
  current: MenuSelectOption[],
  incoming: MenuSelectOption[],
  append: boolean,
): MenuSelectOption[] {
  if (!append) return incoming;
  const seen = new Set(current.map((row) => row.value));
  const fresh = incoming.filter((row) => !seen.has(row.value));
  return fresh.length === 0 ? current : [...current, ...fresh];
}

export interface AsyncMenuSelectProps {
  id?: string;
  value: string;
  /** Label shown when the selected value is not in the current result set. */
  selectedLabel?: string;
  onChange: (value: string, option?: MenuSelectOption) => void;
  /**
   * Called on open and when the search query changes.
   * Return `{ options, hasMore }` to enable infinite scroll batches.
   */
  loadOptions: (
    query: string,
  ) => Promise<MenuSelectOption[] | AsyncMenuLoadResult>;
  /**
   * Called when the user scrolls near the bottom while browsing (empty query)
   * or when a search result page still has more matches.
   */
  loadMoreOptions?: (
    query: string,
  ) => Promise<MenuSelectOption[] | AsyncMenuLoadResult>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
  emptyMessage?: string;
  /**
   * Prefetch the empty-query first page as soon as the control mounts
   * (in parallel with the rest of the page) so opening the menu feels instant.
   * Defaults to true.
   */
  prefetchOnMount?: boolean;
  /**
   * When this value changes (e.g. tenantId), re-run the mount prefetch.
   * Pass `null`/empty to skip until ready.
   */
  prefetchKey?: string | null;
}

/**
 * Searchable select: first batch on mount (and on open), more batches on scroll,
 * search filters loaded rows then falls back to API via `loadOptions`.
 */
export function AsyncMenuSelect({
  id,
  value,
  selectedLabel,
  onChange,
  loadOptions,
  loadMoreOptions,
  placeholder = "Select…",
  className,
  disabled = false,
  debounceMs = 0,
  emptyMessage = "No matches",
  prefetchOnMount = true,
  prefetchKey,
}: AsyncMenuSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<MenuSelectOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuWidth, setMenuWidth] = useState<number | undefined>();
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const optionsRef = useRef<MenuSelectOption[]>([]);
  const loadOptionsRef = useRef(loadOptions);
  const loadMoreOptionsRef = useRef(loadMoreOptions);

  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;
  optionsRef.current = options;
  loadOptionsRef.current = loadOptions;
  loadMoreOptionsRef.current = loadMoreOptions;

  const displayLabel =
    options.find((option) => option.value === value)?.label ??
    selectedLabel ??
    placeholder;

  // Instant local filter from cached rows while the network catches up.
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const showSkeleton = loading && visibleOptions.length === 0;

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (anchorRef.current) {
      setMenuWidth(anchorRef.current.offsetWidth);
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  // Prefetch first page with the page so dropdowns open instantly.
  // Uses a ref so unstable parent callbacks don't re-fire every render.
  useEffect(() => {
    if (!prefetchOnMount) return;
    if (prefetchKey === null || prefetchKey === "") return;
    const id = ++requestId.current;
    void loadOptionsRef
      .current("")
      .then((raw) => {
        if (id !== requestId.current) return;
        const result = normalizeLoadResult(raw);
        setOptions(result.options);
        setHasMore(Boolean(result.hasMore));
        setError(null);
      })
      .catch(() => {
        // Keep quiet on background prefetch — open will retry with UI feedback.
      });
  }, [prefetchOnMount, prefetchKey]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    const delay = trimmed ? debounceMs : 0;
    const handle = window.setTimeout(() => {
      const id = ++requestId.current;
      const hasCachedEmpty = !trimmed && optionsRef.current.length > 0;
      // Soft-refresh when we already prefetched — avoid "Loading…" flash.
      if (!hasCachedEmpty) {
        setLoading(true);
      }
      setError(null);
      void loadOptionsRef
        .current(trimmed)
        .then((raw) => {
          if (id !== requestId.current) return;
          const result = normalizeLoadResult(raw);
          setOptions(result.options);
          setHasMore(Boolean(result.hasMore));
        })
        .catch((err: unknown) => {
          if (id !== requestId.current) return;
          setError(err instanceof Error ? err.message : "Failed to load");
          if (!hasCachedEmpty) {
            setOptions([]);
            setHasMore(false);
          }
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, delay);
    return () => window.clearTimeout(handle);
  }, [open, query, debounceMs]);

  const fetchMore = () => {
    const loadMore = loadMoreOptionsRef.current;
    if (!loadMore) return;
    if (!hasMoreRef.current || loadingMoreRef.current || loading) return;
    const id = ++requestId.current;
    setLoadingMore(true);
    loadingMoreRef.current = true;
    void loadMore(query.trim())
      .then((raw) => {
        if (id !== requestId.current) return;
        const result = normalizeLoadResult(raw);
        setOptions((prev) =>
          mergeOptions(prev, result.options, result.append !== false),
        );
        setHasMore(Boolean(result.hasMore));
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to load more");
        setHasMore(false);
      })
      .finally(() => {
        if (id === requestId.current) {
          setLoadingMore(false);
          loadingMoreRef.current = false;
        }
      });
  };

  return (
    <div ref={anchorRef} className={cn("tw-relative tw-min-w-0 tw-w-full", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "form-control select2 vonos-menu-select-trigger",
          !value && "vonos-menu-select-placeholder",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-left">
          {displayLabel}
        </span>
        <ChevronDown className="tw-h-4 tw-w-4 tw-shrink-0 tw-opacity-60" />
      </button>

      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        className="tw-rounded-lg tw-border tw-border-solid tw-border-gray-200 tw-bg-white tw-shadow-lg"
      >
        <div
          className="vonos-floating-menu-body"
          style={{ width: menuWidth ? `${menuWidth}px` : "16rem" }}
        >
          <div className="tw-shrink-0 tw-border-b tw-border-solid tw-border-gray-200 tw-p-2.5">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="form-control select2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            className="vonos-floating-menu-list tw-py-1"
            onWheel={(event) => event.stopPropagation()}
            onScroll={() => {
              const el = listRef.current;
              if (!el) return;
              const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
              if (remaining < 48) fetchMore();
            }}
          >
            {showSkeleton ? <MenuListSkeleton rows={5} /> : null}
            {error ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-red-600">
                {error}
              </p>
            ) : !loading && visibleOptions.length === 0 ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-gray-500">
                {emptyMessage}
              </p>
            ) : visibleOptions.length > 0 ? (
              <>
                {loading && query.trim() ? (
                  <p className="tw-px-3.5 tw-py-1 tw-text-[11px] tw-leading-4 tw-text-gray-400">
                    Updating…
                  </p>
                ) : null}
                {visibleOptions.map((option) => (
                  <button
                    key={option.value || "__empty"}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      "tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-border-0 tw-bg-transparent tw-px-3.5 tw-py-2.5 tw-text-left tw-text-sm tw-leading-5 tw-text-gray-900 hover:tw-bg-gray-100",
                      option.value === value && "tw-bg-gray-100 tw-font-medium",
                    )}
                    onClick={() => {
                      onChange(option.value, option);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                {loadingMore ? <MenuListSkeleton rows={2} /> : null}
              </>
            ) : null}
          </div>
        </div>
      </FloatingMenuPanel>
    </div>
  );
}
