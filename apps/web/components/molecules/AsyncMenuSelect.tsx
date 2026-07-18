"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import type { MenuSelectOption } from "@/components/molecules/MenuSelect";
import { cn } from "@/lib/utils/cn";

export interface AsyncMenuSelectProps {
  id?: string;
  value: string;
  /** Label shown when the selected value is not in the current result set. */
  selectedLabel?: string;
  onChange: (value: string) => void;
  /** Server search — called with debounced query (empty = initial open). */
  loadOptions: (query: string) => Promise<MenuSelectOption[]>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
  emptyMessage?: string;
}

/**
 * Searchable select that loads options from the server as the user types.
 * Prefer this over prefetching large catalogs into MenuSelect.
 */
export function AsyncMenuSelect({
  id,
  value,
  selectedLabel,
  onChange,
  loadOptions,
  placeholder = "Select…",
  className,
  disabled = false,
  debounceMs = 300,
  emptyMessage = "No matches",
}: AsyncMenuSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<MenuSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuWidth, setMenuWidth] = useState<number | undefined>();
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const displayLabel =
    options.find((option) => option.value === value)?.label ??
    selectedLabel ??
    placeholder;

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

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      void loadOptions(query.trim())
        .then((rows) => {
          if (id !== requestId.current) return;
          setOptions(rows);
        })
        .catch((err: unknown) => {
          if (id !== requestId.current) return;
          setError(err instanceof Error ? err.message : "Failed to load");
          setOptions([]);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [open, query, loadOptions, debounceMs]);

  return (
    <div ref={anchorRef} className={cn("relative w-full", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm text-foreground",
          "hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60",
          !value && "text-muted",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        className="overflow-hidden rounded-lg border border-border bg-card shadow-lg"
      >
        <div
          className="flex min-h-0 max-h-full flex-col"
          style={{ width: menuWidth ? `${menuWidth}px` : "16rem" }}
        >
          <div className="shrink-0 border-b border-border p-2">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-brand"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          <div
            id={listId}
            role="listbox"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-0.5"
            onWheel={(event) => event.stopPropagation()}
          >
            {loading ? (
              <p className="px-2.5 py-2 text-xs text-muted">Searching…</p>
            ) : error ? (
              <p className="px-2.5 py-2 text-xs text-error">{error}</p>
            ) : options.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted">{emptyMessage}</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.value || "__empty"}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "flex w-full px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-[var(--color-surface-muted)]",
                    option.value === value && "bg-[var(--color-surface-muted)]",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      </FloatingMenuPanel>
    </div>
  );
}
