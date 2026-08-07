"use client";

import { AlertTriangle } from "lucide-react";
import { useApiHealthQuery } from "@/lib/hooks/useApiHealth";

/**
 * Sticky banner when Nest `/health` reports DB disconnected or unreachable.
 * Writes are soft-blocked via `useAppMutation` while this is showing.
 */
export function ApiHealthBanner() {
  const { data, isError, isFetching, refetch } = useApiHealthQuery();

  const dbDown = isError || data?.database === "disconnected";
  if (!dbDown) return null;

  return (
    <div
      role="alert"
      className="flex shrink-0 items-center justify-between gap-4 border-b border-amber-800/40 bg-amber-950 px-4 py-2.5 text-sm text-amber-50 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <span className="font-medium">
          {isError
            ? "API unreachable — database status unknown."
            : "Database disconnected — reads may be stale; saves are paused."}
        </span>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md border border-amber-200/30 bg-amber-900/40 px-2.5 py-1 text-xs font-medium text-amber-50 hover:bg-amber-900/70 disabled:opacity-60"
        onClick={() => void refetch()}
        disabled={isFetching}
      >
        {isFetching ? "Checking…" : "Retry"}
      </button>
    </div>
  );
}
