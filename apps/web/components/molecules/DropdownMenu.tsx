"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { matchSorter, rankings } from "match-sorter";
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
    const q = query.trim();
    if (!q) return options;
    return matchSorter(options, q, {
      keys: ["label"],
      threshold: rankings.CONTAINS,
    });
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
    <div ref={anchorRef} className={cn("tw-relative tw-inline-block", className)}>
      <div onClick={() => setOpen((current) => !current)}>{trigger}</div>
      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        align={align}
        className="tw-min-w-[15rem] tw-rounded-lg tw-border tw-border-solid tw-border-gray-200 tw-bg-white tw-shadow-lg"
      >
        <div className="vonos-floating-menu-body">
          {searchable ? (
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
          ) : null}
          <div
            className="vonos-floating-menu-list tw-py-1"
            onWheel={(event) => event.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-gray-500">
                No matches
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value || "__empty"}
                  type="button"
                  className={cn(
                    "tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-border-0 tw-bg-transparent tw-px-3.5 tw-py-2.5 tw-text-left tw-text-sm tw-leading-5 tw-text-gray-900 hover:tw-bg-gray-100",
                    value === option.value && "tw-bg-gray-100 tw-font-medium",
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
