"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { getCafeTables, updateCafeTableStatus } from "@/lib/api/cafeTables";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import type { CafeTable, CafeTableStatus } from "@vonos/types";
import { cn } from "@/lib/utils/cn";

const STATUS_CYCLE: CafeTableStatus[] = ["available", "occupied", "reserved"];

function nextTableStatus(current: CafeTableStatus): CafeTableStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length] ?? "available";
}

function TableCard({ table }: { table: CafeTable }) {
  const queryClient = useQueryClient();
  const mutation = useAppMutation({
    mutationFn: (status: CafeTableStatus) => updateCafeTableStatus(table.id, status),
    successMessage: (_data, status) => `Table ${table.label} is now ${status}`,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cafe-tables"] });
    },
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate(nextTableStatus(table.status))}
      disabled={mutation.isPending}
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-card transition-colors hover:bg-[var(--color-surface-muted)]",
        mutation.isPending && "opacity-60",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-lg font-semibold text-foreground">{table.label}</span>
        <span className="text-sm font-medium capitalize text-foreground">{table.status}</span>
      </div>
      <p className="text-sm text-muted">Seats {table.capacity}</p>
      <p className="text-xs text-muted">Tap to cycle status</p>
    </button>
  );
}

export function TableManagementView() {
  const tenantId = useTenantId();
  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ["cafe-tables", tenantId],
    queryFn: () => getCafeTables(tenantId!),
    enabled: Boolean(tenantId),
  });

  if (!tenantId) {
    return (
      <EmptyState title="No tenant" message="Select an entity to manage cafe tables." />
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading tables…</p>;
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load tables"
        message="We could not load table status. Try again in a moment."
      />
    );
  }

  if (tables.length === 0) {
    return (
      <EmptyState
        title="No tables configured"
        message="No tables are set up yet. Contact your administrator to add floor tables."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} />
      ))}
    </div>
  );
}
