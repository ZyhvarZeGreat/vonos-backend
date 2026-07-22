"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import type { ExpenseCategory } from "@vonos/types";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategoriesPage,
  updateExpenseCategory,
} from "@/lib/api/expenses";
import { useExpensePageTabs } from "@/lib/hooks/useExpensePageTabs";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

export function Hq6ExpenseCategoriesListView() {
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const { tabs, activeTab, onTabChange } = useExpensePageTabs("expense-categories");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [asSubCategory, setAsSubCategory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseCategory | null>(null);

  const {
    items: data,
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
  } = useServerListPage<ExpenseCategory>({
    queryKey: ["expense-categories", tenantId],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit) => getExpenseCategoriesPage(tenantId!, cursor, limit),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createExpenseCategory(tenantId!, {
        name: editName.trim(),
        code: editCode.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-categories", tenantId] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateExpenseCategory(tenantId!, editingId!, {
        name: editName.trim(),
        code: editCode.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-categories", tenantId] });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tenantId!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expense-categories", tenantId] });
      setConfirmDelete(null);
    },
  });

  const openAdd = () => {
    setModalMode("add");
    setEditingId(null);
    setEditName("");
    setEditCode("");
    setAsSubCategory(false);
    setModalOpen(true);
  };

  const openEdit = (row: ExpenseCategory) => {
    setModalMode("edit");
    setEditingId(row.id);
    setEditName(row.name);
    setEditCode(row.code ?? "");
    setAsSubCategory(false);
    setModalOpen(true);
  };

  const columns: ColumnConfig<ExpenseCategory>[] = [
    {
      key: "name",
      header: "Category name",
      render: (r) => (
        <span className="font-medium uppercase text-[#111827]">{r.name}</span>
      ),
    },
    {
      key: "code",
      header: "Category code",
      render: (r) => r.code ?? "",
    },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="hq6-meta-btn-edit"
            onClick={() => openEdit(r)}
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
          <button
            type="button"
            className="hq6-meta-btn-delete"
            onClick={() => setConfirmDelete(r)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <ListPageShell
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      showImport={false}
      showDateRange={false}
      showSearch={false}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Expense Categories</h2>
          <p className="text-sm text-[#6b7280]">Manage your expense categories</p>
        </div>
        <button type="button" className="hq6-btn-blue" onClick={openAdd}>
          + Add
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        <div className="border-b border-[#e5e7eb] px-4 py-3 text-sm font-semibold text-[#111827]">
          All your expense categories
        </div>
        <ServerPaginatedTable
          items={data}
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
          error={error ? "Failed to load expense categories" : null}
          emptyState={{
            message: "No expense categories yet. Create one to classify business expenses.",
          }}
        />
      </div>

      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "edit" ? "Edit Expense Category" : "Add Expense Category"}
        footer={
          <Hq6ModalSaveClose
            onSave={() => {
              if (modalMode === "edit") updateMutation.mutate();
              else createMutation.mutate();
            }}
            onClose={() => setModalOpen(false)}
            saveLabel={modalMode === "edit" ? "Update" : "Save"}
            saving={createMutation.isPending || updateMutation.isPending}
            saveDisabled={!editName.trim()}
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Category name" required>
            <input
              className="hq6-modal-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Category code">
            <input
              className="hq6-modal-input"
              placeholder="Category code"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
            />
          </Hq6Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <input
              type="checkbox"
              checked={asSubCategory}
              onChange={(e) => setAsSubCategory(e.target.checked)}
            />
            Add as sub-category
          </label>
        </div>
      </Hq6Modal>

      <Hq6ConfirmModal
        open={Boolean(confirmDelete)}
        title="Delete expense category"
        message={
          confirmDelete
            ? `Delete category "${confirmDelete.name}"? Expenses keep their data.`
            : ""
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
        }}
        onClose={() => setConfirmDelete(null)}
        confirming={deleteMutation.isPending}
      />
    </ListPageShell>
  );
}
