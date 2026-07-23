"use client";

import { type ReactNode } from "react";
import { CloudDownload, Plus } from "lucide-react";
import Link from "next/link";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { Hq6ListToolbar } from "@/components/hq6/Hq6ListToolbar";
import { Hq6FiltersCard } from "@/components/hq6/Hq6Chrome";
import { cn } from "@/lib/utils/cn";

export type Hq6PrimaryButtonVariant = "blue" | "purple" | "download";

export interface Hq6TabConfig {
  id: string;
  label: string;
  active?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface Hq6PrimaryAction {
  label?: string;
  variant: Hq6PrimaryButtonVariant;
  onClick?: () => void;
  href?: string;
  hidden?: boolean;
}

export interface Hq6DataListPageProps {
  title: string;
  subtitle?: string;
  /** HQ6 list pages usually show title only (no subtitle in header). */
  showSubtitle?: boolean;
  filters?: ReactNode;
  tabs?: Hq6TabConfig[];
  /** Extra tab-row actions (overrides primaryActions when set). */
  tabActions?: ReactNode;
  primaryActions?: Hq6PrimaryAction[];
  /** Toolbar — pass false to hide. */
  toolbar?: false | {
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
    density?: import("@/lib/utils/tableColumnAlign").TableDensity;
    onDensityChange?: (
      density: import("@/lib/utils/tableColumnAlign").TableDensity,
    ) => void;
  };
  children: ReactNode;
  tableFooter?: ReactNode;
  summaryStrip?: ReactNode;
  bulkActions?: ReactNode;
  pagination?: {
    pageIndex?: number;
    pageSize?: number;
    itemCount?: number;
    hasMore?: boolean;
    canGoPrev?: boolean;
    onPrev?: () => void;
    onNext?: () => void;
    onPageSizeChange?: (size: number) => void;
    onPageSelect?: (index: number) => void;
    canSelectPage?: (index: number) => boolean;
    totalItems?: number;
    isBusy?: boolean;
    show?: boolean;
  };
  modals?: ReactNode;
  className?: string;
  /** Freeze first table column while scrolling horizontally. */
  freezeFirstColumn?: boolean;
}

function PrimaryActionButton({ action }: { action: Hq6PrimaryAction }) {
  const label = action.label ?? (action.variant === "download" ? "Download Excel" : "Add");
  const className = cn(
    "hq6-btn",
    action.variant === "purple" && "hq6-btn-purple",
    action.variant === "blue" && "hq6-btn-blue",
    action.variant === "download" && "hq6-btn-download",
  );
  const icon =
    action.variant === "download" ? (
      <CloudDownload className="h-3.5 w-3.5" />
    ) : (
      <Plus className="h-3.5 w-3.5" />
    );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={action.onClick}>
      {icon}
      {label}
    </button>
  );
}

/** Shared HQ6 list page shell — ui-audit list pages (products, sales, purchases, etc.). */
export function Hq6DataListPage({
  title,
  subtitle,
  showSubtitle = false,
  filters,
  tabs,
  tabActions,
  primaryActions = [],
  toolbar,
  children,
  tableFooter,
  summaryStrip,
  bulkActions,
  pagination,
  modals,
  className,
  freezeFirstColumn = true,
}: Hq6DataListPageProps) {
  const visibleActions = primaryActions.filter((a) => !a.hidden);

  return (
    <div className={cn("hq6-page", className)}>
      <section className="hq6-content-header">
        <h1>
          {title}
          {showSubtitle && subtitle ? <small>{subtitle}</small> : null}
        </h1>
      </section>

      {filters ? <Hq6FiltersCard>{filters}</Hq6FiltersCard> : null}

      <div className="hq6-card hq6-products-box overflow-x-clip">
        {tabs && tabs.length > 0 ? (
          <div className="hq6-tab-row">
            <div className="flex min-w-0 flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={cn("hq6-tab", tab.active && "hq6-tab-active")}
                  onClick={tab.onClick}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {tabActions ? (
              <div className="flex shrink-0 items-center gap-2 px-3">{tabActions}</div>
            ) : visibleActions.length > 0 ? (
              <div className="flex shrink-0 items-center gap-2 px-3">
                {visibleActions.map((action, index) => (
                  <PrimaryActionButton key={`${action.variant}-${index}`} action={action} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {toolbar !== false && toolbar ? <Hq6ListToolbar {...toolbar} /> : null}

        <div
          className={cn(
            "hq6-table-wrap relative",
            freezeFirstColumn && "hq6-table-freeze-first",
          )}
        >
          {children}
          {tableFooter}
          {summaryStrip}
        </div>

        {bulkActions}

        {pagination?.show !== false &&
        pagination &&
        pagination.pageIndex !== undefined &&
        pagination.pageSize !== undefined &&
        pagination.itemCount !== undefined &&
        pagination.hasMore !== undefined &&
        pagination.canGoPrev !== undefined &&
        pagination.onPrev &&
        pagination.onNext &&
        pagination.onPageSizeChange &&
        (pagination.itemCount > 0 || pagination.canGoPrev || pagination.isBusy) ? (
          <CursorPaginationBar
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            itemCount={pagination.itemCount}
            hasMore={pagination.hasMore}
            canGoPrev={pagination.canGoPrev}
            onPrev={pagination.onPrev}
            onNext={pagination.onNext}
            onPageSizeChange={pagination.onPageSizeChange}
            onPageSelect={pagination.onPageSelect}
            canSelectPage={pagination.canSelectPage}
            totalItems={pagination.totalItems}
            isBusy={pagination.isBusy}
            className="border-t border-[var(--hq6-border)] px-3 py-2"
          />
        ) : null}
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>

      {modals}
    </div>
  );
}
