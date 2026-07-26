"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { RequisitionRecordModal } from "@/components/organisms/RequisitionRecordModal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import {
  getAllRequisitions,
  getRequisitionsPage,
} from "@/lib/api/requisitions";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { prefetchRequisitionListModals } from "@/lib/query/prefetchListModals";
import { formatDate } from "@/lib/utils/formatDate";
import type { Requisition } from "@vonos/types";

/** VA Operations — Requisitions list on HQ6 chrome (no live HQ6 audit; shared list lift). */
export function Hq6RequisitionsListView() {
  const chrome = useHq6ListChrome("requisitions");
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { recordId, recordSeed, openRecord, closeRecord } =
    useListRecordModal<Requisition>({
      onPrefetchRecord: (id) => {
        if (!tenantId) return;
        prefetchRequisitionListModals(queryClient, tenantId, id);
      },
    });
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();
  const [localSearch, setLocalSearch] = useState(search);

  const {
    items: requisitions,
    hasMore,
    totalCount,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,
    isFetching,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<Requisition>({
    queryKey: ["requisitions", tenantId],
    enabled: Boolean(tenantId),
    search,
    fetchPage: (cursor, limit, _sort, opts) =>
      getRequisitionsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
        includeSummary: opts?.includeSummary,
      }),
  });

  const columns: ColumnConfig<Requisition>[] = [
    {
      key: "reference",
      header: "Req #",
      render: (r) => <span className="font-medium">{r.reference}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusPill status={r.status} vocabulary="movementStatus" />
      ),
    },
    {
      key: "lines",
      header: "Lines",
      render: (r) => r.lines.length,
    },
    {
      key: "createdAt",
      header: "Created",
      sortValue: (r) => new Date(r.createdAt).getTime(),
      render: (r) => formatDate(r.createdAt),
    },
  ];

  const columnOptions = columns.map((c) => ({
    key: c.key,
    label: String(c.header || c.key),
  }));

  const effectiveColumns = useMemo(() => {
    if (!chrome.visibleColumnKeys) return columns;
    const allowed = new Set(chrome.visibleColumnKeys);
    return columns.filter((c) => allowed.has(c.key));
  }, [chrome.visibleColumnKeys, columns]);

  return (
    <Hq6StandardListShell
      slug="requisitions"
      tabLabel="All Requisitions"
      hidePrimaryAction
      onExport={async () => {
        if (!tenantId) return;
        const rows = await getAllRequisitions(tenantId);
        exportList(
          "requisitions",
          [
            { key: "reference", header: "Req #" },
            { key: "status", header: "Status" },
            { key: "createdAt", header: "Created" },
          ],
          rows.map((row) => ({
            reference: row.reference,
            status: row.status,
            createdAt: formatDate(row.createdAt),
          })),
          "Export Requisitions",
        );
      }}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={() => setSearch(localSearch)}
      columnOptions={columnOptions}
      chrome={chrome}
      pagination={{
        pageIndex,
        pageSize,
        itemCount: requisitions.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isFetching && !isLoading,
      }}
      modals={
        <RequisitionRecordModal
          requisitionId={recordId}
          initialRecord={recordSeed}
          mode="outgoing"
          onClose={closeRecord}
        />
      }
    >
      <DataTable
        data={requisitions}
        columns={effectiveColumns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load requisitions" : null}
        onRowClick={(row) => openRecord(row.id, row)}
        emptyState={{
          message:
            "No material requisitions yet. Request parts from a job detail page.",
        }}
      />
    </Hq6StandardListShell>
  );
}
