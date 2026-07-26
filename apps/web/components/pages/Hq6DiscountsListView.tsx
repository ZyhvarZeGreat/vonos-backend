"use client";

import { useMemo, useState, useCallback } from "react";
import { Info } from "lucide-react";
import type { Discount, DiscountType } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import {
  createDiscount,
  deleteDiscount,
  getDiscountsPage,
  updateDiscount,
} from "@/lib/api/discounts";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useBusinessLocationOptions } from "@/lib/hooks/useBusinessLocationOptions";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatHq6DateTime } from "@/lib/utils/hq6Format";

function emptyDiscountForm() {
  return {
    name: "",
    products: "",
    brand: "",
    category: "",
    locationCode: "",
    priority: "",
    discountType: "percentage" as DiscountType,
    amount: "",
    startsAt: "",
    endsAt: "",
    sellingPriceGroup: "all",
    isActive: true,
    applyInCustomerGroups: false,
  };
}

/** HQ6 Discounts list — ui-audit/34_discount/screenshot.png */
export function Hq6DiscountsListView() {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const { options: locationOptions } = useBusinessLocationOptions(config);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);
  const [form, setForm] = useState(emptyDiscountForm);
  const [localSearch, setLocalSearch] = useState("");
  const chrome = useHq6ListChrome("discounts");

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
    totalCount,
  } = useServerListPage<Discount>({
    queryKey: ["discounts", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) => getDiscountsPage(tenantId!, cursor, limit, { includeSummary: opts?.includeSummary }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyDiscountForm());
    setFormOpen(true);
  };

  const openEdit = (row: Discount) => {
    setEditing(row);
    setForm({
      ...emptyDiscountForm(),
      name: row.name,
      discountType: row.discountType,
      amount: String(row.amount),
      isActive: row.isActive,
      startsAt: row.startsAt ? row.startsAt.slice(0, 16) : "",
      endsAt: row.endsAt ? row.endsAt.slice(0, 16) : "",
    });
    setFormOpen(true);
  };

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      if (!form.name.trim()) throw new Error("Name is required");
      if (!form.locationCode.trim() && locationOptions.some((o) => o.value)) {
        // Location required in HQ6 UI — allow empty when tenant has no locations.
      }
      const payload = {
        name: form.name.trim(),
        discountType: form.discountType,
        amount: Number(form.amount) || 0,
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      };
      if (editing) {
        return updateDiscount(tenantId, editing.id, payload);
      }
      return createDiscount(tenantId, payload);
    },
    successMessage: editing ? "Discount updated" : "Discount created",
    optimistic: {
      keys: [["discounts"]],
      update: (qc) => {
        const startsAt = form.startsAt
          ? new Date(form.startsAt).toISOString()
          : null;
        const endsAt = form.endsAt
          ? new Date(form.endsAt).toISOString()
          : null;
        const amount = Number(form.amount) || 0;
        if (editing) {
          patchEntityInQueries(qc, ["discounts"], editing.id, {
            name: form.name.trim(),
            discountType: form.discountType,
            amount,
            isActive: form.isActive,
            startsAt,
            endsAt,
          });
        } else if (tenantId) {
          const now = new Date().toISOString();
          prependEntityInQueries(qc, ["discounts"], {
            id: optimisticTempId("discount"),
            tenantId,
            name: form.name.trim(),
            discountType: form.discountType,
            amount,
            isActive: form.isActive,
            startsAt,
            endsAt,
            createdAt: now,
            updatedAt: now,
          } satisfies Discount);
        }
        setFormOpen(false);
      },
      commit: (qc, data) => {
        prependEntityInQueries(qc, ["discounts"], data);
      },
    },
    onSuccess: () => {
      setEditing(null);
      setForm(emptyDiscountForm());
    },
    onError: () => {
      setFormOpen(true);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId || !deleteTarget) throw new Error("Nothing to delete");
      await deleteDiscount(tenantId, deleteTarget.id);
    },
    successMessage: "Discount deleted",
    optimistic: {
      keys: [["discounts"]],
      update: (qc) => {
        if (!deleteTarget) return;
        removeEntityFromQueries(qc, ["discounts"], deleteTarget.id);
      },
    },
    onSuccess: () => {
      setDeleteTarget(null);
    },
  });

  const columns: ColumnConfig<Discount>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "startsAt",
        header: "Starts At",
        sortValue: (row) =>
          row.startsAt ? new Date(row.startsAt).getTime() : 0,
        render: (row) =>
          row.startsAt ? formatHq6DateTime(row.startsAt) : "",
      },
      {
        key: "endsAt",
        header: "Ends At",
        sortValue: (row) => (row.endsAt ? new Date(row.endsAt).getTime() : 0),
        render: (row) =>
          row.endsAt ? formatHq6DateTime(row.endsAt) : "",
      },
      {
        key: "amount",
        header: "Discount Amount",
        render: (row) =>
          row.discountType === "percentage"
            ? `${row.amount}%`
            : formatCurrency(row.amount),
      },
      {
        key: "priority",
        header: "Priority",
        sortable: false,
        render: () => "",
      },
      {
        key: "brand",
        header: "Brand",
        sortable: false,
        render: () => "",
      },
      {
        key: "category",
        header: "Category",
        sortable: false,
        render: () => "",
      },
      {
        key: "products",
        header: "Products",
        sortable: false,
        render: () => "",
      },
      {
        key: "location",
        header: "Location",
        sortable: false,
        render: () => "",
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              { id: "edit", label: "Edit", onClick: () => openEdit(row) },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteTarget(row),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  const filtered = useMemo(() => {
    if (!localSearch.trim()) return items;
    const q = localSearch.toLowerCase();
    return items.filter((row) => row.name.toLowerCase().includes(q));
  }, [items, localSearch]);

  const exportList = useListExport();
  const handleExport = useCallback(() => {
    exportList(
      "discounts",
      [
        { key: "name", header: "Name" },
        { key: "startsAt", header: "Starts At" },
        { key: "endsAt", header: "Ends At" },
        { key: "amount", header: "Discount Amount" },
        { key: "priority", header: "Priority" },
        { key: "brand", header: "Brand" },
        { key: "category", header: "Category" },
        { key: "products", header: "Products" },
        { key: "location", header: "Location" },
      ],
      filtered.map((r) => ({
        name: r.name,
        startsAt: r.startsAt ? formatHq6DateTime(r.startsAt) : "",
        endsAt: r.endsAt ? formatHq6DateTime(r.endsAt) : "",
        amount:
          r.discountType === "percentage"
            ? `${r.amount}%`
            : formatCurrency(r.amount),
        priority: "",
        brand: "",
        category: "",
        products: "",
        location: "",
      })),
    );
  }, [exportList, filtered]);

  const patchForm = (patch: Partial<ReturnType<typeof emptyDiscountForm>>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  return (
    <Hq6StandardListShell
      slug="discounts"
      title="Discount"
      tabLabel="Discount"
      boxTitle=""
      addLabel="Add"
      onAdd={openCreate}
      onExport={handleExport}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      searchPlaceholder="Search ..."
      pagination={{
        pageIndex,
        pageSize,
        itemCount: filtered.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isPaging,
      }}
      modals={
        <>
          <Hq6Modal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            title={editing ? "Edit Discount" : "Add Discount"}
            size="lg"
            footer={
              <Hq6ModalSaveClose
                onSave={() => saveMutation.mutate()}
                onClose={() => setFormOpen(false)}
                saving={saveMutation.isPending}
                saveLabel="Save"
              />
            }
          >
            <div className="grid gap-3">
              <Hq6Field label="Name" required>
                <input
                  className="hq6-modal-input"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                />
              </Hq6Field>
              <Hq6Field label="Products">
                <input
                  className="hq6-modal-input"
                  placeholder="Products"
                  value={form.products}
                  onChange={(e) => patchForm({ products: e.target.value })}
                />
              </Hq6Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Hq6Field label="Brand">
                  <select
                    className="hq6-modal-input"
                    value={form.brand}
                    onChange={(e) => patchForm({ brand: e.target.value })}
                  >
                    <option value="">Please Select</option>
                  </select>
                </Hq6Field>
                <Hq6Field label="Category">
                  <select
                    className="hq6-modal-input"
                    value={form.category}
                    onChange={(e) => patchForm({ category: e.target.value })}
                  >
                    <option value="">Please Select</option>
                  </select>
                </Hq6Field>
                <Hq6Field label="Location" required>
                  <select
                    className="hq6-modal-input"
                    value={form.locationCode}
                    onChange={(e) =>
                      patchForm({ locationCode: e.target.value })
                    }
                  >
                    <option value="">Please Select</option>
                    {locationOptions
                      .filter((o) => o.value)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </Hq6Field>
                <Hq6Field
                  label="Priority"
                  hint={
                    <Info className="inline h-3.5 w-3.5 text-[#3c8dbc]" aria-hidden />
                  }
                >
                  <input
                    className="hq6-modal-input"
                    placeholder="Priority"
                    value={form.priority}
                    onChange={(e) => patchForm({ priority: e.target.value })}
                  />
                </Hq6Field>
                <Hq6Field label="Discount Type" required>
                  <select
                    className="hq6-modal-input"
                    value={form.discountType}
                    onChange={(e) =>
                      patchForm({
                        discountType: e.target.value as DiscountType,
                      })
                    }
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </Hq6Field>
                <Hq6Field label="Discount Amount" required>
                  <input
                    className="hq6-modal-input"
                    type="number"
                    placeholder="Discount Amount"
                    value={form.amount}
                    onChange={(e) => patchForm({ amount: e.target.value })}
                  />
                </Hq6Field>
                <Hq6Field label="Starts At">
                  <input
                    className="hq6-modal-input"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => patchForm({ startsAt: e.target.value })}
                  />
                </Hq6Field>
                <Hq6Field label="Ends At">
                  <input
                    className="hq6-modal-input"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => patchForm({ endsAt: e.target.value })}
                  />
                </Hq6Field>
                <Hq6Field label="Selling Price Group">
                  <select
                    className="hq6-modal-input"
                    value={form.sellingPriceGroup}
                    onChange={(e) =>
                      patchForm({ sellingPriceGroup: e.target.value })
                    }
                  >
                    <option value="all">All</option>
                  </select>
                </Hq6Field>
                <label className="flex items-end gap-2 pb-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => patchForm({ isActive: e.target.checked })}
                  />
                  Is active
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#111827]">
                <input
                  type="checkbox"
                  checked={form.applyInCustomerGroups}
                  onChange={(e) =>
                    patchForm({ applyInCustomerGroups: e.target.checked })
                  }
                />
                Apply in customer groups
              </label>
            </div>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteMutation.mutate()}
            title="Delete discount"
            message={`Delete “${deleteTarget?.name ?? ""}”? This cannot be undone.`}
            confirmLabel="Delete"
            danger
            confirming={deleteMutation.isPending}
          />
        </>
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load discounts." : null}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
