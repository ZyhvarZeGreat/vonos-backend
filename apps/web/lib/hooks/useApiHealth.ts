"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiHealth } from "@/lib/api/health";

const HEALTH_STALE_MS = 15_000;
const HEALTH_REFETCH_MS = 30_000;

export function useApiHealthQuery() {
  return useQuery({
    queryKey: ["apiHealth"],
    queryFn: ({ signal }) => getApiHealth(signal),
    staleTime: HEALTH_STALE_MS,
    refetchInterval: HEALTH_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Optimistic: treat as connected until a successful probe says otherwise,
 * or the probe errors (API unreachable).
 */
export function useDatabaseConnected(): boolean {
  const query = useApiHealthQuery();
  if (query.isError) return false;
  if (!query.data) return true;
  return query.data.database === "connected";
}
