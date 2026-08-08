"use client";

import type { ReactNode } from "react";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import { cn } from "@/lib/utils/cn";
import {
  formatListEntriesLabel,
  listEntryRange,
  slidingPageIndices,
  totalPagesFromEntries,
} from "@/lib/utils/paginationWindow";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500, 1000] as const;

/** "All" in the length menu — capped so Prisma `take` stays valid (never -1). */
export const UPOS_PAGE_SIZE_ALL = 1000;

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
  /** Search debounce/fetch in progress — spinner in filter + Processing overlay. */
  isSearching?: boolean;
  className?: string;
  /** Hide info + paginate footer (toolbar-only chrome). */
  showPagination?: boolean;
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
  isSearching,
  className,
  showPagination = true,
}: UposDataTablesShellProps) {
  const range = listEntryRange({
    pageIndex,
    pageSize,
    itemCount,
    totalCount: totalItems,
  });
  const { from, to, total } = range;
  const tableBusy = Boolean(isBusy || isSearching);
  const infoText =
    isSearching
      ? "Searching…"
      : itemCount === 0 && isBusy
        ? "Loading…"
        : total != null
          ? formatListEntriesLabel({ from, to, total })
          : formatListEntriesLabel({ from, to, total: undefined });

  const totalPages =
    totalPagesFromEntries(totalItems ?? total, pageSize) ??
    Math.max(1, pageIndex + 1 + (hasMore ? 1 : 0));

  const pageIndices = slidingPageIndices(pageIndex, {
    totalPages,
    hasMore: totalItems == null ? Boolean(hasMore) : false,
    maxButtons: 5,
  });

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
                value={
                  PAGE_SIZE_OPTIONS.includes(
                    pageSize as (typeof PAGE_SIZE_OPTIONS)[number],
                  )
                    ? pageSize
                    : pageSize >= UPOS_PAGE_SIZE_ALL
                      ? UPOS_PAGE_SIZE_ALL
                      : PAGE_SIZE_OPTIONS[0]
                }
                disabled={false}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onPageSizeChange(
                    Number.isFinite(next) && next > 0 ? next : UPOS_PAGE_SIZE_ALL,
                  );
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n === UPOS_PAGE_SIZE_ALL ? "All" : n.toLocaleString()}
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
            isSearching={isSearching}
          />
        </div>
      </div>

      <div
        className={cn(
          "dataTables_scrollBody hq6-dt-scroll",
          tableBusy && "hq6-dt-scroll--busy",
        )}
        style={{ width: "100%", position: "relative" }}
      >
        {tableBusy ? (
          <div
            id={`${tableId}_processing`}
            className="dataTables_processing panel panel-default"
            role="status"
            aria-live="polite"
          >
            {isSearching ? "Searching…" : "Processing…"}
          </div>
        ) : null}
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
                  (!canGoPrev || tableBusy) && "disabled",
                )}
                id={`${tableId}_previous`}
              >
                <a
                  href="#"
                  aria-controls={tableId}
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    if (canGoPrev && !tableBusy) onPrev?.();
                  }}
                >
                  Previous
                </a>
              </li>
              {pageIndices.map((entry) => (
                  <li
                    key={entry}
                    className={cn(
                      "paginate_button",
                      entry === pageIndex && "active",
                      tableBusy && "disabled",
                    )}
                  >
                    <a
                      href="#"
                      aria-controls={tableId}
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        if (tableBusy || entry === pageIndex) return;
                        if (canSelectPage && !canSelectPage(entry)) return;
                        onPageSelect?.(entry);
                      }}
                    >
                      {entry + 1}
                    </a>
                  </li>
              ))}
              <li
                className={cn(
                  "paginate_button next",
                  (!(hasMore ?? pageIndex + 1 < totalPages) || tableBusy) &&
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
                    if ((hasMore ?? pageIndex + 1 < totalPages) && !tableBusy) {
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
