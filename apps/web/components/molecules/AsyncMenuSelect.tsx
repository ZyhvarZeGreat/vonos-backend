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
 * Chrome matches UPOS `select.form-control.select2`.
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
        className="tw-overflow-hidden tw-rounded-lg tw-border tw-border-solid tw-border-gray-200 tw-bg-white tw-shadow-lg"
      >
        <div
          className="tw-flex tw-max-h-[min(20rem,var(--vonos-floating-max-h,20rem))] tw-flex-col"
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
            id={listId}
            role="listbox"
            className="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-overscroll-contain tw-py-1"
            onWheel={(event) => event.stopPropagation()}
          >
            {loading ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-gray-500">
                Searching…
              </p>
            ) : error ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-red-600">
                {error}
              </p>
            ) : options.length === 0 ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-gray-500">
                {emptyMessage}
              </p>
            ) : (
              options.map((option) => (
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
