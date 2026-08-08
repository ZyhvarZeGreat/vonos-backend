"use client";

import { type ReactNode } from "react";
import {
  Hq6Breadcrumbs,
  useHq6Breadcrumbs,
} from "@/components/hq6/Hq6Breadcrumbs";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import { UposFiltersPanel } from "@/components/upos/UposFiltersPanel";
import {
  UposGradientActionButton,
  UposNavTabs,
} from "@/components/upos/UposNavTabs";
import { cn } from "@/lib/utils/cn";

export type Hq6PrimaryButtonVariant = "blue" | "purple" | "download";

export interface Hq6TabConfig {
  id: string;
  label: string;
  active?: boolean;
  icon?: ReactNode;
  iconClass?: string;
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
  /** HQ6 list pages show title + small subtitle in content-header. */
  showSubtitle?: boolean;
  /** Box header title when using single-pane lists (e.g. "All users"). */
  boxTitle?: string;
  filters?: ReactNode;
  tabs?: Hq6TabConfig[];
  /** Extra tab-row actions (overrides primaryActions when set). */
  tabActions?: ReactNode;
  primaryActions?: Hq6PrimaryAction[];
  /** Toolbar — pass false to hide. */
  toolbar?:
    | false
    | {
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
    isSearching?: boolean;
    show?: boolean;
  };
  modals?: ReactNode;
  className?: string;
  /** Freeze first table column while scrolling horizontally. */
  freezeFirstColumn?: boolean;
}

/** Shared HQ6 list page shell — UPOS content-header + filters + nav-tabs + DataTables. */
export function Hq6DataListPage({
  title,
  subtitle,
  showSubtitle = true,
  boxTitle,
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
  const crumbs = useHq6Breadcrumbs({ leafLabel: title });
  const visibleActions = primaryActions.filter(
    (a) => !a.hidden && (a.onClick || a.href),
  );
  const multiTabs = Boolean(tabs && tabs.length > 1);
  const resolvedBoxTitle =
    boxTitle ??
    (!multiTabs && tabs?.[0]?.label ? tabs[0].label : undefined);

  const gradientActions = (
    <>
      {visibleActions.map((action, index) => (
        <UposGradientActionButton
          key={`${action.variant}-${index}`}
          label={
            action.label ??
            (action.variant === "download" ? "Download Excel" : "Add")
          }
          icon={action.variant === "download" ? "download" : "plus"}
          onClick={action.onClick}
          href={action.href}
        />
      ))}
    </>
  );

  /** HQ6 widget tool slot — no `pull-right` float (breaks flex box-header). */
  const actionsNode = tabActions ? (
    <div className="box-tools">{tabActions}</div>
  ) : visibleActions.length > 0 ? (
    <div className="box-tools">{gradientActions}</div>
  ) : null;

  const tableBody = (
    <>
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
    </>
  );

  const listBody =
    toolbar !== false && toolbar ? (
      <UposDataTablesShell
        tableId="hq6_list_table"
        pageSize={toolbar.pageSize}
        onPageSizeChange={toolbar.onPageSizeChange}
        searchValue={toolbar.searchValue}
        onSearchChange={toolbar.onSearchChange}
        onSearchCommit={toolbar.onSearchCommit}
        searchPlaceholder={toolbar.searchPlaceholder ?? "Search ..."}
        onExportCsv={toolbar.onExportCsv}
        onExportExcel={toolbar.onExportExcel}
        onPrint={toolbar.onPrint}
        onColumnVisibility={toolbar.onColumnVisibility}
        onExportPdf={toolbar.onExportPdf}
        hideExports={
          !toolbar.onExportCsv &&
          !toolbar.onExportExcel &&
          !toolbar.onPrint &&
          !toolbar.onColumnVisibility &&
          !toolbar.onExportPdf
        }
        pageIndex={pagination?.pageIndex ?? 0}
        itemCount={pagination?.itemCount ?? 0}
        totalItems={pagination?.totalItems}
        hasMore={pagination?.hasMore}
        canGoPrev={pagination?.canGoPrev}
        onPrev={pagination?.onPrev}
        onNext={pagination?.onNext}
        onPageSelect={pagination?.onPageSelect}
        canSelectPage={pagination?.canSelectPage}
        isBusy={pagination?.isBusy}
        isSearching={pagination?.isSearching}
        showPagination={pagination?.show !== false}
        bulkActions={bulkActions}
      >
        {tableBody}
      </UposDataTablesShell>
    ) : (
      <>
        {tableBody}
        {bulkActions}
      </>
    );

  return (
    <div className={cn("hq6-page", className)}>
      {title ? (
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          {title}
          {showSubtitle && subtitle ? (
            <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
              {subtitle}
            </small>
          ) : null}
        </h1>
        <Hq6Breadcrumbs items={crumbs} />
      </section>
      ) : null}

      <section className="content">
        {filters ? (
          <div className="row">
            <div className="col-md-12">
              <UposFiltersPanel title="Filters" defaultOpen>
                {filters}
              </UposFiltersPanel>
            </div>
          </div>
        ) : null}

        <div className="row">
          <div className="col-md-12">
            {multiTabs ? (
              <UposNavTabs
                tabs={tabs!.map((tab) => ({
                  id: tab.id,
                  label: tab.label,
                  active: tab.active,
                  onClick: tab.onClick,
                  iconClass: tab.iconClass,
                }))}
              >
                <div className="tab-pane active">
                  {visibleActions.length > 0 ? (
                    <>
                      {gradientActions}
                      <br />
                      <br />
                    </>
                  ) : tabActions ? (
                    <div className="clearfix">{tabActions}</div>
                  ) : null}
                  {listBody}
                </div>
              </UposNavTabs>
            ) : (
              /* components/widget.blade.php — box-primary card + box-header + slot */
              <div className="box-primary tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
                <div className="tw-p-2 sm:tw-p-3">
                  {resolvedBoxTitle || actionsNode ? (
                    <div className="box-header">
                      {resolvedBoxTitle ? (
                        <h3 className="box-title">{resolvedBoxTitle}</h3>
                      ) : (
                        <span />
                      )}
                      {actionsNode}
                    </div>
                  ) : null}
                  <div className="tw-flow-root tw-border-gray-200">
                    <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                      {listBody}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>

      {modals}
    </div>
  );
}
