"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { createVehicle, getAllVehicles, getVehiclesPage } from "@/lib/api/vehicles";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  optimisticTempId,
  prependEntityInQueries,
} from "@/lib/query/optimistic";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { chronoListCursor } from "@/lib/utils/pagination";

import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { prefetchVehicleDetail } from "@/lib/query/prefetchListDetails";
import type { Vehicle } from "@vonos/types";

/** VA Operations — Vehicles list on HQ6 chrome (no live HQ6 audit; shared list lift). */
export function Hq6VehiclesListView() {
  const chrome = useHq6ListChrome("vehicles");
  const { goToDetail, prefetchDetail } = useRecordNavigation("vehicles");
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    plateNumber: "",
    make: "",
    model: "",
    year: "",
    ownerName: "",
    ownerPhone: "",
  });

  const createMutation = useAppMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error("No tenant");
      return createVehicle(tenantId, {
        plateNumber: form.plateNumber.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim() || null,
        vin: null,
      });
    },
    successMessage: "Vehicle registered",
    optimistic: {
      keys: [["vehicles", tenantId]],
      update: (qc) => {
        if (!tenantId) return;
        const now = new Date().toISOString();
        prependEntityInQueries(qc, ["vehicles", tenantId], {
          id: optimisticTempId("vehicle"),
          tenantId,
          plateNumber: form.plateNumber.trim(),
          vin: null,
          make: form.make.trim(),
          model: form.model.trim(),
          year: form.year ? Number(form.year) : null,
          ownerName: form.ownerName.trim(),
          ownerPhone: form.ownerPhone.trim() || null,
          createdAt: now,
          updatedAt: now,
        } satisfies Vehicle);
        setCreateOpen(false);
      },
      commit: (qc, data) => {
        if (!data || !tenantId) return;
        const entries = qc.getQueriesData({ queryKey: ["vehicles", tenantId] });
        for (const [queryKey, cached] of entries) {
          if (
            cached &&
            typeof cached === "object" &&
            Array.isArray((cached as { items?: Vehicle[] }).items)
          ) {
            const list = cached as { items: Vehicle[] };
            qc.setQueryData(queryKey, {
              ...list,
              items: list.items.filter((row) => !row.id.startsWith("vehicle-")),
            });
          }
        }
        prependEntityInQueries(qc, ["vehicles", tenantId], data);
      },
    },
    onSuccess: (vehicle) => {
      setForm({
        plateNumber: "",
        make: "",
        model: "",
        year: "",
        ownerName: "",
        ownerPhone: "",
      });
      goToDetail(vehicle.id);
    },
    onError: () => {
      setCreateOpen(true);
    },
  });

  const canCreate =
    form.plateNumber.trim() &&
    form.make.trim() &&
    form.model.trim() &&
    form.ownerName.trim();

  const {
    items: vehicles,
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
    isPaging,
    isSearching,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<Vehicle>({
    queryKey: ["vehicles", tenantId],
    enabled: Boolean(tenantId),
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _sort, opts) =>
      getVehiclesPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => chronoListCursor(row),
  });

  const columns: ColumnConfig<Vehicle>[] = [
    {
      key: "plateNumber",
      header: "Plate",
      render: (r) => <span className="font-medium">{r.plateNumber}</span>,
    },
    { key: "make", header: "Make" },
    { key: "model", header: "Model" },
    { key: "ownerName", header: "Owner" },
    { key: "year", header: "Year", sortValue: (r) => r.year ?? 0 },
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
      slug="vehicles"
      tabLabel="All Vehicles"
      onAdd={() => setCreateOpen(true)}
      onExport={async () => {
        if (!tenantId) return;
        const rows = await getAllVehicles(tenantId);
        exportList(
          "vehicles",
          [
            { key: "plateNumber", header: "Plate" },
            { key: "make", header: "Make" },
            { key: "model", header: "Model" },
            { key: "ownerName", header: "Owner" },
            { key: "year", header: "Year" },
          ],
          rows.map((row) => ({
            plateNumber: row.plateNumber,
            make: row.make,
            model: row.model,
            ownerName: row.ownerName,
            year: row.year,
          })),
          "Export Vehicles",
        );
      }}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={search}
      onSearchChange={setSearch}
      
      columnOptions={columnOptions}
      chrome={chrome}
      pagination={{
        pageIndex,
        pageSize,
        itemCount: vehicles.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isPaging,
        isSearching,
      }}
      modals={
        createOpen ? (
          <Modal open onClose={() => setCreateOpen(false)} panelClassName="max-w-lg">
            <ModalHeader
              title="Register vehicle"
              onClose={() => setCreateOpen(false)}
            />
            <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-2">
              <Input
                label="Plate number"
                value={form.plateNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, plateNumber: e.target.value }))
                }
              />
              <Input
                label="Owner name"
                value={form.ownerName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerName: e.target.value }))
                }
              />
              <Input
                label="Make"
                value={form.make}
                onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
              />
              <Input
                label="Model"
                value={form.model}
                onChange={(e) =>
                  setForm((p) => ({ ...p, model: e.target.value }))
                }
              />
              <Input
                label="Year"
                type="number"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
              />
              <Input
                label="Owner phone"
                value={form.ownerPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerPhone: e.target.value }))
                }
              />
            </div>
            <ModalFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!canCreate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Register
              </Button>
            </ModalFooter>
          </Modal>
        ) : null
      }
    >
      <DataTable
        data={vehicles}
        columns={effectiveColumns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load vehicles" : null}
        emptyState={{
          message:
            "No vehicles in the registry yet. Create a vehicle to track repair history.",
        }}
        onRowPointerEnter={(row) => {
          prefetchDetail(row.id);
          if (tenantId)
            prefetchVehicleDetail(queryClient, tenantId, row.id, row);
        }}
        onRowClick={(row) => {
          prefetchDetail(row.id);
          if (tenantId)
            prefetchVehicleDetail(queryClient, tenantId, row.id, row);
          goToDetail(row.id);
        }}
      />
    </Hq6StandardListShell>
  );
}
