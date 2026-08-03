"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
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
import { cn } from "@/lib/utils/cn";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { parseTenantPath } from "@/lib/utils/tenantRoutes";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { ExportDocumentModal } from "@/components/organisms/ExportDocumentModal";
import {
  ListTableBridgeProvider,
  useListTableBridge,
} from "@/lib/listTableBridge";
import { downloadCsv, downloadExcelCsv } from "@/lib/utils/exportCsv";
import { exportTablePdf } from "@/lib/utils/exportPdf";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/search";
import { toast } from "@/stores/toastStore";

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
  /** UPOS "Show N entries" — wire to server page size when provided */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function ListPageShell(props: ListPageShellProps) {
  const isHq6 = useIsVaHq6();
  return (
    <ListTableBridgeProvider>
      {isHq6 ? (
        <Hq6ListPageShell {...props} />
      ) : (
        <DefaultListPageShell {...props} />
      )}
      <ExportDocumentModal />
    </ListTableBridgeProvider>
  );
}

function slugFilename(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "export"
  );
}

function useListTableActions(activeLabel: string, onExport?: () => void) {
  const bridge = useListTableBridge();
  const api = bridge?.api ?? null;
  const exportFilename = slugFilename(activeLabel);

  const payloadOrFallback = (preferCustom: boolean) => {
    if (preferCustom && onExport) {
      onExport();
      return "custom" as const;
    }
    const payload = api?.getExportPayload(exportFilename);
    if (payload && payload.rows.length > 0) return payload;
    if (onExport) {
      onExport();
      return "custom" as const;
    }
    toast.error("No table data to export on this page.");
    return null;
  };

  const runCsv = () => {
    // Prefer live table rows when present; fall back to page-specific exporters
    // (full-dataset / API) so empty onExport stubs never block CSV.
    const result = payloadOrFallback(false);
    if (!result || result === "custom") return;
    downloadCsv(result);
    toast.success("CSV export started");
  };

  const runExcel = () => {
    const result = payloadOrFallback(false);
    if (!result || result === "custom") return;
    downloadExcelCsv(result);
    toast.success("Excel CSV export started — open in Excel or Sheets");
  };

  const runPdf = () => {
    const result = payloadOrFallback(false);
    if (!result || result === "custom") return;
    try {
      exportTablePdf(result);
      toast.success(
        "PDF export opened — choose Save as PDF in the print dialog",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    }
  };

  const runPrint = () => {
    window.print();
  };

  const bridgeColumns = (api?.getColumns() ?? [])
    .filter((c) => c.hideable)
    .map((c) => ({ key: c.key, label: c.label }));

  return { api, runCsv, runExcel, runPdf, runPrint, bridgeColumns };
}

function useCommittedSearch(
  searchValue: string,
) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  return { localSearch, setLocalSearch };
}

function useDebouncedSearch(
  searchValue: string,
  onSearchChange: ((value: string) => void) | undefined,
  searchDebounceMs: number,
) {
  const { localSearch, setLocalSearch } = useCommittedSearch(searchValue);

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
  searchPlaceholder = "Search by name, reference…",
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
  searchDebounceMs = SEARCH_DEBOUNCE_MS,
  hq6Title,
  hq6Subtitle,
  hq6PageChrome = true,
  hq6Columns = [],
  hq6VisibleColumns,
  onHq6VisibleColumnsChange,
  pageSize = 25,
  onPageSizeChange,
}: ListPageShellProps) {
  const pathname = usePathname();
  const { section } = parseTenantPath(pathname);
  const copy = useMemo(() => hq6CopyForSlug(section), [section]);
  const title = hq6Title ?? copy.title;
  const subtitle = hq6Subtitle ?? copy.subtitle;
  const resolvedSearchPlaceholder =
    searchPlaceholder === "Search ..." || searchPlaceholder === "Search …"
      ? copy.searchPlaceholder
      : searchPlaceholder;
  const { localSearch, setLocalSearch } = useDebouncedSearch(
    searchValue,
    onSearchChange,
    searchDebounceMs,
  );
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnModalKeys, setColumnModalKeys] = useState<string[]>([]);

  const hasFilters =
    showDateRange || filterDropdowns.length > 0 || filterCheckboxes.length > 0;

  const multiTabs = tabs.length > 1;
  const activeLabel =
    tabs.find((t) => t.id === activeTab)?.label ?? tabs[0]?.label ?? "Export";

  const { api, runCsv, runExcel, runPdf, runPrint, bridgeColumns } =
    useListTableActions(activeLabel, onExport);

  const columnOptions =
    hq6Columns.length > 0 ? hq6Columns : bridgeColumns;
  const defaultColumnKeys = useMemo(
    () => columnOptions.map((c) => c.key),
    [columnOptions],
  );

  const openColumnsModal = () => {
    setColumnModalKeys(
      hq6VisibleColumns ?? api?.getVisibleKeys() ?? defaultColumnKeys,
    );
    setColumnsOpen(true);
  };

  const applyColumnVisibility = (keys: string[]) => {
    if (onHq6VisibleColumnsChange) {
      onHq6VisibleColumnsChange(keys);
      return;
    }
    api?.setVisibleKeys(keys);
  };

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
                className="h-4 w-4 rounded border border-[#d1d5db]"
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
              className="form-control select2"
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

  const showToolbar = showImport || showExport || showSearch;

  const box = (
    <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200 min-w-0 overflow-hidden">
      <div className="tw-p-2 sm:tw-p-3">
      {multiTabs ? (
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
          <div className="box-tools">{primaryAction}</div>
        ) : null}
      </div>
      ) : (
      <div className="box-header">
        <h3 className="box-title">{activeLabel}</h3>
        {primaryAction ? (
          <div className="box-tools">{primaryAction}</div>
        ) : null}
      </div>
      )}

      {showToolbar ? (
      <div className="hq6-dt-toolbar">
        {onPageSizeChange ? (
          <label className="hq6-show-entries">
            Show{" "}
            <select
              className="form-control select2"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
            </select>{" "}
            entries
          </label>
        ) : null}
        <div className="hq6-dt-toolbar-actions">
          {showImport && onImport ? (
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
                  "tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2",
                  importDisabled && "pointer-events-none opacity-50",
                )}
              >
                <Download className="h-3.5 w-3.5" />
                Import CSV
              </label>
            </>
          ) : null}
          {showExport ? (
            <>
              <button
                type="button"
                className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
                onClick={runCsv}
              >
                <FileText className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
                onClick={runExcel}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </button>
              <button
                type="button"
                className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
                onClick={() => setPrintOpen(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              {columnOptions.length > 0 ? (
                <button
                  type="button"
                  className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
                  onClick={openColumnsModal}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Column visibility
                </button>
              ) : null}
              <button
                type="button"
                className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
                onClick={runPdf}
              >
                <FileText className="h-3.5 w-3.5" />
                Export PDF
              </button>
            </>
          ) : null}
        </div>
        {showSearch ? (
          <div className="hq6-dt-search">
            <span className="hq6-dt-search-label">Search:</span>
            <input
              type="search"
              placeholder={resolvedSearchPlaceholder}
              title={resolvedSearchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchChange?.(localSearch);
                }
              }}
            />
          </div>
        ) : null}
      </div>
      ) : null}

      <div className={cn("hq6-table-wrap tw-py-2 sm:tw-px-5 overflow-x-auto", contentClassName)}>{children}</div>
      </div>
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
        <Hq6PrintModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          onPrint={runPrint}
        />
        {columnOptions.length > 0 ? (
          <Hq6ColumnVisibilityModal
            open={columnsOpen}
            onClose={() => setColumnsOpen(false)}
            columns={columnOptions}
            visibleKeys={columnModalKeys}
            onChange={applyColumnVisibility}
            onReset={() => {
              if (onHq6VisibleColumnsChange) {
                onHq6VisibleColumnsChange(defaultColumnKeys);
                setColumnModalKeys(defaultColumnKeys);
                return;
              }
              api?.resetVisibleKeys();
              setColumnModalKeys(defaultColumnKeys);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <Hq6PageFrame title={title} subtitle={subtitle} filters={filters}>
      {box}
      <Hq6PrintModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        onPrint={runPrint}
      />
      {columnOptions.length > 0 ? (
        <Hq6ColumnVisibilityModal
          open={columnsOpen}
          onClose={() => setColumnsOpen(false)}
          columns={columnOptions}
          visibleKeys={columnModalKeys}
          onChange={applyColumnVisibility}
          onReset={() => {
            if (onHq6VisibleColumnsChange) {
              onHq6VisibleColumnsChange(defaultColumnKeys);
              setColumnModalKeys(defaultColumnKeys);
              return;
            }
            api?.resetVisibleKeys();
            setColumnModalKeys(defaultColumnKeys);
          }}
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
  searchDebounceMs = SEARCH_DEBOUNCE_MS,
  hq6Columns = [],
  hq6VisibleColumns,
  onHq6VisibleColumnsChange,
}: ListPageShellProps) {
  const { localSearch, setLocalSearch } = useDebouncedSearch(
    searchValue,
    onSearchChange,
    searchDebounceMs,
  );
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnModalKeys, setColumnModalKeys] = useState<string[]>([]);
  const activeLabel =
    tabs.find((t) => t.id === activeTab)?.label ?? tabs[0]?.label ?? "Export";
  const { api, runCsv, runExcel, runPdf, runPrint, bridgeColumns } =
    useListTableActions(activeLabel, onExport);

  const columnOptions =
    hq6Columns.length > 0 ? hq6Columns : bridgeColumns;
  const defaultColumnKeys = useMemo(
    () => columnOptions.map((c) => c.key),
    [columnOptions],
  );

  const openColumnsModal = () => {
    setColumnModalKeys(
      hq6VisibleColumns ?? api?.getVisibleKeys() ?? defaultColumnKeys,
    );
    setColumnsOpen(true);
  };

  const applyColumnVisibility = (keys: string[]) => {
    if (onHq6VisibleColumnsChange) {
      onHq6VisibleColumnsChange(keys);
      return;
    }
    api?.setVisibleKeys(keys);
  };

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
          {showImport && onImport ? (
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
          ) : null}
          {showExport ? (
            <>
              <button
                type="button"
                onClick={runCsv}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
              >
                <FileText className="h-4 w-4 text-muted" />
                CSV
              </button>
              <button
                type="button"
                onClick={runExcel}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
              >
                <FileSpreadsheet className="h-4 w-4 text-muted" />
                Excel
              </button>
              <button
                type="button"
                onClick={runPrint}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
              >
                <Printer className="h-4 w-4 text-muted" />
                Print
              </button>
              {columnOptions.length > 0 ? (
                <button
                  type="button"
                  onClick={openColumnsModal}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
                >
                  <Columns3 className="h-4 w-4 text-muted" />
                  Columns
                </button>
              ) : null}
              <button
                type="button"
                onClick={runPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
              >
                <Upload className="h-4 w-4 text-muted" />
                PDF
              </button>
            </>
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
                    className="rounded border border-border"
                  />
                  {box.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showSearch ? (
            <div className="flex h-9 w-full items-stretch overflow-hidden rounded-lg border border-border bg-card md:w-auto md:min-w-[16rem]">
              <div className="relative flex min-w-0 flex-1 items-center px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted" />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSearchChange?.(localSearch);
                    }
                  }}
                  className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {contentClassName ? (
        <div className={contentClassName}>{children}</div>
      ) : (
        children
      )}

      {columnOptions.length > 0 ? (
        <Hq6ColumnVisibilityModal
          open={columnsOpen}
          onClose={() => setColumnsOpen(false)}
          columns={columnOptions}
          visibleKeys={columnModalKeys}
          onChange={applyColumnVisibility}
          onReset={() => {
            if (onHq6VisibleColumnsChange) {
              onHq6VisibleColumnsChange(defaultColumnKeys);
              setColumnModalKeys(defaultColumnKeys);
              return;
            }
            api?.resetVisibleKeys();
            setColumnModalKeys(defaultColumnKeys);
          }}
        />
      ) : null}
    </div>
  );
}
