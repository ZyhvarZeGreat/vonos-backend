"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import { cn } from "@/lib/utils/cn";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  align?: "start" | "end";
  className?: string;
  /** When false, hides the search field (default true). */
  searchable?: boolean;
}

export function DropdownMenu({
  trigger,
  options,
  value,
  onSelect,
  align = "start",
  className,
  searchable = true,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div ref={anchorRef} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((current) => !current)}>{trigger}</div>
      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        align={align}
        className="min-w-[12rem] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
      >
        <div className="flex min-h-0 max-h-full flex-col">
          {searchable ? (
            <div className="shrink-0 border-b border-border p-2">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-0.5"
            onWheel={(event) => event.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted">No matches</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value || "__empty"}
                  type="button"
                  className={cn(
                    "flex w-full px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-[var(--color-surface-muted)]",
                    value === option.value && "bg-[var(--color-surface-muted)]",
                  )}
                  onClick={() => {
                    onSelect(option.value);
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
