"use client";

import type { ReactNode } from "react";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500, 1000, -1] as const;

export interface UposDataTablesShellProps {
  tableId?: string;
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
  hideExports?: boolean;
  /** Native <table>…</table> (thead/tbody/tfoot). */
  children: ReactNode;
  /** Optional bulk-action row rendered under the table (UPOS tfoot pattern). */
  bulkActions?: ReactNode;
  pageIndex: number;
  itemCount: number;
  totalItems?: number;
  hasMore?: boolean;
  canGoPrev?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onPageSelect?: (index: number) => void;
  canSelectPage?: (index: number) => boolean;
  isBusy?: boolean;
  className?: string;
  /** Hide info + paginate footer (toolbar-only chrome). */
  showPagination?: boolean;
}

function pageWindow(
  pageIndex: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set<number>([0, totalPages - 1, pageIndex]);
  for (let i = pageIndex - 1; i <= pageIndex + 1; i++) {
    if (i > 0 && i < totalPages - 1) pages.add(i);
  }
  if (pageIndex < 3) {
    pages.add(1);
    pages.add(2);
    pages.add(3);
  }
  if (pageIndex > totalPages - 4) {
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
    pages.add(totalPages - 4);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev = -2;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * Ultimate POS DataTables chrome — converted from live HQ6 product_table wrapper.
 * Markup mirrors: length | dt-buttons | filter | table | info | paginate.
 */
export function UposDataTablesShell({
  tableId = "upos_table",
  pageSize,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  onSearchCommit,
  searchPlaceholder = "Search ...",
  onExportCsv,
  onExportExcel,
  onPrint,
  onColumnVisibility,
  onExportPdf,
  hideExports = false,
  children,
  bulkActions,
  pageIndex,
  itemCount,
  totalItems,
  hasMore,
  canGoPrev,
  onPrev,
  onNext,
  onPageSelect,
  canSelectPage,
  isBusy,
  className,
  showPagination = true,
}: UposDataTablesShellProps) {
  const from = itemCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = pageIndex * pageSize + itemCount;
  const total = totalItems ?? (hasMore ? undefined : to);
  const infoText =
    total != null
      ? `Showing ${from} to ${to} of ${total.toLocaleString()} entries`
      : itemCount === 0
        ? "Showing 0 to 0 of 0 entries"
        : `Showing ${from} to ${to} entries`;

  const totalPages =
    total != null && pageSize > 0
      ? Math.max(total === 0 ? 1 : 1, Math.ceil(total / pageSize))
      : Math.max(1, pageIndex + 1 + (hasMore ? 1 : 0));

  const exportButtons: Array<{
    key: string;
    className: string;
    icon: string;
    label: string;
    onClick?: () => void;
  }> = hideExports
    ? []
    : [
        {
          key: "csv",
          className: "buttons-csv buttons-html5",
          icon: "fa fa-file-csv",
          label: "Export CSV",
          onClick: onExportCsv,
        },
        {
          key: "excel",
          className: "buttons-excel buttons-html5",
          icon: "fa fa-file-excel",
          label: "Export Excel",
          onClick: onExportExcel,
        },
        {
          key: "print",
          className: "buttons-print",
          icon: "fa fa-print",
          label: "Print",
          onClick: onPrint,
        },
        {
          key: "colvis",
          className: "buttons-collection buttons-colvis",
          icon: "fa fa-columns",
          label: "Column visibility",
          onClick: onColumnVisibility,
        },
        {
          key: "pdf",
          className: "buttons-pdf buttons-html5",
          icon: "fa fa-file-pdf",
          label: "Export PDF",
          onClick: onExportPdf,
        },
      ];

  return (
    <div
      id={`${tableId}_wrapper`}
      className={cn("dataTables_wrapper form-inline dt-bootstrap", className)}
    >
      {/* HQ6 users_table: row margin-bottom-20 text-center → col-sm-1 | col-sm-8 | col-sm-3 */}
      <div className="row margin-bottom-20 text-center">
        <div className="col-sm-1">
          <div className="dataTables_length" id={`${tableId}_length`}>
            <label>
              Show{" "}
              <select
                name={`${tableId}_length`}
                aria-controls={tableId}
                className="form-control input-sm"
                value={pageSize}
                disabled={isBusy}
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
          </div>
        </div>
        <div className="col-sm-8">
          {exportButtons.length > 0 ? (
            <div className="dt-buttons btn-group">
              {exportButtons.map((btn) => (
                <a
                  key={btn.key}
                  className={cn(
                    btn.className,
                    "tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2",
                  )}
                  tabIndex={0}
                  aria-controls={tableId}
                  href="#"
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    btn.onClick?.();
                  }}
                >
                  <span>
                    <i className={btn.icon} aria-hidden /> {btn.label}
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className="col-sm-3">
          <Hq6DtSearchFilter
            id={`${tableId}_filter`}
            ariaControls={tableId}
            value={searchValue}
            onChange={onSearchChange}
            onCommit={() => {
              if (onSearchCommit) onSearchCommit();
              else onSearchChange(searchValue.trim());
            }}
            placeholder={searchPlaceholder}
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="dataTables_scrollBody hq6-dt-scroll" style={{ width: "100%" }}>
        {children}
      </div>

      {bulkActions}

      {showPagination ? (
      <div className="row">
        <div className="col-sm-5">
          <div
            className="dataTables_info"
            id={`${tableId}_info`}
            role="status"
            aria-live="polite"
          >
            {infoText}
          </div>
        </div>
        <div className="col-sm-7">
          <div
            className="dataTables_paginate paging_simple_numbers"
            id={`${tableId}_paginate`}
          >
            <ul className="pagination">
              <li
                className={cn(
                  "paginate_button previous",
                  (!canGoPrev || isBusy) && "disabled",
                )}
                id={`${tableId}_previous`}
              >
                <a
                  href="#"
                  aria-controls={tableId}
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    if (canGoPrev && !isBusy) onPrev?.();
                  }}
                >
                  Previous
                </a>
              </li>
              {pageWindow(pageIndex, totalPages).map((entry, idx) =>
                entry === "ellipsis" ? (
                  <li key={`e-${idx}`} className="paginate_button disabled">
                    <a href="#" tabIndex={-1} onClick={(e) => e.preventDefault()}>
                      …
                    </a>
                  </li>
                ) : (
                  <li
                    key={entry}
                    className={cn(
                      "paginate_button",
                      entry === pageIndex && "active",
                      isBusy && "disabled",
                    )}
                  >
                    <a
                      href="#"
                      aria-controls={tableId}
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        if (isBusy || entry === pageIndex) return;
                        if (canSelectPage && !canSelectPage(entry)) return;
                        onPageSelect?.(entry);
                      }}
                    >
                      {entry + 1}
                    </a>
                  </li>
                ),
              )}
              <li
                className={cn(
                  "paginate_button next",
                  (!(hasMore ?? pageIndex + 1 < totalPages) || isBusy) &&
                    "disabled",
                )}
                id={`${tableId}_next`}
              >
                <a
                  href="#"
                  aria-controls={tableId}
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    if ((hasMore ?? pageIndex + 1 < totalPages) && !isBusy) {
                      onNext?.();
                    }
                  }}
                >
                  Next
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
