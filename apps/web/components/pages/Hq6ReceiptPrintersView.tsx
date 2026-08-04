"use client";

/**
 * HQ6 Printers — ui-audit/67_printers
 * "All configured Printers" DataTables list. Add → /receipt-printers/create
 */
import { matchSearchRows } from "@/lib/utils/listClientSearch";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReceiptPrinter } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { deleteReceiptPrinter, getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export function Hq6ReceiptPrintersView() {
  const tenantId = useTenantId();
  const { tenantCode } = useRouteTenant();
  const chrome = useHq6ListChrome("receipt-printers");
  const [localSearch, setLocalSearch] = useState("");
  const [pageSize, setPageSize] = useState(HQ6_TABLE_PAGE_SIZE);

  const createHref = tenantCode
    ? `${tenantListPath(tenantCode, "receipt-printers")}/create`
    : "#";

  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteReceiptPrinter(id),
    successMessage: "Receipt printer removed",
    invalidateKeys: [["invoice-settings", tenantId]],
  });

  const printers = settings?.printers ?? [];
  const filtered = useMemo(
    () => matchSearchRows(printers, localSearch, ["name"]),
    [localSearch, printers],
  );

  const columns: ColumnConfig<ReceiptPrinter>[] = useMemo(
    () => [
      { key: "name", header: "Printer Name", render: (row) => row.name },
      {
        key: "printerType",
        header: "Connection Type",
        render: (row) => <span className="capitalize">{row.printerType}</span>,
      },
      {
        key: "capability",
        header: "Capability Profile",
        render: () => "Default",
      },
      {
        key: "chars",
        header: "Characters per line",
        render: () => "42",
      },
      {
        key: "ip",
        header: "IP Address",
        render: (row) =>
          row.printerType === "network" ? (row.connectionString ?? "—") : "—",
      },
      { key: "port", header: "Port", render: () => "—" },
      {
        key: "path",
        header: "Path",
        render: (row) =>
          row.printerType === "browser"
            ? (row.connectionString ?? "Browser")
            : "—",
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <button
            type="button"
            className="btn btn-xs btn-danger"
            onClick={() => deleteMutation.mutate(row.id)}
          >
            Delete
          </button>
        ),
      },
    ],
    [deleteMutation],
  );

  return (
    <Hq6StandardListShell
      slug="receipt-printers"
      title="Printers"
      tabLabel="All configured Printers"
      boxTitle="All configured Printers"
      chrome={chrome}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      searchPlaceholder="Search..."
      addHref={createHref}
      addLabel="Add Printer"
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      columnOptions={columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header) }))}
      pagination={{
        pageIndex: 0,
        pageSize,
        itemCount: filtered.length,
        totalItems: filtered.length,
        hasMore: false,
        canGoPrev: false,
        onPageSizeChange: setPageSize,
      }}
    >
      {isLoading ? (
        <p className="text-center text-[#777]">Loading…</p>
      ) : (
        <DataTable<ReceiptPrinter>
          displayMode="table"
          data={filtered.slice(0, pageSize > 0 ? pageSize : filtered.length)}
          columns={columns}
          emptyState={{ message: "No data available in table" }}
        />
      )}
    </Hq6StandardListShell>
  );
}
