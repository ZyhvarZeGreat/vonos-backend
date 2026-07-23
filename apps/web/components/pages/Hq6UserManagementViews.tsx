"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Monitor, Plus } from "lucide-react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
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
export function Hq6RolesListView() {
  const router = useRouter();
  const { detailPath } = useRecordNavigation("roles");
  const [localSearch, setLocalSearch] = useState("");
  const [deleteRole, setDeleteRole] = useState<{ id: string; name: string } | null>(null);
  const chrome = useHq6ListChrome("roles");

  const roles = useMemo(() => {
    const builtIn = [
      { id: "super_admin", name: "Super Admin", userCount: 0 },
      { id: "admin", name: "Admin", userCount: 0 },
      { id: "manager", name: "Manager", userCount: 0 },
      { id: "staff", name: "Staff", userCount: 0 },
      { id: "viewer", name: "Viewer", userCount: 0 },
    ];
    if (!localSearch.trim()) return builtIn;
    const q = localSearch.toLowerCase();
    return builtIn.filter((r) => r.name.toLowerCase().includes(q));
  }, [localSearch]);

  const columns: ColumnConfig<(typeof roles)[number]>[] = useMemo(
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
                onClick: () => router.push(`${detailPath(row.id)}/edit`),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteRole({ id: row.id, name: row.name }),
              },
            ]}
          />
        ),
      },
      { key: "name", header: "Role", render: (r) => <span className="font-medium">{r.name}</span> },
      {
        key: "userCount",
        header: "Users",
        render: (r) => <span className="tabular-nums">{r.userCount}</span>,
      },
    ],
    [detailPath, router],
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
        <Hq6ConfirmModal
          open={Boolean(deleteRole)}
          onClose={() => setDeleteRole(null)}
          onConfirm={() => {
            toast.info(
              `“${deleteRole?.name ?? "Role"}” is a system role and cannot be deleted.`,
            );
            setDeleteRole(null);
          }}
          title="Delete role"
          message={`Delete “${deleteRole?.name ?? ""}”? System roles cannot be removed.`}
          confirmLabel="Understood"
        />
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

/** HQ6 Commission agents — ui-audit/03_sales-commission-agents/screenshot.png */
export function Hq6CommissionAgentsListView() {
  const chrome = useHq6ListChrome("commission-agents");
  const [localSearch, setLocalSearch] = useState("");

  return (
    <Hq6StandardListShell
      slug="commission-agents"
      tabLabel="All sales commission agents"
      columnOptions={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Contact Number" },
      ]}
      chrome={chrome}
      pageSize={25}
      onPageSizeChange={() => undefined}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
    >
      <div className="p-8 text-center text-sm text-[#777]">
        No commission agents configured yet. Use Add to register sales commission agents.
      </div>
    </Hq6StandardListShell>
  );
}
