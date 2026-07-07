"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { EmptyState } from "@/components/atoms/EmptyState";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  createReceiptPrinter,
  deleteReceiptPrinter,
  getInvoiceSettings,
  updateInvoiceSettings,
} from "@/lib/api/invoiceSettings";
import type { ReceiptPrinter } from "@vonos/types";

export function InvoiceSettingsView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const [layoutId, setLayoutId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [termsText, setTermsText] = useState("");

  useEffect(() => {
    if (!settings) return;
    setLayoutId(settings.defaultLayoutId ?? "");
    setSchemeId(settings.defaultSchemeId ?? "");
    setTermsText(settings.termsText ?? "");
  }, [settings]);

  const saveMutation = useAppMutation({
    mutationFn: () =>
      updateInvoiceSettings({
        defaultLayoutId: layoutId || null,
        defaultSchemeId: schemeId || null,
        termsText,
      }),
    successMessage: "Invoice settings saved",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoice-settings", tenantId] });
    },
  });

  if (isLoading || !settings) {
    return <p className="py-8 text-sm text-muted">Loading invoice settings…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Invoice Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Configure invoice layout, numbering scheme, and default terms for receipts and invoices.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Invoice Scheme</label>
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={schemeId}
              onChange={(e) => setSchemeId(e.target.value)}
            >
              {settings.schemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name}
                  {scheme.prefix ? ` (${scheme.prefix})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Invoice Layout</label>
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={layoutId}
              onChange={(e) => setLayoutId(e.target.value)}
            >
              {settings.layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name} ({layout.design})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Terms & Conditions</label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={4}
            placeholder="Enter default invoice terms…"
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BarcodeSettingsView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Barcode Settings</h2>
        <p className="mt-1 text-sm text-muted">Configure barcode label format and content.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Barcode Type</label>
            <select className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option>C128</option>
              <option>C39</option>
              <option>EAN-13</option>
              <option>EAN-8</option>
              <option>UPC-A</option>
              <option>UPC-E</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Sticker Sheet</label>
            <select className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
              <option>20 per sheet (4 × 5)</option>
              <option>30 per sheet (3 × 10)</option>
              <option>40 per sheet (4 × 10)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}

const printerColumns: ColumnConfig<ReceiptPrinter>[] = [
  { key: "name", header: "Name", render: (row) => <span className="font-medium">{row.name}</span> },
  {
    key: "printerType",
    header: "Type",
    render: (row) => <span className="capitalize">{row.printerType}</span>,
  },
  {
    key: "connectionString",
    header: "Connection",
    render: (row) => <span className="text-muted">{row.connectionString ?? "Browser print"}</span>,
  },
  {
    key: "isDefault",
    header: "Default",
    render: (row) => (row.isDefault ? "Yes" : "—"),
  },
];

export function ReceiptPrintersView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const [name, setName] = useState("");
  const [printerType, setPrinterType] = useState("browser");
  const [connectionString, setConnectionString] = useState("");

  const createMutation = useAppMutation({
    mutationFn: () =>
      createReceiptPrinter({
        name,
        printerType,
        connectionString: connectionString.trim() || null,
        isDefault: (settings?.printers.length ?? 0) === 0,
      }),
    successMessage: "Receipt printer added",
    onSuccess: () => {
      setName("");
      setConnectionString("");
      void queryClient.invalidateQueries({ queryKey: ["invoice-settings", tenantId] });
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteReceiptPrinter(id),
    successMessage: "Receipt printer removed",
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoice-settings", tenantId] });
    },
  });

  const printers = settings?.printers ?? [];

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "Receipt Printers" }]}
      activeTab="all"
      onTabChange={() => {}}
      showImport={false}
      showDateRange={false}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Add printer</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Printer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={printerType}
              onChange={(e) => setPrinterType(e.target.value)}
            >
              <option value="browser">Browser</option>
              <option value="network">Network</option>
            </select>
            <input
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Connection (optional)"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Add printer
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Loading printers…</p>
        ) : printers.length === 0 ? (
          <EmptyState
            title="Receipt Printers"
            message="No receipt printers configured. Add a browser or network printer above."
          />
        ) : (
          <DataTable<ReceiptPrinter>
            displayMode="table"
            data={printers}
            columns={[
              ...printerColumns,
              {
                key: "actions",
                header: "",
                render: (row: ReceiptPrinter) => (
                  <button
                    type="button"
                    className="text-sm text-error hover:underline"
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
                    Remove
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>
    </ListPageShell>
  );
}

interface TaxRateRow {
  id: string;
  name: string;
  rate: number;
  isTaxGroup: boolean;
}

const taxRateColumns: ColumnConfig<TaxRateRow>[] = [
  { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
  {
    key: "rate",
    header: "Rate",
    sortValue: (r) => r.rate,
    render: (r) => <span className="tabular-nums">{r.rate}%</span>,
  },
  {
    key: "isTaxGroup",
    header: "Type",
    render: (r) => (r.isTaxGroup ? "Group" : "Rate"),
  },
];

export function TaxRatesListView() {
  const rows: TaxRateRow[] = [
    { id: "vat", name: "VAT", rate: 7.5, isTaxGroup: false },
  ];

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "Tax Rates" }]}
      activeTab="all"
      onTabChange={() => {}}
      showImport={false}
      showDateRange={false}
    >
      <DataTable<TaxRateRow> displayMode="table" data={rows} columns={taxRateColumns} />
    </ListPageShell>
  );
}
