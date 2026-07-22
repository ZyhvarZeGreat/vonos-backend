"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Hq6DataListPage } from "@/components/hq6/Hq6DataListPage";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { hq6ListActionRule, hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";

export interface Hq6ListChromeState {
  printOpen: boolean;
  setPrintOpen: (open: boolean) => void;
  columnsOpen: boolean;
  setColumnsOpen: (open: boolean) => void;
  visibleColumnKeys: string[] | null;
  setVisibleColumnKeys: (keys: string[] | null) => void;
}

export function useHq6ListChrome(): Hq6ListChromeState {
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[] | null>(null);
  return {
    printOpen,
    setPrintOpen,
    columnsOpen,
    setColumnsOpen,
    visibleColumnKeys,
    setVisibleColumnKeys,
  };
}

export interface Hq6StandardListShellProps {
  slug: string;
  title?: string;
  tabLabel: string;
  filters?: ReactNode;
  onAdd?: () => void;
  addHref?: string;
  onExport?: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchCommit?: () => void;
  columnOptions: Array<{ key: string; label: string }>;
  /** When set, column visibility starts from these keys (HQ6 default thead). */
  defaultVisibleColumnKeys?: string[];
  chrome: Hq6ListChromeState;
  children: ReactNode;
  tableFooter?: ReactNode;
  summaryStrip?: ReactNode;
  bulkActions?: ReactNode;
  tabs?: Array<{ id: string; label: string; active?: boolean; icon?: ReactNode; onClick?: () => void }>;
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
    show?: boolean;
  };
  modals?: ReactNode;
  hidePrimaryAction?: boolean;
  hideToolbar?: boolean;
}

/** Standard HQ6 list chrome wired from hq6PageCopy action rules. */
export function Hq6StandardListShell({
  slug,
  title,
  tabLabel,
  filters,
  onAdd,
  addHref,
  onExport,
  pageSize,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  onSearchCommit,
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
}: Hq6StandardListShellProps) {
  const rules = hq6ListActionRule(slug);
  const copy = hq6CopyForSlug(slug);
  const resolvedTitle = title ?? copy.title;

  const primaryActions = useMemo(() => {
    if (hidePrimaryAction || tabActions) return [];
    const actions = [];
    if (rules.addVariant !== "none") {
      actions.push({
        label: "Add",
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
  }, [addHref, hidePrimaryAction, onAdd, onExport, rules, tabActions]);

  const listTabs =
    tabs ??
    ([
      {
        id: "main",
        label: tabLabel,
        active: true,
      },
    ] as const);

  return (
    <Hq6DataListPage
      title={resolvedTitle}
      subtitle={copy.subtitle}
      showSubtitle={!rules.titleOnly && Boolean(copy.subtitle)}
      filters={filters}
      tabs={listTabs}
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
              onExportCsv: onExport,
              onExportExcel: onExport,
              onPrint: () => chrome.setPrintOpen(true),
              onColumnVisibility: () => chrome.setColumnsOpen(true),
              onExportPdf: () => undefined,
            }
      }
      tableFooter={tableFooter}
      summaryStrip={summaryStrip}
      bulkActions={bulkActions}
      pagination={pagination}
      modals={
        <>
          {modals}
          <Hq6PrintModal open={chrome.printOpen} onClose={() => chrome.setPrintOpen(false)} />
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
          />
        </>
      }
    >
      {children}
    </Hq6DataListPage>
  );
}
