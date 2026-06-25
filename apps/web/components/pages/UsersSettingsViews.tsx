"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { InviteUserModal } from "@/components/organisms/InviteUserModal";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getUsers, type UserListRow } from "@/lib/api/users";
import { updateTenantConfig } from "@/lib/api/tenants";
import {
  formatBusinessLocations,
  linesToList,
  listToLines,
  parseBusinessLocations,
} from "@/lib/utils/catalogConfig";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { filterBySearch, uniqueFieldOptions } from "@/lib/utils/listFilters";
import { hasPermission } from "@/lib/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import type { User } from "@vonos/types";

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

const userColumns: ColumnConfig<UserListRow>[] = [
  { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
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
      <StatusPill
        status={formatStatus(r.status)}
        vocabulary="userStatus"
      />
    ),
  },
];

const allTenantsColumns: ColumnConfig<UserListRow>[] = [
  {
    key: "tenantCode",
    header: "Entity",
    render: (r) => (
      <span className="font-medium">{r.tenantCode ?? "—"}</span>
    ),
  },
  ...userColumns,
];

export interface UsersViewProps {
  /** Super-admin group view — all entities' users. */
  allTenants?: boolean;
}

export function UsersView({ allTenants = false }: UsersViewProps) {
  const { tenantId, tenantName } = useRouteTenant();
  const authRole = useAuthStore((state) => state.role);
  const { dateRange, setDateRange, search, setSearch } = useListPageFilters();
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const canInvite = authRole ? hasPermission(authRole, "manageUsers") : false;

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users", allTenants ? "all" : tenantId],
    queryFn: () =>
      allTenants
        ? getUsers(null, { allTenants: true })
        : getUsers(tenantId),
    enabled: allTenants || Boolean(tenantId),
  });

  const filtered = useMemo(() => {
    let rows = users;
    if (roleFilter) rows = rows.filter((u) => u.role === roleFilter);
    if (statusFilter) rows = rows.filter((u) => u.status === statusFilter);
    return filterBySearch(rows, search, ["name", "email", "tenantCode"]);
  }, [roleFilter, search, statusFilter, users]);

  const roleOptions = useMemo(
    () => uniqueFieldOptions(users, "role"),
    [users],
  );
  const statusOptions = useMemo(
    () => uniqueFieldOptions(users, "status"),
    [users],
  );

  const columns = allTenants ? allTenantsColumns : userColumns;

  const subtitle = allTenants
    ? "Includes group super admins and staff imported from legacy systems (linked to their home entity)."
    : null;

  return (
    <div className="space-y-6">
      {!allTenants && tenantName ? (
        <p className="text-sm text-muted">
          Team members for <span className="font-medium text-foreground">{tenantName}</span>{" "}
          — includes legacy imports even if promoted to group admin.
        </p>
      ) : null}
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      {canInvite ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Add user
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
        tabs={[{ id: "all", label: "All Users" }]}
        activeTab="all"
        onTabChange={() => {}}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search users..."
        showImport={false}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange={false}
        filterDropdowns={[
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
        ]}
      >
        <DataTable
          data={filtered}
          columns={columns}
          displayMode="table"
          embedded
          isLoading={isLoading}
          error={error ? "Could not load users." : null}
        />
      </ListPageShell>
    </div>
  );
}

const SETTINGS_TABS = [
  { id: "branding", label: "Branding" },
  { id: "terminology", label: "Terminology" },
  { id: "catalog", label: "Catalog & locations" },
  { id: "notifications", label: "Notifications" },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("branding");
  const { tenantId, tenantName, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const terminology = config?.terminology ?? {};
  const [displayName, setDisplayName] = useState(config?.name ?? tenantName ?? "");
  const [itemLabel, setItemLabel] = useState(terminology.item ?? "Item");
  const [inventoryLabel, setInventoryLabel] = useState(terminology.inventory ?? "Inventory");
  const [categoriesText, setCategoriesText] = useState(listToLines(config?.itemCategories));
  const [branchesText, setBranchesText] = useState(
    formatBusinessLocations(config?.businessLocations),
  );
  const [storageText, setStorageText] = useState(listToLines(config?.storageLocations));
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(config?.name ?? tenantName ?? "");
    setItemLabel(terminology.item ?? "Item");
    setInventoryLabel(terminology.inventory ?? "Inventory");
    setCategoriesText(listToLines(config?.itemCategories));
    setBranchesText(formatBusinessLocations(config?.businessLocations));
    setStorageText(listToLines(config?.storageLocations));
  }, [
    config?.businessLocations,
    config?.itemCategories,
    config?.name,
    config?.storageLocations,
    tenantName,
    terminology.inventory,
    terminology.item,
  ]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, {
        name: displayName.trim() || undefined,
        terminology: {
          ...(itemLabel.trim() ? { item: itemLabel.trim() } : {}),
          ...(inventoryLabel.trim() ? { inventory: inventoryLabel.trim() } : {}),
        },
        ...(activeTab === "catalog"
          ? {
              itemCategories: linesToList(categoriesText),
              businessLocations: parseBusinessLocations(branchesText),
              storageLocations: linesToList(storageText),
            }
          : {}),
      });
    },
    successMessage:
      activeTab === "catalog" ? "Catalog and locations saved" : "Settings saved",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Settings for <span className="font-medium text-foreground">{tenantName}</span>.
      </p>
      <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground">
          {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
        </h3>
        <p className="mt-1 mb-6 text-sm text-muted">
          Tenant configuration — branding, terminology overrides, and notification preferences.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (activeTab === "notifications") return;
            saveMutation.mutate();
          }}
        >
          {activeTab === "branding" && (
            <>
              <Input
                label="Entity display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input label="Accent color" defaultValue="#059669" type="text" disabled />
              <p className="text-xs text-muted">Accent color is read-only until theme settings are persisted.</p>
            </>
          )}
          {activeTab === "terminology" && (
            <>
              <Input
                label="Item label"
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
              />
              <Input
                label="Inventory label"
                value={inventoryLabel}
                onChange={(e) => setInventoryLabel(e.target.value)}
              />
            </>
          )}
          {activeTab === "catalog" && (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Item categories</span>
                <span className="block text-xs text-muted">One category per line. Used on create forms and sales.</span>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={categoriesText}
                  onChange={(e) => setCategoriesText(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Business locations</span>
                <span className="block text-xs text-muted">
                  Branch / POS sites — one per line as <code className="text-xs">CODE | Name</code> (e.g. BL004 | VONOS HEAD OFFICE).
                </span>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={branchesText}
                  onChange={(e) => setBranchesText(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Storage locations</span>
                <span className="block text-xs text-muted">Bin / rack codes for warehouse inventory — one per line.</span>
                <textarea
                  className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={storageText}
                  onChange={(e) => setStorageText(e.target.value)}
                />
              </label>
            </>
          )}
          {activeTab === "notifications" && (
            <p className="text-sm text-muted">Configure email and in-app notification preferences for this entity.</p>
          )}
          {saveError ? <p className="text-sm text-error">{saveError}</p> : null}
          <div className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={saveMutation.isPending || activeTab === "notifications"}
            >
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
