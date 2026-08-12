"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { removeEntityFromQueries } from "@/lib/query/optimistic";
import {
  Calendar,
  CheckSquare,
  Pencil,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
import type {
  AttendanceByShiftRow,
  AttendanceRow,
  AttendanceShiftRow,
  Designation,
  HolidayRow,
  LeaveRow,
  LeaveTypeRow,
  PayrollGroup,
  SalesTargetRow,
  WorkforceMember,
} from "@vonos/types";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import {
  clockInAttendance,
  createAttendanceShift,
  createDesignation,
  createHoliday,
  createLeave,
  createLeaveType,
  createPayrollGroup,
  deleteDesignation,
  deleteHoliday,
  deleteLeave,
  deleteLeaveType,
  deletePayrollGroup,
  getAttendanceByShift,
  getAttendancesPage,
  getAttendanceShiftsPage,
  getDesignations,
  getDesignationsPage,
  getHolidaysPage,
  getLeavesPage,
  getLeaveTypesPage,
  getPayrollGroupsPage,
  getSalesTargetsPage,
  getWorkforcePage,
  updateDesignation,
  updateLeaveType,
  updatePayrollGroup,
  upsertSalesTarget,
} from "@/lib/api/hrm";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { businessLocationOptions } from "@/lib/hooks/useBusinessLocationOptions";
import {
  serverPaginationBarProps,
  useServerListPage,
} from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatDate } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";
import { useTenantStore } from "@/stores/tenantStore";
import {
  dateListCursor,
  leaveListCursor,
  nameListCursor,
  userNameListCursor,
} from "@/lib/utils/pagination";
function ActionEditDelete({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="hq6-meta-btn-edit" onClick={onEdit}>
        <Pencil className="size-3.5" />
        Edit
      </button>
      <button type="button" className="hq6-meta-btn-delete" onClick={onDelete}>
        <Trash2 className="size-3.5" />
        Delete
      </button>
    </div>
  );
}

function ListCard({
  title,
  subtitle,
  onAdd,
  addLabel = "+ Add",
  filters,
  children,
}: {
  title: string;
  subtitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-[#6b7280]">{subtitle}</p>
          ) : null}
        </div>
        {onAdd ? (
          <UposGradientActionButton label={addLabel.replace(/^\+\s*/, "")} onClick={onAdd} />
        ) : null}
      </div>
      {filters}
      <div className="overflow-hidden rounded border border-[#d2d6de] bg-white">
        {children}
      </div>
    </div>
  );
}

/* —— Leave Type —— */

export function HrmLeaveTypeView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveTypeRow | null>(null);
  const [name, setName] = useState("");
  const [maxCount, setMaxCount] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState<LeaveTypeRow | null>(null);

  const list = useServerListPage<LeaveTypeRow>({
    queryKey: ["hrm-leave-types", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _s, opts) =>
      getLeaveTypesPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const saveMutation = useAppMutation({
    mutationFn: () =>
      editing
        ? updateLeaveType(tenantId!, editing.id, {
            name: name.trim(),
            maxLeaveCount: Number(maxCount) || 0,
          })
        : createLeaveType(tenantId!, {
            name: name.trim(),
            maxLeaveCount: Number(maxCount) || 0,
          }),
    invalidateKeys: [["hrm-leave-types", tenantId]],
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteLeaveType(tenantId!, id),
    optimistic: {
      keys: [["hrm-leave-types", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["hrm-leave-types", tenantId], id);
      },
    },
    onSuccess: () => {
      setConfirmDelete(null);
    },
  });

  const columns: ColumnConfig<LeaveTypeRow>[] = [
    {
      key: "name",
      header: "Leave Type",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "maxLeaveCount",
      header: "Max Leave Count",
      sortValue: (r) => r.maxLeaveCount,
    },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <ActionEditDelete
          onEdit={() => {
            setEditing(r);
            setName(r.name);
            setMaxCount(String(r.maxLeaveCount));
            setModalOpen(true);
          }}
          onDelete={() => setConfirmDelete(r)}
        />
      ),
    },
  ];

  return (
    <ListCard
      title="Leave Type"
      onAdd={() => {
        setEditing(null);
        setName("");
        setMaxCount("0");
        setModalOpen(true);
      }}
    >
      <div className="border-b border-[#d2d6de] px-4 py-3 text-sm font-semibold">
        All leave types
      </div>
      <div className="flex justify-end border-b border-[#d2d6de] px-4 py-2">
        <div className="hq6-search max-w-xs">
          <label className="hq6-search-field">
            <span className="sr-only">Search</span>
            <input
              className="hq6-modal-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearch((prev) => prev.trim());
                }
              }}
            />
          </label>
        </div>
      </div>
      <ServerPaginatedTable
        items={list.items}
        columns={columns}
        {...serverPaginationBarProps(list)}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error ? "Failed to load leave types" : null}
        emptyState={{ message: "No data available in table" }}
      />
      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Leave Type" : "Add Leave Type"}
        footer={
          <Hq6ModalSaveClose
            onSave={() => saveMutation.mutate()}
            onClose={() => setModalOpen(false)}
            saving={saveMutation.isPending}
            saveDisabled={!name.trim()}
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Leave Type" required>
            <input
              className="hq6-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Max Leave Count">
            <input
              type="number"
              className="hq6-modal-input"
              value={maxCount}
              onChange={(e) => setMaxCount(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
      <Hq6ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        title="Delete leave type?"
        message={`Remove “${confirmDelete?.name ?? ""}”?`}
        confirming={deleteMutation.isPending}
      />
    </ListCard>
  );
}

/* —— Leave —— */

export function HrmLeaveView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<LeaveRow | null>(null);

  const designationsQuery = useQuery({
    queryKey: ["designations-typeahead", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () => getDesignations(tenantId!),
  });

  const leaveTypesQuery = useQuery({
    queryKey: ["leave-types-typeahead", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const page = await getLeaveTypesPage(tenantId!, undefined, 100, {
        includeSummary: false,
      });
      return page.items;
    },
  });

  const list = useServerListPage<LeaveRow>({
    queryKey: ["hrm-leaves", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    filters: { designationId },
    fetchPage: (cursor, limit, _s, opts) =>
      getLeavesPage(tenantId!, cursor, limit, {
        search: opts?.search,
        designationId: designationId || undefined,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => leaveListCursor(row),
  });

  const createMutation = useAppMutation({
    mutationFn: () =>
      createLeave(tenantId!, {
        employeeName: employeeName.trim(),
        leaveTypeId: leaveTypeId || undefined,
        designationId: designationId || undefined,
        leaveDate,
        reason: reason.trim() || undefined,
      }),
    invalidateKeys: [["hrm-leaves", tenantId]],
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteLeave(tenantId!, id),
    optimistic: {
      keys: [["hrm-leaves", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["hrm-leaves", tenantId], id);
      },
    },
    onSuccess: () => {
      setConfirmDelete(null);
    },
  });

  const columns: ColumnConfig<LeaveRow>[] = [
    {
      key: "referenceNo",
      header: "Reference No",
      render: (r) => r.referenceNo ?? "—",
    },
    {
      key: "leaveTypeName",
      header: "Leave Type",
      render: (r) => r.leaveTypeName ?? "—",
    },
    { key: "employeeName", header: "Employee" },
    {
      key: "leaveDate",
      header: "Date",
      sortValue: (r) => new Date(r.leaveDate).getTime(),
      render: (r) => formatDate(r.leaveDate),
    },
    { key: "reason", header: "Reason", render: (r) => r.reason ?? "—" },
    { key: "status", header: "Status" },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <button
          type="button"
          className="hq6-meta-btn-delete"
          onClick={() => setConfirmDelete(r)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      ),
    },
  ];

  return (
    <ListCard
      title="Leave"
      onAdd={() => {
        setEmployeeName("");
        setLeaveTypeId("");
        setLeaveDate("");
        setReason("");
        setModalOpen(true);
      }}
      filters={
        <div className="rounded border border-[#d2d6de] bg-white px-4 py-3">
          <p className="mb-2 text-sm font-semibold text-[#555]">Filters</p>
          <div className="flex flex-wrap gap-3">
            <select
              className="hq6-modal-input max-w-xs"
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
            >
              <option value="">All designations</option>
              {(designationsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="hq6-search max-w-xs">
              <label className="hq6-search-field">
                <span className="sr-only">Search</span>
                <input
                  className="hq6-modal-input"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setSearch((prev) => prev.trim());
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      }
    >
      <div className="border-b border-[#d2d6de] px-4 py-3 text-sm font-semibold">
        All Leaves
      </div>
      <ServerPaginatedTable
        items={list.items}
        columns={columns}
        {...serverPaginationBarProps(list)}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error ? "Failed to load leaves" : null}
        emptyState={{ message: "No data available in table" }}
      />
      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Leave"
        footer={
          <Hq6ModalSaveClose
            onSave={() => createMutation.mutate()}
            onClose={() => setModalOpen(false)}
            saving={createMutation.isPending}
            saveDisabled={!employeeName.trim() || !leaveDate}
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Employee" required>
            <input
              className="hq6-modal-input"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Leave Type">
            <select
              className="hq6-modal-input"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              <option value="">Select</option>
              {(leaveTypesQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Hq6Field>
          <Hq6Field label="Date" required>
            <input
              type="date"
              className="hq6-modal-input"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Reason">
            <textarea
              className="hq6-modal-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
      <Hq6ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        title="Delete leave?"
        message="Remove this leave request?"
        confirming={deleteMutation.isPending}
      />
    </ListCard>
  );
}

/* —— Holiday —— */

export function HrmHolidayView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<HolidayRow | null>(null);
  const tenantConfig = useTenantStore((s) => s.tenantConfig);
  const locations = businessLocationOptions(tenantConfig?.businessLocations);

  function enumerateIsoDates(startIso: string, endIso: string): string[] {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    let startUTC = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
    );
    let endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    if (endUTC < startUTC) {
      const tmp = startUTC;
      startUTC = endUTC;
      endUTC = tmp;
    }

    const dates: string[] = [];
    const cursor = new Date(startUTC);
    while (cursor <= endUTC) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  const list = useServerListPage<HolidayRow>({
    queryKey: ["hrm-holidays", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _s, opts) =>
      getHolidaysPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => dateListCursor(row),
  });

  const createMutation = useAppMutation({
    mutationFn: async () => {
      const start = startDate;
      const end = endDate || startDate;
      const dates = enumerateIsoDates(start, end);
      if (dates.length === 0) throw new Error("Invalid date range");

      let last: HolidayRow | null = null;
      for (const isoDate of dates) {
        last = await createHoliday(tenantId!, {
          name: name.trim(),
          date: isoDate,
          locationCode: locationCode || undefined,
          note: note.trim() || undefined,
        });
      }

      if (!last) throw new Error("Failed to create holiday");
      return last;
    },
    invalidateKeys: [["hrm-holidays", tenantId]],
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteHoliday(tenantId!, id),
    optimistic: {
      keys: [["hrm-holidays", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["hrm-holidays", tenantId], id);
      },
    },
    onSuccess: () => {
      setConfirmDelete(null);
    },
  });

  const columns: ColumnConfig<HolidayRow>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "date",
      header: "Date",
      sortValue: (r) => new Date(r.date).getTime(),
      render: (r) => formatDate(r.date),
    },
    {
      key: "locationCode",
      header: "Business Location",
      render: (r) => r.locationCode ?? "—",
    },
    { key: "note", header: "Note", render: (r) => r.note ?? "—" },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <button
          type="button"
          className="hq6-meta-btn-delete"
          onClick={() => setConfirmDelete(r)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      ),
    },
  ];

  return (
    <ListCard
      title="Holiday"
      onAdd={() => {
        setName("");
        setStartDate("");
        setEndDate("");
        setLocationCode("");
        setNote("");
        setModalOpen(true);
      }}
      filters={
        <div className="rounded border border-[#d2d6de] bg-white px-4 py-3">
          <p className="mb-2 text-sm font-semibold text-[#555]">Filters</p>
          <div className="hq6-search max-w-xs">
            <label className="hq6-search-field">
              <span className="sr-only">Search</span>
              <input
                className="hq6-modal-input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setSearch((prev) => prev.trim());
                  }
                }}
              />
            </label>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-between border-b border-[#d2d6de] px-4 py-3">
        <span className="text-sm font-semibold">All Holidays</span>
      </div>
      <ServerPaginatedTable
        items={list.items}
        columns={columns}
        {...serverPaginationBarProps(list)}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error ? "Failed to load holidays" : null}
        emptyState={{ message: "No data available in table" }}
      />
      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Holiday"
        footer={
          <Hq6ModalSaveClose
            onSave={() => createMutation.mutate()}
            onClose={() => setModalOpen(false)}
            saving={createMutation.isPending}
            saveDisabled={!name.trim() || !startDate || !endDate}
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Name" required>
            <input
              className="hq6-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Hq6Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Hq6Field label="Start Date" required>
              <input
                type="date"
                className="hq6-modal-input"
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  setEndDate((prev) => prev || next);
                }}
              />
            </Hq6Field>
            <Hq6Field label="End Date" required>
              <input
                type="date"
                className="hq6-modal-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Hq6Field>
          </div>
          <Hq6Field label="Business Location">
            <select
              className="hq6-modal-input"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
            >
              <option value="">All</option>
              {locations.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </Hq6Field>
          <Hq6Field label="Note">
            <textarea
              className="hq6-modal-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
      <Hq6ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        title="Delete holiday?"
        message={`Remove “${confirmDelete?.name ?? ""}”?`}
        confirming={deleteMutation.isPending}
      />
    </ListCard>
  );
}

/* —— Departments (payroll groups) —— */

export function HrmDepartmentsView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollGroup | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PayrollGroup | null>(null);

  const list = useServerListPage<PayrollGroup>({
    queryKey: ["hrm-departments", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _s, opts) =>
      getPayrollGroupsPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const saveMutation = useAppMutation({
    mutationFn: () =>
      editing
        ? updatePayrollGroup(tenantId!, editing.id, {
            name: name.trim(),
            code: code.trim() || null,
            description: description.trim() || null,
          })
        : createPayrollGroup(tenantId!, {
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || undefined,
          }),
    invalidateKeys: [["hrm-departments", tenantId]],
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deletePayrollGroup(tenantId!, id),
    optimistic: {
      keys: [["hrm-departments", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["hrm-departments", tenantId], id);
      },
    },
    onSuccess: () => {
      setConfirmDelete(null);
    },
  });

  const columns: ColumnConfig<PayrollGroup>[] = [
    {
      key: "name",
      header: "Department",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "code", header: "Department ID", render: (r) => r.code ?? "—" },
    {
      key: "description",
      header: "Description",
      render: (r) => r.description ?? "",
    },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <ActionEditDelete
          onEdit={() => {
            setEditing(r);
            setName(r.name);
            setCode(r.code ?? "");
            setDescription(r.description ?? "");
            setModalOpen(true);
          }}
          onDelete={() => setConfirmDelete(r)}
        />
      ),
    },
  ];

  return (
    <ListCard
      title="Departments"
      subtitle="Manage Departments"
      onAdd={() => {
        setEditing(null);
        setName("");
        setCode("");
        setDescription("");
        setModalOpen(true);
      }}
    >
      <div className="flex justify-end border-b border-[#d2d6de] px-4 py-2">
        <div className="hq6-search max-w-xs">
          <label className="hq6-search-field">
            <span className="sr-only">Search</span>
            <input
              className="hq6-modal-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearch((prev) => prev.trim());
                }
              }}
            />
          </label>
        </div>
      </div>
      <ServerPaginatedTable
        items={list.items}
        columns={columns}
        {...serverPaginationBarProps(list)}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error ? "Failed to load departments" : null}
        emptyState={{ message: "No data available in table" }}
      />
      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Department" : "Add Department"}
        footer={
          <Hq6ModalSaveClose
            onSave={() => saveMutation.mutate()}
            onClose={() => setModalOpen(false)}
            saving={saveMutation.isPending}
            saveDisabled={!name.trim()}
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Department" required>
            <input
              className="hq6-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Department ID">
            <input
              className="hq6-modal-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Description">
            <textarea
              className="hq6-modal-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
      <Hq6ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        title="Delete department?"
        message={`Remove “${confirmDelete?.name ?? ""}”?`}
        confirming={deleteMutation.isPending}
      />
    </ListCard>
  );
}

/* —— Designations —— */

export function HrmDesignationsView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Designation | null>(null);

  const list = useServerListPage<Designation>({
    queryKey: ["hrm-designations", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _s, opts) =>
      getDesignationsPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const saveMutation = useAppMutation({
    mutationFn: () =>
      editing
        ? updateDesignation(tenantId!, editing.id, {
            name: name.trim(),
            description: description.trim() || null,
          })
        : createDesignation(tenantId!, {
            name: name.trim(),
            description: description.trim() || undefined,
          }),
    invalidateKeys: [["hrm-designations", tenantId]],
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => deleteDesignation(tenantId!, id),
    optimistic: {
      keys: [["hrm-designations", tenantId]],
      update: (qc, id) => {
        removeEntityFromQueries(qc, ["hrm-designations", tenantId], id);
      },
    },
    onSuccess: () => {
      setConfirmDelete(null);
    },
  });

  const columns: ColumnConfig<Designation>[] = [
    {
      key: "name",
      header: "Designation",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (r) => r.description ?? "",
    },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <ActionEditDelete
          onEdit={() => {
            setEditing(r);
            setName(r.name);
            setDescription(r.description ?? "");
            setModalOpen(true);
          }}
          onDelete={() => setConfirmDelete(r)}
        />
      ),
    },
  ];

  return (
    <ListCard
      title="Designations"
      subtitle="Manage designations"
      onAdd={() => {
        setEditing(null);
        setName("");
        setDescription("");
        setModalOpen(true);
      }}
    >
      <div className="flex justify-end border-b border-[#d2d6de] px-4 py-2">
        <div className="hq6-search max-w-xs">
          <label className="hq6-search-field">
            <span className="sr-only">Search</span>
            <input
              className="hq6-modal-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearch((prev) => prev.trim());
                }
              }}
            />
          </label>
        </div>
      </div>
      <ServerPaginatedTable
        items={list.items}
        columns={columns}
        {...serverPaginationBarProps(list)}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error ? "Failed to load designations" : null}
        emptyState={{ message: "No data available in table" }}
      />
      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Designation" : "Add Designation"}
        footer={
          <Hq6ModalSaveClose
            onSave={() => saveMutation.mutate()}
            onClose={() => setModalOpen(false)}
            saving={saveMutation.isPending}
            saveDisabled={!name.trim()}
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Designation" required>
            <input
              className="hq6-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Description">
            <textarea
              className="hq6-modal-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
      <Hq6ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        title="Delete designation?"
        message={`Remove “${confirmDelete?.name ?? ""}”?`}
        confirming={deleteMutation.isPending}
      />
    </ListCard>
  );
}

/* —— Sales Targets —— */

export function HrmSalesTargetsView() {
  const tenantId = useTenantId();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<SalesTargetRow | null>(null);
  const [note, setNote] = useState("");

  const targetsList = useServerListPage<SalesTargetRow>({
    queryKey: ["hrm-sales-targets", tenantId],
    enabled: Boolean(tenantId),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _s, opts) =>
      getSalesTargetsPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => userNameListCursor(row),
  });

  const workforceQuery = useQuery({
    queryKey: ["workforce-for-targets", tenantId],
    enabled: Boolean(tenantId),
    queryFn: () =>
      getWorkforcePage(tenantId!, undefined, 100, undefined, {
        includeSummary: false,
      }),
    staleTime: 5 * 60_000,
  });

  const rows = useMemo((): SalesTargetRow[] => {
    const targets = targetsList.items;
    if (targets.length > 0) return targets;
    return (workforceQuery.data?.items ?? []).map((w: WorkforceMember) => ({
      id: w.id,
      tenantId: w.tenantId,
      userName: w.employeeName,
      userId: w.id,
      createdAt: w.lastPayrollMonth,
    }));
  }, [targetsList.items, workforceQuery.data?.items]);

  const saveMutation = useAppMutation({
    mutationFn: () =>
      upsertSalesTarget(tenantId!, {
        userName: selected?.userName ?? "",
        userId: selected?.userId ?? undefined,
        note: note.trim() || undefined,
      }),
    invalidateKeys: [["hrm-sales-targets", tenantId]],
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const columns: ColumnConfig<SalesTargetRow>[] = [
    {
      key: "userName",
      header: "User",
      render: (r) => <span className="font-medium">{r.userName}</span>,
    },
    {
      key: "id",
      header: "Action",
      sortable: false,
      render: (r) => (
        <button
          type="button"
          className="hq6-btn hq6-btn-blue"
          onClick={() => {
            setSelected(r);
            setNote("");
            setModalOpen(true);
          }}
        >
          Set Sales Target
        </button>
      ),
    },
  ];

  const busy = targetsList.isLoading || workforceQuery.isLoading;

  return (
    <ListCard title="Sales Targets">
      <div className="flex justify-end border-b border-[#d2d6de] px-4 py-2">
        <div className="hq6-search max-w-xs">
          <label className="hq6-search-field">
            <span className="sr-only">Search</span>
            <input
              className="hq6-modal-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearch((prev) => prev.trim());
                }
              }}
            />
          </label>
        </div>
      </div>
      <ServerPaginatedTable
        items={rows}
        columns={columns}
        {...serverPaginationBarProps(
          targetsList.items.length > 0
            ? targetsList
            : {
                ...targetsList,
                items: rows,
                totalCount: rows.length,
                hasMore: false,
              },
        )}
        isLoading={busy}
        isFetching={targetsList.isFetching}
        error={targetsList.error ? "Failed to load sales targets" : null}
        emptyState={{ message: "No data available in table" }}
      />
      <Hq6Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Set Sales Target — ${selected?.userName ?? ""}`}
        footer={
          <Hq6ModalSaveClose
            onSave={() => saveMutation.mutate()}
            onClose={() => setModalOpen(false)}
            saving={saveMutation.isPending}
            saveDisabled={!selected}
            saveLabel="Save"
          />
        }
      >
        <Hq6Field label="Note (optional)">
          <textarea
            className="hq6-modal-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Target details / commission notes"
          />
        </Hq6Field>
      </Hq6Modal>
    </ListCard>
  );
}

/* —— Attendance (horizontal sub-tabs) —— */

type AttendanceTab =
  | "shifts"
  | "all"
  | "by-shift"
  | "by-date";

const ATTENDANCE_TABS: Array<{
  id: AttendanceTab;
  label: string;
  icon: ReactNode;
}> = [
  { id: "shifts", label: "Shifts", icon: <Users className="size-3.5" /> },
  {
    id: "all",
    label: "All Attendance",
    icon: <CheckSquare className="size-3.5" />,
  },
  {
    id: "by-shift",
    label: "Attendance by shift",
    icon: <UserCheck className="size-3.5" />,
  },
  {
    id: "by-date",
    label: "Attendance by date",
    icon: <Calendar className="size-3.5" />,
  },
];

export function HrmAttendanceView() {
  const tenantId = useTenantId();
  const [tab, setTab] = useState<AttendanceTab>("by-shift");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shiftModal, setShiftModal] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [clockModal, setClockModal] = useState(false);
  const [clockName, setClockName] = useState("");

  const shifts = useServerListPage<AttendanceShiftRow>({
    queryKey: ["hrm-attendance-shifts", tenantId],
    enabled: Boolean(tenantId) && tab === "shifts",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _s, opts) =>
      getAttendanceShiftsPage(tenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const allAttendance = useServerListPage<AttendanceRow>({
    queryKey: ["hrm-attendance-all", tenantId],
    enabled: Boolean(tenantId) && (tab === "all" || tab === "by-date"),
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    search,
    searchMode: "hybrid",
    filters: { date: tab === "by-date" ? date : "" },
    fetchPage: (cursor, limit, _s, opts) =>
      getAttendancesPage(tenantId!, cursor, limit, {
        search: opts?.search,
        date: tab === "by-date" ? date : undefined,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => dateListCursor(row),
  });

  const byShiftQuery = useQuery({
    queryKey: ["hrm-attendance-by-shift", tenantId, date],
    enabled: Boolean(tenantId) && tab === "by-shift",
    queryFn: () => getAttendanceByShift(tenantId!, date),
  });

  const createShiftMutation = useAppMutation({
    mutationFn: () => createAttendanceShift(tenantId!, { name: shiftName.trim() }),
    invalidateKeys: [["hrm-attendance-shifts", tenantId]],
    onSuccess: () => {
      setShiftModal(false);
    },
  });

  const clockMutation = useAppMutation({
    mutationFn: () =>
      clockInAttendance(tenantId!, {
        employeeName: clockName.trim(),
        date,
      }),
    invalidateKeys: [
      ["hrm-attendance", tenantId],
      ["hrm-attendance-all", tenantId],
      ["hrm-attendance-by-shift", tenantId],
    ],
    onSuccess: () => {
      setClockModal(false);
    },
  });

  const shiftColumns: ColumnConfig<AttendanceShiftRow>[] = [
    { key: "name", header: "Shift", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "createdAt",
      header: "Created",
      render: (r) => formatDate(r.createdAt),
    },
  ];

  const attendanceColumns: ColumnConfig<AttendanceRow>[] = [
    { key: "employeeName", header: "Employee" },
    { key: "shiftName", header: "Shift", render: (r) => r.shiftName ?? "—" },
    {
      key: "date",
      header: "Date",
      render: (r) => formatDate(r.date),
    },
    {
      key: "clockIn",
      header: "Clock In",
      render: (r) => (r.clockIn ? formatDate(r.clockIn) : "—"),
    },
    {
      key: "clockOut",
      header: "Clock Out",
      render: (r) => (r.clockOut ? formatDate(r.clockOut) : "—"),
    },
    { key: "status", header: "Status" },
  ];

  const byShiftColumns: ColumnConfig<AttendanceByShiftRow>[] = [
    { key: "shift", header: "Shift" },
    { key: "present", header: "Present" },
    { key: "absent", header: "Absent" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#111827]">Attendance</h2>
        <button
          type="button"
          className="hq6-btn hq6-btn-blue"
          onClick={() => {
            setClockName("");
            setClockModal(true);
          }}
        >
          Clock In ▾
        </button>
      </div>

      <div className="overflow-hidden rounded border border-[#d2d6de] bg-white">
        <div className="flex flex-wrap gap-1 border-b border-[#d2d6de] px-2 pt-2">
          {ATTENDANCE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm",
                tab === item.id
                  ? "border-[#3c8dbc] font-semibold text-[#3c8dbc]"
                  : "border-transparent text-[#555] hover:text-[#111]",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "by-shift" || tab === "by-date" ? (
            <div className="mb-4">
              <input
                type="date"
                className="hq6-modal-input w-full max-w-md"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          ) : null}

          {tab === "shifts" ? (
            <>
              <div className="mb-3 flex justify-end">
                <UposGradientActionButton
                  label="Add"
                  onClick={() => {
                    setShiftName("");
                    setShiftModal(true);
                  }}
                />
              </div>
              <ServerPaginatedTable
                items={shifts.items}
                columns={shiftColumns}
                {...serverPaginationBarProps(shifts)}
                isLoading={shifts.isLoading}
                isFetching={shifts.isFetching}
                error={shifts.error ? "Failed to load shifts" : null}
                emptyState={{ message: "No data found" }}
              />
            </>
          ) : null}

          {tab === "all" || tab === "by-date" ? (
            <ServerPaginatedTable
              items={allAttendance.items}
              columns={attendanceColumns}
              {...serverPaginationBarProps(allAttendance)}
              isLoading={allAttendance.isLoading}
              isFetching={allAttendance.isFetching}
              error={allAttendance.error ? "Failed to load attendance" : null}
              emptyState={{ message: "No data found" }}
            />
          ) : null}

          {tab === "by-shift" ? (
            <ServerPaginatedTable
              items={byShiftQuery.data ?? []}
              columns={byShiftColumns}
              pageIndex={0}
              pageSize={50}
              hasMore={false}
              canGoPrev={false}
              onPrev={() => undefined}
              onNext={() => undefined}
              onPageSizeChange={() => undefined}
              isLoading={byShiftQuery.isLoading}
              isFetching={byShiftQuery.isFetching}
              error={byShiftQuery.error ? "Failed to load attendance by shift" : null}
              emptyState={{ message: "No data found" }}
            />
          ) : null}
        </div>
      </div>

      <Hq6Modal
        open={shiftModal}
        onClose={() => setShiftModal(false)}
        title="Add Shift"
        footer={
          <Hq6ModalSaveClose
            onSave={() => createShiftMutation.mutate()}
            onClose={() => setShiftModal(false)}
            saving={createShiftMutation.isPending}
            saveDisabled={!shiftName.trim()}
          />
        }
      >
        <Hq6Field label="Shift name" required>
          <input
            className="hq6-modal-input"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
          />
        </Hq6Field>
      </Hq6Modal>

      <Hq6Modal
        open={clockModal}
        onClose={() => setClockModal(false)}
        title="Clock In"
        footer={
          <Hq6ModalSaveClose
            onSave={() => clockMutation.mutate()}
            onClose={() => setClockModal(false)}
            saving={clockMutation.isPending}
            saveDisabled={!clockName.trim()}
            saveLabel="Clock In"
          />
        }
      >
        <div className="space-y-3">
          <Hq6Field label="Employee" required>
            <input
              className="hq6-modal-input"
              value={clockName}
              onChange={(e) => setClockName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Date">
            <input
              type="date"
              className="hq6-modal-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
    </div>
  );
}
