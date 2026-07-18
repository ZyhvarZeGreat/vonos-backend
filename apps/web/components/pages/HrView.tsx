"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { InviteUserModal } from "@/components/organisms/InviteUserModal";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getAllTenantsWorkforce, getWorkforce } from "@/lib/api/hrm";
import { getAllTenantUsersPage, getUsersPage, type UserListRow } from "@/lib/api/users";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { hasPermission } from "@/lib/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
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
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const authRole = useAuthStore((state) => state.role);
  const { search, setSearch } = useListPageFilters();
  const [activeTab, setActiveTab] = useState<HrTab>("workforce");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const canInvite = authRole ? hasPermission(authRole, "manageUsers") : false;

  const workforceQuery = useQuery({
    queryKey: ["workforce", allTenants ? "all" : tenantId, search],
    enabled: activeTab === "workforce" && (allTenants || Boolean(tenantId)),
    queryFn: () =>
      allTenants
        ? getAllTenantsWorkforce(search || undefined)
        : getWorkforce(tenantId!, search || undefined),
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
    isFetching: usersFetching,
    error: usersError,
    goToPage,
    canSelectPage,
  } = useServerListPage<UserListRow>({
    queryKey: ["users", allTenants ? "all" : tenantId],
    enabled: activeTab === "app-access" && (allTenants || Boolean(tenantId)),
    search,
    filters: { role: roleFilter || undefined, status: statusFilter || undefined },
    fetchPage: (cursor, limit) =>
      allTenants
        ? getAllTenantUsersPage(cursor, limit, {
            search: search.trim() || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
          })
        : getUsersPage(tenantId!, cursor, limit, {
            search: search.trim() || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
          }),
  });

  const workforce = workforceQuery.data ?? [];

  const filteredUsers = users;

  // Workforce API already accepts search — keep result as returned.
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

  const activeCount = users.filter((u) => u.status === "active").length;
  const invitedCount = users.filter((u) => u.status === "invited").length;

  return (
    <div className={embedded ? "p-4" : "space-y-6"}>
      {!embedded ? (
        <EntityContextBanner
          module="HR & People"
          description={
            allTenants
              ? "Workforce roster and app access across all operating entities."
              : "Legacy payroll workers for this entity plus staff with Vonos login access."
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Workforce</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{workforce.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">App users active</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Pending invite</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{invitedCount}</p>
        </div>
      </div>

      {!allTenants && tenantName ? (
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
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Invite staff
          </Button>
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
            pageIndex={0}
            pageSize={filteredWorkforce.length || 25}
            hasMore={false}
            canGoPrev={false}
            onNext={() => {}}
            onPrev={() => {}}
            onPageSizeChange={() => {}}
            onPageSelect={() => {}}
            isLoading={workforceQuery.isLoading}
            isFetching={workforceQuery.isFetching}
            error={
              workforceQuery.error
                ? workforceQuery.error instanceof Error
                  ? workforceQuery.error.message
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

/** @deprecated Use HrView — kept for legacy /users routes. */
export function UsersView(props: HrViewProps) {
  return <HrView {...props} />;
}
