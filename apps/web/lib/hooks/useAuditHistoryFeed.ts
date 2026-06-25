import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "@/lib/api/audit";
import { formatDateTime } from "@/lib/utils/formatDate";
import type { HistoryFeedEntry } from "@/lib/registries/sectionTypes";

export function createdByField(name: string | null | undefined) {
  if (!name) return null;
  return { label: "Created by", value: name };
}

export function useAuditHistoryFeed(
  entityType: string,
  entityId: string | undefined,
  tenantId: string | null | undefined,
): { entries: HistoryFeedEntry[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-entity", tenantId, entityType, entityId],
    queryFn: () =>
      getAuditLog({ entityType, entityId: entityId!, limit: 20 }, tenantId),
    enabled: Boolean(tenantId && entityId),
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

  return { entries, isLoading };
}
