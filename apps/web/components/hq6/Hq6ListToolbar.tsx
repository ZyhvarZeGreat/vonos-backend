"use client";

import {
  Columns3,
  FileSpreadsheet,
  FileText,
  Printer,
  Rows2,
  Rows3,
  Rows4,
} from "lucide-react";
import type { TableDensity } from "@/lib/utils/tableColumnAlign";
import { cn } from "@/lib/utils/cn";

export interface Hq6ListToolbarProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchCommit?: () => void;
  searchPlaceholder?: string;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  onColumnVisibility?: () => void;
  onExportPdf?: () => void;
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500, 1000, -1] as const;

/** DataTables-style toolbar — Show | exports | Search (ui-audit/01_users). */
export function Hq6ListToolbar({
  pageSize,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  onSearchCommit,
  searchPlaceholder,
  onExportCsv,
  onExportExcel,
  onPrint,
  onColumnVisibility,
  onExportPdf,
  density,
  onDensityChange,
}: Hq6ListToolbarProps) {
  const commit = () => onSearchCommit?.();

  return (
    <div className="hq6-dt-toolbar">
      <label className="hq6-show-entries">
        Show{" "}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === -1 ? "All" : n.toLocaleString()}
            </option>
          ))}
        </select>{" "}
        entries
      </label>

      <div className="hq6-dt-toolbar-actions">
        {onDensityChange && density ? (
          <div
            className="inline-flex items-center rounded border border-[var(--hq6-border)] bg-white p-0.5"
            role="group"
            aria-label="Row density"
          >
            {(
              [
                ["condensed", Rows4, "Condensed"],
                ["regular", Rows3, "Regular"],
                ["relaxed", Rows2, "Relaxed"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={density === value}
                className={cn(
                  "rounded px-1.5 py-1 text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]",
                  density === value && "bg-[#f3f4f6] text-[#111827]",
                )}
                onClick={() => onDensityChange(value)}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ) : null}
        {onExportCsv ? (
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
            onClick={onExportCsv}
          >
            <FileText className="h-3.5 w-3.5" />
            Export CSV
          </button>
        ) : null}
        {onExportExcel ? (
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
            onClick={onExportExcel}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </button>
        ) : null}
        {onPrint ? (
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
            onClick={onPrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        ) : null}
        {onColumnVisibility ? (
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
            onClick={onColumnVisibility}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Column visibility
          </button>
        ) : null}
        {onExportPdf ? (
          <button
            type="button"
            className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-my-2"
            onClick={onExportPdf}
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
        ) : null}
      </div>

      <div className="hq6-dt-search">
        <span className="hq6-dt-search-label">Search:</span>
        <input
          type="search"
          value={searchValue}
          onChange={(e) => {
            onSearchChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={searchPlaceholder}
          title={searchPlaceholder}
        />
        <button
          type="button"
          className="hq6-search-btn"
          aria-label="Search"
          onClick={commit}
        >
          Search
        </button>
      </div>
    </div>
  );
}
