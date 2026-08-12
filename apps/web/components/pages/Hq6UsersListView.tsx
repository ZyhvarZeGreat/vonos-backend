"use client";

/**
 * Direct lift from HQ6 ui-audit/01_users/page.html
 * Source Blade: manage_user/index.blade.php + components/widget.blade.php
 * + ManageUserController DataTables action HTML.
 *
 * Markup/classes match the scraped page — not our generic list shell.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import {
  deactivateUser,
  getUsersPage,
  getAllUsers,
  getAllTenantUsersPage,
  getAllTenantUsers,
  type UserListRow,
} from "@/lib/api/users";
import { getTenantRoles } from "@/lib/api/tenantRoles";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { usePathname } from "next/navigation";
import { useHq6Permissions } from "@/lib/hooks/useHq6Permissions";
import { prefetchUserDetail } from "@/lib/query/prefetchListDetails";
import { matchSearchRows } from "@/lib/utils/listClientSearch";
import { toast } from "@/stores/toastStore";
import type { User } from "@vonos/types";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500, 1000, -1] as const;
const USERS_PAGE_SIZE = 50;

function formatJwtRole(role: User["role"]): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .toUpperCase();
}

function roleLabelFor(row: User): string {
  if (row.tenantRoleName) return row.tenantRoleName.toUpperCase();
  return formatJwtRole(row.role);
}

function usernameOf(row: UserListRow): string {
  return row.email.split("@")[0] ?? "";
}

/** HQ6: `{{$username}} @if(empty($allow_login)) <span class="label bg-gray">…` */
function UsernameCell({ row }: { row: UserListRow }) {
  const username = usernameOf(row);
  const loginBlocked = row.status === "suspended" || row.status === "invited";
  if (loginBlocked && !username) {
    return <span className="label bg-gray">Login not allowed</span>;
  }
  return (
    <>
      {username}
      {loginBlocked ? (
        <>
          {" "}
          <span className="label bg-gray">
            {row.status === "invited" ? "Invited" : "Login not allowed"}
          </span>
        </>
      ) : null}
    </>
  );
}

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

export function Hq6UsersListView() {
  const tenantId = useTenantId();
  const pathname = usePathname() ?? "";
  const isAdminHrm = pathname.startsWith("/admin/hrm/users");
  /** VAG HRM users list is group-wide — no entity switch required. */
  const useAllTenants = isAdminHrm;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { detailPath, prefetchDetail } = useRecordNavigation("users");
  const { requireCan } = useHq6Permissions();
  const { search, setSearch } = useListPageFilters();
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserListRow | null>(null);

  const createHref = `${detailPath("new")}/edit`;

  /** Warm create route + default-home roles so Add User isn't a cold start. */
  useEffect(() => {
    router.prefetch(createHref);
    if (!tenantId) return;
    void queryClient.prefetchQuery({
      queryKey: ["tenant-roles", tenantId],
      queryFn: () => getTenantRoles(tenantId),
      staleTime: 5 * 60_000,
    });
  }, [createHref, queryClient, router, tenantId]);

  const deactivateMutation = useMutation({
    mutationFn: (row: UserListRow) =>
      deactivateUser(row.id, { tenantId: tenantId ?? row.tenantId ?? null }),
    onSuccess: async (_data, row) => {
      toast.success(`Deactivated ${row.name}`);
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deactivate user");
    },
  });

  const {
    items: users,
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
    isSearching,
    error,
    goToPage,
  } = useServerListPage<UserListRow>({
    queryKey: ["users", useAllTenants ? "all" : tenantId, "hq6"],
    enabled: useAllTenants || Boolean(tenantId),
    defaultPageSize: USERS_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _sort, opts) =>
      useAllTenants
        ? getAllTenantUsersPage(cursor, limit, {
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          })
        : getUsersPage(tenantId!, cursor, limit, {
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          }),
  });

  const exportList = useListExport();

  const handleExport = useCallback(() => {
    if (!useAllTenants && !tenantId) return;
    void (async () => {
      const rows = useAllTenants
        ? await getAllTenantUsers()
        : await getAllUsers(tenantId!);
      const filtered = matchSearchRows(rows, search, ["name", "email"]);
      exportList(
        "users",
        [
          { key: "username", header: "Username" },
          { key: "name", header: "Name" },
          { key: "role", header: "Role" },
          { key: "email", header: "Email" },
        ],
        filtered.map((row) => ({
          username: usernameOf(row),
          name: row.name,
          role: roleLabelFor(row),
          email: row.email,
        })),
        "Export Users",
      );
    })();
  }, [exportList, search, tenantId, useAllTenants]);

  const warmUser = (row: UserListRow) => {
    prefetchDetail(row.id);
    if (tenantId) prefetchUserDetail(queryClient, tenantId, row.id, row);
  };

  const total = totalCount ?? users.length;
  const from = users.length === 0 ? 0 : pageIndex * pageSize + 1;
  const to = pageIndex * pageSize + users.length;
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(Math.max(total, 1) / pageSize)) : 1;
  const busy = isFetching || isLoading || isSearching;

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 7);
    for (let i = 0; i < max; i++) pages.push(i);
    return pages;
  }, [totalPages]);

  return (
    <div className="hq6-page hq6-users-page">
      {/* —— content-header (page.html) —— */}
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Users{" "}
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            Manage users
          </small>
        </h1>
      </section>

      {/* —— content + components.widget (box-primary) —— */}
      <section className="content">
        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header tw-flex tw-items-center tw-justify-between tw-gap-3">
              <h3 className="box-title">All users</h3>
              <div className="box-tools tw-flex tw-items-center">
                  <a
                    href={createHref}
                    className="tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full"
                    onMouseEnter={() => router.prefetch(createHref)}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!requireCan("user.create")) return;
                      router.push(createHref);
                    }}
                  >
                    {PlusIcon} Add
                  </a>
                </div>
            </div>

            <div className="tw-flow-root tw-border-gray-200">
              <div>
                <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                  <div className="table-responsive">
                    <div
                      id="users_table_wrapper"
                      className="dataTables_wrapper form-inline dt-bootstrap no-footer"
                    >
                      {/* HQ6 DataTables top row — exact classes from page.html */}
                      <div className="row margin-bottom-20 text-center">
                        <div className="col-sm-1">
                          <div
                            className="dataTables_length"
                            id="users_table_length"
                          >
                            <label>
                              Show{" "}
                              <select
                                name="users_table_length"
                                aria-controls="users_table"
                                className="form-control input-sm"
                                value={pageSize}
                                disabled={busy}
                                onChange={(e) =>
                                  setPageSize(Number(e.target.value))
                                }
                              >
                                {PAGE_SIZE_OPTIONS.map((n) => (
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
                            <a
                              className="buttons-csv buttons-html5 tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2"
                              href="#"
                              role="button"
                              tabIndex={0}
                              aria-controls="users_table"
                              onClick={(e) => {
                                e.preventDefault();
                                if (!requireCan("view_export_buttons")) return;
                                handleExport();
                              }}
                            >
                              <span>
                                <i className="fa fa-file-csv" aria-hidden />{" "}
                                Export CSV
                              </span>
                            </a>{" "}
                            <a
                              className="buttons-excel buttons-html5 tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2"
                              href="#"
                              role="button"
                              tabIndex={0}
                              aria-controls="users_table"
                              onClick={(e) => {
                                e.preventDefault();
                                if (!requireCan("view_export_buttons")) return;
                                handleExport();
                              }}
                            >
                              <span>
                                <i className="fa fa-file-excel" aria-hidden />{" "}
                                Export Excel
                              </span>
                            </a>{" "}
                            <a
                              className="buttons-print tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2"
                              href="#"
                              role="button"
                              tabIndex={0}
                              aria-controls="users_table"
                              onClick={(e) => {
                                e.preventDefault();
                                if (!requireCan("view_export_buttons")) return;
                                window.print();
                              }}
                            >
                              <span>
                                <i className="fa fa-print" aria-hidden /> Print
                              </span>
                            </a>{" "}
                            <a
                              className="buttons-collection buttons-colvis tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2"
                              href="#"
                              role="button"
                              tabIndex={0}
                              aria-controls="users_table"
                              onClick={(e) => {
                                e.preventDefault();
                                setColumnsOpen((v) => !v);
                              }}
                            >
                              <span>
                                <i className="fa fa-columns" aria-hidden />{" "}
                                Column visibility
                              </span>
                            </a>{" "}
                            <a
                              className="buttons-pdf buttons-html5 tw-dw-btn-xs tw-dw-btn tw-dw-btn-outline tw-my-2"
                              href="#"
                              role="button"
                              tabIndex={0}
                              aria-controls="users_table"
                              onClick={(e) => {
                                e.preventDefault();
                                if (!requireCan("view_export_buttons")) return;
                                handleExport();
                              }}
                            >
                              <span>
                                <i className="fa fa-file-pdf" aria-hidden />{" "}
                                Export PDF
                              </span>
                            </a>
                          </div>
                        </div>
                        <div className="col-sm-3">
                          <Hq6DtSearchFilter
                            id="users_table_filter"
                            ariaControls="users_table"
                            value={search}
                            onChange={setSearch}
                            isSearching={isSearching}
                          />
                        </div>
                        <div
                          id="users_table_processing"
                          className="dataTables_processing panel panel-default"
                          style={{
                            display: busy && users.length === 0 ? "block" : "none",
                          }}
                        >{isSearching ? "Searching…" : "Processing…"}</div>
                      </div>

                      {columnsOpen ? (
                        <p className="text-muted" style={{ fontSize: 12 }}>
                          Columns: Username, Name, Role, Email, Action
                        </p>
                      ) : null}

                      <table
                        className="table table-bordered table-striped dataTable no-footer"
                        id="users_table"
                        role="grid"
                        aria-describedby="users_table_info"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr role="row">
                            <th
                              className="sorting_asc"
                              tabIndex={0}
                              aria-controls="users_table"
                              rowSpan={1}
                              colSpan={1}
                              aria-sort="ascending"
                            >
                              Username
                            </th>
                            <th
                              className="sorting"
                              tabIndex={0}
                              aria-controls="users_table"
                              rowSpan={1}
                              colSpan={1}
                            >
                              Name
                            </th>
                            <th
                              className="sorting"
                              tabIndex={0}
                              aria-controls="users_table"
                              rowSpan={1}
                              colSpan={1}
                            >
                              Role
                            </th>
                            <th
                              className="sorting"
                              tabIndex={0}
                              aria-controls="users_table"
                              rowSpan={1}
                              colSpan={1}
                            >
                              Email
                            </th>
                            <th
                              className="sorting_disabled"
                              rowSpan={1}
                              colSpan={1}
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {error ? (
                            <tr className="odd">
                              <td colSpan={5} className="dataTables_empty">
                                Could not load users.
                              </td>
                            </tr>
                          ) : !busy && users.length === 0 ? (
                            <tr className="odd">
                              <td colSpan={5} className="dataTables_empty">
                                No data available in table
                              </td>
                            </tr>
                          ) : (
                            users.map((row, index) => (
                              <tr
                                key={row.id}
                                role="row"
                                className={index % 2 === 0 ? "odd" : "even"}
                                onMouseEnter={() => warmUser(row)}
                              >
                                <td className="sorting_1">
                                  <UsernameCell row={row} />
                                </td>
                                <td>
                                  {row.name}
                                  {row.tenantCode ? (
                                    <span className="tw-ml-1 tw-text-xs tw-text-gray-500">
                                      ({row.tenantCode})
                                    </span>
                                  ) : null}
                                </td>
                                <td>{roleLabelFor(row)}</td>
                                <td>{row.email}</td>
                                <td>
                                  {/* ManageUserController action HTML order */}
                                  <a
                                    href={`${detailPath(row.id)}/edit`}
                                    className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-primary"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (!requireCan("user.update")) return;
                                      warmUser(row);
                                      router.push(
                                        `${detailPath(row.id)}/edit`,
                                      );
                                    }}
                                  >
                                    <i
                                      className="glyphicon glyphicon-edit"
                                      aria-hidden
                                    />{" "}
                                    Edit
                                  </a>
                                  &nbsp;
                                  <a
                                    href={detailPath(row.id)}
                                    className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-info"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (!requireCan("user.view", "view")) return;
                                      warmUser(row);
                                      router.push(detailPath(row.id));
                                    }}
                                  >
                                    <i className="fa fa-eye" aria-hidden />{" "}
                                    View
                                  </a>
                                  &nbsp;
                                  <button
                                    type="button"
                                    data-href={detailPath(row.id)}
                                    className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-error delete_user_button"
                                    onClick={() => {
                                      if (!requireCan("user.delete")) return;
                                      setDeleteTarget(row);
                                    }}
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

                      {/* HQ6 page.html: info + paginate as siblings (no Bootstrap row) */}
                      <div
                        className="dataTables_info"
                        id="users_table_info"
                        role="status"
                        aria-live="polite"
                      >
                        {`Showing ${from} to ${to} of ${total.toLocaleString()} entries`}
                      </div>
                      <div
                        className="dataTables_paginate paging_simple_numbers"
                        id="users_table_paginate"
                      >
                        <ul className="pagination">
                          <li
                            className={`paginate_button previous${!canGoPrev || busy ? " disabled" : ""}`}
                            id="users_table_previous"
                          >
                            <a
                              href="#"
                              aria-controls="users_table"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault();
                                if (canGoPrev && !busy) goPrev();
                              }}
                            >
                              Previous
                            </a>
                          </li>
                          {pageNumbers.map((p) => (
                            <li
                              key={p}
                              className={`paginate_button${p === pageIndex ? " active" : ""}${busy ? " disabled" : ""}`}
                            >
                              <a
                                href="#"
                                aria-controls="users_table"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!busy && p !== pageIndex) goToPage(p);
                                }}
                              >
                                {p + 1}
                              </a>
                            </li>
                          ))}
                          <li
                            className={`paginate_button next${!hasMore || busy ? " disabled" : ""}`}
                            id="users_table_next"
                          >
                            <a
                              href="#"
                              aria-controls="users_table"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault();
                                if (hasMore && !busy) goNext();
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

      <Hq6ConfirmModal
        open={Boolean(deleteTarget)}
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget && !deactivateMutation.isPending) {
            deactivateMutation.mutate(deleteTarget);
          }
        }}
        title="Are you sure?"
        message={
          deleteTarget
            ? `This will deactivate “${deleteTarget.name}” and revoke their access.`
            : "This user will be deactivated."
        }
        confirmLabel={
          deactivateMutation.isPending ? "Deactivating…" : "Yes, deactivate"
        }
      />
    </div>
  );
}
