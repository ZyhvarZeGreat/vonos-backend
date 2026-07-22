"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6DateTime } from "@/lib/utils/hq6Format";

const STORAGE_PREFIX = "vonos:hq6-todos:";

interface TodoRow {
  id: string;
  addedOn: string;
  taskId: string;
  task: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  assignedBy: string;
  assignedTo: string;
  tags: string[];
}

/** HQ6 Essentials View — route (`/essentials/todo/:id`). */
export function Hq6TodoDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { listPath } = useRecordNavigation("essentials-todo");

  const todo = useMemo(() => {
    if (!tenantId || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${tenantId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TodoRow[];
      return parsed.find((row) => row.id === recordId) ?? null;
    } catch {
      return null;
    }
  }, [recordId, tenantId]);

  if (!todo) {
    return (
      <EmptyState
        title="To Do not found"
        message="This task is not saved on this device."
        ctaLabel="Back to To Do"
        onCta={() => router.push(listPath)}
      />
    );
  }

  return (
    <Hq6PageFrame title={todo.task} subtitle={`Task ${todo.taskId}`}>
      <div className="mb-4">
        <button
          type="button"
          className="hq6-btn hq6-btn-outline text-xs"
          onClick={() => router.push(listPath)}
        >
          Back to To Do
        </button>
      </div>
      <section className="rounded-lg border border-[#e5e7eb] bg-white p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#777]">Status</dt>
            <dd className="font-medium">{todo.status}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Priority</dt>
            <dd className="font-medium capitalize">{todo.priority}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Assigned To</dt>
            <dd className="font-medium">{todo.assignedTo}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Assigned By</dt>
            <dd className="font-medium">{todo.assignedBy}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Start</dt>
            <dd className="font-medium">{formatHq6DateTime(todo.startDate)}</dd>
          </div>
          <div>
            <dt className="text-[#777]">End</dt>
            <dd className="font-medium">{formatHq6DateTime(todo.endDate)}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Estimated hours</dt>
            <dd className="font-medium">{todo.estimatedHours}</dd>
          </div>
          <div>
            <dt className="text-[#777]">Added On</dt>
            <dd className="font-medium">{formatHq6DateTime(todo.addedOn)}</dd>
          </div>
        </dl>
      </section>
    </Hq6PageFrame>
  );
}
