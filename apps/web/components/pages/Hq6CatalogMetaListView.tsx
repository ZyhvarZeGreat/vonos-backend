"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import type {
  Brand,
  ProductCategory,
  ProductUnit,
  SellingPriceGroup,
  Warranty,
} from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { CatalogMetaCreateBar } from "@/components/molecules/CatalogMetaCreateBar";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import {
  deleteCatalogMeta,
  getCatalogMetaPage,
  updateCatalogMeta,
  type CatalogMetaKind,
  type CatalogMetaRow,
} from "@/lib/api/catalogMeta";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { toast } from "@/stores/toastStore";

interface MetaRow {
  id: string;
  name: string;
  code?: string;
  description?: string;
  shortName?: string;
  allowDecimal?: boolean;
  durationLabel?: string;
  isActive?: boolean;
  asSubTaxonomy?: boolean;
}

const SLUG_BY_KIND: Record<CatalogMetaKind, string> = {
  categories: "categories",
  brands: "brands",
  units: "units",
  warranties: "warranties",
  "price-groups": "price-groups",
};

function toMetaRows(kind: CatalogMetaKind, data: CatalogMetaRow[]): MetaRow[] {
  switch (kind) {
    case "categories":
      return (data as ProductCategory[]).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.shortCode ?? undefined,
        description: row.description ?? undefined,
        asSubTaxonomy: Boolean(row.parentId),
      }));
    case "brands":
      return (data as Brand[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
      }));
    case "units":
      return (data as ProductUnit[]).map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.shortName,
        allowDecimal: row.allowDecimal,
      }));
    case "warranties":
      return (data as Warranty[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        durationLabel: `${row.duration} ${row.durationType}`,
      }));
    case "price-groups":
      return (data as SellingPriceGroup[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        isActive: row.isActive,
      }));
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function emptyEditState() {
  return {
    name: "",
    code: "",
    description: "",
    shortName: "",
    allowDecimal: false,
    asSubTaxonomy: false,
  };
}

/** HQ6 catalog meta lists — Brands / Units / Categories share the same Edit modal chrome. */
export function Hq6CatalogMetaListView({ kind }: { kind: CatalogMetaKind }) {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const slug = SLUG_BY_KIND[kind];
  const copy = hq6CopyForSlug(slug);
  const chrome = useHq6ListChrome();
  const [editTarget, setEditTarget] = useState<MetaRow | null>(null);
  const [editForm, setEditForm] = useState(emptyEditState);
  const [deleteTarget, setDeleteTarget] = useState<MetaRow | null>(null);
  const [saving, setSaving] = useState(false);

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
    totalCount,
  } = useServerListPage<CatalogMetaRow>({
    queryKey: ["catalog-meta", tenantId, kind, "hq6"],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit) =>
      getCatalogMetaPage(tenantId!, kind, cursor, limit),
  });

  const rows = useMemo(() => toMetaRows(kind, data), [data, kind]);

  const openEdit = (row: MetaRow) => {
    setEditTarget(row);
    setEditForm({
      name: row.name,
      code: row.code ?? "",
      description: row.description ?? "",
      shortName: row.shortName ?? "",
      allowDecimal: Boolean(row.allowDecimal),
      asSubTaxonomy: Boolean(row.asSubTaxonomy),
    });
  };

  const saveEdit = async () => {
    if (!tenantId || !editTarget || !editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: editForm.name.trim() };
      if (kind === "units") {
        body.shortName = editForm.shortName.trim() || editForm.name.trim();
        body.allowDecimal = editForm.allowDecimal;
      }
      if (kind === "brands" || kind === "price-groups") {
        body.description = editForm.description.trim() || null;
      }
      if (kind === "categories") {
        body.shortCode = editForm.code.trim() || null;
        body.description = editForm.description.trim() || null;
      }
      if (kind === "warranties") {
        body.description = editForm.description.trim() || null;
      }
      await updateCatalogMeta(tenantId, kind, editTarget.id, body);
      toast.success("Updated");
      setEditTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["catalog-meta"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const actionColumn: ColumnConfig<MetaRow> = {
    key: "actions",
    header: "Action",
    sortable: false,
    render: (row) => (
      <div className="hq6-meta-row-actions">
        <button
          type="button"
          className="hq6-meta-btn-edit"
          onClick={() => openEdit(row)}
        >
          <Pencil size={13} strokeWidth={2} />
          Edit
        </button>
        <button
          type="button"
          className="hq6-meta-btn-delete"
          onClick={() => setDeleteTarget(row)}
        >
          <Trash2 size={13} strokeWidth={2} />
          Delete
        </button>
      </div>
    ),
  };

  const columns: ColumnConfig<MetaRow>[] = useMemo(() => {
    switch (kind) {
      case "categories":
        return [
          actionColumn,
          {
            key: "name",
            header: "Category",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "code",
            header: "Category Code",
            render: (row) => row.code || "",
          },
          {
            key: "description",
            header: "Description",
            render: (row) => row.description || "",
          },
        ];
      case "brands":
        return [
          actionColumn,
          {
            key: "name",
            header: "Brands",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "description",
            header: "Note",
            render: (row) => row.description || "—",
          },
        ];
      case "units":
        return [
          actionColumn,
          {
            key: "name",
            header: "Name",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "shortName",
            header: "Short name",
            render: (row) => row.shortName || "—",
          },
          {
            key: "allowDecimal",
            header: "Allow decimal",
            render: (row) => (row.allowDecimal ? "Yes" : "No"),
          },
        ];
      case "price-groups":
        return [
          actionColumn,
          {
            key: "name",
            header: "Name",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "description",
            header: "Description",
            render: (row) => row.description || "—",
          },
        ];
      case "warranties":
        return [
          actionColumn,
          {
            key: "name",
            header: "Name",
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: "durationLabel",
            header: "Description",
            render: (row) => row.durationLabel || row.description || "—",
          },
        ];
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
    // actionColumn is stable enough for list renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  const nameLabel =
    kind === "categories"
      ? "Category name"
      : kind === "brands"
        ? "Brand name"
        : kind === "units"
          ? "Name"
          : "Name";

  return (
    <Hq6StandardListShell
      slug={slug}
      title={copy.title}
      tabLabel={`All ${copy.title.toLowerCase()}`}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue=""
      onSearchChange={() => undefined}
      tabActions={<CatalogMetaCreateBar kind={kind} />}
      pagination={{
        pageIndex,
        pageSize,
        itemCount: rows.length,
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
            open={Boolean(editTarget)}
            onClose={() => setEditTarget(null)}
            title="Edit"
            size="sm"
            footer={
              <Hq6ModalSaveClose
                onSave={() => {
                  void saveEdit();
                }}
                onClose={() => setEditTarget(null)}
                saving={saving}
                saveLabel="Update"
              />
            }
          >
            <div className="grid gap-3">
              <Hq6Field label={nameLabel} required>
                <input
                  className="hq6-modal-input"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={nameLabel}
                />
              </Hq6Field>

              {kind === "categories" ? (
                <Hq6Field
                  label="Category Code"
                  hint={
                    <>
                      Category code is same as <strong>HSN code</strong>
                    </>
                  }
                >
                  <input
                    className="hq6-modal-input"
                    value={editForm.code}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        code: e.target.value,
                      }))
                    }
                    placeholder="Category Code"
                  />
                </Hq6Field>
              ) : null}

              {kind === "units" ? (
                <Hq6Field label="Short name">
                  <input
                    className="hq6-modal-input"
                    value={editForm.shortName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        shortName: e.target.value,
                      }))
                    }
                    placeholder="Short name"
                  />
                </Hq6Field>
              ) : null}

              {kind === "categories" ||
              kind === "brands" ||
              kind === "price-groups" ||
              kind === "warranties" ? (
                <Hq6Field label="Description">
                  <textarea
                    className="hq6-modal-input"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Description"
                  />
                </Hq6Field>
              ) : null}

              {kind === "units" ? (
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={editForm.allowDecimal}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        allowDecimal: e.target.checked,
                      }))
                    }
                  />
                  Allow decimal
                </label>
              ) : null}

              {kind === "categories" ? (
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={editForm.asSubTaxonomy}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        asSubTaxonomy: e.target.checked,
                      }))
                    }
                  />
                  Add as sub taxonomy
                </label>
              ) : null}
            </div>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            title="Are you sure ?"
            message={
              deleteTarget
                ? `Delete "${deleteTarget.name}"?`
                : "Are you sure ?"
            }
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              if (!tenantId || !deleteTarget) return;
              void deleteCatalogMeta(tenantId, kind, deleteTarget.id)
                .then(async () => {
                  toast.success(`Deleted ${deleteTarget.name}`);
                  setDeleteTarget(null);
                  await queryClient.invalidateQueries({
                    queryKey: ["catalog-meta"],
                  });
                })
                .catch((err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Delete failed",
                  ),
                );
            }}
          />
        </>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={error ? `Could not load ${copy.title.toLowerCase()}.` : null}
        emptyState={{ message: "No data available in table" }}
      />
    </Hq6StandardListShell>
  );
}
