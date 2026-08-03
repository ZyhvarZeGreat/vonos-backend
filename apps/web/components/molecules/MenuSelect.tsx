"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { matchSorter, rankings } from "match-sorter";
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
  /** When false, uses a native UPOS select (default). Set true for searchable panels. */
  searchable?: boolean;
}

/**
 * UPOS-aligned select. Non-searchable → native `select.form-control.select2`.
 * Searchable → same chrome, portaled options panel.
 */
export function MenuSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select…",
  className,
  disabled = false,
  searchable = false,
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

  if (!searchable) {
    const hasEmptyOption = options.some((option) => option.value === "");
    return (
      <div className={cn("tw-relative tw-min-w-0 tw-w-full", className)}>
        <select
          id={id}
          className="form-control select2"
          value={value}
          disabled={disabled}
          aria-label={placeholder}
          onChange={(event) => onChange(event.target.value)}
        >
          {!value && !hasEmptyOption ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value || "__empty"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

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
          {selectedLabel}
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
            id={listId}
            role="listbox"
            className="vonos-floating-menu-list tw-py-1"
            onWheel={(event) => event.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <p className="tw-px-3.5 tw-py-2.5 tw-text-sm tw-text-gray-500">
                No options
              </p>
            ) : (
              filtered.map((option) => (
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
