import type { AuditLogEntry } from "@vonos/types";
import type { HistoryFeedEntry } from "@/lib/registries/sectionTypes";
import { formatDateTime } from "@/lib/utils/formatDate";

export function auditEntryToHistoryFeed(entry: AuditLogEntry): HistoryFeedEntry {
  const actor = entry.actorName ?? "System";
  const actionLabel = entry.action.replace(/_/g, " ");
  return {
    id: entry.id,
    title: entry.summary,
    subtitle: `${actor} · ${actionLabel}`,
    date: formatDateTime(entry.occurredAt),
    actorName: entry.actorName ?? undefined,
    action: entry.action,
  };
}

export function auditEntriesToHistoryFeed(entries: AuditLogEntry[]): HistoryFeedEntry[] {
  return entries.map(auditEntryToHistoryFeed);
}
