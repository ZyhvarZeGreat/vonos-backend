"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import type { Discount, DiscountType, Item, VariationTemplate } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { SalesListView } from "@/components/pages/EntityListViews";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6DiscountsListView } from "@/components/pages/Hq6DiscountsListView";
import { Hq6SalesListView } from "@/components/pages/Hq6SalesListView";
import {
  createDiscount,
  deleteDiscount,
  getDiscountsPage,
} from "@/lib/api/discounts";
import { bulkUpdatePrices, getAllItems } from "@/lib/api/items";
import {
  createVariation,
  deleteVariation,
  getVariationsPage,
} from "@/lib/api/variations";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export function ListPosView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) {
    // HQ6 “List POS” is a sales list (invoice columns), not cash registers.
    return (
      <Hq6SalesListView
        saleStatus="completed"
        tabLabel="List POS"
        hidePrimaryAction
        slug="pos"
      />
    );
  }
  return <SalesListView saleStatus="completed" tabLabel="POS Sales" hidePrimaryAction />;
}

export function ShipmentsListView() {
  return (
    <SalesListView shipmentsOnly tabLabel="All shipments" hidePrimaryAction slug="shipments" />
  );
}

export function UpdatePriceView() {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"fixed" | "percentage">("percentage");
  const [adjustmentValue, setAdjustmentValue] = useState("10");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => (config?.itemCategories ?? []).map((c) => ({ value: c, label: c })),
    [config?.itemCategories],
  );

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      const value = Number(adjustmentValue);
      if (!Number.isFinite(value)) throw new Error("Enter a valid adjustment value");
      return bulkUpdatePrices(tenantId, {
        category: category || undefined,
        adjustmentType,
        adjustmentValue: value,
      });
    },
    onSuccess: async (data) => {
      setResult(`Updated ${data.updated} product price(s).`);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setResult(null);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Update Price</h2>
        <p className="mt-1 text-sm text-muted">
          Bulk-adjust selling prices for all products or a single category.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <Select
          label="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: "", label: "All products" }, ...categoryOptions]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Adjustment type"
            value={adjustmentType}
            onChange={(e) =>
              setAdjustmentType(e.target.value as "fixed" | "percentage")
            }
            options={[
              { value: "percentage", label: "Percentage (%)" },
              { value: "fixed", label: "Fixed amount (NGN)" },
            ]}
          />
          <Input
            label={adjustmentType === "percentage" ? "Percentage change" : "Amount to add"}
            type="number"
            value={adjustmentValue}
            onChange={(e) => setAdjustmentValue(e.target.value)}
            placeholder={adjustmentType === "percentage" ? "e.g. 10" : "e.g. 500"}
          />
        </div>
        <p className="text-xs text-muted">
          Percentage applies to current unit price (use negative values to decrease).
        </p>
        {result ? <p className="text-sm text-success">{result}</p> : null}
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <div className="flex justify-end">
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Updating…" : "Apply to products"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DiscountsListView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6DiscountsListView />;
  return <DiscountsListViewBody />;
}

function DiscountsListViewBody() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [amount, setAmount] = useState("5");

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
  } = useServerListPage<Discount>({
    queryKey: ["discounts", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit, _sort, opts) => getDiscountsPage(tenantId!, cursor, limit, { includeSummary: opts?.includeSummary }),
  });

  const createMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return createDiscount(tenantId, {
        name: name.trim(),
        discountType,
        amount: Number(amount) || 0,
      });
    },
    successMessage: "Discount created",
    onSuccess: async () => {
      setFormOpen(false);
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
  });

  const columns: ColumnConfig<Discount>[] = useMemo(
    () => [
      { key: "name", header: "Name" },
      {
        key: "discountType",
        header: "Type",
        render: (row) => (row.discountType === "percentage" ? "Percentage" : "Fixed"),
      },
      {
        key: "amount",
        header: "Amount",
        render: (row) =>
          row.discountType === "percentage" ? `${row.amount}%` : formatCurrency(row.amount),
      },
      {
        key: "isActive",
        header: "Status",
        render: (row) => (
          <span className={row.isActive ? "text-success" : "text-muted"}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (row) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (!tenantId) return;
              await deleteDiscount(tenantId, row.id);
              await queryClient.invalidateQueries({ queryKey: ["discounts"] });
            }}
          >
            Delete
          </Button>
        ),
      },
    ],
    [queryClient, tenantId],
  );

  return (
    <ListPageShell
      tabs={[{ id: "discounts", label: "Discounts" }]}
      activeTab="discounts"
      onTabChange={() => {}}
      primaryAction={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          Add discount
        </Button>
      }
      showImport={false}
    >
      {formOpen ? (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              options={[
                { value: "percentage", label: "Percentage" },
                { value: "fixed", label: "Fixed" },
              ]}
            />
            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
      <ServerPaginatedTable
        items={items}
        columns={columns}
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
        error={error ? "Failed to load discounts" : null}
        emptyState={{ message: "No discounts yet." }}
      />
    </ListPageShell>
  );
}

export function VariationsListView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [valuesText, setValuesText] = useState("");

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
  } = useServerListPage<VariationTemplate>({
    queryKey: ["variations", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit, _sort, opts) => getVariationsPage(tenantId!, cursor, limit, { includeSummary: opts?.includeSummary }),
  });

  const createMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      const values = valuesText
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length === 0) throw new Error("Add at least one value");
      return createVariation(tenantId, { name: name.trim(), values });
    },
    successMessage: "Variation template saved",
    onSuccess: async () => {
      setFormOpen(false);
      setName("");
      setValuesText("");
      await queryClient.invalidateQueries({ queryKey: ["variations"] });
    },
  });

  const columns: ColumnConfig<VariationTemplate>[] = useMemo(
    () => [
      { key: "name", header: "Template" },
      {
        key: "values",
        header: "Values",
        render: (row) => row.values.join(", "),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (row) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (!tenantId) return;
              await deleteVariation(tenantId, row.id);
              await queryClient.invalidateQueries({ queryKey: ["variations"] });
            }}
          >
            Delete
          </Button>
        ),
      },
    ],
    [queryClient, tenantId],
  );

  return (
    <ListPageShell
      tabs={[{ id: "variations", label: "Variations" }]}
      activeTab="variations"
      onTabChange={() => {}}
      primaryAction={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          Add template
        </Button>
      }
      showImport={false}
    >
      {formOpen ? (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-4">
          <Input
            label="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Size"
          />
          <Input
            label="Values (comma-separated)"
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            placeholder="S, M, L, XL"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
      <ServerPaginatedTable
        items={items}
        columns={columns}
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
        error={error ? "Failed to load variations" : null}
        emptyState={{ message: "No variation templates yet." }}
      />
    </ListPageShell>
  );
}

export function PrintLabelsView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadProducts() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const items = await getAllItems(tenantId, { search: search.trim() || undefined });
      setSelected(items.slice(0, 24));
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 py-6 print:py-0">
      <div className="print:hidden">
        <h2 className="text-lg font-semibold text-foreground">Print Labels</h2>
        <p className="mt-1 text-sm text-muted">
          Load products and print barcode-style shelf labels.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[240px]"
          />
          <div className="flex items-end gap-2">
            <Button disabled={loading} onClick={loadProducts}>
              {loading ? "Loading…" : "Load products"}
            </Button>
            <Button variant="secondary" disabled={selected.length === 0} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {selected.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-3 text-center print:break-inside-avoid"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.sku}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{item.name}</p>
            <p className="mt-2 font-mono text-lg tracking-widest">{item.sku.replace(/-/g, "")}</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(item.costPrice, item.currency)}</p>
          </div>
        ))}
      </div>
      {selected.length === 0 ? (
        <p className="text-sm text-muted print:hidden">Load products to preview labels.</p>
      ) : null}
    </div>
  );
}
