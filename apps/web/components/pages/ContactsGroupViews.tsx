"use client";

import { useState } from "react";
import type { CustomerGroup, CsvImportResult } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getCustomerGroupsPage } from "@/lib/api/customerGroups";
import { importCustomers } from "@/lib/api/customers";
import { importItems } from "@/lib/api/items";
import { importSales } from "@/lib/api/sales";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const customerGroupColumns: ColumnConfig<CustomerGroup>[] = [
  {
    key: "name",
    header: "Name",
    render: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    key: "discountPercent",
    header: "Discount %",
    sortValue: (r) => r.discountPercent,
    render: (r) => <span className="tabular-nums">{r.discountPercent}%</span>,
  },
  {
    key: "actions",
    header: "Action",
    render: () => (
      <div className="flex gap-1">
        <Button variant="secondary" size="sm">Edit</Button>
        <Button variant="secondary" size="sm" className="text-red-600">Delete</Button>
      </div>
    ),
  },
];

export function CustomerGroupsListView() {
  const tenantId = useTenantId();

  const {
    items,
    hasMore,
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
  } = useServerListPage<CustomerGroup>({
    queryKey: ["customer-groups", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit) => getCustomerGroupsPage(tenantId!, cursor, limit),
  });

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "Customer Groups" }]}
      activeTab="all"
      onTabChange={() => {}}
      showImport={false}
      showDateRange={false}
    >
      <ServerPaginatedTable
        items={items}
        columns={customerGroupColumns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        onPageSelect={goToPage}
        canSelectPage={canSelectPage}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error ? "Failed to load customer groups" : null}
        emptyState={{ message: "No customer groups defined yet. Create groups to apply bulk discounts." }}
      />
    </ListPageShell>
  );
}

export function ImportContactsView() {
  const tenantId = useTenantId();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImport() {
    if (!file || !tenantId) return;
    setIsImporting(true);
    setError(null);
    try {
      const csv = await file.text();
      const importResult = await importCustomers(tenantId, csv);
      setResult(importResult);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Import Contacts</h2>
        <p className="mt-1 text-sm text-muted">
          Upload a CSV file to bulk-import suppliers or customers.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <input
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          id="contact-import-file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor="contact-import-file"
          className="cursor-pointer text-sm text-brand-primary hover:underline"
        >
          {file ? file.name : "Click to select a CSV or Excel file"}
        </label>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Expected columns:</p>
        <p className="mt-1">
          contact_type, name, business_name, email, mobile, tax_number,
          opening_balance, pay_term_number, pay_term_type, address, city,
          state, country, zip_code, custom_field_1 … custom_field_10
        </p>
      </div>

      <div className="flex justify-end gap-3">
        {result ? (
          <p className="self-center text-sm text-muted">
            Imported {result.created} contact(s)
            {result.errors.length > 0 ? ` · ${result.errors.length} error(s)` : ""}
          </p>
        ) : null}
        <Button disabled={!file || isImporting} onClick={handleImport}>
          {isImporting ? "Importing…" : "Import"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {result?.errors.length ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          {result.errors.slice(0, 10).map((row) => (
            <p key={`${row.row}-${row.message}`} className="text-muted">
              Row {row.row}: {row.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CsvImportPanel({
  title,
  description,
  expectedColumns,
  onImport,
}: {
  title: string;
  description: string;
  expectedColumns: string;
  onImport: (csv: string) => Promise<CsvImportResult>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImport() {
    if (!file) return;
    setIsImporting(true);
    setError(null);
    try {
      const csv = await file.text();
      const importResult = await onImport(csv);
      setResult(importResult);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          id={`import-${title.replace(/\s+/g, "-").toLowerCase()}`}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label
          htmlFor={`import-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="cursor-pointer text-sm text-brand-primary hover:underline"
        >
          {file ? file.name : "Click to select a CSV file"}
        </label>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Expected columns:</p>
        <p className="mt-1">{expectedColumns}</p>
      </div>

      <div className="flex justify-end gap-3">
        {result ? (
          <p className="self-center text-sm text-muted">
            Imported {result.created} row(s)
            {result.errors.length > 0 ? ` · ${result.errors.length} error(s)` : ""}
          </p>
        ) : null}
        <Button disabled={!file || isImporting} onClick={handleImport}>
          {isImporting ? "Importing…" : "Import"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {result?.errors.length ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          {result.errors.slice(0, 10).map((row) => (
            <p key={`${row.row}-${row.message}`} className="text-muted">
              Row {row.row}: {row.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ImportProductsView() {
  const tenantId = useTenantId();
  if (!tenantId) return null;

  return (
    <CsvImportPanel
      title="Import Products"
      description="Upload a CSV file to bulk-import catalog items."
      expectedColumns="name, sku, category, unit, cost, price, quantity, reorder_point, description"
      onImport={(csv) => importItems(tenantId, csv)}
    />
  );
}

export function ImportSalesView() {
  const tenantId = useTenantId();
  if (!tenantId) return null;

  return (
    <CsvImportPanel
      title="Import Sales"
      description="Upload a CSV file to bulk-import historical sales."
      expectedColumns="reference, customer, date, sku, product name, quantity, unit_price, payment_method, payment_amount"
      onImport={(csv) => importSales(tenantId, csv)}
    />
  );
}
