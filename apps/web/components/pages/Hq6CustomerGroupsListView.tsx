"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CustomerGroup } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  createCustomerGroup,
  deleteCustomerGroup,
  getCustomerGroupsPage,
  updateCustomerGroup,
} from "@/lib/api/customerGroups";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

/** HQ6 Customer Groups — ui-audit/06_customer-group + Edit modal walkthrough */
export function Hq6CustomerGroupsListView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const chrome = useHq6ListChrome();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerGroup | null>(null);
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    items,
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
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<CustomerGroup>({
    queryKey: ["customer-groups", tenantId, "hq6", search],
    enabled: Boolean(tenantId),
    filters: { search: search.trim() || undefined },
    search,
    fetchPage: (cursor, limit) =>
      getCustomerGroupsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
      }),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setDiscountPercent("0");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: CustomerGroup) => {
    setEditing(row);
    setName(row.name);
    setDiscountPercent(String(row.discountPercent));
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!tenantId || !name.trim()) {
      toast.error("Customer group name is required");
      return;
    }
    const pct = Number(discountPercent);
    if (Number.isNaN(pct)) {
      toast.error("Calculation percentage must be a number");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCustomerGroup(tenantId, editing.id, {
          name: name.trim(),
          discountPercent: pct,
        });
        toast.success("Customer group updated");
      } else {
        await createCustomerGroup(tenantId, {
          name: name.trim(),
          discountPercent: pct,
        });
        toast.success("Customer group created");
      }
      closeForm();
      await queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [closeForm, discountPercent, editing, name, queryClient, tenantId]);

  const handleDelete = useCallback(async () => {
    if (!tenantId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomerGroup(tenantId, deleteTarget.id);
      toast.success("Customer group deleted");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, queryClient, tenantId]);

  const columns: ColumnConfig<CustomerGroup>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Customer Group Name",
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "discountPercent",
        header: "Calculation Percentage (%)",
        sortValue: (row) => row.discountPercent,
        render: (row) => (
          <span className="tabular-nums">{row.discountPercent.toFixed(2)}</span>
        ),
      },
      {
        key: "priceGroup",
        header: "Selling Price Group",
        sortable: false,
        render: () => "—",
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="hq6-btn hq6-btn-outline text-xs"
              onClick={() => openEdit(row)}
            >
              Edit
            </button>
            <button
              type="button"
              className="hq6-btn hq6-btn-outline text-xs text-red-600"
              onClick={() => setDeleteTarget(row)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [openEdit],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  return (
    <Hq6StandardListShell
      slug="customer-groups"
      tabLabel="All Customer Groups"
      onAdd={openCreate}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={search}
      onSearchChange={setSearch}
      pagination={{
        pageIndex,
        pageSize,
        itemCount: items.length,
        hasMore,
        canGoPrev,
        onPrev: goPrev,
        onNext: goNext,
        onPageSizeChange: setPageSize,
        onPageSelect: goToPage,
        canSelectPage,
        totalItems: totalCount,
        isBusy: isFetching && !isLoading,
      }}
      modals={
        <>
          <Hq6Modal
            open={formOpen}
            onClose={closeForm}
            title={editing ? "Edit Customer Group" : "Add Customer Group"}
            size="md"
            footer={
              <Hq6ModalSaveClose
                onSave={() => void handleSave()}
                onClose={closeForm}
                saveLabel={editing ? "Update" : "Save"}
                saving={saving}
                saveDisabled={!name.trim()}
              />
            }
          >
            <div className="space-y-4">
              <Hq6Field label="Customer Group Name" required>
                <input
                  className="hq6-modal-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </Hq6Field>
              <Hq6Field label="Price calculation type">
                <select className="hq6-modal-input" value="percentage" disabled>
                  <option value="percentage">Percentage</option>
                </select>
              </Hq6Field>
              <Hq6Field label="Calculation Percentage (%)">
                <input
                  className="hq6-modal-input"
                  type="number"
                  step="0.01"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </Hq6Field>
            </div>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => void handleDelete()}
            title="Delete Customer Group"
            message={`Delete "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
            confirmLabel="Delete"
            confirming={deleting}
            danger
          />
        </>
      }
    >
      <DataTable
        data={items}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? "Failed to load customer groups." : null}
        emptyState={{ message: "No customer groups defined yet." }}
      />
    </Hq6StandardListShell>
  );
}
