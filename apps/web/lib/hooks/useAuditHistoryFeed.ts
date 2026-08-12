"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAuditLog } from "@/lib/api/audit";
import { formatDateTime } from "@/lib/utils/formatDate";
import type { HistoryFeedEntry } from "@/lib/registries/sectionTypes";

export function createdByField(name: string | null | undefined) {
  if (!name) return null;
  return { label: "Created by", value: name };
}

const AUDIT_DEFER_MS = 300;

/**
 * Audit feed for detail sidebars — deferred until idle (or 300ms) so the
 * primary shell query wins the first paint RTT. Skips defer when already cached
 * (e.g. seeded from sale /view prefetch).
 */
export function useAuditHistoryFeed(
  entityType: string,
  entityId: string | undefined,
  tenantId: string | null | undefined,
  options?: { enabled?: boolean },
): { entries: HistoryFeedEntry[]; isLoading: boolean } {
  const queryClient = useQueryClient();
  const cacheKey = ["audit-entity", tenantId, entityType, entityId] as const;
  const hasCached =
    Boolean(tenantId && entityId) &&
    queryClient.getQueryData(cacheKey) != null;

  const [deferredReady, setDeferredReady] = useState(hasCached);

  useEffect(() => {
    if (!tenantId || !entityId) {
      setDeferredReady(false);
      return;
    }
    if (
      queryClient.getQueryData(["audit-entity", tenantId, entityType, entityId]) !=
      null
    ) {
      setDeferredReady(true);
      return;
    }
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const ready = () => {
      if (!cancelled) setDeferredReady(true);
    };

    const w = typeof window !== "undefined" ? window : null;
    if (w && "requestIdleCallback" in w) {
      idleId = w.requestIdleCallback(ready, { timeout: AUDIT_DEFER_MS });
    } else {
      timeoutId = setTimeout(ready, AUDIT_DEFER_MS);
    }

    return () => {
      cancelled = true;
      if (idleId != null && w && "cancelIdleCallback" in w) {
        w.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [tenantId, entityId, entityType, queryClient]);

  const explicitEnabled = options?.enabled !== false;
  const enabled =
    explicitEnabled && Boolean(tenantId && entityId) && deferredReady;

  const { data, isLoading } = useQuery({
    queryKey: cacheKey,
    queryFn: () =>
      getAuditLog({ entityType, entityId: entityId!, limit: 20 }, tenantId),
    enabled,
  });

  if (!entityId) {
    return { entries: [], isLoading: false };
  }

  const entries: HistoryFeedEntry[] =
    data?.map((entry) => ({
      id: entry.id,
      title: entry.summary,
      subtitle: entry.actorName ?? undefined,
      date: formatDateTime(entry.occurredAt),
      status: undefined,
      action: entry.action,
      actorName: entry.actorName ?? undefined,
      metadata: entry.metadata ?? null,
    })) ?? [];

  return { entries, isLoading: enabled && isLoading };
}
