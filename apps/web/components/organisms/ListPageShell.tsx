"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  CloudDownload,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Upload,
} from "lucide-react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import type { DateRangePreset, CustomDateRange } from "@/stores/uiStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { parseTenantPath } from "@/lib/utils/tenantRoutes";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";

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
  contentClassName?: string;
  onExport?: () => void;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  searchDebounceMs?: number;
  /** Override HQ6 page title (VA). Defaults from route slug. */
  hq6Title?: string;
  hq6Subtitle?: string;
  /**
   * When false on VA, skip outer page header/footer (use inside pages that
   * already provide their own title, e.g. Finance tabs).
   */
  hq6PageChrome?: boolean;
  /** Column keys for HQ6 Column visibility modal */
  hq6Columns?: { key: string; label: string }[];
  hq6VisibleColumns?: string[];
  onHq6VisibleColumnsChange?: (keys: string[]) => void;
}

export function ListPageShell(props: ListPageShellProps) {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6ListPageShell {...props} />;
  return <DefaultListPageShell {...props} />;
}

function useDebouncedSearch(
  searchValue: string,
  onSearchChange: ((value: string) => void) | undefined,
  searchDebounceMs: number,
) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localSearch !== searchValue) onSearchChange?.(localSearch);
    }, searchDebounceMs);
    return () => window.clearTimeout(timer);
  }, [localSearch, onSearchChange, searchDebounceMs, searchValue]);

  return { localSearch, setLocalSearch };
}

function Hq6ListPageShell({
  tabs,
  activeTab,
  onTabChange,
  searchPlaceholder = "Search ...",
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
  contentClassName,
  searchDebounceMs = 300,
  hq6Title,
  hq6Subtitle,
  hq6PageChrome = true,
  hq6Columns = [],
  hq6VisibleColumns,
  onHq6VisibleColumnsChange,
}: ListPageShellProps) {
  const openExportModal = useUiStore((state) => state.openExportModal);
  const pathname = usePathname();
  const { section } = parseTenantPath(pathname);
  const copy = useMemo(() => hq6CopyForSlug(section), [section]);
  const title = hq6Title ?? copy.title;
  const subtitle = hq6Subtitle ?? copy.subtitle;
  const { localSearch, setLocalSearch } = useDebouncedSearch(
    searchValue,
    onSearchChange,
    searchDebounceMs,
  );
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const defaultColumnKeys = useMemo(
    () => hq6Columns.map((c) => c.key),
    [hq6Columns],
  );
  const visibleKeys = hq6VisibleColumns ?? defaultColumnKeys;

  const hasFilters =
    showDateRange || filterDropdowns.length > 0 || filterCheckboxes.length > 0;

  const filters = hasFilters ? (
    <div className="space-y-4">
      {filterCheckboxes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {filterCheckboxes.map((box) => (
            <label
              key={box.id}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#374151]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#d1d5db]"
                checked={box.checked}
                onChange={(e) => box.onChange(e.target.checked)}
              />
              {box.label}
            </label>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showDateRange ? (
          <div className="hq6-field">
            <span>Date Range:</span>
            <DateRangeDropdown
              value={dateRange}
              onChange={onDateRangeChange}
              customValue={customDateRange}
              onCustomChange={onCustomDateRangeChange}
            />
          </div>
        ) : null}
        {filterDropdowns.map((filter) => (
          <label key={filter.id} className="hq6-field">
            <span>{filter.label.replace(/:$/, "")}:</span>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              <option value="">All</option>
              {filter.options
                .filter((o) => o.value !== "")
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  ) : undefined;

  const box = (
    <div className="hq6-card hq6-products-box overflow-hidden">
      <div className="hq6-tab-row">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "hq6-tab",
                activeTab === tab.id && "hq6-tab-active",
              )}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {primaryAction ? (
          <div className="flex shrink-0 items-center gap-2 px-3 py-2">
            {primaryAction}
          </div>
        ) : null}
      </div>

      <div className="hq6-dt-toolbar">
        <label className="hq6-show-entries">
          Show{" "}
          <select defaultValue={25}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>{" "}
          entries
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {showImport ? (
            onImport ? (
              <>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="hq6-list-import"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onImport(file);
                    event.target.value = "";
                  }}
                />
                <label
                  htmlFor="hq6-list-import"
                  className={cn(
                    "hq6-btn hq6-btn-outline",
                    importDisabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  Import CSV
                </label>
              </>
            ) : (
              <button type="button" className="hq6-btn hq6-btn-outline" disabled>
                <Download className="h-3.5 w-3.5" />
                Import CSV
              </button>
            )
          ) : null}
          {showExport ? (
            <>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={onExport ?? (() => openExportModal())}
              >
                <FileText className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={onExport ?? (() => openExportModal())}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={() => setColumnsOpen(true)}
                disabled={hq6Columns.length === 0}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Column visibility
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-blue"
                onClick={onExport ?? (() => openExportModal())}
              >
                <CloudDownload className="h-3.5 w-3.5" />
                Download Excel
              </button>
            </>
          ) : null}
        </div>
        {showSearch ? (
          <label className="hq6-search ml-auto">
            <span className="sr-only">Search</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      <div className={cn("hq6-table-wrap", contentClassName)}>{children}</div>
    </div>
  );

  if (!hq6PageChrome) {
    return (
      <div className="space-y-4">
        {filters ? (
          <div className="hq6-card hq6-filters-card">
            <div className="hq6-filters-body">{filters}</div>
          </div>
        ) : null}
        {box}
        <Hq6PrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
        {hq6Columns.length > 0 ? (
          <Hq6ColumnVisibilityModal
            open={columnsOpen}
            onClose={() => setColumnsOpen(false)}
            columns={hq6Columns}
            visibleKeys={visibleKeys}
            onChange={(keys) => onHq6VisibleColumnsChange?.(keys)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <Hq6PageFrame title={title} subtitle={subtitle} filters={filters}>
      {box}
      <Hq6PrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
      {hq6Columns.length > 0 ? (
        <Hq6ColumnVisibilityModal
          open={columnsOpen}
          onClose={() => setColumnsOpen(false)}
          columns={hq6Columns}
          visibleKeys={visibleKeys}
          onChange={(keys) => onHq6VisibleColumnsChange?.(keys)}
        />
      ) : null}
    </Hq6PageFrame>
  );
}

function DefaultListPageShell({
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
  const { localSearch, setLocalSearch } = useDebouncedSearch(
    searchValue,
    onSearchChange,
    searchDebounceMs,
  );

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
