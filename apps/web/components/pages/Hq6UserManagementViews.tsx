"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Monitor, Plus } from "lucide-react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6DtSearchFilter } from "@/components/hq6/Hq6DtSearchFilter";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  loadStoredRoles,
  saveStoredRoles,
  type Hq6StoredRole,
} from "@/lib/registries/hq6RolePermissions";
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

/** Ultimate POS — role/index.blade.php + ui-audit/02_roles (direct HTML lift). */
export function Hq6RolesListView() {
  const router = useRouter();
  const { tenantCode } = useRouteTenant();
  const { detailPath, listPath } = useRecordNavigation("roles");
  const [localSearch, setLocalSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [roles, setRoles] = useState<Hq6StoredRole[]>([]);
  const [deleteRole, setDeleteRole] = useState<Hq6StoredRole | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (!tenantCode) return;
    setRoles(loadStoredRoles(tenantCode));
  }, [tenantCode]);

  const filtered = useMemo(() => {
    if (!committedSearch.trim()) return roles;
    const q = committedSearch.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [committedSearch, roles]);

  const total = filtered.length;
  const effectiveSize = pageSize <= 0 ? Math.max(total, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(Math.max(total, 1) / effectiveSize));
  const safePage = Math.min(pageIndex, pageCount - 1);

  const visible = useMemo(() => {
    const start = safePage * effectiveSize;
    return filtered.slice(start, start + effectiveSize);
  }, [filtered, safePage, effectiveSize]);

  const from = visible.length === 0 ? 0 : safePage * effectiveSize + 1;
  const to = safePage * effectiveSize + visible.length;

  const handleDelete = () => {
    if (!deleteRole || !tenantCode) return;
    if (deleteRole.locked || deleteRole.name === "Admin") {
      toast.info(`“${deleteRole.name}” cannot be deleted.`);
      setDeleteRole(null);
      return;
    }
    const next = roles.filter((role) => role.id !== deleteRole.id);
    saveStoredRoles(tenantCode, next);
    setRoles(next);
    toast.success(`Role “${deleteRole.name}” deleted.`);
    setDeleteRole(null);
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(pageCount, 7);
    for (let i = 0; i < max; i++) pages.push(i);
    return pages;
  }, [pageCount]);

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

  return (
    <div className="hq6-page hq6-roles-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Roles{" "}
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            Manage roles
          </small>
        </h1>
      </section>

      <section className="content">
        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header">
              <h3 className="box-title">All roles</h3>
              <div className="box-tools">
                <a
                  className="tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full"
                  href={`${detailPath("new")}/edit`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`${detailPath("new")}/edit`);
                  }}
                >
                  {PlusIcon} Add
                </a>
              </div>
            </div>

            <div className="tw-flow-root tw-border-gray-200">
              <div>
                <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                  <div
                    id="roles_table_wrapper"
                    className="dataTables_wrapper form-inline dt-bootstrap no-footer"
                  >
                    {/* HQ6: buttons:[] — length | empty buttons | search */}
                    <div className="row margin-bottom-20 text-center">
                      <div className="col-sm-1">
                        <div
                          className="dataTables_length"
                          id="roles_table_length"
                        >
                          <label>
                            Show{" "}
                            <select
                              name="roles_table_length"
                              aria-controls="roles_table"
                              className="form-control input-sm"
                              value={pageSize}
                              onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPageIndex(0);
                              }}
                            >
                              {[25, 50, 100, 200, 500, 1000, -1].map((n) => (
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
                        <div className="dt-buttons btn-group" />
                      </div>
                        <div className="col-sm-3">
                          <Hq6DtSearchFilter
                            id="roles_table_filter"
                            ariaControls="roles_table"
                            value={localSearch}
                            onChange={setLocalSearch}
                            onCommit={() => {
                              setCommittedSearch(localSearch);
                              setPageIndex(0);
                            }}
                          />
                        </div>
                    </div>

                    <table
                      className="table table-bordered table-striped dataTable no-footer"
                      id="roles_table"
                      role="grid"
                      aria-describedby="roles_table_info"
                      style={{ width: "100%" }}
                    >
                      <thead>
                        <tr role="row">
                          <th
                            className="sorting_asc"
                            tabIndex={0}
                            aria-controls="roles_table"
                            rowSpan={1}
                            colSpan={1}
                            aria-sort="ascending"
                          >
                            Roles
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
                        {visible.length === 0 ? (
                          <tr className="odd">
                            <td colSpan={2} className="dataTables_empty">
                              No data available in table
                            </td>
                          </tr>
                        ) : (
                          visible.map((row, index) => {
                            const locked =
                              row.locked || row.name === "Admin";
                            return (
                              <tr
                                key={row.id}
                                role="row"
                                className={index % 2 === 0 ? "odd" : "even"}
                              >
                                <td className="sorting_1">{row.name}</td>
                                <td>
                                  {locked ? null : (
                                    <>
                                      <a
                                        href={`${detailPath(row.id)}/edit`}
                                        className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-primary"
                                        onClick={(e) => {
                                          e.preventDefault();
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
                                      <button
                                        type="button"
                                        data-href={`${listPath}/${row.id}`}
                                        className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-error delete_role_button"
                                        onClick={() => setDeleteRole(row)}
                                      >
                                        <i
                                          className="glyphicon glyphicon-trash"
                                          aria-hidden
                                        />{" "}
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    <div
                      className="dataTables_info"
                      id="roles_table_info"
                      role="status"
                      aria-live="polite"
                    >
                      {`Showing ${from} to ${to} of ${total.toLocaleString()} entries`}
                    </div>
                    <div
                      className="dataTables_paginate paging_simple_numbers"
                      id="roles_table_paginate"
                    >
                      <ul className="pagination">
                        <li
                          className={`paginate_button previous${safePage === 0 ? " disabled" : ""}`}
                          id="roles_table_previous"
                        >
                          <a
                            href="#"
                            aria-controls="roles_table"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              if (safePage > 0) setPageIndex(safePage - 1);
                            }}
                          >
                            Previous
                          </a>
                        </li>
                        {pageNumbers.map((p) => (
                          <li
                            key={p}
                            className={`paginate_button${p === safePage ? " active" : ""}`}
                          >
                            <a
                              href="#"
                              aria-controls="roles_table"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault();
                                setPageIndex(p);
                              }}
                            >
                              {p + 1}
                            </a>
                          </li>
                        ))}
                        <li
                          className={`paginate_button next${safePage >= pageCount - 1 ? " disabled" : ""}`}
                          id="roles_table_next"
                        >
                          <a
                            href="#"
                            aria-controls="roles_table"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              if (safePage < pageCount - 1)
                                setPageIndex(safePage + 1);
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
      </section>

      <Hq6ConfirmModal
        open={Boolean(deleteRole)}
        danger
        onClose={() => setDeleteRole(null)}
        onConfirm={handleDelete}
        title="Are you sure?"
        message={
          deleteRole
            ? `Delete “${deleteRole.name}”? Users assigned to this role will need a new role.`
            : ""
        }
        confirmLabel="Yes, delete"
      />
    </div>
  );
}

type CommissionAgentRow = {
  id: string;
  name: string;
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  commissionPercent: string;
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
    const parsed = JSON.parse(raw) as Array<Partial<CommissionAgentRow> & { id?: string; name?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row?.id && (row?.name || row?.firstName))
      .map((row) => {
        const firstName = String(row.firstName ?? "");
        const lastName = String(row.lastName ?? "");
        const surname = String(row.surname ?? "");
        const name =
          String(row.name ?? "").trim() ||
          [surname, firstName, lastName].filter(Boolean).join(" ");
        return {
          id: String(row.id),
          name,
          surname,
          firstName: firstName || name.split(/\s+/)[0] || "",
          lastName:
            lastName || name.split(/\s+/).slice(1).join(" ") || "",
          email: String(row.email ?? ""),
          phone: String(row.phone ?? ""),
          address: String(row.address ?? ""),
          commissionPercent: String(row.commissionPercent ?? ""),
        };
      });
  } catch {
    return [];
  }
}

function saveCommissionAgents(
  tenantCode: string,
  rows: CommissionAgentRow[],
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    commissionAgentsStorageKey(tenantCode),
    JSON.stringify(rows),
  );
}

const AGENT_PAGE_SIZES = [25, 50, 100, 200, 500, 1000, -1] as const;

/** Ultimate POS — sales_commission_agent/index.blade.php + create/edit modal (direct lift). */
export function Hq6CommissionAgentsListView() {
  const { tenantCode } = useRouteTenant();
  const [localSearch, setLocalSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [agents, setAgents] = useState<CommissionAgentRow[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionAgentRow | null>(null);
  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [deleteAgent, setDeleteAgent] = useState<CommissionAgentRow | null>(
    null,
  );
  const [pageSize, setPageSize] = useState(50);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (!tenantCode) return;
    setAgents(loadCommissionAgents(tenantCode));
  }, [tenantCode]);

  const filtered = useMemo(() => {
    if (!committedSearch.trim()) return agents;
    const q = committedSearch.toLowerCase();
    return agents.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q),
    );
  }, [agents, committedSearch]);

  const total = filtered.length;
  const effectiveSize = pageSize <= 0 ? Math.max(total, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(Math.max(total, 1) / effectiveSize));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const visible = useMemo(() => {
    const start = safePage * effectiveSize;
    return filtered.slice(start, start + effectiveSize);
  }, [filtered, safePage, effectiveSize]);
  const from = visible.length === 0 ? 0 : safePage * effectiveSize + 1;
  const to = safePage * effectiveSize + visible.length;

  const resetForm = () => {
    setSurname("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setCommissionPercent("");
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (row: CommissionAgentRow) => {
    setEditing(row);
    setSurname(row.surname);
    setFirstName(row.firstName);
    setLastName(row.lastName);
    setEmail(row.email);
    setPhone(row.phone);
    setAddress(row.address);
    setCommissionPercent(row.commissionPercent);
    setFormOpen(true);
  };

  const persist = (next: CommissionAgentRow[]) => {
    if (!tenantCode) return;
    setAgents(next);
    saveCommissionAgents(tenantCode, next);
  };

  const handleSave = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      toast.error("First name is required.");
      return;
    }
    if (!commissionPercent.trim()) {
      toast.error("Sales Commission Percentage is required.");
      return;
    }
    if (!tenantCode) {
      toast.error("Select a business first.");
      return;
    }

    const displayName = [surname.trim(), trimmedFirst, lastName.trim()]
      .filter(Boolean)
      .join(" ");

    if (editing) {
      persist(
        agents.map((row) =>
          row.id === editing.id
            ? {
                ...row,
                name: displayName,
                surname: surname.trim(),
                firstName: trimmedFirst,
                lastName: lastName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                address: address.trim(),
                commissionPercent: commissionPercent.trim(),
              }
            : row,
        ),
      );
      toast.success(`Agent “${displayName}” updated.`);
    } else {
      persist([
        ...agents,
        {
          id: `agent_${Date.now().toString(36)}`,
          name: displayName,
          surname: surname.trim(),
          firstName: trimmedFirst,
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          commissionPercent: commissionPercent.trim(),
        },
      ]);
      toast.success(`Agent “${displayName}” added.`);
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

  return (
    <div className="hq6-page hq6-agents-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Sales Commission Agents
        </h1>
      </section>

      <section className="content">
        <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
          <div className="tw-p-2 sm:tw-p-3">
            <div className="box-header">
              <h3 className="box-title" />
              <div className="box-tools">
                <button
                  type="button"
                  className="tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full btn-modal pull-right"
                  onClick={openCreate}
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
                      id="sales_commission_agent_table_wrapper"
                      className="dataTables_wrapper form-inline dt-bootstrap no-footer"
                    >
                      <div className="row margin-bottom-20 text-center">
                        <div className="col-sm-1">
                          <div
                            className="dataTables_length"
                            id="sales_commission_agent_table_length"
                          >
                            <label>
                              Show{" "}
                              <select
                                name="sales_commission_agent_table_length"
                                aria-controls="sales_commission_agent_table"
                                className="form-control input-sm"
                                value={pageSize}
                                onChange={(e) => {
                                  setPageSize(Number(e.target.value));
                                  setPageIndex(0);
                                }}
                              >
                                {AGENT_PAGE_SIZES.map((n) => (
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
                                aria-controls="sales_commission_agent_table"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (key === "print") window.print();
                                  else
                                    toast.info(
                                      `${label} — export coming with API.`,
                                    );
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
                              id="sales_commission_agent_table_filter"
                              ariaControls="sales_commission_agent_table"
                              value={localSearch}
                              onChange={setLocalSearch}
                              onCommit={() => {
                                setCommittedSearch(localSearch);
                                setPageIndex(0);
                              }}
                            />
                          </div>
                      </div>

                      <table
                        className="table table-bordered table-striped dataTable no-footer"
                        id="sales_commission_agent_table"
                        role="grid"
                        aria-describedby="sales_commission_agent_table_info"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr role="row">
                            <th>Name</th>
                            <th>Email</th>
                            <th>Contact Number</th>
                            <th>Address</th>
                            <th>Sales Commission Percentage (%)</th>
                            <th className="sorting_disabled">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.length === 0 ? (
                            <tr className="odd">
                              <td
                                colSpan={6}
                                className="dataTables_empty"
                                valign="top"
                              >
                                No data available in table
                              </td>
                            </tr>
                          ) : (
                            visible.map((row, index) => (
                              <tr
                                key={row.id}
                                role="row"
                                className={index % 2 === 0 ? "odd" : "even"}
                              >
                                <td>{row.name}</td>
                                <td>{row.email}</td>
                                <td>{row.phone}</td>
                                <td>{row.address}</td>
                                <td>{row.commissionPercent || "—"}</td>
                                <td>
                                  <a
                                    href="#"
                                    className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-primary"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openEdit(row);
                                    }}
                                  >
                                    <i
                                      className="glyphicon glyphicon-edit"
                                      aria-hidden
                                    />{" "}
                                    Edit
                                  </a>
                                  &nbsp;
                                  <button
                                    type="button"
                                    className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-error delete_commsn_agnt_button"
                                    onClick={() => setDeleteAgent(row)}
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

                      <div
                        className="dataTables_info"
                        id="sales_commission_agent_table_info"
                        role="status"
                        aria-live="polite"
                      >
                        {`Showing ${from} to ${to} of ${total.toLocaleString()} entries`}
                      </div>
                      <div
                        className="dataTables_paginate paging_simple_numbers"
                        id="sales_commission_agent_table_paginate"
                      >
                        <ul className="pagination">
                          <li
                            className={`paginate_button previous${safePage === 0 ? " disabled" : ""}`}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (safePage > 0) setPageIndex(safePage - 1);
                              }}
                            >
                              Previous
                            </a>
                          </li>
                          {Array.from(
                            { length: Math.min(pageCount, 7) },
                            (_, i) => (
                              <li
                                key={i}
                                className={`paginate_button${i === safePage ? " active" : ""}`}
                              >
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setPageIndex(i);
                                  }}
                                >
                                  {i + 1}
                                </a>
                              </li>
                            ),
                          )}
                          <li
                            className={`paginate_button next${safePage >= pageCount - 1 ? " disabled" : ""}`}
                          >
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (safePage < pageCount - 1)
                                  setPageIndex(safePage + 1);
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

        {formOpen ? (
          <div
            className="modal fade commission_agent_modal in"
            tabIndex={-1}
            role="dialog"
            style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <form id="sale_commission_agent_form" onSubmit={handleSave}>
                  <div className="modal-header">
                    <button
                      type="button"
                      className="close"
                      aria-label="Close"
                      onClick={() => {
                        setFormOpen(false);
                        setEditing(null);
                      }}
                    >
                      <span aria-hidden>×</span>
                    </button>
                    <h4 className="modal-title">
                      {editing
                        ? "Edit Sales Commission Agent"
                        : "Add Sales Commission Agent"}
                    </h4>
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-2">
                        <div className="form-group">
                          <label htmlFor="surname">Prefix:</label>
                          <input
                            id="surname"
                            className="form-control"
                            placeholder="Mr / Mrs / Miss"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-5">
                        <div className="form-group">
                          <label htmlFor="first_name">First Name:*</label>
                          <input
                            id="first_name"
                            className="form-control"
                            required
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="col-md-5">
                        <div className="form-group">
                          <label htmlFor="last_name">Last Name:</label>
                          <input
                            id="last_name"
                            className="form-control"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="clearfix" />
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="email">Email:</label>
                          <input
                            id="email"
                            className="form-control"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact_no">Contact Number:</label>
                          <input
                            id="contact_no"
                            className="form-control"
                            placeholder="Contact Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="form-group">
                          <label htmlFor="address">Address:</label>
                          <textarea
                            id="address"
                            className="form-control"
                            placeholder="Address"
                            rows={3}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="cmmsn_percent">
                            Sales Commission Percentage (%):
                          </label>
                          <input
                            id="cmmsn_percent"
                            className="form-control input_number"
                            required
                            placeholder="Sales Commission Percentage (%)"
                            value={commissionPercent}
                            onChange={(e) =>
                              setCommissionPercent(e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="submit"
                      className="tw-dw-btn tw-dw-btn-primary tw-text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="tw-dw-btn tw-dw-btn-neutral tw-text-white"
                      onClick={() => {
                        setFormOpen(false);
                        setEditing(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <Hq6ConfirmModal
        open={Boolean(deleteAgent)}
        danger
        onClose={() => setDeleteAgent(null)}
        onConfirm={handleDelete}
        title="Are you sure?"
        message={
          deleteAgent ? `Delete “${deleteAgent.name}”?` : ""
        }
        confirmLabel="Yes, delete"
      />
    </div>
  );
}
