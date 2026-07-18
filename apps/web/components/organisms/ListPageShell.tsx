"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Download, Search, Upload } from "lucide-react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import type { DateRangePreset, CustomDateRange } from "@/stores/uiStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

export interface ListTab {
  id: string;
  label: string;
}

export interface ListFilterDropdown {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export interface ListFilterCheckbox {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface ListPageShellProps {
  tabs: ListTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showImport?: boolean;
  showExport?: boolean;
  /** When set, enables the Import CSV toolbar button and invokes this handler with the selected file. */
  onImport?: (file: File) => void | Promise<void>;
  importDisabled?: boolean;
  showDateRange?: boolean;
  showSearch?: boolean;
  dateRange?: DateRangePreset;
  onDateRangeChange?: (preset: DateRangePreset) => void;
  customDateRange?: CustomDateRange | null;
  onCustomDateRangeChange?: (range: CustomDateRange | null) => void;
  filterDropdowns?: ListFilterDropdown[];
  filterCheckboxes?: ListFilterCheckbox[];
  /** Extra classes for the content area below the toolbar (e.g. report body padding). */
  contentClassName?: string;
  onExport?: () => void;
  /** Primary action rendered in the table toolbar (e.g. "Add Customer"). */
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  searchDebounceMs?: number;
}

export function ListPageShell({
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = "Search",
  searchValue = "",
  onSearchChange,
  showImport = true,
  showExport = true,
  onImport,
  importDisabled = false,
  showDateRange = true,
  showSearch = true,
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
  filterDropdowns = [],
  filterCheckboxes = [],
  onExport,
  primaryAction,
  children,
  className,
  contentClassName,
  searchDebounceMs = 300,
}: ListPageShellProps) {
  const openExportModal = useUiStore((state) => state.openExportModal);
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange?.(localSearch);
      }
    }, searchDebounceMs);
    return () => window.clearTimeout(timer);
  }, [localSearch, onSearchChange, searchDebounceMs, searchValue]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 pt-4">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative top-px shrink-0 whitespace-nowrap pb-4 text-sm transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-3 pb-3 md:flex">
          {showImport ? (
            onImport ? (
              <>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="list-page-shell-import"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onImport(file);
                    event.target.value = "";
                  }}
                />
                <label
                  htmlFor="list-page-shell-import"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-sm",
                    importDisabled
                      ? "cursor-not-allowed text-muted opacity-60"
                      : "cursor-pointer text-foreground hover:bg-[var(--color-surface-muted)]",
                  )}
                >
                  <Download className="h-4 w-4 text-muted" />
                  Import CSV
                </label>
              </>
            ) : (
              <button
                type="button"
                disabled
                title="CSV import requires a backend upload endpoint (not yet available)"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted opacity-60 shadow-sm"
              >
                <Download className="h-4 w-4 text-muted" />
                Import CSV
              </button>
            )
          ) : null}
          {showExport ? (
            <button
              type="button"
              onClick={onExport ?? (() => openExportModal())}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
            >
              <Upload className="h-4 w-4 text-muted" />
              Export
            </button>
          ) : null}
          {primaryAction}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {showDateRange ? (
            <DateRangeDropdown
              value={dateRange}
              onChange={onDateRangeChange}
              customValue={customDateRange}
              onCustomChange={onCustomDateRangeChange}
            />
          ) : null}
          {filterDropdowns.map((filter) => (
            <DropdownMenu
              key={filter.id}
              value={filter.value}
              options={[{ value: "", label: `All ${filter.label}` }, ...filter.options]}
              onSelect={filter.onChange}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-[var(--color-text-secondary)] shadow-sm hover:bg-[var(--color-surface-muted)]"
                >
                  {filter.value
                    ? (filter.options.find((o) => o.value === filter.value)?.label ??
                      filter.label)
                    : filter.label}
                  <ChevronDown className="h-4 w-4 text-muted" />
                </button>
              }
            />
          ))}
          {filterCheckboxes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              {filterCheckboxes.map((box) => (
                <label
                  key={box.id}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={box.checked}
                    onChange={(e) => box.onChange(e.target.checked)}
                    className="rounded border-border"
                  />
                  {box.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showSearch ? (
            <div className="relative flex h-9 w-full items-center rounded-lg border border-border bg-card px-3 md:w-64">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>
          ) : null}
        </div>
      </div>

      {contentClassName ? (
        <div className={contentClassName}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
