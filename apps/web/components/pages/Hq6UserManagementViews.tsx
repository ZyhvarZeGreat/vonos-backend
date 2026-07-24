"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Monitor, Plus } from "lucide-react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

interface PosRegisterRow {
  id: string;
  name: string;
  location: string;
  status: "open" | "closed";
}

const DEMO_REGISTERS: PosRegisterRow[] = [
  { id: "1", name: "Register 1", location: "Head Office", status: "closed" },
  { id: "2", name: "Register 2", location: "Workshop", status: "open" },
];

/** HQ6 List POS — ui-audit/26_pos/screenshot.png */
export function Hq6PosListView() {
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState("");
  const [editRegister, setEditRegister] = useState<PosRegisterRow | null>(null);
  const [editName, setEditName] = useState("");
  const chrome = useHq6ListChrome("pos-registers");

  const rows = useMemo(() => {
    if (!localSearch.trim()) return DEMO_REGISTERS;
    const q = localSearch.toLowerCase();
    return DEMO_REGISTERS.filter(
      (row) => row.name.toLowerCase().includes(q) || row.location.toLowerCase().includes(q),
    );
  }, [localSearch]);

  const columns: ColumnConfig<PosRegisterRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "open",
                label: "Open POS",
                onClick: () =>
                  router.push(`/${tenantCode}/pos-terminal?register=${row.id}`),
              },
              {
                id: "edit",
                label: "Edit",
                onClick: () => {
                  setEditRegister(row);
                  setEditName(row.name);
                },
              },
            ]}
          />
        ),
      },
      {
        key: "name",
        header: "Cash Register",
        render: (row) => (
          <Link
            href={`/${tenantCode}/pos-terminal?register=${row.id}`}
            className="font-medium text-[var(--hq6-blue)] hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      { key: "location", header: "Business Location" },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <span className={row.status === "open" ? "hq6-pay-paid" : "hq6-pay-due"}>
            {row.status === "open" ? "Open" : "Closed"}
          </span>
        ),
      },
    ],
    [router, tenantCode],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  return (
    <Hq6StandardListShell
      slug="pos"
      tabLabel="All cash registers"
      addHref={`/${tenantCode}/pos-terminal`}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={25}
      onPageSizeChange={() => undefined}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      tabs={[
        {
          id: "registers",
          label: "All cash registers",
          active: true,
          icon: <Monitor className="h-4 w-4" />,
        },
      ]}
      tabActions={
        <>
          <Link href={`/${tenantCode}/pos-terminal`} className="hq6-btn hq6-btn-blue">
            <Plus className="h-3.5 w-3.5" />
            Add
          </Link>
        </>
      }
      pagination={{
        pageIndex: 0,
        pageSize: 25,
        itemCount: rows.length,
        hasMore: false,
        canGoPrev: false,
        onPrev: () => undefined,
        onNext: () => undefined,
        onPageSizeChange: () => undefined,
      }}
      modals={
        <Hq6Modal
          open={Boolean(editRegister)}
          onClose={() => setEditRegister(null)}
          title="Edit cash register"
        >
          <div className="space-y-3">
            <label className="hq6-field">
              <span>Name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded border border-[var(--hq6-border)] px-2 py-1.5 text-sm"
              />
            </label>
            <p className="text-xs text-[#777]">
              Register names are stored on this device until POS register APIs are wired.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={() => setEditRegister(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-blue"
                onClick={() => {
                  toast.info(
                    `Register renamed to “${editName.trim() || editRegister?.name}” (local only).`,
                  );
                  setEditRegister(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </Hq6Modal>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        emptyState={{ message: "No cash registers configured." }}
      />
    </Hq6StandardListShell>
  );
}

/** HQ6 Roles list — ui-audit/02_roles/screenshot.png */
type RoleRow = {
  id: string;
  name: string;
  userCount: number;
  custom?: boolean;
};

const BUILT_IN_ROLES: RoleRow[] = [
  { id: "super_admin", name: "Super Admin", userCount: 0 },
  { id: "admin", name: "Admin", userCount: 0 },
  { id: "manager", name: "Manager", userCount: 0 },
  { id: "staff", name: "Staff", userCount: 0 },
  { id: "viewer", name: "Viewer", userCount: 0 },
];

function customRolesStorageKey(tenantCode: string) {
  return `vonos.hq6.custom-roles.${tenantCode}`;
}

function loadCustomRoles(tenantCode: string): RoleRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(customRolesStorageKey(tenantCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ id: string; name: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row?.id && row?.name)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        userCount: 0,
        custom: true,
      }));
  } catch {
    return [];
  }
}

function saveCustomRoles(tenantCode: string, roles: RoleRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    customRolesStorageKey(tenantCode),
    JSON.stringify(
      roles.map((role) => ({ id: role.id, name: role.name })),
    ),
  );
}

export function Hq6RolesListView() {
  const router = useRouter();
  const { tenantCode } = useRouteTenant();
  const { detailPath } = useRecordNavigation("roles");
  const [localSearch, setLocalSearch] = useState("");
  const [customRoles, setCustomRoles] = useState<RoleRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [roleName, setRoleName] = useState("");
  const [deleteRole, setDeleteRole] = useState<RoleRow | null>(null);
  const chrome = useHq6ListChrome("roles");

  useEffect(() => {
    if (!tenantCode) return;
    setCustomRoles(loadCustomRoles(tenantCode));
  }, [tenantCode]);

  const roles = useMemo(() => {
    const all = [...BUILT_IN_ROLES, ...customRoles];
    if (!localSearch.trim()) return all;
    const q = localSearch.toLowerCase();
    return all.filter((r) => r.name.toLowerCase().includes(q));
  }, [customRoles, localSearch]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setRoleName("");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(
    (row: RoleRow) => {
      if (!row.custom) {
        router.push(`${detailPath(row.id)}/edit`);
        return;
      }
      setEditing(row);
      setRoleName(row.name);
      setFormOpen(true);
    },
    [detailPath, router],
  );

  const persistCustom = (next: RoleRow[]) => {
    if (!tenantCode) return;
    setCustomRoles(next);
    saveCustomRoles(tenantCode, next);
  };

  const handleSave = () => {
    const name = roleName.trim();
    if (!name) {
      toast.error("Enter a role name.");
      return;
    }
    if (!tenantCode) {
      toast.error("Select a business first.");
      return;
    }

    const duplicate = roles.some(
      (role) =>
        role.name.toLowerCase() === name.toLowerCase() &&
        role.id !== editing?.id,
    );
    if (duplicate) {
      toast.error(`A role named “${name}” already exists.`);
      return;
    }

    if (editing?.custom) {
      persistCustom(
        customRoles.map((role) =>
          role.id === editing.id ? { ...role, name } : role,
        ),
      );
      toast.success(`Role “${name}” updated.`);
    } else {
      const id = `custom_${Date.now().toString(36)}`;
      persistCustom([...customRoles, { id, name, userCount: 0, custom: true }]);
      toast.success(`Role “${name}” added.`);
    }
    setFormOpen(false);
    setEditing(null);
    setRoleName("");
  };

  const handleDelete = () => {
    if (!deleteRole) return;
    if (!deleteRole.custom) {
      toast.info(
        `“${deleteRole.name}” is a system role and cannot be deleted.`,
      );
      setDeleteRole(null);
      return;
    }
    persistCustom(customRoles.filter((role) => role.id !== deleteRole.id));
    toast.success(`Role “${deleteRole.name}” deleted.`);
    setDeleteRole(null);
  };

  const columns: ColumnConfig<RoleRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "edit",
                label: "Edit",
                onClick: () => openEdit(row),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteRole(row),
              },
            ]}
          />
        ),
      },
      {
        key: "name",
        header: "Role",
        render: (r) => (
          <span className="font-medium">
            {r.name}
            {r.custom ? (
              <span className="ml-2 text-xs font-normal text-[#777]">
                (custom)
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "userCount",
        header: "Users",
        render: (r) => <span className="tabular-nums">{r.userCount}</span>,
      },
    ],
    [openEdit],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  return (
    <Hq6StandardListShell
      slug="roles"
      tabLabel="All roles"
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={25}
      onPageSizeChange={() => undefined}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onAdd={openCreate}
      hideToolbar={false}
      pagination={{
        pageIndex: 0,
        pageSize: 25,
        itemCount: roles.length,
        hasMore: false,
        canGoPrev: false,
        onPrev: () => undefined,
        onNext: () => undefined,
        onPageSizeChange: () => undefined,
        show: false,
      }}
      modals={
        <>
          <Hq6Modal
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
              setRoleName("");
            }}
            title={editing ? "Edit role" : "Add role"}
            size="md"
            footer={
              <Hq6ModalSaveClose
                onSave={handleSave}
                onClose={() => {
                  setFormOpen(false);
                  setEditing(null);
                  setRoleName("");
                }}
                saveLabel={editing ? "Update" : "Save"}
                saveDisabled={!roleName.trim()}
              />
            }
          >
            <div className="space-y-4">
              <Hq6Field label="Role name" required>
                <input
                  className="hq6-modal-input"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Cashier"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
              </Hq6Field>
              <p className="text-xs text-[#777]">
                Custom roles are stored for this browser so you can label teams.
                User access still uses Vonos system roles (Admin, Manager, Staff,
                Viewer) when inviting users.
              </p>
            </div>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deleteRole)}
            onClose={() => setDeleteRole(null)}
            onConfirm={handleDelete}
            title="Delete role"
            message={
              deleteRole?.custom
                ? `Delete “${deleteRole.name}”?`
                : `“${deleteRole?.name ?? ""}” is a system role and cannot be removed.`
            }
            confirmLabel={deleteRole?.custom ? "Delete" : "Understood"}
          />
        </>
      }
    >
      <DataTable
        data={roles}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        emptyState={{ message: "No roles defined." }}
      />
    </Hq6StandardListShell>
  );
}

type CommissionAgentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

function commissionAgentsStorageKey(tenantCode: string) {
  return `vonos.hq6.commission-agents.${tenantCode}`;
}

function loadCommissionAgents(tenantCode: string): CommissionAgentRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(
      commissionAgentsStorageKey(tenantCode),
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommissionAgentRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row?.id && row?.name)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
      }));
  } catch {
    return [];
  }
}

function saveCommissionAgents(
  tenantCode: string,
  agents: CommissionAgentRow[],
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    commissionAgentsStorageKey(tenantCode),
    JSON.stringify(agents),
  );
}

/** HQ6 Commission agents — ui-audit/03_sales-commission-agents/screenshot.png */
export function Hq6CommissionAgentsListView() {
  const { tenantCode } = useRouteTenant();
  const chrome = useHq6ListChrome("commission-agents");
  const [localSearch, setLocalSearch] = useState("");
  const [agents, setAgents] = useState<CommissionAgentRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionAgentRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deleteAgent, setDeleteAgent] = useState<CommissionAgentRow | null>(
    null,
  );

  useEffect(() => {
    if (!tenantCode) return;
    setAgents(loadCommissionAgents(tenantCode));
  }, [tenantCode]);

  const rows = useMemo(() => {
    if (!localSearch.trim()) return agents;
    const q = localSearch.toLowerCase();
    return agents.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q),
    );
  }, [agents, localSearch]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: CommissionAgentRow) => {
    setEditing(row);
    setName(row.name);
    setEmail(row.email);
    setPhone(row.phone);
    setFormOpen(true);
  }, []);

  const persist = (next: CommissionAgentRow[]) => {
    if (!tenantCode) return;
    setAgents(next);
    saveCommissionAgents(tenantCode, next);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter an agent name.");
      return;
    }
    if (!tenantCode) {
      toast.error("Select a business first.");
      return;
    }

    if (editing) {
      persist(
        agents.map((row) =>
          row.id === editing.id
            ? {
                ...row,
                name: trimmedName,
                email: email.trim(),
                phone: phone.trim(),
              }
            : row,
        ),
      );
      toast.success(`Agent “${trimmedName}” updated.`);
    } else {
      persist([
        ...agents,
        {
          id: `agent_${Date.now().toString(36)}`,
          name: trimmedName,
          email: email.trim(),
          phone: phone.trim(),
        },
      ]);
      toast.success(`Agent “${trimmedName}” added.`);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleteAgent) return;
    persist(agents.filter((row) => row.id !== deleteAgent.id));
    toast.success(`Agent “${deleteAgent.name}” deleted.`);
    setDeleteAgent(null);
  };

  const columns: ColumnConfig<CommissionAgentRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "edit",
                label: "Edit",
                onClick: () => openEdit(row),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteAgent(row),
              },
            ]}
          />
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      { key: "email", header: "Email" },
      { key: "phone", header: "Contact Number" },
    ],
    [openEdit],
  );

  const columnOptions = columns
    .filter((c) => c.key !== "actions")
    .map((c) => ({ key: c.key, label: String(c.header) }));

  return (
    <Hq6StandardListShell
      slug="commission-agents"
      tabLabel="All sales commission agents"
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={25}
      onPageSizeChange={() => undefined}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onAdd={openCreate}
      pagination={{
        pageIndex: 0,
        pageSize: 25,
        itemCount: rows.length,
        hasMore: false,
        canGoPrev: false,
        onPrev: () => undefined,
        onNext: () => undefined,
        onPageSizeChange: () => undefined,
        show: false,
      }}
      modals={
        <>
          <Hq6Modal
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            title={editing ? "Edit commission agent" : "Add commission agent"}
            size="md"
            footer={
              <Hq6ModalSaveClose
                onSave={handleSave}
                onClose={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
                saveLabel={editing ? "Update" : "Save"}
                saveDisabled={!name.trim()}
              />
            }
          >
            <div className="space-y-4">
              <Hq6Field label="Name" required>
                <input
                  className="hq6-modal-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent name"
                  autoFocus
                />
              </Hq6Field>
              <Hq6Field label="Email">
                <input
                  className="hq6-modal-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@example.com"
                />
              </Hq6Field>
              <Hq6Field label="Contact Number">
                <input
                  className="hq6-modal-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                />
              </Hq6Field>
              <p className="text-xs text-[#777]">
                Agents are stored in this browser until the sales-commission API
                is connected.
              </p>
            </div>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deleteAgent)}
            onClose={() => setDeleteAgent(null)}
            onConfirm={handleDelete}
            title="Delete commission agent"
            message={`Delete “${deleteAgent?.name ?? ""}”?`}
            confirmLabel="Delete"
          />
        </>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        displayMode="table"
        embedded
        disablePagination
        emptyState={{
          message:
            "No commission agents configured yet. Use Add to register sales commission agents.",
        }}
      />
    </Hq6StandardListShell>
  );
}
