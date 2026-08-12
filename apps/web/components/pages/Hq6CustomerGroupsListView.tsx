"use client";

import { customerGroupFormSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { withOptimistic } from "@/lib/hooks/useAppMutation";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
  removeEntityFromQueries,
} from "@/lib/query/optimistic";
import type { CustomerGroup } from "@vonos/types";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  createCustomerGroup,
  deleteCustomerGroup,
  getCustomerGroupsPage,
  updateCustomerGroup,
} from "@/lib/api/customerGroups";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { slidingPageIndices, listEntryRange, formatListEntriesLabel, totalPagesFromEntries } from "@/lib/utils/paginationWindow";

import { chronoListCursor } from "@/lib/utils/pagination";

import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useQuery } from "@tanstack/react-query";
import { getAllCatalogMeta } from "@/lib/api/catalogMeta";
import type { SellingPriceGroup } from "@vonos/types";
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

/** Ultimate POS — customer_group/index.blade.php + create modal (direct lift). */
export function Hq6CustomerGroupsListView() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const chrome = useHq6ListChrome("customer-groups");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerGroup | null>(null);
  const [name, setName] = useState("");
  const [priceCalcType, setPriceCalcType] = useState<"percentage" | "selling_price_group">(
    "percentage",
  );
  const [discountPercent, setDiscountPercent] = useState("");
  const [priceGroupId, setPriceGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const priceGroupsQuery = useQuery({
    queryKey: ["catalog-meta", "price-groups", tenantId, "customer-group-form"],
    queryFn: () =>
      getAllCatalogMeta(tenantId!, "price-groups") as Promise<
        SellingPriceGroup[]
      >,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const priceGroupOptions = useMemo(
    () =>
      (priceGroupsQuery.data ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      })),
    [priceGroupsQuery.data],
  );

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
    isPaging,
    isSearching,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<CustomerGroup>({
    queryKey: ["customer-groups", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _sort, opts) =>
      getCustomerGroupsPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => chronoListCursor(row),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setPriceCalcType("percentage");
    setDiscountPercent("0");
    setPriceGroupId("");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: CustomerGroup) => {
    setEditing(row);
    setName(row.name);
    setPriceCalcType("percentage");
    setDiscountPercent(String(row.discountPercent));
    setPriceGroupId("");
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const handleSave = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!tenantId) return;
      const valid = parseForm(customerGroupFormSchema, {
        name,
        calculationPercentage: discountPercent,
      });
      if (!valid) return;
      const pct = Number(String(valid.calculationPercentage || "0").trim() || "0");
      const opt = withOptimistic<CustomerGroup, void>(queryClient, {
        keys: [["customer-groups"]],
        update: (qc) => {
          if (editing) {
            patchEntityInQueries(qc, ["customer-groups"], editing.id, {
              name: name.trim(),
              discountPercent: pct,
            });
          } else if (tenantId) {
            const now = new Date().toISOString();
            prependEntityInQueries(qc, ["customer-groups"], {
              id: optimisticTempId("customer-group"),
              tenantId,
              name: name.trim(),
              discountPercent: pct,
              createdAt: now,
              updatedAt: now,
            } satisfies CustomerGroup);
          }
          setFormOpen(false);
        },
        commit: (qc, data) => {
          prependEntityInQueries(qc, ["customer-groups"], data);
        },
      });
      setSaving(true);
      const ctx = await opt.onMutate(undefined);
      try {
        if (editing) {
          const updated = await updateCustomerGroup(tenantId, editing.id, {
            name: name.trim(),
            discountPercent: pct,
          });
          opt.onSuccess(updated, undefined);
          toast.success("Customer group updated");
        } else {
          const created = await createCustomerGroup(tenantId, {
            name: name.trim(),
            discountPercent: pct,
          });
          opt.onSuccess(created, undefined);
          toast.success("Customer group created");
        }
        setEditing(null);
        setName("");
        setDiscountPercent("0");
      } catch (err) {
        opt.onError(err, undefined, ctx);
        setFormOpen(true);
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        void opt.onSettled();
        setSaving(false);
      }
    },
    [closeForm, discountPercent, editing, name, queryClient, tenantId],
  );

  const handleDelete = useCallback(async () => {
    if (!tenantId || !deleteTarget) return;
    const targetId = deleteTarget.id;
    const opt = withOptimistic(queryClient, {
      keys: [["customer-groups"]],
      update: (qc) => {
        removeEntityFromQueries(qc, ["customer-groups"], targetId);
      },
    });
    setDeleting(true);
    const ctx = await opt.onMutate(undefined);
    try {
      await deleteCustomerGroup(tenantId, targetId);
      toast.success("Customer group deleted");
      setDeleteTarget(null);
    } catch (err) {
      opt.onError(err, undefined, ctx);
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      void opt.onSettled();
      setDeleting(false);
    }
  }, [deleteTarget, queryClient, tenantId]);

  const totalItems = totalCount ?? items.length;
  const effectiveSize = pageSize <= 0 ? Math.max(totalItems, 1) : pageSize;
  const knownPages = totalPagesFromEntries(totalCount, effectiveSize);
  const { from, to } = listEntryRange({
    pageIndex,
    pageSize: effectiveSize,
    itemCount: items.length,
    totalCount: totalCount ?? totalItems,
  });
  const busy = isPaging || isSearching || (isLoading && items.length === 0);

  const pageNumbers = useMemo(
    () =>
      slidingPageIndices(pageIndex, {
        totalPages: knownPages,
        hasMore: knownPages == null ? hasMore : false,
        maxButtons: 5,
      }),
    [hasMore, pageIndex, knownPages],
  );

  const columnOptions = [
    { key: "name", label: "Customer Group Name" },
    { key: "discountPercent", label: "Calculation Percentage (%)" },
    { key: "priceGroup", label: "Selling Price Group" },
  ];

  const exportList = useListExport();

  const handleExport = useCallback(() => {
    exportList(
      "customer-groups",
      [
        { key: "name", header: "Customer Group Name" },
        { key: "discountPercent", header: "Calculation Percentage (%)" },
        { key: "priceGroup", header: "Selling Price Group" },
      ],
      items.map((row) => ({
        name: row.name,
        discountPercent: row.discountPercent ?? "",
        priceGroup: "",
      })),
      "Export Customer Groups",
    );
  }, [exportList, items]);

  return (
    <div className="hq6-page hq6-customer-groups-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Customer Groups
        </h1>
      </section>

      <section className="content">
        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header">
              <h3 className="box-title">All Customer Groups</h3>
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
                      id="customer_groups_table_wrapper"
                      className="dataTables_wrapper form-inline dt-bootstrap no-footer"
                    >
                      <div className="row margin-bottom-20 text-center">
                        <div className="col-sm-1">
                          <div
                            className="dataTables_length"
                            id="customer_groups_table_length"
                          >
                            <label>
                              Show{" "}
                              <select
                                name="customer_groups_table_length"
                                aria-controls="customer_groups_table"
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
                                  else handleExport();
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
                            id="customer_groups_table_filter"
                            value={search}
                            onChange={setSearch}
                          
                            isSearching={isSearching}
                          />
                        </div>
                        {busy ? (
                          <div className="dataTables_processing panel panel-default">{isSearching ? "Searching…" : "Processing…"}</div>
                        ) : null}
                      </div>

                      <table
                        className="table table-bordered table-striped dataTable no-footer"
                        id="customer_groups_table"
                        role="grid"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr role="row">
                            <th>Customer Group Name</th>
                            <th>Calculation Percentage (%)</th>
                            <th>Selling Price Group</th>
                            <th className="sorting_disabled">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {error ? (
                            <tr className="odd">
                              <td colSpan={4} className="dataTables_empty">
                                Failed to load customer groups.
                              </td>
                            </tr>
                          ) : isLoading && items.length === 0 ? (
                            <tr className="odd">
                              <td colSpan={4} className="dataTables_empty">
                                Processing...
                              </td>
                            </tr>
                          ) : items.length === 0 ? (
                            <tr className="odd">
                              <td
                                colSpan={4}
                                className="dataTables_empty"
                                valign="top"
                              >
                                No data available in table
                              </td>
                            </tr>
                          ) : (
                            items.map((row, index) => (
                              <tr
                                key={row.id}
                                role="row"
                                className={index % 2 === 0 ? "odd" : "even"}
                              >
                                <td>{row.name}</td>
                                <td>{row.discountPercent.toFixed(2)}</td>
                                <td>—</td>
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
                        id="customer_groups_table_info"
                        role="status"
                        aria-live="polite"
                      >
                        {formatListEntriesLabel({
                          from,
                          to,
                          total: totalCount ?? to,
                        })}
                      </div>
                      <div
                        className="dataTables_paginate paging_simple_numbers"
                        id="customer_groups_table_paginate"
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
                                  if (busy) return;
                                  if (canSelectPage?.(i) === false) return;
                                  void goToPage(i);
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
            className="modal fade customer_groups_modal in"
            tabIndex={-1}
            role="dialog"
            style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <form id="customer_group_add_form" onSubmit={handleSave}>
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
                      {editing ? "Edit Customer Group" : "Add Customer Group"}
                    </h4>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label htmlFor="name">Customer Group Name:*</label>
                      <input
                        id="name"
                        className="form-control"
                        required
                        placeholder="Customer Group Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="price_calculation_type">
                        Price calculation type:
                      </label>
                      <select
                        id="price_calculation_type"
                        className="form-control"
                        value={priceCalcType}
                        onChange={(e) =>
                          setPriceCalcType(
                            e.target.value as
                              | "percentage"
                              | "selling_price_group",
                          )
                        }
                      >
                        <option value="percentage">Percentage</option>
                        <option value="selling_price_group">
                          Selling Price Group
                        </option>
                      </select>
                    </div>
                    {priceCalcType === "percentage" ? (
                      <div className="form-group percentage-field">
                        <label htmlFor="amount">
                          Calculation Percentage (%):
                        </label>
                        <input
                          id="amount"
                          className="form-control input_number"
                          placeholder="Calculation Percentage (%)"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="form-group selling_price_group-field">
                        <label htmlFor="selling_price_group_id">
                          Selling Price Group:
                        </label>
                        <select
                          id="selling_price_group_id"
                          className="form-control"
                          value={priceGroupId}
                          onChange={(e) => setPriceGroupId(e.target.value)}
                        >
                          <option value="">None</option>
                          {priceGroupOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
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
    </div>
  );
}
