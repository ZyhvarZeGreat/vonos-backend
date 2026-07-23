"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CloudDownload, Filter, Plus } from "lucide-react";
import type { User } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { InviteUserModal } from "@/components/organisms/InviteUserModal";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6ListToolbar } from "@/components/hq6/Hq6ListToolbar";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { getUsersPage, type UserListRow } from "@/lib/api/users";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { hasPermission } from "@/lib/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";
function formatRole(role: User["role"]): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status: User["status"]): string {
  if (status === "active") return "Active";
  if (status === "invited") return "Invited";
  return "Suspended";
}

function statusBadgeClass(status: User["status"]): string {
  if (status === "active") return "hq6-pay-paid";
  if (status === "invited") return "hq6-pay-partial";
  return "hq6-pay-due";
}

/** HQ6 Users list — ui-audit/01_users/screenshot.png */
export function Hq6UsersListView() {
  const tenantId = useTenantId();
  const router = useRouter();
  const { detailPath } = useRecordNavigation("users");
  const authRole = useAuthStore((state) => state.role);
  const { search, setSearch } = useListPageFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localSearch, setLocalSearch] = useState(search);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[] | null>(null);

  const canInvite = authRole ? hasPermission(authRole, "manageUsers") : false;

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
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<UserListRow>({
    queryKey: ["users", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    search,
    filters: { role: roleFilter || undefined, status: statusFilter || undefined },
    fetchPage: (cursor, limit, _sort, opts) =>
      getUsersPage(tenantId!, cursor, limit, {
        search: (localSearch || search).trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        includeSummary: opts?.includeSummary,
      }),
  });

  const commitSearch = () => setSearch(localSearch);

  const columns: ColumnConfig<UserListRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "view",
                label: "View",
                onClick: () => router.push(detailPath(row.id)),
              },
              {
                id: "edit",
                label: "Edit",
                onClick: () => router.push(`${detailPath(row.id)}/edit`),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => router.push(`${detailPath(row.id)}?action=delete`),
              },
            ]}
          />
        ),
      },
      {
        key: "username",
        header: "Username",
        render: (row) => row.email.split("@")[0],
      },
      {
        key: "name",
        header: "Name",
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "role",
        header: "Role",
        render: (row) => formatRole(row.role),
      },
      {
        key: "email",
        header: "Email",
        render: (row) => row.email,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span className={cn("hq6-pay-badge", statusBadgeClass(row.status))}>
            {formatStatus(row.status)}
          </span>
        ),
      },
      {
        key: "lastLoginAt",
        header: "Last sign-in",
        sortValue: (row) =>
          row.lastLoginAt ? new Date(row.lastLoginAt).getTime() : 0,
        render: (row) =>
          row.lastLoginAt ? formatDate(row.lastLoginAt) : "Never",
      },
    ],
    [detailPath, router],
  );

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header || c.key) })),
    [columns],
  );

  const effectiveColumns = useMemo(() => {
    if (!visibleColumnKeys) return columns;
    const allowed = new Set(["actions", ...visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [columns, visibleColumnKeys]);

  return (
    <div className="hq6-page">
      <section className="hq6-content-header">
        <h1>Users</h1>
      </section>

      <div className="hq6-card hq6-filters-card">
        <button
          type="button"
          className="hq6-filters-summary"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 opacity-60 transition-transform",
              filtersOpen && "rotate-180",
            )}
          />
        </button>
        {filtersOpen ? (
          <div className="hq6-filters-body">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="hq6-field">
                <span>Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {(["viewer", "staff", "manager", "admin"] as const).map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hq6-field">
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {(["active", "invited", "suspended"] as const).map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="hq6-card hq6-products-box overflow-x-clip">
        <div className="hq6-tab-row">
          <div className="flex min-w-0 flex-1">
            <button type="button" className="hq6-tab hq6-tab-active">
              All users
            </button>
          </div>
          {canInvite ? (
            <div className="flex shrink-0 items-center gap-2 px-3">
              <button
                type="button"
                className="hq6-btn hq6-btn-blue"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
              <button type="button" className="hq6-btn hq6-btn-download">
                <CloudDownload className="h-3.5 w-3.5" />
                Download Excel
              </button>
            </div>
          ) : null}
        </div>

        <Hq6ListToolbar
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          searchValue={localSearch}
          onSearchChange={setLocalSearch}
          onSearchCommit={commitSearch}
          onPrint={() => setPrintOpen(true)}
          onColumnVisibility={() => setColumnsOpen(true)}
        />

        <div className="hq6-table-wrap relative">
          <DataTable
            data={users}
            columns={effectiveColumns}
            displayMode="table"
            embedded
            disablePagination
            isLoading={isLoading}
            isFetching={isFetching && !isLoading}
            error={error ? "Could not load users." : null}
            emptyState={{ message: "No users found." }}
          />
        </div>

        {(users.length > 0 || canGoPrev || isLoading) && !isLoading ? (
          <CursorPaginationBar
            pageIndex={pageIndex}
            pageSize={pageSize}
            itemCount={users.length}
            hasMore={hasMore}
            canGoPrev={canGoPrev}
            onPrev={goPrev}
            onNext={goNext}
            onPageSizeChange={setPageSize}
            onPageSelect={goToPage}
            canSelectPage={canSelectPage}
            totalItems={totalCount}
            isBusy={isFetching && !isLoading}
            className="border-t border-[var(--hq6-border)] px-3 py-2"
          />
        ) : null}
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        defaultTenantId={tenantId}
      />
      <Hq6PrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
      <Hq6ColumnVisibilityModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columnOptions}
        visibleKeys={visibleColumnKeys ?? columnOptions.map((c) => c.key)}
        onChange={setVisibleColumnKeys}
      />
    </div>
  );
}
