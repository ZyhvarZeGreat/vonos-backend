"use client";

import { ChevronDown, Download, Search, Upload } from "lucide-react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import type { DateRangePreset } from "@/stores/uiStore";
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

export interface ListPageShellProps {
  tabs: ListTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showImport?: boolean;
  showExport?: boolean;
  showDateRange?: boolean;
  dateRange?: DateRangePreset;
  onDateRangeChange?: (preset: DateRangePreset) => void;
  filterDropdowns?: ListFilterDropdown[];
  onExport?: () => void;
  children: React.ReactNode;
  className?: string;
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
  showDateRange = true,
  dateRange,
  onDateRangeChange,
  filterDropdowns = [],
  onExport,
  children,
  className,
}: ListPageShellProps) {
  const openExportModal = useUiStore((state) => state.openExportModal);

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
            <button
              type="button"
              disabled
              title="CSV import requires a backend upload endpoint (not yet available)"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted opacity-60 shadow-sm"
            >
              <Download className="h-4 w-4 text-muted" />
              Import CSV
            </button>
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
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {showDateRange ? (
            <DateRangeDropdown value={dateRange} onChange={onDateRangeChange} />
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-border bg-card px-3 md:w-64">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
