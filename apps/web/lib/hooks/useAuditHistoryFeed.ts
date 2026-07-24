import { useQuery } from "@tanstack/react-query";
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
 * primary shell query wins the first paint RTT.
 */
export function useAuditHistoryFeed(
  entityType: string,
  entityId: string | undefined,
  tenantId: string | null | undefined,
  options?: { enabled?: boolean },
): { entries: HistoryFeedEntry[]; isLoading: boolean } {
  const [deferredReady, setDeferredReady] = useState(false);

  useEffect(() => {
    if (!tenantId || !entityId) {
      setDeferredReady(false);
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
  }, [tenantId, entityId]);

  const explicitEnabled = options?.enabled !== false;
  const enabled =
    explicitEnabled && Boolean(tenantId && entityId) && deferredReady;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-entity", tenantId, entityType, entityId],
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
    })) ?? [];

  return { entries, isLoading: enabled && isLoading };
}
