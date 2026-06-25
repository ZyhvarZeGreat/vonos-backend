import { useQuery } from "@tanstack/react-query";
import type { AuditLogEntry } from "@vonos/types";
import type { ActivityFeedEntry } from "@/components/organisms/ActivityFeedPanel";
import { getRecentAudit } from "@/lib/api/audit";
import { formatDateTime } from "@/lib/utils/formatDate";

export function auditToActivityFeed(entries: AuditLogEntry[]): ActivityFeedEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.summary,
    description: entry.actorName
      ? `${entry.actorName} · ${entry.action.replace(/_/g, " ")}`
      : entry.action.replace(/_/g, " "),
    timestamp: formatDateTime(entry.occurredAt),
  }));
}

export function useRecentActivityFeed(
  tenantId: string | null | undefined,
): { items: ActivityFeedEntry[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-recent", tenantId],
    queryFn: () => getRecentAudit(tenantId, 10),
    enabled: Boolean(tenantId),
  });

  return {
    items: data && data.length > 0 ? auditToActivityFeed(data) : [],
    isLoading,
  };
}
