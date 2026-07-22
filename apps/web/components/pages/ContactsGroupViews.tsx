"use client";

import { useState } from "react";
import type { CustomerGroup, CsvImportResult } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { Hq6CustomerGroupsListView } from "@/components/pages/Hq6CustomerGroupsListView";
import { Hq6GuideImportPage } from "@/components/hq6/Hq6GuideImportPage";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
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
  const isHq6 = useIsVaHq6();
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

  const body = (
    <div className={isHq6 ? "space-y-6" : "mx-auto max-w-2xl space-y-6 py-8"}>
      {!isHq6 ? (
        <div>
          <h2 className="text-lg font-semibold text-foreground">Import Contacts</h2>
          <p className="mt-1 text-sm text-muted">
            Upload a CSV file to bulk-import suppliers or customers.
          </p>
        </div>
      ) : null}

      <div
        className={
          isHq6
            ? "rounded-lg border border-[#e5e7eb] bg-white p-5"
            : "rounded-xl border border-dashed border-border bg-card p-8 text-center"
        }
      >
        <div className={isHq6 ? "flex flex-wrap items-end gap-3" : undefined}>
          <div className={isHq6 ? "min-w-[220px]" : undefined}>
            {isHq6 ? (
              <label className="mb-1 block text-sm font-semibold text-[#374151]">
                File To Import:
              </label>
            ) : null}
            <input
              type="file"
              accept=".csv,.xlsx"
              className={isHq6 ? "block w-full text-sm" : "hidden"}
              id="contact-import-file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {!isHq6 ? (
              <label
                htmlFor="contact-import-file"
                className="cursor-pointer text-sm text-brand-primary hover:underline"
              >
                {file ? file.name : "Click to select a CSV or Excel file"}
              </label>
            ) : null}
          </div>
          {isHq6 ? (
            <>
              <button
                type="button"
                className="hq6-btn hq6-btn-blue"
                disabled={!file || isImporting}
                onClick={() => void handleImport()}
              >
                {isImporting ? "Importing…" : "Submit"}
              </button>
              <a
                className="hq6-btn hq6-btn-outline"
                href="/templates/contacts-import.csv"
                download
              >
                Download template file
              </a>
            </>
          ) : null}
        </div>
      </div>

      <div
        className={
          isHq6
            ? "rounded-lg border border-[#e5e7eb] bg-white p-5 text-sm"
            : "rounded-lg border border-border bg-surface-secondary p-4 text-sm text-muted"
        }
      >
        <p className={isHq6 ? "mb-3 font-medium text-[#111827]" : "font-medium text-foreground"}>
          {isHq6
            ? "Carefully follow the instructions before importing the file. The columns of the CSV file should be in the following order."
            : "Expected columns:"}
        </p>
        {isHq6 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                  <th className="pb-2 pr-3 font-medium">Column Number</th>
                  <th className="pb-2 pr-3 font-medium">Column Name</th>
                  <th className="pb-2 font-medium">Instruction</th>
                </tr>
              </thead>
              <tbody>
                {HQ6_CONTACT_IMPORT_COLUMNS.map((col) => (
                  <tr key={col.n} className="border-b border-[#f3f4f6]">
                    <td className="py-2 pr-3 tabular-nums">{col.n}</td>
                    <td className="py-2 pr-3 font-medium text-[#111827]">{col.name}</td>
                    <td className="py-2 text-[#6b7280]">{col.instruction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-1">
            contact_type, name, business_name, email, mobile, tax_number,
            opening_balance, pay_term_number, pay_term_type, address, city,
            state, country, zip_code, custom_field_1 … custom_field_10
          </p>
        )}
      </div>

      {!isHq6 ? (
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
      ) : result ? (
        <p className="text-sm text-[#6b7280]">
          Imported {result.created} contact(s)
          {result.errors.length > 0 ? ` · ${result.errors.length} error(s)` : ""}
        </p>
      ) : null}
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

  if (isHq6) {
    return <Hq6PageFrame title="Import Contacts">{body}</Hq6PageFrame>;
  }
  return body;
}

const HQ6_CONTACT_IMPORT_COLUMNS: Array<{
  n: number;
  name: string;
  instruction: string;
}> = [
  { n: 1, name: "Contact type", instruction: "Required — customer / supplier / both" },
  { n: 2, name: "Prefix", instruction: "Optional" },
  { n: 3, name: "First Name", instruction: "Required" },
  { n: 4, name: "Middle name", instruction: "Optional" },
  { n: 5, name: "Last Name", instruction: "Optional" },
  { n: 6, name: "Business Name", instruction: "Optional" },
  { n: 7, name: "Contact ID", instruction: "Optional — leave blank to auto-generate" },
  { n: 8, name: "Tax number", instruction: "Optional" },
  { n: 9, name: "Opening Balance", instruction: "Optional" },
  { n: 10, name: "Pay term number", instruction: "Optional" },
  { n: 11, name: "Pay term type", instruction: "Optional — days / months" },
  { n: 12, name: "Credit Limit", instruction: "Optional" },
  { n: 13, name: "Email", instruction: "Optional" },
  { n: 14, name: "Mobile", instruction: "Required" },
  { n: 15, name: "Alternate contact number", instruction: "Optional" },
  { n: 16, name: "Landline", instruction: "Optional" },
  { n: 17, name: "City", instruction: "Optional" },
  { n: 18, name: "State", instruction: "Optional" },
  { n: 19, name: "Country", instruction: "Optional" },
  { n: 20, name: "Address line 1", instruction: "Optional" },
  { n: 21, name: "Address line 2", instruction: "Optional" },
  { n: 22, name: "Zip Code", instruction: "Optional" },
  { n: 23, name: "Date of birth", instruction: "Optional — Format Y-m-d" },
  { n: 24, name: "Custom Field 1", instruction: "Optional" },
  { n: 25, name: "Custom Field 2", instruction: "Optional" },
  { n: 26, name: "Custom Field 3", instruction: "Optional" },
  { n: 27, name: "Custom Field 4", instruction: "Optional" },
];

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
