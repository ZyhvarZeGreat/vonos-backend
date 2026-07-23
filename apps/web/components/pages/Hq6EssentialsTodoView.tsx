"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6Modal, Hq6Field, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { HQ6_TODO_FILTERS } from "@/lib/registries/hq6Filters";
import { formatHq6DateTime } from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";

interface TodoRow {
  id: string;
  addedOn: string;
  taskId: string;
  task: string;
  status: "Completed" | "Pending" | "In Progress" | "New" | "On Hold";
  priority: "low" | "medium" | "high" | "urgent";
  startDate: string;
  endDate: string;
  estimatedHours: number;
  assignedBy: string;
  assignedTo: string;
  tags: string[];
}

const STORAGE_PREFIX = "vonos:hq6-todos:";

function loadTodos(tenantId: string | null): TodoRow[] {
  if (!tenantId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${tenantId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TodoRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
      ...row,
      priority: row.priority ?? "medium",
      status: row.status ?? "Pending",
    }));
  } catch {
    return [];
  }
}

function saveTodos(tenantId: string, rows: TodoRow[]) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${tenantId}`, JSON.stringify(rows));
}

/** HQ6 Essentials → To Do — persisted per-tenant in localStorage (no server API yet). */
export function Hq6EssentialsTodoView() {
  const tenantId = useTenantId();
  const router = useRouter();
  const { detailPath } = useRecordNavigation("essentials-todo");
  const chrome = useHq6ListChrome("essentials-todo");
  const { dateRange, setDateRange, customDateRange, setCustomDateRange, bounds } =
    useListPageFilters({ defaultDateRange: "all_time" });
  const [localSearch, setLocalSearch] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<TodoRow | null>(null);
  const [statusValue, setStatusValue] = useState<TodoRow["status"]>("Pending");
  const [deleteTarget, setDeleteTarget] = useState<TodoRow | null>(null);
  const [task, setTask] = useState("");
  const [todos, setTodos] = useState<TodoRow[]>([]);

  useEffect(() => {
    setTodos(loadTodos(tenantId));
  }, [tenantId]);

  const persist = (next: TodoRow[]) => {
    if (!tenantId) return;
    setTodos(next);
    saveTodos(tenantId, next);
  };

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of todos) {
      if (row.assignedTo.trim()) names.add(row.assignedTo.trim());
    }
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [todos]);

  const rows = useMemo(() => {
    const fromMs = bounds?.from ? new Date(bounds.from).getTime() : null;
    const toMs = bounds?.to ? new Date(bounds.to).getTime() : null;
    return todos.filter((row) => {
      if (assignedToFilter && row.assignedTo !== assignedToFilter) return false;
      if (priorityFilter && row.priority !== priorityFilter) return false;
      if (statusFilter) {
        const map: Record<string, string[]> = {
          new: ["New", "Pending"],
          in_progress: ["In Progress"],
          on_hold: ["On Hold"],
          completed: ["Completed"],
        };
        const allowed = map[statusFilter] ?? [];
        if (!allowed.includes(row.status)) return false;
      }
      if (dateRange !== "all_time" && fromMs != null && toMs != null) {
        const t = new Date(row.addedOn).getTime();
        if (Number.isNaN(t) || t < fromMs || t > toMs) return false;
      }
      if (!localSearch.trim()) return true;
      const q = localSearch.toLowerCase();
      return (
        row.task.toLowerCase().includes(q) ||
        row.taskId.toLowerCase().includes(q) ||
        row.assignedTo.toLowerCase().includes(q)
      );
    });
  }, [
    assignedToFilter,
    bounds?.from,
    bounds?.to,
    dateRange,
    localSearch,
    priorityFilter,
    statusFilter,
    todos,
  ]);

  const columns: ColumnConfig<TodoRow>[] = useMemo(
    () => [
      {
        key: "addedOn",
        header: "Added On",
        render: (row) => formatHq6DateTime(row.addedOn),
      },
      { key: "taskId", header: "Task Id", render: (row) => row.taskId },
      {
        key: "task",
        header: "Task",
        render: (row) => (
          <div>
            <span className="font-medium text-[var(--hq6-blue)]">{row.task}</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {row.tags.map((tag) => (
                <span
                  key={tag}
                  className={
                    tag === "Urgent"
                      ? "rounded bg-[#dd4b39] px-1.5 py-0.5 text-[10px] text-white"
                      : "rounded bg-[#3c8dbc] px-1.5 py-0.5 text-[10px] text-white"
                  }
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ),
      },
      { key: "status", header: "Status", render: (row) => row.status },
      {
        key: "startDate",
        header: "Start Date",
        render: (row) => formatHq6DateTime(row.startDate),
      },
      {
        key: "endDate",
        header: "End Date",
        render: (row) => formatHq6DateTime(row.endDate),
      },
      {
        key: "estimatedHours",
        header: "Estimated Hours",
        render: (row) => row.estimatedHours,
      },
      { key: "assignedBy", header: "Assigned By", render: (row) => row.assignedBy },
      { key: "assignedTo", header: "Assigned To", render: (row) => row.assignedTo },
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
                onClick: () => {
                  setStatusTarget(row);
                  setStatusValue(row.status);
                },
              },
              {
                id: "change_status",
                label: "Change Status",
                onClick: () => {
                  setStatusTarget(row);
                  setStatusValue(row.status);
                },
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteTarget(row),
              },
            ]}
          />
        ),
      },
    ],
    [detailPath, router],
  );

  return (
    <Hq6StandardListShell
      slug="essentials-todo"
      tabLabel="To Do"
      chrome={chrome}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onAdd={() => setAddOpen(true)}
      pageSize={25}
      onPageSizeChange={() => undefined}
      columnOptions={columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header) }))}
      filters={
        <Hq6FilterGrid>
          <Hq6FilterSelect
            label="Assigned To"
            value={assignedToFilter}
            onChange={setAssignedToFilter}
            emptyLabel="All"
            options={assigneeOptions}
          />
          <Hq6FilterSelect
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={HQ6_TODO_FILTERS[1]!.options!}
          />
          <Hq6FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={HQ6_TODO_FILTERS[2]!.options!}
          />
          <Hq6FilterDateRange
            value={dateRange}
            onChange={setDateRange}
            customValue={customDateRange}
            onCustomChange={setCustomDateRange}
          />
        </Hq6FilterGrid>
      }
      tabs={[
        {
          id: "todo",
          label: "To Do",
          active: true,
          icon: <CheckSquare className="h-4 w-4" />,
        },
      ]}
      pagination={{
        pageIndex: 0,
        pageSize: 25,
        itemCount: rows.length,
        hasMore: false,
        canGoPrev: false,
        onPrev: () => undefined,
        onNext: () => undefined,
        onPageSizeChange: () => undefined,
        totalItems: rows.length,
      }}
      modals={
        <>
          <Hq6Modal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            title="Add To Do"
            footer={
              <Hq6ModalSaveClose
                onClose={() => setAddOpen(false)}
                onSave={() => {
                  if (!tenantId) return;
                  const trimmed = task.trim();
                  if (!trimmed) {
                    toast.error("Enter a task");
                    return;
                  }
                  const now = new Date().toISOString();
                  const nextRow: TodoRow = {
                    id: crypto.randomUUID(),
                    addedOn: now,
                    taskId: `${new Date().getFullYear()}/${String(todos.length + 1).padStart(4, "0")}`,
                    task: trimmed,
                    status: "Pending",
                    priority: "medium",
                    startDate: now,
                    endDate: now,
                    estimatedHours: 1,
                    assignedBy: "You",
                    assignedTo: "You",
                    tags: [],
                  };
                  persist([nextRow, ...todos]);
                  toast.success("To Do saved on this device");
                  setAddOpen(false);
                  setTask("");
                }}
              />
            }
          >
            <Hq6Field label="Task" required>
              <input
                className="hq6-modal-input"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
            </Hq6Field>
          </Hq6Modal>
          <Hq6Modal
            open={Boolean(statusTarget)}
            onClose={() => setStatusTarget(null)}
            title="Change Status"
            footer={
              <Hq6ModalSaveClose
                onClose={() => setStatusTarget(null)}
                onSave={() => {
                  if (!statusTarget) return;
                  persist(
                    todos.map((t) =>
                      t.id === statusTarget.id ? { ...t, status: statusValue } : t,
                    ),
                  );
                  toast.success("Status updated");
                  setStatusTarget(null);
                }}
              />
            }
          >
            <Hq6Field label="Status">
              <select
                className="hq6-modal-input"
                value={statusValue}
                onChange={(e) =>
                  setStatusValue(e.target.value as TodoRow["status"])
                }
              >
                {(
                  [
                    "New",
                    "Pending",
                    "In Progress",
                    "On Hold",
                    "Completed",
                  ] as const
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Hq6Field>
          </Hq6Modal>
          <Hq6ConfirmModal
            open={Boolean(deleteTarget)}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              if (!deleteTarget) return;
              persist(todos.filter((t) => t.id !== deleteTarget.id));
              toast.success("Task deleted");
              setDeleteTarget(null);
            }}
            title="Delete to do"
            message={`Delete “${deleteTarget?.task ?? ""}”?`}
            confirmLabel="Delete"
            danger
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
        emptyState={{ message: "No to-dos yet. Add a task to get started." }}
      />
    </Hq6StandardListShell>
  );
}
