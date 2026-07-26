"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { withOptimistic } from "@/lib/hooks/useAppMutation";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";
import type { VariationTemplate } from "@vonos/types";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  createVariation,
  deleteVariation,
  getVariationsPage,
  updateVariation,
} from "@/lib/api/variations";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

const PAGE_SIZES = [25, 50, 100, 200, 500, 1000, -1] as const;

const PlusIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="icon icon-tabler icons-tabler-outline icon-tabler-plus"
    aria-hidden
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
  </svg>
);

/** Ultimate POS — variation/index.blade.php + create/edit modal (direct lift). */
export function Hq6VariationsListView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [localSearch, setLocalSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const chrome = useHq6ListChrome("variations");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VariationTemplate | null>(null);
  const [name, setName] = useState("");
  const [values, setValues] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VariationTemplate | null>(
    null,
  );
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
    isPaging,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<VariationTemplate>({
    queryKey: ["variations", tenantId, "hq6", committedSearch],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    filters: { search: committedSearch.trim() || undefined },
    search: committedSearch,
    fetchPage: (cursor, limit, _sort, opts) =>
      getVariationsPage(tenantId!, cursor, limit, {
        includeSummary: opts?.includeSummary,
      }),
  });

  const filteredItems = useMemo(() => {
    const q = committedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.values.some((v) => v.toLowerCase().includes(q)),
    );
  }, [committedSearch, items]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setValues([""]);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: VariationTemplate) => {
    setEditing(row);
    setName(row.name);
    setValues(row.values.length > 0 ? [...row.values] : [""]);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setValues([""]);
  }, []);

  const handleSave = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!tenantId) return;
      const cleaned = values.map((v) => v.trim()).filter(Boolean);
      if (!name.trim()) {
        toast.error("Variation name is required");
        return;
      }
      if (cleaned.length === 0) {
        toast.error("Add at least one variation value");
        return;
      }
      const opt = withOptimistic<VariationTemplate, void>(queryClient, {
        keys: [["variations"]],
        update: (qc) => {
          if (editing) {
            patchEntityInQueries(qc, ["variations"], editing.id, {
              name: name.trim(),
              values: cleaned,
            });
          } else if (tenantId) {
            const now = new Date().toISOString();
            prependEntityInQueries(qc, ["variations"], {
              id: optimisticTempId("variation"),
              tenantId,
              name: name.trim(),
              values: cleaned,
              createdAt: now,
              updatedAt: now,
            } satisfies VariationTemplate);
          }
          setFormOpen(false);
        },
        commit: (qc, data) => {
          prependEntityInQueries(qc, ["variations"], data);
        },
      });
      setSaving(true);
      const ctx = await opt.onMutate(undefined);
      try {
        if (editing) {
          const updated = await updateVariation(tenantId, editing.id, {
            name: name.trim(),
            values: cleaned,
          });
          opt.onSuccess(updated, undefined);
          toast.success("Variation updated");
        } else {
          const created = await createVariation(tenantId, {
            name: name.trim(),
            values: cleaned,
          });
          opt.onSuccess(created, undefined);
          toast.success("Variation template saved");
        }
        setEditing(null);
        setName("");
        setValues([""]);
      } catch (err) {
        opt.onError(err, undefined, ctx);
        setFormOpen(true);
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        await opt.onSettled();
        setSaving(false);
      }
    },
    [closeForm, editing, name, queryClient, tenantId, values],
  );

  const handleDelete = useCallback(async () => {
    if (!tenantId || !deleteTarget) return;
    const targetId = deleteTarget.id;
    const opt = withOptimistic(queryClient, {
      keys: [["variations"]],
      update: (qc) => {
        removeEntityFromQueries(qc, ["variations"], targetId);
      },
    });
    setDeleting(true);
    const ctx = await opt.onMutate(undefined);
    try {
      await deleteVariation(tenantId, targetId);
      toast.success("Variation deleted");
      setDeleteTarget(null);
    } catch (err) {
      opt.onError(err, undefined, ctx);
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      await opt.onSettled();
      setDeleting(false);
    }
  }, [deleteTarget, queryClient, tenantId]);

  const displayItems = filteredItems;
  const totalItems = totalCount ?? displayItems.length;
  const effectiveSize = pageSize <= 0 ? Math.max(totalItems, 1) : pageSize;
  const knownPages =
    totalCount != null
      ? Math.max(1, Math.ceil(Math.max(totalCount, 1) / effectiveSize))
      : Math.max(pageIndex + 1 + (hasMore ? 1 : 0), 1);
  const from = displayItems.length === 0 ? 0 : pageIndex * effectiveSize + 1;
  const to = pageIndex * effectiveSize + displayItems.length;
  const busy = isPaging || isLoading || isFetching;

  const pageNumbers = useMemo(() => {
    const max = Math.min(knownPages, 7);
    return Array.from({ length: max }, (_, i) => i);
  }, [knownPages]);

  const columnOptions = [
    { key: "name", label: "Variations" },
    { key: "values", label: "Values" },
  ];

  const exportToast = (label: string) =>
    toast.info(`${label} — export coming with API.`);

  return (
    <div className="hq6-page hq6-customer-groups-page hq6-variations-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Variations{" "}
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            Manage product variations
          </small>
        </h1>
      </section>

      <section className="content">
        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header">
              <h3 className="box-title">All variations</h3>
              <div className="box-tools">
                <button
                  type="button"
                  className="tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full btn-modal"
                  onClick={openCreate}
                >
                  {PlusIcon} Add
                </button>
              </div>
            </div>

            <div className="tw-flow-root tw-border-gray-200">
              <div>
                <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                  <div className="table-responsive">
                    <div
                      id="variation_table_wrapper"
                      className="dataTables_wrapper form-inline dt-bootstrap no-footer"
                    >
                      <div className="row margin-bottom-20 text-center">
                        <div className="col-sm-1">
                          <div
                            className="dataTables_length"
                            id="variation_table_length"
                          >
                            <label>
                              Show{" "}
                              <select
                                name="variation_table_length"
                                aria-controls="variation_table"
                                className="form-control input-sm"
                                value={pageSize}
                                onChange={(e) =>
                                  setPageSize(Number(e.target.value))
                                }
                              >
                                {PAGE_SIZES.map((n) => (
                                  <option key={n} value={n}>
                                    {n === -1 ? "All" : n.toLocaleString()}
                                  </option>
                                ))}
                              </select>{" "}
                              entries
                            </label>
                          </div>
                        </div>
                        <div className="col-sm-8">
                          <div className="dt-buttons btn-group">
                            {(
                              [
                                ["csv", "fa-file-csv", "Export CSV"],
                                ["excel", "fa-file-excel", "Export Excel"],
                                ["print", "fa-print", "Print"],
                                ["colvis", "fa-columns", "Column visibility"],
                                ["pdf", "fa-file-pdf", "Export PDF"],
                              ] as const
                            ).map(([key, icon, label]) => (
                              <a
                                key={key}
                                className={`${
                                  key === "print"
                                    ? "buttons-print"
                                    : key === "colvis"
                                      ? "buttons-collection buttons-colvis"
                                      : `buttons-${key} buttons-html5`
                                } tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2`}
                                href="#"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (key === "print") chrome.setPrintOpen(true);
                                  else if (key === "colvis")
                                    chrome.setColumnsOpen(true);
                                  else exportToast(label);
                                }}
                              >
                                <span>
                                  <i className={`fa ${icon}`} aria-hidden />{" "}
                                  {label}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <Hq6DtSearchFilter
                            id="variation_table_filter"
                            value={localSearch}
                            onChange={setLocalSearch}
                            onCommit={() => setCommittedSearch(localSearch)}
                          />
                        </div>
                        {busy ? (
                          <div className="dataTables_processing panel panel-default">
                            Processing...
                          </div>
                        ) : null}
                      </div>

                      <table
                        className="table table-bordered table-striped dataTable no-footer"
                        id="variation_table"
                        role="grid"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr role="row">
                            <th>Variations</th>
                            <th>Values</th>
                            <th className="sorting_disabled">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {error ? (
                            <tr className="odd">
                              <td colSpan={3} className="dataTables_empty">
                                Failed to load variations.
                              </td>
                            </tr>
                          ) : isLoading && displayItems.length === 0 ? (
                            <tr className="odd">
                              <td colSpan={3} className="dataTables_empty">
                                Processing...
                              </td>
                            </tr>
                          ) : displayItems.length === 0 ? (
                            <tr className="odd">
                              <td
                                colSpan={3}
                                className="dataTables_empty"
                                valign="top"
                              >
                                No data available in table
                              </td>
                            </tr>
                          ) : (
                            displayItems.map((row, index) => (
                              <tr
                                key={row.id}
                                role="row"
                                className={index % 2 === 0 ? "odd" : "even"}
                              >
                                <td>{row.name}</td>
                                <td>{row.values.join(", ")}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-primary"
                                    onClick={() => openEdit(row)}
                                  >
                                    <i
                                      className="glyphicon glyphicon-edit"
                                      aria-hidden
                                    />{" "}
                                    Edit
                                  </button>
                                  &nbsp;
                                  <button
                                    type="button"
                                    className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-error"
                                    onClick={() => setDeleteTarget(row)}
                                  >
                                    <i
                                      className="glyphicon glyphicon-trash"
                                      aria-hidden
                                    />{" "}
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      <div
                        className="dataTables_info"
                        id="variation_table_info"
                        role="status"
                        aria-live="polite"
                      >
                        {`Showing ${from} to ${to} of ${(totalCount ?? to).toLocaleString()} entries`}
                      </div>
                      <div
                        className="dataTables_paginate paging_simple_numbers"
                        id="variation_table_paginate"
                      >
                        <ul className="pagination">
                          <li
                            className={`paginate_button previous${!canGoPrev ? " disabled" : ""}`}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (canGoPrev) goPrev();
                              }}
                            >
                              Previous
                            </a>
                          </li>
                          {pageNumbers.map((i) => (
                            <li
                              key={i}
                              className={`paginate_button${i === pageIndex ? " active" : ""}`}
                            >
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (canSelectPage?.(i) !== false) goToPage(i);
                                }}
                              >
                                {i + 1}
                              </a>
                            </li>
                          ))}
                          <li
                            className={`paginate_button next${!hasMore ? " disabled" : ""}`}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (hasMore) goNext();
                              }}
                            >
                              Next
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {formOpen ? (
          <div
            className="modal fade variation_modal in"
            tabIndex={-1}
            role="dialog"
            style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <form
                  id="variation_add_form"
                  className="form-horizontal"
                  onSubmit={handleSave}
                >
                  <div className="modal-header">
                    <button
                      type="button"
                      className="close"
                      aria-label="Close"
                      onClick={closeForm}
                    >
                      <span aria-hidden>×</span>
                    </button>
                    <h4 className="modal-title">
                      {editing ? "Edit Variation" : "Add Variation"}
                    </h4>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label
                        htmlFor="variation_name"
                        className="col-sm-3 control-label"
                      >
                        Variation Name:*
                      </label>
                      <div className="col-sm-9">
                        <input
                          id="variation_name"
                          className="form-control"
                          required
                          placeholder="Variation Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    {values.map((value, idx) => (
                      <div key={idx} className="form-group">
                        {idx === 0 ? (
                          <label className="col-sm-3 control-label">
                            Add variation values:*
                          </label>
                        ) : (
                          <div className="col-sm-3" />
                        )}
                        <div className="col-sm-7">
                          <input
                            className="form-control"
                            required={idx === 0}
                            value={value}
                            onChange={(e) => {
                              const next = [...values];
                              next[idx] = e.target.value;
                              setValues(next);
                            }}
                            placeholder="Value"
                          />
                        </div>
                        <div className="col-sm-2">
                          {idx === 0 ? (
                            <button
                              type="button"
                              className="tw-dw-btn tw-dw-btn-primary tw-text-white tw-dw-btn-sm"
                              id="add_variation_values"
                              onClick={() => setValues((v) => [...v, ""])}
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="tw-dw-btn tw-dw-btn-error tw-text-white tw-dw-btn-sm"
                              onClick={() =>
                                setValues((v) => v.filter((_, i) => i !== idx))
                              }
                            >
                              −
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="submit"
                      className="tw-dw-btn tw-dw-btn-primary tw-text-white"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="tw-dw-btn tw-dw-btn-neutral tw-text-white"
                      onClick={closeForm}
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <Hq6ConfirmModal
        open={Boolean(deleteTarget)}
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Are you sure?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Yes, delete"
        confirming={deleting}
      />
      <Hq6PrintModal
        open={chrome.printOpen}
        onClose={() => chrome.setPrintOpen(false)}
      />
      <Hq6ColumnVisibilityModal
        open={chrome.columnsOpen}
        onClose={() => chrome.setColumnsOpen(false)}
        columns={columnOptions}
        visibleKeys={
          chrome.visibleColumnKeys ?? columnOptions.map((c) => c.key)
        }
        onChange={chrome.setVisibleColumnKeys}
        onReset={() => {
          chrome.resetColumnVisibility();
          chrome.setColumnsOpen(false);
        }}
      />

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
