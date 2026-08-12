"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Customer } from "@vonos/types";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6Breadcrumbs, useHq6Breadcrumbs } from "@/components/hq6/Hq6Breadcrumbs";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import {
  Hq6ContactEditModal,
  Hq6PayContactModal,
} from "@/components/hq6/Hq6ContactModals";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  getAllCustomers,
  getCustomersListSummary,
  getCustomersPage,
  setCustomerStatus,
} from "@/lib/api/customers";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import { withOptimistic } from "@/lib/hooks/useAppMutation";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { getDesignations, getEmployees, loadMoreEmployeesForPicker } from "@/lib/api/hrm";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import { useServerListPage, withListSort } from "@/lib/hooks/useServerListPage";
import { slidingPageIndices, listEntryRange, formatListEntriesLabel, totalPagesFromEntries } from "@/lib/utils/paginationWindow";

import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { compositeListCursorFrom } from "@/lib/utils/pagination";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { prefetchContactModalRefs } from "@/lib/query/prefetchListModals";
import { prefetchCustomerDetail } from "@/lib/query/prefetchListDetails";
import {
  HQ6_CUSTOMER_COLUMNS,
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

const PAGE_SIZES = [25, 50, 100, 200, 500, 1000, -1] as const;

/** HQ6 contact custom columns (ui-audit/05 thead) → Customer.details keys. */
const CUSTOM_FIELD_COLUMNS = [
  { key: "customField1", header: "Milage" },
  { key: "customField2", header: "VIN Number" },
  { key: "customField3", header: "Car Model & Year" },
  { key: "customField4", header: "Customer Location" },
  { key: "customField5", header: "Referral source" },
  { key: "customField6", header: "Custom Field 6" },
  { key: "customField7", header: "Custom Field 7" },
  { key: "customField8", header: "Custom Field 8" },
  { key: "customField9", header: "Custom Field 9" },
  { key: "customField10", header: "Custom Field 10" },
] as const;

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
 * Ultimate POS — contact/index.blade.php (type=customer) + ui-audit/05 (direct HTML lift).
 */
export function Hq6CustomersListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { goToDetail, detailPath, prefetchDetail } =
    useRecordNavigation("customers");
  const tenantId = useTenantId();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const { search, setSearch } = useListPageFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const chrome = useHq6ListChrome("customers");

  const [sellDue, setSellDue] = useState(false);
  const [sellReturn, setSellReturn] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(false);
  const [hasNoSellFrom, setHasNoSellFrom] = useState("");
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [assignedToEmployeeId, setAssignedToEmployeeId] = useState("");
  const [assignedToEmployeeName, setAssignedToEmployeeName] = useState("");
  const [assignDesignationId, setAssignDesignationId] = useState("");
  const [status, setStatus] = useState("");

  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [payTarget, setPayTarget] = useState<Customer | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(
    null,
  );
  const [statusBusy, setStatusBusy] = useState(false);

  const groupsQuery = useQuery({
    queryKey: ["customer-groups", tenantId, "filter"],
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: Infinity,
  });
  const designationsQuery = useQuery({
    queryKey: ["designations", tenantId, "customer-filter"],
    queryFn: () => getDesignations(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: Infinity,
  });

  const employeeNameById = useRef<Map<string, string>>(new Map());
  const loadEmployeeOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [{ value: "", label: "All workers" }], hasMore: false };
      const rows = await getEmployees(tenantId, query || undefined, {
        designationId: assignDesignationId || undefined,
      });
      for (const row of rows) employeeNameById.current.set(row.id, row.name);
      return {
        options: [
          { value: "", label: "All workers" },
          ...rows.map((row) => ({
            value: row.id,
            label: row.designationName
              ? `${row.name} · ${row.designationName}`
              : row.name,
          })),
        ],
        // Always allow scroll attempts — loadMore no-ops when exhausted.
        hasMore: !query.trim(),
      };
    },
    [tenantId, assignDesignationId],
  );

  const loadMoreEmployeeOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreEmployeesForPicker(tenantId, {
      designationId: assignDesignationId || undefined,
    });
    for (const row of page.appended) {
      employeeNameById.current.set(row.id, row.name);
    }
    return {
      options: page.appended.map((row) => ({
        value: row.id,
        label: row.designationName
          ? `${row.name} · ${row.designationName}`
          : row.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId, assignDesignationId]);

  const apiFilters = useMemo(() => {
    const months = Number(hasNoSellFrom);
    return {
      sellDue: sellDue || undefined,
      sellReturn: sellReturn || undefined,
      advanceBalance: advanceBalance || undefined,
      openingBalance: openingBalance || undefined,
      hasNoSellMonths:
        months === 1 || months === 3 || months === 6 || months === 12
          ? (months as 1 | 3 | 6 | 12)
          : undefined,
      customerGroupId: customerGroupId || undefined,
      assignedToEmployeeId: assignedToEmployeeId || undefined,
      status: (status || undefined) as "active" | "inactive" | undefined,
    };
  }, [
    advanceBalance,
    assignedToEmployeeId,
    customerGroupId,
    hasNoSellFrom,
    openingBalance,
    sellDue,
    sellReturn,
    status,
  ]);

  const {
    items: customers,
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
  } = useServerListPage<Customer>({
    queryKey: ["customers", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    // Full-catalog API search (same path as Add Sale customer picker), not
    // match-sorter over the sliding window of warm pages.
    searchMode: "hybrid",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    defaultSort: { sortBy: "updatedAt", sortDir: "desc" },
    fetchPage: (cursor, limit, listSort, opts) =>
      getCustomersPage(
        tenantId!,
        withListSort(
          {
            ...apiFilters,
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          },
          listSort,
        ),
        cursor,
        limit,
      ),
    fetchSummary: (opts) =>
      getCustomersListSummary(tenantId!, {
        ...apiFilters,
        search: opts?.search,
      }),
    getCursor: (row, listSort) => {
      const sortBy = listSort?.sortBy ?? "updatedAt";
      const type =
        sortBy === "createdAt" || sortBy === "updatedAt"
          ? "date"
          : sortBy === "totalSellDue" ||
              sortBy === "totalSell" ||
              sortBy === "openingBalance"
            ? "number"
            : "string";
      return compositeListCursorFrom(row, sortBy, type);
    },
  });

  const invalidate = useCallback(async () => {
    const opt = withOptimistic(queryClient, { keys: [["customers"]] });
    await opt.onMutate(undefined);
    void opt.onSettled();
  }, [queryClient]);

  const handleDeactivate = useCallback(async () => {
    if (!tenantId || !deactivateTarget) return;
    const next =
      deactivateTarget.status === "inactive" ? "active" : "inactive";
    const targetId = deactivateTarget.id;
    const opt = withOptimistic(queryClient, {
      keys: [["customers"]],
      update: (qc) => {
        patchEntityInQueries(qc, ["customers"], targetId, { status: next });
      },
    });
    setStatusBusy(true);
    const ctx = await opt.onMutate(undefined);
    try {
      await setCustomerStatus(tenantId, targetId, next);
      toast.success(
        next === "inactive" ? "Customer deactivated" : "Customer activated",
      );
      setDeactivateTarget(null);
    } catch (err) {
      opt.onError(err, undefined, ctx);
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      void opt.onSettled();
      setStatusBusy(false);
    }
  }, [deactivateTarget, queryClient, tenantId]);

  const defaultKeys = useMemo(
    () => hq6DefaultColumnKeys(HQ6_CUSTOMER_COLUMNS),
    [],
  );
  const columnOptions = useMemo(
    () => HQ6_CUSTOMER_COLUMNS.map((c) => ({ key: c.key, label: c.header })),
    [],
  );
  const visibleKeys = useMemo(() => {
    const keys = chrome.visibleColumnKeys ?? defaultKeys;
    return new Set(keys);
  }, [chrome.visibleColumnKeys, defaultKeys]);

  const totalItems = totalCount ?? customers.length;
  const effectiveSize = pageSize <= 0 ? Math.max(totalItems, 1) : pageSize;
  const knownPages = totalPagesFromEntries(totalCount, effectiveSize);
  const { from, to } = listEntryRange({
    pageIndex,
    pageSize: effectiveSize,
    itemCount: customers.length,
    // Only pass a real server/search total — never page length as a fake total.
    totalCount,
  });
  const busy = isPaging || isSearching || (isLoading && customers.length === 0);
  // Skeleton for empty table while search/load is in flight — never flash
  // "No data available" mid-search.
  const showSearchSkeleton =
    customers.length === 0 && (isLoading || isSearching);

  // Footer sell-due must come from the deferred list summary (full filtered
  // catalog). Falling back to the visible page sum makes totals look wrong.
  const dueTotal = amountSummary?.totalDue;
  // Return-due has no API aggregate yet — page sum only (labeled in footer).
  const returnDueTotal = customers.reduce(
    (sum, row) => sum + (row.totalSellReturn ?? 0),
    0,
  );

  const exportList = useListExport();

  const handleExport = useCallback(async () => {
    if (!tenantId) return;
    const rows = await getAllCustomers(tenantId, {
      ...apiFilters,
      search: search.trim() || undefined,
    });
    exportList(
      "customers",
      [
        { key: "contactId", header: "Contact ID" },
        { key: "businessName", header: "Business Name" },
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "mobile", header: "Mobile" },
        { key: "totalSellDue", header: "Total sell due" },
        { key: "status", header: "Status" },
      ],
      rows.map((row) => ({
        contactId: row.contactId ?? "",
        businessName: row.businessName ?? "",
        name: row.name,
        email: row.email ?? "",
        mobile: row.phone ?? "",
        totalSellDue: row.totalSellDue ?? 0,
        status: row.status ?? "active",
      })),
      "Export Customers Spreadsheet",
    );
  }, [apiFilters, exportList, search, tenantId]);

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
  const colSpan = 15 + CUSTOM_FIELD_COLUMNS.length;

  const handleCustomerSaved = useCallback(
    (updated: Customer) => {
      patchEntityInQueries(queryClient, ["customers"], updated.id, {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        contactId: updated.contactId,
        businessName: updated.businessName,
        taxNumber: updated.taxNumber,
        openingBalance: updated.openingBalance,
        customerGroupId: updated.customerGroupId,
        customerGroupName: updated.customerGroupName,
        details: updated.details,
      });
      void invalidate();
    },
    [invalidate, queryClient],
  );
  const crumbs = useHq6Breadcrumbs({ leafLabel: "Customers" });

  return (
    <div className="hq6-page hq6-customers-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          {" "}
          Customers{" "}
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            Manage your Customers
          </small>
        </h1>
        <Hq6Breadcrumbs items={crumbs} />
      </section>

      <section className="content">
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
              <a href="#collapseFilter" onClick={(e) => e.preventDefault()}>
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
                      id="has_sell_due"
                      type="checkbox"
                      checked={sellDue}
                      onChange={(e) => setSellDue(e.target.checked)}
                    />{" "}
                    <strong>Sell Due</strong>
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>
                    <input
                      className="input-icheck"
                      id="has_sell_return"
                      type="checkbox"
                      checked={sellReturn}
                      onChange={(e) => setSellReturn(e.target.checked)}
                    />{" "}
                    <strong>Sell Return</strong>
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
                  <label htmlFor="has_no_sell_from">Has no sell from:</label>
                  <select
                    className="form-control"
                    id="has_no_sell_from"
                    value={hasNoSellFrom}
                    onChange={(e) => setHasNoSellFrom(e.target.value)}
                  >
                    <option value="">Please Select</option>
                    <option value="1">One month</option>
                    <option value="3">Three months</option>
                    <option value="6">Six months</option>
                    <option value="12">One year</option>
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label htmlFor="cg_filter">Customer Group:</label>
                  <select
                    className="form-control"
                    id="cg_filter"
                    value={customerGroupId}
                    onChange={(e) => setCustomerGroupId(e.target.value)}
                  >
                    <option value="">None</option>
                    {(groupsQuery.data ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label htmlFor="assign_category">Staff category:</label>
                  <select
                    className="form-control"
                    id="assign_category"
                    value={assignDesignationId}
                    onChange={(e) => setAssignDesignationId(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {(designationsQuery.data ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label htmlFor="assigned_to">Assigned to:</label>
                  <AsyncMenuSelect
                    id="assigned_to"
                    value={assignedToEmployeeId}
                    selectedLabel={assignedToEmployeeName || "All workers"}
                    placeholder="Search workers…"
                    emptyMessage="No workers found"
                    loadOptions={loadEmployeeOptions}
                    loadMoreOptions={loadMoreEmployeeOptions}
                    onChange={(id) => {
                      setAssignedToEmployeeId(id);
                      setAssignedToEmployeeName(
                        id ? employeeNameById.current.get(id) ?? "" : "",
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

        <input type="hidden" value="customer" id="contact_type" readOnly />

        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header">
              <h3 className="box-title">All your Customers</h3>
              <div className="box-tools">
                <button
                  type="button"
                  className="tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full btn-modal"
                  onClick={() => openCreateModal("customer")}
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
                              {showCol("name") ? <th>Name</th> : null}
                              {showCol("email") ? <th>Email</th> : null}
                              {showCol("taxNumber") ? (
                                <th>Tax number</th>
                              ) : null}
                              {showCol("creditLimit") ? (
                                <th>Credit Limit</th>
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
                              {showCol("customerGroup") ? (
                                <th>Customer Group</th>
                              ) : null}
                              {showCol("address") ? (
                                <th className="sorting_disabled">Address</th>
                              ) : null}
                              {showCol("phone") ? <th>Mobile</th> : null}
                              {showCol("totalSellDue") ? (
                                <th className="sorting_disabled">
                                  Total Sale Due
                                </th>
                              ) : null}
                              {showCol("totalSellReturn") ? (
                                <th className="sorting_disabled">
                                  Total Sell Return Due
                                </th>
                              ) : null}
                              {CUSTOM_FIELD_COLUMNS.map((col) => (
                                <th key={col.key}>{col.header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {error ? (
                              <tr className="odd">
                                <td
                                  colSpan={colSpan}
                                  className="dataTables_empty"
                                >
                                  Failed to load customers.
                                </td>
                              </tr>
                            ) : showSearchSkeleton ? (
                              Array.from({ length: 8 }).map((_, rowIdx) => (
                                <tr
                                  key={`sk-${rowIdx}`}
                                  className={rowIdx % 2 === 0 ? "odd" : "even"}
                                >
                                  {Array.from({ length: Math.min(colSpan, 8) }).map(
                                    (__, colIdx) => (
                                      <td key={colIdx}>
                                        <span
                                          className="tw-inline-block tw-h-3.5 tw-animate-pulse tw-rounded tw-bg-gray-200"
                                          style={{
                                            width: `${48 + ((rowIdx + colIdx) % 4) * 12}%`,
                                          }}
                                          aria-hidden
                                        />
                                      </td>
                                    ),
                                  )}
                                </tr>
                              ))
                            ) : customers.length === 0 ? (
                              <tr className="odd">
                                <td
                                  colSpan={colSpan}
                                  className="dataTables_empty"
                                  valign="top"
                                >
                                  No data available in table
                                </td>
                              </tr>
                            ) : (
                              customers.map((row, index) => (
                                <tr
                                  key={row.id}
                                  role="row"
                                  className={index % 2 === 0 ? "odd" : "even"}
                                  onMouseEnter={() => {
                                    prefetchDetail(row.id);
                                    if (tenantId)
                                      prefetchCustomerDetail(
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
                                                prefetchContactModalRefs(
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
                                            onClick: () =>
                                              setDeactivateTarget(row),
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
                                            id: "sales",
                                            label: "Sales",
                                            onClick: () =>
                                              router.push(
                                                `${detailPath(row.id)}?view=sales`,
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
                                      {hq6Cell(
                                        hq6DistinctName(row.businessName, row.name),
                                      )}
                                    </td>
                                  ) : null}
                                  {showCol("name") ? <td>{row.name}</td> : null}
                                  {showCol("email") ? (
                                    <td>{hq6Cell(row.email)}</td>
                                  ) : null}
                                  {showCol("taxNumber") ? (
                                    <td>{hq6Cell(row.taxNumber)}</td>
                                  ) : null}
                                  {showCol("creditLimit") ? (
                                    <td>
                                      {row.details?.creditLimit != null
                                        ? formatHq6Currency(row.details.creditLimit)
                                        : "No Limit"}
                                    </td>
                                  ) : null}
                                  {showCol("payTerm") ? (
                                    <td>
                                      {row.details?.payTermNumber != null
                                        ? `${row.details.payTermNumber}${
                                            row.details.payTermType
                                              ? ` ${row.details.payTermType}`
                                              : ""
                                          }`
                                        : ""}
                                    </td>
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
                                  {showCol("customerGroup") ? (
                                    <td>{hq6Cell(row.customerGroupName)}</td>
                                  ) : null}
                                  {showCol("address") ? (
                                    <td>
                                      {hq6Cell(
                                        [
                                          row.details?.addressLine1,
                                          row.details?.addressLine2,
                                          row.details?.city,
                                          row.details?.state,
                                          row.details?.country,
                                        ]
                                          .filter(Boolean)
                                          .join(", "),
                                      )}
                                    </td>
                                  ) : null}
                                  {showCol("phone") ? (
                                    <td>{hq6Cell(row.phone)}</td>
                                  ) : null}
                                  {showCol("totalSellDue") ? (
                                    <td>
                                      <span
                                        className="contact_due"
                                        data-orig-value={String(
                                          row.totalSellDue ?? 0,
                                        )}
                                      >
                                        {formatHq6Currency(
                                          row.totalSellDue ?? 0,
                                        )}
                                      </span>
                                    </td>
                                  ) : null}
                                  {showCol("totalSellReturn") ? (
                                    <td>
                                      <span
                                        className="return_due"
                                        data-orig-value={String(
                                          row.totalSellReturn ?? 0,
                                        )}
                                      >
                                        {formatHq6Currency(
                                          row.totalSellReturn ?? 0,
                                        )}
                                      </span>
                                    </td>
                                  ) : null}
                                  {CUSTOM_FIELD_COLUMNS.map((col) => (
                                    <td key={col.key}>
                                      {hq6Cell(row.details?.[col.key])}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                          {customers.length > 0 ? (
                            <tfoot>
                              <tr className="bg-gray font-17 text-center footer-total">
                                <td />
                                {showCol("contactId") ? <td /> : null}
                                {showCol("businessName") ? <td /> : null}
                                {showCol("name") ? <td /> : null}
                                {showCol("email") ? <td /> : null}
                                {showCol("taxNumber") ? <td /> : null}
                                <td
                                  colSpan={
                                    [
                                      "creditLimit",
                                      "payTerm",
                                      "openingBalance",
                                      "advanceBalance",
                                      "createdAt",
                                      "customerGroup",
                                      "address",
                                      "phone",
                                    ].filter((k) => showCol(k)).length || 1
                                  }
                                >
                                  <strong>Total:</strong>
                                </td>
                                {showCol("totalSellDue") ? (
                                  <td className="footer_contact_due">
                                    {dueTotal != null
                                      ? formatHq6Currency(dueTotal)
                                      : "—"}
                                  </td>
                                ) : null}
                                {showCol("totalSellReturn") ? (
                                  <td className="footer_contact_return_due">
                                    {formatHq6Currency(returnDueTotal)}
                                  </td>
                                ) : null}
                                {CUSTOM_FIELD_COLUMNS.map((col) => (
                                  <td key={col.key} />
                                ))}
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

      <Hq6ContactEditModal
        open={Boolean(editTarget)}
        customer={editTarget}
        tenantId={tenantId}
        onClose={() => setEditTarget(null)}
        onSaved={handleCustomerSaved}
      />
      <Hq6PayContactModal
        open={Boolean(payTarget)}
        customer={payTarget}
        tenantId={tenantId}
        onClose={() => setPayTarget(null)}
        onPaid={invalidate}
      />
      <Hq6ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title={
          deactivateTarget?.status === "inactive"
            ? "Activate contact"
            : "Deactivate contact"
        }
        message={
          deactivateTarget
            ? deactivateTarget.status === "inactive"
              ? `Activate ${deactivateTarget.businessName ?? deactivateTarget.name}?`
              : `Deactivate ${deactivateTarget.businessName ?? deactivateTarget.name}? They will be hidden from active lists.`
            : ""
        }
        confirmLabel={
          deactivateTarget?.status === "inactive" ? "Activate" : "Deactivate"
        }
        confirming={statusBusy}
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
