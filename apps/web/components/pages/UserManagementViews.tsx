"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { EmptyState } from "@/components/atoms/EmptyState";

interface RoleRow {
  id: string;
  name: string;
  userCount: number;
}

const roleColumns: ColumnConfig<RoleRow>[] = [
  {
    key: "name",
    header: "Role",
    render: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    key: "userCount",
    header: "Users",
    render: (r) => <span className="tabular-nums">{r.userCount}</span>,
  },
  {
    key: "actions",
    header: "Action",
    render: () => (
      <div className="flex gap-1">
        <Button variant="secondary" size="sm">
          Edit
        </Button>
      </div>
    ),
  },
];

const BUILT_IN_ROLES: RoleRow[] = [
  { id: "super_admin", name: "Super Admin", userCount: 0 },
  { id: "admin", name: "Admin", userCount: 0 },
  { id: "manager", name: "Manager", userCount: 0 },
  { id: "staff", name: "Staff", userCount: 0 },
  { id: "viewer", name: "Viewer", userCount: 0 },
];

export function RolesListView() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return BUILT_IN_ROLES;
    const q = search.toLowerCase();
    return BUILT_IN_ROLES.filter((r) => r.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <ListPageShell
      tabs={[{ id: "all", label: "Roles" }]}
      activeTab="all"
      onTabChange={() => {}}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search roles…"
      showImport={false}
      showDateRange={false}
    >
      <ServerPaginatedTable
        items={filtered}
        columns={roleColumns}
        pageIndex={0}
        pageSize={filtered.length || 25}
        hasMore={false}
        canGoPrev={false}
        onNext={() => {}}
        onPrev={() => {}}
        onPageSizeChange={() => {}}
        isLoading={false}
        error={null}
        emptyState={{ message: "No roles defined yet." }}
      />
    </ListPageShell>
  );
}

export function CommissionAgentsListView() {
  return (
    <ListPageShell
      tabs={[{ id: "all", label: "Sales Commission Agents" }]}
      activeTab="all"
      onTabChange={() => {}}
      showImport={false}
      showDateRange={false}
    >
      <EmptyState
        title="Sales Commission Agents"
        message="No commission agents configured yet. Add agents to track sales commissions."
      />
    </ListPageShell>
  );
}
