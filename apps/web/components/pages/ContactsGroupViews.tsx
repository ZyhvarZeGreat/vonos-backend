"use client";

import { useState } from "react";
import type { CustomerGroup, CsvImportResult } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { Hq6CustomerGroupsListView } from "@/components/pages/Hq6CustomerGroupsListView";
import { Hq6ImportContactsView } from "@/components/pages/Hq6ImportContactsView";
import { Hq6ImportOpeningStockView } from "@/components/pages/Hq6ImportOpeningStockView";
import { Hq6ImportProductsView } from "@/components/pages/Hq6ImportProductsView";
import { Hq6GuideImportPage } from "@/components/hq6/Hq6GuideImportPage";
import { getCustomerGroupsPage } from "@/lib/api/customerGroups";
import { importCustomers } from "@/lib/api/customers";
import { importItems } from "@/lib/api/items";
import { importSales } from "@/lib/api/sales";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
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
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6CustomerGroupsListView />;
  return <CustomerGroupsListViewBody />;
}

function CustomerGroupsListViewBody() {
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
    isPaging,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<CustomerGroup>({
    queryKey: ["customer-groups", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit, _sort, opts) => getCustomerGroupsPage(tenantId!, cursor, limit, { includeSummary: opts?.includeSummary }),
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
          isPaging={isPaging}
        error={error ? "Failed to load customer groups" : null}
        emptyState={{ message: "No customer groups defined yet. Create groups to apply bulk discounts." }}
      />
    </ListPageShell>
  );
}

export function ImportContactsView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6ImportContactsView />;
  return <ImportContactsViewBody />;
}

function ImportContactsViewBody() {
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
  const isHq6 = useIsVaHq6();
  if (!tenantId) return null;

  if (isHq6) return <Hq6ImportProductsView />;

  return (
    <CsvImportPanel
      title="Import Products"
      description="Upload a CSV file to bulk-import catalog items."
      expectedColumns="name, sku, category, unit, cost, price, quantity, reorder_point, description"
      onImport={(csv) => importItems(tenantId, csv)}
    />
  );
}

export function ImportOpeningStockView() {
  const isHq6 = useIsVaHq6();
  if (!isHq6) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Import opening stock is available in the HQ6 experience.
      </div>
    );
  }

  return <Hq6ImportOpeningStockView />;
}

export function ImportSalesView() {
  const tenantId = useTenantId();
  const isHq6 = useIsVaHq6();
  if (!tenantId) return null;

  if (isHq6) {
    return (
      <Hq6GuideImportPage
        title="Import Sales"
        uploadReviewLabel="Upload and review"
        numberedInstructions={[
          "Upload sales data in excel format.",
          "Choose business location and column by which sell lines will be grouped.",
          "Choose respective sales fields for each column.",
        ]}
        columns={HQ6_SALES_IMPORT_COLUMNS}
        historyTitle="Imports"
        historyColumns={[
          "Import batch",
          "Import time",
          "Created By",
          "Invoices",
          "Action",
        ]}
        onImport={(csv) => importSales(tenantId, csv)}
      />
    );
  }

  return (
    <CsvImportPanel
      title="Import Sales"
      description="Upload a CSV file to bulk-import historical sales."
      expectedColumns="reference, customer, date, sku, product name, quantity, unit_price, payment_method, payment_amount"
      onImport={(csv) => importSales(tenantId, csv)}
    />
  );
}

const HQ6_SALES_IMPORT_COLUMNS: Array<{ n: number; name: string; instruction: string }> = [
  { n: 1, name: "Invoice No.", instruction: "" },
  { n: 2, name: "Customer name", instruction: "" },
  {
    n: 3,
    name: "Customer Phone number",
    instruction: "Either customer email id or phone number required",
  },
  {
    n: 4,
    name: "Customer Email",
    instruction: "Either customer email id or phone number required",
  },
  {
    n: 5,
    name: "Sale Date",
    instruction: 'Sale date time format should be "Y-m-d H:i:s" (e.g., 2020-07-15 17:45:32)',
  },
  {
    n: 6,
    name: "Product Name",
    instruction: "Either product name (for single and combo only) or product sku required",
  },
  {
    n: 7,
    name: "Product SKU",
    instruction: "Either product name (for single and combo only) or product sku required",
  },
  { n: 8, name: "Quantity", instruction: "Required" },
  { n: 9, name: "Product Unit", instruction: "" },
  { n: 10, name: "Unit Price", instruction: "" },
  { n: 11, name: "Item Tax", instruction: "" },
  { n: 12, name: "Item Discount", instruction: "" },
  { n: 13, name: "Item Description", instruction: "" },
  { n: 14, name: "Order Total", instruction: "" },
];

export function ImportExpenseView() {
  const isHq6 = useIsVaHq6();
  if (!isHq6) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Import expenses is available in the HQ6 VA experience.
      </div>
    );
  }
  return (
    <Hq6GuideImportPage
      title="Import expense"
      columns={HQ6_EXPENSE_IMPORT_COLUMNS}
    />
  );
}

const HQ6_EXPENSE_IMPORT_COLUMNS: Array<{ n: number; name: string; instruction: string }> = [
  { n: 1, name: "Business Location", instruction: "" },
  {
    n: 2,
    name: "Expense Category (Optional)",
    instruction:
      "Name of the Category (If not found new category with the given name will be created)",
  },
  {
    n: 3,
    name: "Sub category (Optional)",
    instruction:
      "Name of the Sub-Category (If not found new sub-category with the given name under the parent Category will be created)",
  },
  { n: 4, name: "Reference No (Optional)", instruction: "Leave empty to autogenerate" },
  {
    n: 5,
    name: "Date (Optional)",
    instruction:
      "Expense date time format should be 'Y-m-d H:i:s' (2020-07-15 17:45:32)",
  },
  {
    n: 6,
    name: "Expense for (Optional)",
    instruction:
      "Choose the user (email/username) for which expense is related to (Optional)",
  },
  { n: 7, name: "Contact ID (Optional)", instruction: "" },
  { n: 8, name: "Attach Document (Optional)", instruction: "" },
  { n: 9, name: "Applicable Tax (Optional)", instruction: "" },
  { n: 10, name: "Expense note (Optional)", instruction: "" },
  { n: 11, name: "Total amount", instruction: "" },
  { n: 12, name: "Paid Amount", instruction: "" },
  {
    n: 13,
    name: "Paid on",
    instruction:
      "Expense date time format should be 'Y-m-d H:i:s' (2020-07-15 17:45:32)",
  },
  {
    n: 14,
    name: "Payment Method",
    instruction:
      "Cash, Card, Cheque, Bank Transfer, Other, POS 1, FCMB (Bank Transfer), GTB (Bank Transfer), Zenith (Bank Transfer), POS 2, Discount, Exchange",
  },
  { n: 15, name: "Payment Account (Optional)", instruction: "" },
  { n: 16, name: "Payment note (Optional)", instruction: "" },
];
