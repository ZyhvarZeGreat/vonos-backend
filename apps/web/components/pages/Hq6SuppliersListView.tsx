"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6Breadcrumbs, useHq6Breadcrumbs } from "@/components/hq6/Hq6Breadcrumbs";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import { Hq6EditSupplierModal } from "@/components/hq6/Hq6EditSupplierModal";
import { Hq6PaySupplierModal } from "@/components/hq6/Hq6PaySupplierModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import {
  getAllSuppliers,
  getSuppliersPage,
  setSupplierStatus,
  type SupplierListRow,
} from "@/lib/api/suppliers";
import { getUsersForPicker, loadMoreUsersForPicker, usersPickerHasMore } from "@/lib/api/users";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { slidingPageIndices, listEntryRange, formatListEntriesLabel, totalPagesFromEntries } from "@/lib/utils/paginationWindow";

import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { withOptimistic } from "@/lib/hooks/useAppMutation";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  prefetchContactModalRefs,
  prefetchPaymentAccountsRef,
} from "@/lib/query/prefetchListModals";
import { prefetchSupplierDetail } from "@/lib/query/prefetchListDetails";
import {
  HQ6_SUPPLIER_COLUMNS,
  hq6DefaultColumnKeys,
} from "@/lib/registries/hq6TableRows";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import {
  formatHq6Currency,
  formatHq6Date,
  hq6Cell,
  hq6DistinctName,
} from "@/lib/utils/hq6Format";
import { chronoListCursor } from "@/lib/utils/pagination";

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

/**
 * Ultimate POS — contact/index.blade.php (type=supplier) + ui-audit/04 (direct HTML lift).
 */
export function Hq6SuppliersListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { goToDetail, detailPath, prefetchDetail } = useRecordNavigation("suppliers");
  const tenantId = useTenantId();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const { search, setSearch } = useListPageFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [purchaseDue, setPurchaseDue] = useState(false);
  const [purchaseReturn, setPurchaseReturn] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(false);
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [assignedToUserName, setAssignedToUserName] = useState("");
  const [status, setStatus] = useState("");
  const chrome = useHq6ListChrome("suppliers");

  const [editTarget, setEditTarget] = useState<SupplierListRow | null>(null);
  const [payTarget, setPayTarget] = useState<SupplierListRow | null>(null);

  const userNameById = useRef(new Map<string, string>());
  const loadUserOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [{ value: "", label: "None" }], hasMore: false };
      const rows = await getUsersForPicker(tenantId, query || undefined);
      for (const row of rows) {
        userNameById.current.set(row.id, row.name || row.email);
      }
      return {
        options: [
          { value: "", label: "None" },
          ...rows.map((u) => ({
            value: u.id,
            label: u.name || u.email,
          })),
        ],
        hasMore: !query.trim() && usersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreUserOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreUsersForPicker(tenantId);
    for (const row of page.appended) {
      userNameById.current.set(row.id, row.name || row.email);
    }
    return {
      options: page.appended.map((u) => ({
        value: u.id,
        label: u.name || u.email,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const apiFilters = useMemo(
    () => ({
      purchaseDue: purchaseDue || undefined,
      purchaseReturn: purchaseReturn || undefined,
      advanceBalance: advanceBalance || undefined,
      openingBalance: openingBalance || undefined,
      assignedToUserId: assignedToUserId || undefined,
      status: (status || undefined) as "active" | "inactive" | undefined,
    }),
    [
      advanceBalance,
      assignedToUserId,
      openingBalance,
      purchaseDue,
      purchaseReturn,
      status,
    ],
  );

  const {
    items: suppliers,
    hasMore,
    totalCount,
    amountSummary,
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
  } = useServerListPage<SupplierListRow>({
    queryKey: ["suppliers", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    searchMode: "hybrid",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, listSort, opts) =>
      getSuppliersPage(tenantId!, cursor, limit, {
        ...apiFilters,
        search: opts?.search,
        includeSummary: opts?.includeSummary,
        ...(listSort?.sortBy
          ? { sortBy: listSort.sortBy, sortDir: listSort.sortDir }
          : { sortBy: "updatedAt", sortDir: "desc" }),
      }, { signal: opts?.signal }),
    getCursor: (row) => chronoListCursor(row),
  });

  const invalidate = useCallback(async () => {
    const opt = withOptimistic(queryClient, { keys: [["suppliers"]] });
    await opt.onMutate(undefined);
    void opt.onSettled();
  }, [queryClient]);

  const defaultKeys = useMemo(() => hq6DefaultColumnKeys(HQ6_SUPPLIER_COLUMNS), []);
  const columnOptions = useMemo(
    () => HQ6_SUPPLIER_COLUMNS.map((c) => ({ key: c.key, label: c.header })),
    [],
  );
  const visibleKeys = useMemo(() => {
    const keys = chrome.visibleColumnKeys ?? defaultKeys;
    return new Set(keys);
  }, [chrome.visibleColumnKeys, defaultKeys]);

  const totalItems = totalCount ?? suppliers.length;
  const effectiveSize = pageSize <= 0 ? Math.max(totalItems, 1) : pageSize;
  const knownPages = totalPagesFromEntries(totalCount, effectiveSize);
  const { from, to } = listEntryRange({
    pageIndex,
    pageSize: effectiveSize,
    itemCount: suppliers.length,
    totalCount,
  });
  const busy = isPaging || isSearching || (isLoading && suppliers.length === 0);
  const showSearchSkeleton =
    suppliers.length === 0 && (isLoading || isSearching);

  const dueTotal = amountSummary?.totalDue;
  const returnDueTotal = suppliers.reduce(
    (sum, row) => sum + (row.totalPurchaseReturn ?? 0),
    0,
  );

  const exportList = useListExport();

  const handleExport = useCallback(async () => {
    if (!tenantId) return;
    const rows = await getAllSuppliers(tenantId, apiFilters);
    exportList(
      "suppliers",
      [
        { key: "contactId", header: "Contact ID" },
        { key: "businessName", header: "Business Name" },
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "mobile", header: "Mobile" },
        { key: "totalPurchaseDue", header: "Total purchase due" },
        { key: "status", header: "Status" },
      ],
      rows.map((row) => ({
        contactId: row.contactId ?? "",
        businessName: row.businessName ?? "",
        name: row.name,
        email: row.email ?? "",
        mobile: row.phone ?? "",
        totalPurchaseDue: row.totalPurchaseDue ?? 0,
        status: row.status ?? "active",
      })),
      "Export Suppliers Spreadsheet",
    );
  }, [apiFilters, exportList, tenantId]);

  const pageNumbers = useMemo(
    () =>
      slidingPageIndices(pageIndex, {
        totalPages: knownPages,
        hasMore: knownPages == null ? hasMore : false,
        maxButtons: 5,
      }),
    [hasMore, pageIndex, knownPages],
  );

  const showCol = (key: string) => visibleKeys.has(key);
  const crumbs = useHq6Breadcrumbs({ leafLabel: "Suppliers" });

  return (
    <div className="hq6-page hq6-suppliers-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          {" "}
          Suppliers{" "}
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            Manage your Suppliers
          </small>
        </h1>
        <Hq6Breadcrumbs items={crumbs} />
      </section>

      <section className="content">
        {/* components/filters.blade.php — collapsed by default on HQ6 */}
        <div className="tw-transition-all tw-mb-4 lg:tw-col-span-1 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div
            className="box-header with-border"
            style={{ cursor: "pointer" }}
            onClick={() => setFiltersOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setFiltersOpen((v) => !v);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={filtersOpen}
          >
            <h3 className="box-title tw-pt-2 tw-pb-2 tw-pl-2">
              <a
                href="#collapseFilter"
                onClick={(e) => e.preventDefault()}
              >
                <i className="fa fa-filter" aria-hidden /> Filters
              </a>
            </h3>
          </div>
          <div
            id="collapseFilter"
            className="upos-filters-body tw-pt-4 tw-pb-4"
            aria-expanded={filtersOpen}
            hidden={!filtersOpen}
            style={{ display: filtersOpen ? "block" : "none" }}
          >
            <div className="box-body">
              <div className="col-md-3">
                <div className="form-group">
                  <label>
                    <input
                      className="input-icheck"
                      id="has_purchase_due"
                      type="checkbox"
                      checked={purchaseDue}
                      onChange={(e) => setPurchaseDue(e.target.checked)}
                    />{" "}
                    <strong>Purchase Due</strong>
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>
                    <input
                      className="input-icheck"
                      id="has_purchase_return"
                      type="checkbox"
                      checked={purchaseReturn}
                      onChange={(e) => setPurchaseReturn(e.target.checked)}
                    />{" "}
                    <strong>Purchase Return</strong>
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>
                    <input
                      className="input-icheck"
                      id="has_advance_balance"
                      type="checkbox"
                      checked={advanceBalance}
                      onChange={(e) => setAdvanceBalance(e.target.checked)}
                    />{" "}
                    <strong>Advance Balance</strong>
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>
                    <input
                      className="input-icheck"
                      id="has_opening_balance"
                      type="checkbox"
                      checked={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.checked)}
                    />{" "}
                    <strong>Opening Balance</strong>
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label htmlFor="assigned_to">Assigned to:</label>
                  <AsyncMenuSelect
                    id="assigned_to"
                    value={assignedToUserId}
                    selectedLabel={assignedToUserName || "None"}
                    placeholder="Search users…"
                    emptyMessage="No users found"
                    loadOptions={loadUserOptions}
                    loadMoreOptions={loadMoreUserOptions}
                    onChange={(id) => {
                      setAssignedToUserId(id);
                      setAssignedToUserName(
                        id ? userNameById.current.get(id) ?? "" : "",
                      );
                    }}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label htmlFor="status_filter">Status:</label>
                  <select
                    className="form-control"
                    id="status_filter"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="clearfix" />
            </div>
          </div>
        </div>

        <input type="hidden" value="supplier" id="contact_type" readOnly />

        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header">
              <h3 className="box-title">All your Suppliers</h3>
              <div className="box-tools">
                <button
                  type="button"
                  className="tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full btn-modal"
                  onClick={() => openCreateModal("supplier")}
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
                      id="contact_table_wrapper"
                      className="dataTables_wrapper form-inline dt-bootstrap no-footer"
                    >
                      <div className="row margin-bottom-20 text-center">
                        <div className="col-sm-1">
                          <div
                            className="dataTables_length"
                            id="contact_table_length"
                          >
                            <label>
                              Show{" "}
                              <select
                                name="contact_table_length"
                                aria-controls="contact_table"
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
                                aria-controls="contact_table"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (key === "print") chrome.setPrintOpen(true);
                                  else if (key === "colvis")
                                    chrome.setColumnsOpen(true);
                                  else void handleExport();
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
                            id="contact_table_filter"
                            ariaControls="contact_table"
                            value={search}
                            onChange={setSearch}
                            
                          
                            isSearching={isSearching}
                          />
                        </div>
                        {busy ? (
                          <div
                            id="contact_table_processing"
                            className="dataTables_processing panel panel-default"
                          >{isSearching ? "Searching…" : "Processing…"}</div>
                        ) : null}
                      </div>

                      <div className="dataTables_scroll">
                        <table
                          className="table table-bordered table-striped dataTable no-footer"
                          id="contact_table"
                          role="grid"
                          aria-describedby="contact_table_info"
                          style={{ width: "100%" }}
                        >
                          <thead>
                            <tr role="row">
                              <th className="tw-w-full sorting_disabled">
                                Action
                              </th>
                              {showCol("contactId") ? (
                                <th className="sorting_desc">Contact ID</th>
                              ) : null}
                              {showCol("businessName") ? (
                                <th>Business Name</th>
                              ) : null}
                              {showCol("contactName") ? <th>Name</th> : null}
                              {showCol("email") ? <th>Email</th> : null}
                              {showCol("taxNumber") ? (
                                <th>Tax number</th>
                              ) : null}
                              {showCol("payTerm") ? (
                                <th className="sorting_disabled">Pay term</th>
                              ) : null}
                              {showCol("openingBalance") ? (
                                <th>Opening Balance</th>
                              ) : null}
                              {showCol("advanceBalance") ? (
                                <th>Advance Balance</th>
                              ) : null}
                              {showCol("createdAt") ? <th>Added On</th> : null}
                              {showCol("address") ? (
                                <th className="sorting_disabled">Address</th>
                              ) : null}
                              {showCol("phone") ? <th>Mobile</th> : null}
                              {showCol("totalPurchaseDue") ? (
                                <th className="sorting_disabled">
                                  Total Purchase Due
                                </th>
                              ) : null}
                              {showCol("totalPurchaseReturn") ? (
                                <th className="sorting_disabled">
                                  Total Purchase Return Due
                                </th>
                              ) : null}
                            </tr>
                          </thead>
                          <tbody>
                            {error ? (
                              <tr className="odd">
                                <td
                                  colSpan={14}
                                  className="dataTables_empty"
                                >
                                  Failed to load suppliers.
                                </td>
                              </tr>
                            ) : showSearchSkeleton ? (
                              Array.from({ length: 8 }).map((_, rowIdx) => (
                                <tr
                                  key={`sk-${rowIdx}`}
                                  className={rowIdx % 2 === 0 ? "odd" : "even"}
                                >
                                  {Array.from({ length: 8 }).map((__, colIdx) => (
                                    <td key={colIdx}>
                                      <span
                                        className="tw-inline-block tw-h-3.5 tw-animate-pulse tw-rounded tw-bg-gray-200"
                                        style={{
                                          width: `${48 + ((rowIdx + colIdx) % 4) * 12}%`,
                                        }}
                                        aria-hidden
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : suppliers.length === 0 ? (
                              <tr className="odd">
                                <td
                                  colSpan={14}
                                  className="dataTables_empty"
                                  valign="top"
                                >
                                  No data available in table
                                </td>
                              </tr>
                            ) : (
                              suppliers.map((row, index) => (
                                <tr
                                  key={row.id}
                                  role="row"
                                  className={index % 2 === 0 ? "odd" : "even"}
                                  onMouseEnter={() => {
                                    prefetchDetail(row.id);
                                    if (tenantId)
                                      prefetchSupplierDetail(
                                        queryClient,
                                        tenantId,
                                        row.id,
                                        row,
                                      );
                                  }}
                                >
                                  <td>
                                    <div className="btn-group">
          <Hq6ActionsMenu
            items={[
              {
                id: "pay",
                label: "Pay",
                onClick: () => {
                                              if (tenantId)
                                                prefetchPaymentAccountsRef(
                                                  queryClient,
                                                  tenantId,
                                                );
                  setPayTarget(row);
                },
              },
                                          {
                                            id: "view",
                                            label: "View",
                                            onClick: () => goToDetail(row.id),
                                          },
              {
                id: "edit",
                label: "Edit",
                onClick: () => {
                                              if (tenantId)
                                                prefetchContactModalRefs(
                                                  queryClient,
                                                  tenantId,
                                                );
                                              setEditTarget(row);
                },
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () =>
                                              router.push(
                                                `${detailPath(row.id)}?action=delete`,
                                              ),
              },
              {
                id: "deactivate",
                                            label:
                                              row.status === "inactive"
                                                ? "Activate"
                                                : "Deactivate",
                onClick: () => {
                  if (!tenantId) return;
                                              const next =
                                                row.status === "inactive"
                                                  ? "active"
                                                  : "inactive";
                                              void setSupplierStatus(
                                                tenantId,
                                                row.id,
                                                next,
                                              )
                    .then(() => {
                      toast.success(
                        next === "inactive"
                          ? "Supplier deactivated"
                          : "Supplier activated",
                      );
                      void invalidate();
                    })
                    .catch((err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to update status",
                      ),
                    );
                },
              },
              {
                id: "ledger",
                label: "Ledger",
                                            dividerBefore: true,
                                            onClick: () =>
                                              router.push(
                                                `${detailPath(row.id)}?view=ledger`,
                                              ),
              },
              {
                id: "purchases",
                label: "Purchases",
                onClick: () =>
                                              router.push(
                                                `${detailPath(row.id)}?view=purchase`,
                                              ),
              },
              {
                id: "stock_report",
                label: "Stock Report",
                onClick: () =>
                                              router.push(
                                                `${detailPath(row.id)}?view=stock_report`,
                                              ),
              },
              {
                id: "documents",
                label: "Documents & Note",
                onClick: () =>
                                              router.push(
                                                `${detailPath(row.id)}?view=documents_and_notes`,
                                              ),
              },
            ]}
          />
                                    </div>
                                  </td>
                                  {showCol("contactId") ? (
                                    <td>{hq6Cell(row.contactId)}</td>
                                  ) : null}
                                  {showCol("businessName") ? (
                                    <td>
                                      {hq6Cell(row.businessName ?? row.name)}
                                    </td>
                                  ) : null}
                                  {showCol("contactName") ? (
                                    <td>
                                      {hq6Cell(
                                        hq6DistinctName(
                                          row.contactName,
                                          row.businessName ?? row.name,
                                        ),
                                      )}
                                    </td>
                                  ) : null}
                                  {showCol("email") ? (
                                    <td>{hq6Cell(row.email)}</td>
                                  ) : null}
                                  {showCol("taxNumber") ? (
                                    <td>{hq6Cell(row.taxNumber)}</td>
                                  ) : null}
                                  {showCol("payTerm") ? (
                                    <td>{hq6Cell(row.payTerm)}</td>
                                  ) : null}
                                  {showCol("openingBalance") ? (
                                    <td>
                                      <span
                                        data-orig-value={String(
                                          row.openingBalance ?? 0,
                                        )}
                                      >
                                        {formatHq6Currency(
                                          row.openingBalance ?? 0,
                                        )}
                                      </span>
                                    </td>
                                  ) : null}
                                  {showCol("advanceBalance") ? (
                                    <td>
                                      <span
                                        data-orig-value={String(
                                          row.totalAdvance ?? 0,
                                        )}
                                      >
                                        {formatHq6Currency(
                                          row.totalAdvance ?? 0,
                                        )}
                                      </span>
                                    </td>
                                  ) : null}
                                  {showCol("createdAt") ? (
                                    <td>{formatHq6Date(row.createdAt)}</td>
                                  ) : null}
                                  {showCol("address") ? (
                                    <td>{hq6Cell(row.address)}</td>
                                  ) : null}
                                  {showCol("phone") ? (
                                    <td>{hq6Cell(row.phone)}</td>
                                  ) : null}
                                  {showCol("totalPurchaseDue") ? (
                                    <td>
                                      <span
                                        className="contact_due"
                                        data-orig-value={String(
                                          row.totalPurchaseDue ?? 0,
                                        )}
                                      >
                                        {formatHq6Currency(
                                          row.totalPurchaseDue ?? 0,
                                        )}
                                      </span>
                                    </td>
                                  ) : null}
                                  {showCol("totalPurchaseReturn") ? (
                                    <td>
                                      <span
                                        className="return_due"
                                        data-orig-value={String(
                                          row.totalPurchaseReturn ?? 0,
                                        )}
                                      >
                                        {formatHq6Currency(
                                          row.totalPurchaseReturn ?? 0,
                                        )}
                                      </span>
                                    </td>
                                  ) : null}
                                </tr>
                              ))
                            )}
                          </tbody>
                          {suppliers.length > 0 ? (
                            <tfoot>
                              <tr className="bg-gray font-17 text-center footer-total">
                                <td />
                                {showCol("contactId") ? <td /> : null}
                                {showCol("businessName") ? <td /> : null}
                                {showCol("contactName") ? <td /> : null}
                                {showCol("email") ? <td /> : null}
                                {showCol("taxNumber") ? <td /> : null}
                                <td
                                  colSpan={
                                    [
                                      "payTerm",
                                      "openingBalance",
                                      "advanceBalance",
                                      "createdAt",
                                      "address",
                                      "phone",
                                    ].filter((k) => showCol(k)).length || 1
                                  }
                                >
                                  <strong>Total:</strong>
                                </td>
                                {showCol("totalPurchaseDue") ? (
                                  <td className="footer_contact_due">
                                    {dueTotal != null
                                      ? formatHq6Currency(dueTotal)
                                      : "—"}
                                  </td>
                                ) : null}
                                {showCol("totalPurchaseReturn") ? (
                                  <td className="footer_contact_return_due">
                                    {formatHq6Currency(returnDueTotal)}
                                  </td>
                                ) : null}
                              </tr>
                            </tfoot>
              ) : null}
                        </table>
                      </div>

                      <div
                        className="dataTables_info"
                        id="contact_table_info"
                        role="status"
                        aria-live="polite"
                      >
                        {formatListEntriesLabel({
                          from,
                          to,
                          total: totalCount,
                        })}
            </div>
                      <div
                        className="dataTables_paginate paging_simple_numbers"
                        id="contact_table_paginate"
                      >
                        <ul className="pagination">
                          <li
                            className={`paginate_button previous${!canGoPrev ? " disabled" : ""}`}
                            id="contact_table_previous"
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
                            id="contact_table_next"
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
      </section>

      <Hq6EditSupplierModal
        open={Boolean(editTarget)}
        supplier={editTarget}
        tenantId={tenantId}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          void invalidate();
        }}
      />
      <Hq6PaySupplierModal
        open={Boolean(payTarget)}
        supplier={payTarget}
        tenantId={tenantId}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          void invalidate();
          void queryClient.invalidateQueries({ queryKey: ["supplier-summary"] });
        }}
      />
      <Hq6PrintModal
        open={chrome.printOpen}
        onClose={() => chrome.setPrintOpen(false)}
      />
      <Hq6ColumnVisibilityModal
        open={chrome.columnsOpen}
        onClose={() => chrome.setColumnsOpen(false)}
        columns={columnOptions}
        visibleKeys={chrome.visibleColumnKeys ?? defaultKeys}
        onChange={chrome.setVisibleColumnKeys}
        onReset={() => {
          chrome.resetColumnVisibility();
          chrome.setColumnsOpen(false);
        }}
      />
    </div>
  );
}
