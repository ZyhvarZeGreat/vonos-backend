"use client";

import { useMemo, useState } from "react";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { InviteUserModal } from "@/components/organisms/InviteUserModal";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  getAllTenantsWorkforcePage,
  getWorkforcePage,
} from "@/lib/api/hrm";
import { getAllTenantUsersPage, getUsersPage, type UserListRow } from "@/lib/api/users";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { hasPermission } from "@/lib/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6UsersListView } from "@/components/pages/Hq6UsersListView";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import { nameListCursor, workforceListCursor } from "@/lib/utils/pagination";
import type { User, WorkforceMember } from "@vonos/types";

const HR_TABS = [
  { id: "workforce", label: "Workforce" },
  { id: "app-access", label: "App access" },
] as const;

type HrTab = (typeof HR_TABS)[number]["id"];

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

const workforceColumns: ColumnConfig<WorkforceMember>[] = [
  {
    key: "employeeName",
    header: "Employee",
    render: (r) => <span className="font-medium">{r.employeeName}</span>,
  },
  {
    key: "employeeId",
    header: "Legacy ID",
    render: (r) => r.employeeId ?? "—",
  },
  {
    key: "locationCode",
    header: "Location",
    render: (r) => r.locationCode ?? "—",
  },
  {
    key: "payrollCount",
    header: "Payroll runs",
    sortValue: (r) => r.payrollCount,
  },
  {
    key: "lastPayrollMonth",
    header: "Last payroll",
    sortValue: (r) => new Date(r.lastPayrollMonth).getTime(),
    render: (r) => formatDate(r.lastPayrollMonth),
  },
  {
    key: "totalNetPay",
    header: "Total net paid",
    sortValue: (r) => r.totalNetPay,
    render: (r) => formatCurrency(r.totalNetPay, "NGN"),
  },
];

const groupWorkforceColumns: ColumnConfig<WorkforceMember>[] = [
  {
    key: "tenantCode",
    header: "Entity",
    render: (r) =>
      r.tenantCode ? (
        <EntityColorBadge code={r.tenantCode} size="sm" />
      ) : (
        <span className="text-sm text-muted">—</span>
      ),
  },
  ...workforceColumns,
];

const hrColumns: ColumnConfig<UserListRow>[] = [
  { key: "name", header: "Employee", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "email", header: "Email" },
  {
    key: "role",
    header: "Role",
    render: (r) => formatRole(r.role),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <StatusPill status={formatStatus(r.status)} vocabulary="userStatus" />
    ),
  },
  {
    key: "lastLoginAt",
    header: "Last sign-in",
    sortValue: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).getTime() : 0),
    render: (r) => (
      <span className="text-muted">
        {r.lastLoginAt ? formatDate(r.lastLoginAt) : "Never"}
      </span>
    ),
  },
];

const groupHrColumns: ColumnConfig<UserListRow>[] = [
  {
    key: "tenantCode",
    header: "Entity",
    render: (r) =>
      r.tenantCode ? (
        <EntityColorBadge code={r.tenantCode} size="sm" />
      ) : (
        <span className="text-sm font-medium">VAG</span>
      ),
  },
  ...hrColumns,
];

export interface HrViewProps {
  allTenants?: boolean;
  embedded?: boolean;
}

export function HrView({ allTenants = false, embedded = false }: HrViewProps) {
  return <HrViewBody allTenants={allTenants} embedded={embedded} />;
}

/** Users management list (HQ6: `/VA/users`). */
export function UsersView(props: HrViewProps) {
  const isHq6 = useIsVaHq6();
  if (isHq6 && !props.allTenants && !props.embedded) {
    return <Hq6UsersListView />;
  }
  return <HrViewBody {...props} />;
}

function HrViewBody({ allTenants = false, embedded = false }: HrViewProps) {
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const authRole = useAuthStore((state) => state.role);
  const { search, setSearch } = useListPageFilters();
  const [activeTab, setActiveTab] = useState<HrTab>("workforce");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const canInvite = authRole ? hasPermission(authRole, "manageUsers") : false;

  const {
    items: workforce,
    hasMore: workforceHasMore,
    pageIndex: workforcePageIndex,
    pageSize: workforcePageSize,
    canGoPrev: workforceCanGoPrev,
    goNext: workforceGoNext,
    goPrev: workforceGoPrev,
    setPageSize: setWorkforcePageSize,
    isLoading: workforceLoading,
    isFetching: workforceFetching,
    error: workforceError,
    goToPage: workforceGoToPage,
    canSelectPage: workforceCanSelectPage,
    totalCount: workforceTotalCount,
  } = useServerListPage<WorkforceMember>({
    queryKey: ["workforce", allTenants ? "all" : tenantId],
    enabled: activeTab === "workforce" && (allTenants || Boolean(tenantId)),
    search,
    fetchPage: (cursor, limit, _sort, opts) =>
      allTenants
        ? getAllTenantsWorkforcePage(cursor, limit, search || undefined, {
            includeSummary: opts?.includeSummary,
          })
        : getWorkforcePage(tenantId!, cursor, limit, search || undefined, {
            includeSummary: opts?.includeSummary,
          }),
    getCursor: (row) => workforceListCursor(row),
  });

  const {
    items: users,
    hasMore,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading: usersLoading,
    isFetching,
    isPaging: usersFetching,
    error: usersError,
    goToPage,
    canSelectPage,
    totalCount: usersTotalCount,
  } = useServerListPage<UserListRow>({
    queryKey: ["users", allTenants ? "all" : tenantId],
    enabled: activeTab === "app-access" && (allTenants || Boolean(tenantId)),
    search,
    filters: { role: roleFilter || undefined, status: statusFilter || undefined },
    fetchPage: (cursor, limit, _sort, opts) =>
      allTenants
        ? getAllTenantUsersPage(cursor, limit, {
            search: search.trim() || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
        includeSummary: opts?.includeSummary,
      })
        : getUsersPage(tenantId!, cursor, limit, {
            search: search.trim() || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const filteredUsers = users;
  const filteredWorkforce = workforce;

  const roleOptions = useMemo(
    () =>
      (["viewer", "staff", "manager", "admin", "super_admin"] as const).map(
        (value) => ({ value, label: value }),
      ),
    [],
  );
  const statusOptions = useMemo(
    () =>
      (["active", "invited", "suspended"] as const).map((value) => ({
        value,
        label: value,
      })),
    [],
  );

  const workforceCount = workforceTotalCount ?? filteredWorkforce.length;
  const activeCount = users.filter((u) => u.status === "active").length;
  const invitedCount = users.filter((u) => u.status === "invited").length;
  const usersCountLabel = usersTotalCount ?? users.length;

  return (
    <div className={embedded ? "p-4" : isHq6 ? "space-y-3" : "space-y-6"}>
      {!embedded && !isHq6 ? (
        <EntityContextBanner
          module="HR & People"
          description={
            allTenants
              ? "Workforce roster and app access across all operating entities."
              : "Legacy payroll workers for this entity plus staff with Vonos login access."
          }
        />
      ) : null}

      <div className={isHq6 ? "grid gap-3 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-3"}>
        <div
          className={
            isHq6
              ? "hq6-card p-3"
              : "rounded-xl border border-border bg-card p-4 shadow-card"
          }
        >
          <p
            className={
              isHq6
                ? "text-xs font-semibold uppercase tracking-wide text-[#777]"
                : "text-xs font-medium uppercase tracking-wide text-muted"
            }
          >
            Workforce
          </p>
          <p
            className={
              isHq6
                ? "mt-1 text-2xl font-semibold text-[#111827]"
                : "mt-1 text-2xl font-semibold text-foreground"
            }
          >
            {workforceCount}
          </p>
        </div>
        <div
          className={
            isHq6
              ? "hq6-card p-3"
              : "rounded-xl border border-border bg-card p-4 shadow-card"
          }
        >
          <p
            className={
              isHq6
                ? "text-xs font-semibold uppercase tracking-wide text-[#777]"
                : "text-xs font-medium uppercase tracking-wide text-muted"
            }
          >
            App users active
          </p>
          <p
            className={
              isHq6
                ? "mt-1 text-2xl font-semibold text-[#111827]"
                : "mt-1 text-2xl font-semibold text-foreground"
            }
          >
            {activeCount}
            {usersTotalCount != null ? (
              <span className="ml-1 text-sm font-normal text-muted">
                / {usersCountLabel}
              </span>
            ) : null}
          </p>
        </div>
        <div
          className={
            isHq6
              ? "hq6-card p-3"
              : "rounded-xl border border-border bg-card p-4 shadow-card"
          }
        >
          <p
            className={
              isHq6
                ? "text-xs font-semibold uppercase tracking-wide text-[#777]"
                : "text-xs font-medium uppercase tracking-wide text-muted"
            }
          >
            Pending invite
          </p>
          <p
            className={
              isHq6
                ? "mt-1 text-2xl font-semibold text-[#111827]"
                : "mt-1 text-2xl font-semibold text-foreground"
            }
          >
            {invitedCount}
          </p>
        </div>
      </div>

      {!allTenants && tenantName && !isHq6 ? (
        <p className="text-sm text-muted">
          HR for{" "}
          {tenantCode ? (
            <EntityColorBadge code={tenantCode} size="sm" className="inline-flex" />
          ) : (
            <span className="font-medium text-foreground">{tenantName}</span>
          )}
        </p>
      ) : null}

      {canInvite && activeTab === "app-access" ? (
        <div className="flex justify-end">
          {isHq6 ? (
            <button
              type="button"
              className="hq6-btn hq6-btn-blue"
              onClick={() => setInviteOpen(true)}
            >
              Invite staff
            </button>
          ) : (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invite staff
            </Button>
          )}
        </div>
      ) : null}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        allTenants={allTenants}
        defaultTenantId={allTenants ? undefined : tenantId}
      />

      <ListPageShell
        tabs={HR_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as HrTab)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeTab === "workforce"
            ? "Search employees…"
            : "Search by name or email…"
        }
        showImport={false}
        showDateRange={false}
        className={embedded ? "border-0 shadow-none" : undefined}
        hq6Title="HRM"
        hq6Subtitle={
          allTenants
            ? "Group workforce across entities"
            : "Human resource management"
        }
        hq6PageChrome={!embedded}
        filterDropdowns={
          activeTab === "app-access"
            ? [
                {
                  id: "role",
                  label: "Role",
                  value: roleFilter,
                  onChange: setRoleFilter,
                  options: roleOptions,
                },
                {
                  id: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: statusOptions,
                },
              ]
            : undefined
        }
      >
        {activeTab === "workforce" ? (
          <ServerPaginatedTable
            items={filteredWorkforce}
            columns={allTenants ? groupWorkforceColumns : workforceColumns}
            pageIndex={workforcePageIndex}
            pageSize={workforcePageSize}
            hasMore={workforceHasMore}
            canGoPrev={workforceCanGoPrev}
            onNext={workforceGoNext}
            onPrev={workforceGoPrev}
            onPageSizeChange={setWorkforcePageSize}
            onPageSelect={workforceGoToPage}
            canSelectPage={workforceCanSelectPage}
            isLoading={workforceLoading}
            isFetching={workforceFetching}
            error={
              workforceError
                ? workforceError instanceof Error
                  ? workforceError.message
                  : "Could not load workforce."
                : null
            }
            emptyState={{
              message:
                "No payroll workers imported yet. Run HRM migration for this entity, or check Payroll under HRM.",
            }}
          />
        ) : (
          <ServerPaginatedTable
            items={filteredUsers}
            columns={allTenants ? groupHrColumns : hrColumns}
            pageIndex={pageIndex}
            pageSize={pageSize}
            hasMore={hasMore}
            canGoPrev={canGoPrev}
            onNext={goNext}
            onPrev={goPrev}
            onPageSizeChange={setPageSize}
            onPageSelect={goToPage}
            canSelectPage={canSelectPage}
            isLoading={usersLoading}
            isFetching={usersFetching}
            error={usersError ? "Could not load app users." : null}
            emptyState={{ message: "No staff with app login yet. Use Invite staff to add users." }}
          />
        )}
      </ListPageShell>
    </div>
  );
}
