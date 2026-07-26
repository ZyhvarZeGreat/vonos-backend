"use client";

import { useCallback, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ExpenseCategory } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategoriesPage,
  updateExpenseCategory,
} from "@/lib/api/expenses";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";

/** HQ6 Expense Categories — ui-audit/38_expense-categories */
export function Hq6ExpenseCategoriesListView() {
  const tenantId = useTenantId();
  const chrome = useHq6ListChrome("expense-categories");
  const exportList = useListExport();
  const [localSearch, setLocalSearch] = useState("");
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
    isPaging,
    error,
    goToPage,
    canSelectPage,
    totalCount,
  } = useServerListPage<ExpenseCategory>({
    queryKey: ["expense-categories", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      getExpenseCategoriesPage(tenantId!, cursor, limit, {
        includeSummary: opts?.includeSummary,
      }),
  });

  const filtered = useMemo(() => {
    if (!localSearch.trim()) return data;
    const q = localSearch.toLowerCase();
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.code ?? "").toLowerCase().includes(q),
    );
  }, [data, localSearch]);

  const createMutation = useAppMutation({
    mutationFn: () =>
      createExpenseCategory(tenantId!, {
        name: editName.trim(),
        code: editCode.trim() || undefined,
      }),
    successMessage: "Category created",
    optimistic: {
      keys: [["expense-categories", tenantId]],
      update: (qc) => {
        if (!tenantId) return;
        const now = new Date().toISOString();
        prependEntityInQueries(qc, ["expense-categories", tenantId], {
          id: optimisticTempId("expense-cat"),
          tenantId,
          name: editName.trim(),
          code: editCode.trim() || null,
          createdAt: now,
          updatedAt: now,
        } satisfies ExpenseCategory);
        setModalOpen(false);
      },
      commit: (qc, data) => {
        prependEntityInQueries(qc, ["expense-categories", tenantId], data);
      },
    },
    onError: () => {
      setModalOpen(true);
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: () =>
      updateExpenseCategory(tenantId!, editingId!, {
        name: editName.trim(),
        code: editCode.trim() || undefined,
      }),
    successMessage: "Category updated",
    optimistic: {
      keys: [["expense-categories", tenantId]],
      update: (qc) => {
        if (!editingId) return;
        patchEntityInQueries(qc, ["expense-categories", tenantId], editingId, {
          name: editName.trim(),
          code: editCode.trim() || null,
        });
        setModalOpen(false);
      },
    },
    onError: () => {
      setModalOpen(true);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteExpenseCategory(tenantId!, id),
    successMessage: "Category deleted",
    optimistic: {
      keys: [["expense-categories", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["expense-categories", tenantId], id);
      },
    },
    onSuccess: () => {
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

  const handleExport = useCallback(() => {
    exportList(
      "expense-categories",
      [
        { key: "name", header: "Category name" },
        { key: "code", header: "Category code" },
      ],
      filtered.map((row) => ({
        name: row.name,
        code: row.code ?? "",
      })),
    );
  }, [exportList, filtered]);

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

  const columnOptions = columns
    .filter((c) => c.key !== "id")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  return (
    <Hq6StandardListShell
      slug="expense-categories"
      title="Expense Categories"
      tabLabel="All your expense categories"
      boxTitle="All your expense categories"
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      searchPlaceholder="Search ..."
      columnOptions={columnOptions}
      onAdd={openAdd}
      onExport={handleExport}
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
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={
              modalMode === "edit"
                ? "Edit Expense Category"
                : "Add Expense Category"
            }
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
        error={error ? "Failed to load expense categories" : null}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
