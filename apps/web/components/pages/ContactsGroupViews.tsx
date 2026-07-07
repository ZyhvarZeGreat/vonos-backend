"use client";

import { useState } from "react";
import type { CustomerGroup } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getCustomerGroupsPage } from "@/lib/api/customerGroups";
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
    error,
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
        isLoading={isLoading}
        error={error ? "Failed to load customer groups" : null}
        emptyState={{ message: "No customer groups defined yet. Create groups to apply bulk discounts." }}
      />
    </ListPageShell>
  );
}

export function ImportContactsView() {
  const [file, setFile] = useState<File | null>(null);

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

      <div className="flex justify-end">
        <Button disabled={!file}>Import</Button>
      </div>
    </div>
  );
}
