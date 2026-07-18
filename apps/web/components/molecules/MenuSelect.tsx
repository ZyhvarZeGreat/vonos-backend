"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import { cn } from "@/lib/utils/cn";

export interface MenuSelectOption {
  value: string;
  label: string;
}

export interface MenuSelectProps {
  id?: string;
  value: string;
  options: MenuSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** When false, hides the search field (default true). */
  searchable?: boolean;
}

/** Select-like control with options that scroll inside the panel, not the page. */
export function MenuSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select…",
  className,
  disabled = false,
  searchable = true,
}: MenuSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuWidth, setMenuWidth] = useState<number | undefined>();
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

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
        <span className="truncate">{selectedLabel}</span>
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
          {searchable ? (
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
          ) : null}
          <div
            id={listId}
            role="listbox"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-0.5"
            onWheel={(event) => event.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted">No options</p>
            ) : (
              filtered.map((option) => (
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
