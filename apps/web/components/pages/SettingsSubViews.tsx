"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6InvoiceSchemeModal } from "@/components/hq6/Hq6InvoiceSchemeModal";
import { Hq6InvoiceLayoutModal } from "@/components/hq6/Hq6InvoiceLayoutModal";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  createInvoiceLayout,
  createInvoiceScheme,
  createReceiptPrinter,
  deleteInvoiceLayout,
  deleteReceiptPrinter,
  getInvoiceSettings,
  updateInvoiceLayout,
  updateInvoiceScheme,
  updateInvoiceSettings,
} from "@/lib/api/invoiceSettings";
import type { InvoiceLayout, InvoiceScheme, ReceiptPrinter } from "@vonos/types";
import {
  DataTableSkeleton,
  InvoiceSettingsSkeleton,
} from "@/components/organisms/skeletons";
import { cn } from "@/lib/utils/cn";
import { stripHtmlToText } from "@/lib/utils/stripHtml";

export function InvoiceSettingsView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6InvoiceSettingsView />;
  return <DefaultInvoiceSettingsView />;
}

function DefaultInvoiceSettingsView() {
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
    return <InvoiceSettingsSkeleton />;
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
            <MenuSelect
              value={schemeId}
              onChange={setSchemeId}
              options={settings.schemes.map((scheme) => ({
                value: scheme.id,
                label: scheme.prefix
                  ? `${scheme.name} (${scheme.prefix})`
                  : scheme.name,
              }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Invoice Layout</label>
            <MenuSelect
              value={layoutId}
              onChange={setLayoutId}
              options={settings.layouts.map((layout) => ({
                value: layout.id,
                label: `${layout.name} (${layout.design})`,
              }))}
            />
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
          <Button
            isLoading={saveMutation.isPending}
            loadingText="Saving…"
            onClick={() => saveMutation.mutate()}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

function LayoutStylePreview({ design }: { design: string }) {
  const kind = design.toLowerCase();
  return (
    <div
      className={cn(
        "mt-3 rounded border border-[#e5e7eb] bg-[#f9fafb] p-2",
        kind === "slim" && "max-w-[140px]",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "mb-1.5 h-2 rounded bg-[#d1d5db]",
          kind === "elegant" && "bg-[var(--hq6-purple)]/40",
          kind === "detailed" && "h-3",
        )}
      />
      <div className="mb-1 flex gap-1">
        <div className="h-8 flex-1 rounded bg-white border border-[#e5e7eb]" />
        {kind !== "slim" ? (
          <div className="h-8 w-1/3 rounded bg-white border border-[#e5e7eb]" />
        ) : null}
      </div>
      <div className="space-y-0.5">
        <div className="h-1 rounded bg-[#e5e7eb]" />
        <div className="h-1 rounded bg-[#e5e7eb]" />
        <div className="h-1 w-2/3 rounded bg-[#e5e7eb]" />
      </div>
      {kind === "detailed" ? (
        <div className="mt-1.5 h-4 rounded border border-dashed border-[#d1d5db] bg-white" />
      ) : null}
    </div>
  );
}

function Hq6InvoiceSettingsView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const [tab, setTab] = useState<"schemes" | "layouts">("schemes");
  const [schemeModal, setSchemeModal] = useState<"add" | "edit" | null>(null);
  const [layoutModal, setLayoutModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<InvoiceScheme | null>(null);
  const [editingLayout, setEditingLayout] = useState<InvoiceLayout | null>(null);
  const [search, setSearch] = useState("");

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["invoice-settings", tenantId] });

  const createMutation = useAppMutation({
    mutationFn: createInvoiceScheme,
    successMessage: "Invoice scheme created",
    onSuccess: () => {
      invalidate();
      setSchemeModal(null);
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateInvoiceScheme>[1]) =>
      updateInvoiceScheme(id, input),
    successMessage: "Invoice scheme updated",
    onSuccess: () => {
      invalidate();
      setSchemeModal(null);
      setEditing(null);
    },
  });

  const createLayoutMutation = useAppMutation({
    mutationFn: createInvoiceLayout,
    successMessage: "Invoice layout created",
    onSuccess: () => {
      invalidate();
      setLayoutModal(null);
      setEditingLayout(null);
    },
  });

  const updateLayoutMutation = useAppMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Parameters<typeof updateInvoiceLayout>[1]) =>
      updateInvoiceLayout(id, input),
    successMessage: "Invoice layout updated",
    onSuccess: () => {
      invalidate();
      setLayoutModal(null);
      setEditingLayout(null);
    },
  });

  const deleteLayoutMutation = useAppMutation({
    mutationFn: deleteInvoiceLayout,
    successMessage: "Invoice layout deleted",
    onSuccess: invalidate,
  });

  const setDefaultMutation = useAppMutation({
    mutationFn: (schemeId: string) => updateInvoiceSettings({ defaultSchemeId: schemeId }),
    successMessage: "Default scheme updated",
    onSuccess: invalidate,
  });

  const setLayoutMutation = useAppMutation({
    mutationFn: (layoutId: string) => updateInvoiceSettings({ defaultLayoutId: layoutId }),
    successMessage: "Default layout updated",
    onSuccess: invalidate,
  });

  if (isLoading || !settings) {
    return <InvoiceSettingsSkeleton />;
  }

  const schemes = settings.schemes.filter((s) =>
    search.trim()
      ? s.name.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  return (
    <Hq6PageFrame title="Invoice Settings" subtitle="Manage your invoice settings">
      <div className="hq6-card overflow-hidden">
        <div className="hq6-scheme-tab-row">
          <button
            type="button"
            className={cn("hq6-tab", tab === "schemes" && "hq6-tab-active")}
            onClick={() => setTab("schemes")}
          >
            Invoice Schemes
          </button>
          <button
            type="button"
            className={cn("hq6-tab", tab === "layouts" && "hq6-tab-active")}
            onClick={() => setTab("layouts")}
          >
            Invoice Layouts
          </button>
          <div className="ml-auto flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              className="hq6-btn-purple inline-flex items-center gap-1"
              onClick={() => {
                if (tab === "schemes") {
                  setEditing(null);
                  setSchemeModal("add");
                } else {
                  setEditingLayout(null);
                  setLayoutModal("add");
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        {tab === "schemes" ? (
          <>
            <div className="hq6-dt-toolbar">
              <label className="hq6-search ml-auto">
                <span className="sr-only">Search</span>
                <input
                  type="text"
                  placeholder="Search ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="hq6-table-wrap">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Prefix</th>
                    <th className="px-4 py-2">Start Number</th>
                    <th className="px-4 py-2">Invoice Count</th>
                    <th className="px-4 py-2">Total digits</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#6b7280]">
                        No invoice schemes found
                      </td>
                    </tr>
                  ) : (
                    schemes.map((scheme) => (
                      <tr key={scheme.id}>
                        <td className="px-4 py-2 font-medium">
                          {scheme.name}
                          {scheme.isDefault ? (
                            <span className="ml-2 rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1d4ed8]">
                              Default
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">{scheme.prefix ?? "—"}</td>
                        <td className="px-4 py-2">{scheme.startNumber}</td>
                        <td className="px-4 py-2">{scheme.invoiceCount}</td>
                        <td className="px-4 py-2">{scheme.totalDigits}</td>
                        <td className="px-4 py-2">
                          <Hq6ActionsMenu
                            items={[
                              {
                                id: "edit",
                                label: "Edit",
                                onClick: () => {
                                  setEditing(scheme);
                                  setSchemeModal("edit");
                                },
                              },
                              {
                                id: "default",
                                label: "Set as default",
                                disabled: scheme.isDefault,
                                onClick: () => setDefaultMutation.mutate(scheme.id),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {settings.layouts.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-[#6b7280]">
                No invoice layouts yet. Add a Classic, Slim, or Detailed style.
              </p>
            ) : (
              settings.layouts.map((layout, index) => {
                const active = layout.id === settings.defaultLayoutId;
                const snippet = stripHtmlToText(
                  layout.headerText ||
                    layout.footerText ||
                    layout.termsText ||
                    "",
                );
                const duplicateName =
                  settings.layouts.filter(
                    (other) =>
                      other.name.toLowerCase() === layout.name.toLowerCase(),
                  ).length > 1;
                const title = duplicateName
                  ? `${layout.name} · ${layout.design}${index > 0 ? ` #${index + 1}` : ""}`
                  : layout.name;

                return (
                  <div
                    key={layout.id}
                    className={cn(
                      "hq6-layout-card",
                      active && "hq6-layout-card-active",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-bold text-[#111827]">
                          {title}
                          {active ? (
                            <span className="ml-2 rounded bg-[#dbeafe] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1d4ed8]">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm capitalize text-[#6b7280]">
                          {layout.design} style
                        </div>
                      </div>
                      <Hq6ActionsMenu
                        items={[
                          {
                            id: "edit",
                            label: "Edit",
                            onClick: () => {
                              setEditingLayout(layout);
                              setLayoutModal("edit");
                            },
                          },
                          {
                            id: "default",
                            label: "Set as default",
                            disabled: active,
                            onClick: () => setLayoutMutation.mutate(layout.id),
                          },
                          {
                            id: "delete",
                            label: "Delete",
                            disabled: active,
                            onClick: () => {
                              if (
                                window.confirm(
                                  `Delete layout “${layout.name}”?`,
                                )
                              ) {
                                deleteLayoutMutation.mutate(layout.id);
                              }
                            },
                          },
                        ]}
                      />
                    </div>

                    <LayoutStylePreview design={layout.design} />

                    <p className="mt-3 line-clamp-3 text-xs text-[#4b5563]">
                      {snippet || "No header / footer text set"}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        className="hq6-btn hq6-btn-outline"
                        onClick={() => {
                          setEditingLayout(layout);
                          setLayoutModal("edit");
                        }}
                      >
                        Edit style
                      </button>
                      <button
                        type="button"
                        className="hq6-btn hq6-btn-outline"
                        disabled={active}
                        onClick={() => setLayoutMutation.mutate(layout.id)}
                      >
                        {active ? "Default" : "Set default"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <Hq6InvoiceSchemeModal
        open={schemeModal !== null}
        mode={schemeModal === "edit" ? "edit" : "add"}
        initial={editing}
        saving={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setSchemeModal(null);
          setEditing(null);
        }}
        onSave={async (values) => {
          const payload = {
            name: values.name,
            prefix: values.prefix || null,
            startNumber: values.startNumber,
            totalDigits: values.totalDigits,
          };
          if (schemeModal === "edit" && editing) {
            updateMutation.mutate({ id: editing.id, ...payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />

      <Hq6InvoiceLayoutModal
        open={layoutModal !== null}
        mode={layoutModal === "edit" ? "edit" : "add"}
        initial={editingLayout}
        saving={
          createLayoutMutation.isPending || updateLayoutMutation.isPending
        }
        onClose={() => {
          setLayoutModal(null);
          setEditingLayout(null);
        }}
        onSave={async (values) => {
          const payload = {
            name: values.name,
            design: values.design,
            headerText: values.headerText || null,
            footerText: values.footerText || null,
            termsText: values.termsText || null,
            isDefault: values.isDefault,
          };
          if (layoutModal === "edit" && editingLayout) {
            updateLayoutMutation.mutate({ id: editingLayout.id, ...payload });
          } else {
            createLayoutMutation.mutate(payload);
          }
        }}
      />
    </Hq6PageFrame>
  );
}

export function BarcodeSettingsView() {
  const isHq6 = useIsVaHq6();
  const body = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Barcode Type</label>
          <MenuSelect
            value="C128"
            onChange={() => {}}
            options={[
              { value: "C128", label: "C128" },
              { value: "C39", label: "C39" },
              { value: "EAN-13", label: "EAN-13" },
              { value: "EAN-8", label: "EAN-8" },
              { value: "UPC-A", label: "UPC-A" },
              { value: "UPC-E", label: "UPC-E" },
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Sticker Sheet</label>
          <MenuSelect
            value="20"
            onChange={() => {}}
            options={[
              { value: "20", label: "20 per sheet (4 × 5)" },
              { value: "30", label: "30 per sheet (3 × 10)" },
              { value: "40", label: "40 per sheet (4 × 10)" },
            ]}
          />
        </div>
      </div>
      <div className="flex justify-end">
        {isHq6 ? (
          <button type="button" className="hq6-btn-purple">
            Save
          </button>
        ) : (
          <Button>Save Settings</Button>
        )}
      </div>
    </div>
  );

  if (isHq6) {
    return (
      <Hq6PageFrame title="Barcode Settings" subtitle="Manage barcodes">
        <div className="hq6-card p-4 md:p-6">{body}</div>
      </Hq6PageFrame>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Barcode Settings</h2>
        <p className="mt-1 text-sm text-muted">Configure barcode label format and content.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        {body}
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
            <MenuSelect
              value={printerType}
              searchable={false}
              onChange={setPrinterType}
              options={[
                { value: "browser", label: "Browser" },
                { value: "network", label: "Network" },
              ]}
            />
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
          <DataTableSkeleton
            rows={5}
            columnHeaders={["Name", "Type", "Connection", ""]}
            withPagination={false}
          />
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
