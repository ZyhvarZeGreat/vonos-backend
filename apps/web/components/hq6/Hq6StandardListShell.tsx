"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Hq6DataListPage } from "@/components/hq6/Hq6DataListPage";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { hq6ListActionRule, hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { useTableViewPrefs } from "@/lib/hooks/useTableViewPrefs";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import type { TableDensity } from "@/lib/utils/tableColumnAlign";

export interface Hq6ListChromeState {
  printOpen: boolean;
  setPrintOpen: (open: boolean) => void;
  columnsOpen: boolean;
  setColumnsOpen: (open: boolean) => void;
  visibleColumnKeys: string[] | null;
  setVisibleColumnKeys: (keys: string[] | null) => void;
  resetColumnVisibility: () => void;
  density: TableDensity;
  setDensity: (density: TableDensity) => void;
}

/** Optional page slug enables localStorage persistence for columns + density. */
export function useHq6ListChrome(pageSlug?: string): Hq6ListChromeState {
  const { tenantCode } = useRouteTenant();
  const storageKey =
    pageSlug && tenantCode ? `${tenantCode}.${pageSlug}` : undefined;
  const prefs = useTableViewPrefs(storageKey);
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  return {
    printOpen,
    setPrintOpen,
    columnsOpen,
    setColumnsOpen,
    visibleColumnKeys: prefs.visibleColumnKeys,
    setVisibleColumnKeys: prefs.setVisibleColumnKeys,
    resetColumnVisibility: prefs.resetColumnVisibility,
    density: prefs.density,
    setDensity: prefs.setDensity,
  };
}

export interface Hq6StandardListShellProps {
  slug: string;
  title?: string;
  tabLabel: string;
  filters?: ReactNode;
  onAdd?: () => void;
  addHref?: string;
  /** Override primary Add button label (e.g. "Add Draft"). */
  addLabel?: string;
  onExport?: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchCommit?: () => void;
  searchPlaceholder?: string;
  columnOptions: Array<{ key: string; label: string }>;
  /** When set, column visibility starts from these keys (HQ6 default thead). */
  defaultVisibleColumnKeys?: string[];
  chrome: Hq6ListChromeState;
  children: ReactNode;
  tableFooter?: ReactNode;
  summaryStrip?: ReactNode;
  bulkActions?: ReactNode;
  tabs?: Array<{
    id: string;
    label: string;
    active?: boolean;
    icon?: ReactNode;
    iconClass?: string;
    onClick?: () => void;
  }>;
  tabActions?: ReactNode;
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
  hidePrimaryAction?: boolean;
  hideToolbar?: boolean;
  /** When true, omit CSV/Excel/Print/PDF/column visibility (UPOS roles uses buttons:[]). */
  hideExports?: boolean;
  /** Override box header title; empty string = tools-only header (UPOS agents). */
  boxTitle?: string;
  /** Freeze first column on horizontal scroll. Default true. */
  freezeFirstColumn?: boolean;
}

/** Standard HQ6 list chrome wired from hq6PageCopy action rules. */
export function Hq6StandardListShell({
  slug,
  title,
  tabLabel,
  filters,
  onAdd,
  addHref,
  addLabel,
  onExport,
  pageSize,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  onSearchCommit,
  searchPlaceholder,
  columnOptions,
  defaultVisibleColumnKeys,
  chrome,
  children,
  tableFooter,
  summaryStrip,
  bulkActions,
  tabs,
  tabActions,
  pagination,
  modals,
  hidePrimaryAction,
  hideToolbar,
  hideExports = false,
  boxTitle,
  freezeFirstColumn = true,
}: Hq6StandardListShellProps) {
  const rules = hq6ListActionRule(slug);
  const copy = hq6CopyForSlug(slug);
  const resolvedTitle = title ?? copy.title;
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? copy.searchPlaceholder;

  const primaryActions = useMemo(() => {
    if (hidePrimaryAction || tabActions) return [];
    const actions = [];
    if (rules.addVariant !== "none" && (onAdd || addHref)) {
      actions.push({
        label: addLabel ?? "Add",
        variant: rules.addVariant,
        onClick: onAdd,
        href: addHref,
      });
    }
    if (rules.showDownloadExcel && onExport) {
      actions.push({
        label: "Download Excel",
        variant: "download" as const,
        onClick: onExport,
      });
    }
    return actions;
  }, [addHref, addLabel, hidePrimaryAction, onAdd, onExport, rules, tabActions]);

  const listTabs =
    tabs ??
    ([
      {
        id: "main",
        label: tabLabel,
        active: true,
      },
    ] as const);

  const resolvedBoxTitle =
    boxTitle !== undefined
      ? boxTitle
      : listTabs.length === 1
        ? listTabs[0]?.label
        : undefined;

  /** UPOS always shows DataTables export chrome; print/colvis don't need onExport. */
  const showExportChrome = !hideExports;
  const exportOrNoop = onExport ?? (() => undefined);

  return (
    <Hq6DataListPage
      title={resolvedTitle}
      subtitle={copy.subtitle}
      showSubtitle={!rules.titleOnly && Boolean(copy.subtitle)}
      boxTitle={resolvedBoxTitle}
      filters={filters}
      tabs={[...listTabs]}
      tabActions={tabActions}
      primaryActions={primaryActions}
      toolbar={
        hideToolbar
          ? false
          : {
              pageSize,
              onPageSizeChange,
              searchValue,
              onSearchChange,
              onSearchCommit,
              searchPlaceholder: resolvedSearchPlaceholder,
              onExportCsv: showExportChrome ? exportOrNoop : undefined,
              onExportExcel: showExportChrome ? exportOrNoop : undefined,
              onPrint: showExportChrome
                ? () => chrome.setPrintOpen(true)
                : undefined,
              onColumnVisibility: showExportChrome
                ? () => chrome.setColumnsOpen(true)
                : undefined,
              onExportPdf: showExportChrome ? exportOrNoop : undefined,
            }
      }
      tableFooter={tableFooter}
      summaryStrip={summaryStrip}
      bulkActions={bulkActions}
      pagination={pagination}
      freezeFirstColumn={freezeFirstColumn}
      modals={
        <>
          {modals}
          <Hq6PrintModal
            open={chrome.printOpen}
            onClose={() => chrome.setPrintOpen(false)}
          />
          <Hq6ColumnVisibilityModal
            open={chrome.columnsOpen}
            onClose={() => chrome.setColumnsOpen(false)}
            columns={columnOptions}
            visibleKeys={
              chrome.visibleColumnKeys ??
              defaultVisibleColumnKeys ??
              columnOptions.map((c) => c.key)
            }
            onChange={chrome.setVisibleColumnKeys}
            onReset={() => {
              chrome.resetColumnVisibility();
              chrome.setColumnsOpen(false);
            }}
          />
        </>
      }
    >
      {children}
    </Hq6DataListPage>
  );
}
