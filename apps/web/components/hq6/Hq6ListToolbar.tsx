"use client";

import {
  Columns3,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";

export interface Hq6ListToolbarProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchCommit?: () => void;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
  onColumnVisibility?: () => void;
  onExportPdf?: () => void;
}

/** DataTables-style toolbar — ui-audit list pages (products, sales, purchases, etc.). */
export function Hq6ListToolbar({
  pageSize,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  onSearchCommit,
  onExportCsv,
  onExportExcel,
  onPrint,
  onColumnVisibility,
  onExportPdf,
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
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>{" "}
        entries
      </label>

      <div className="flex flex-wrap items-center gap-1.5">
        {onExportCsv ? (
          <button type="button" className="hq6-btn hq6-btn-outline" onClick={onExportCsv}>
            <FileText className="h-3.5 w-3.5" />
            Export CSV
          </button>
        ) : null}
        {onExportExcel ? (
          <button type="button" className="hq6-btn hq6-btn-outline" onClick={onExportExcel}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </button>
        ) : null}
        {onPrint ? (
          <button type="button" className="hq6-btn hq6-btn-outline" onClick={onPrint}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        ) : null}
        {onColumnVisibility ? (
          <button
            type="button"
            className="hq6-btn hq6-btn-outline"
            onClick={onColumnVisibility}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Column visibility
          </button>
        ) : null}
        {onExportPdf ? (
          <button type="button" className="hq6-btn hq6-btn-outline" onClick={onExportPdf}>
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
        ) : null}
      </div>

      <label className="hq6-search ml-auto">
        <span className="sr-only">Search</span>
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          onBlur={commit}
          placeholder="Search ..."
        />
      </label>
    </div>
  );
}
