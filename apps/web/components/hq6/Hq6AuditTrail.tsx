"use client";

import type { AuditLogEntry } from "@vonos/types";
import { useAuditHistoryFeed } from "@/lib/hooks/useAuditHistoryFeed";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { cn } from "@/lib/utils/cn";

function formatTag(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  if (raw === "due") return "Due";
  if (raw === "partial") return "Partial";
  if (raw === "paid") return "Paid";
  if (raw === "draft") return "Draft";
  if (raw === "quotation") return "Quotation";
  if (raw === "completed") return "Final";
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " ");
}

function movementFromMetadata(
  metadata: AuditLogEntry["metadata"],
): { from: string; to: string } | null {
  if (!metadata || typeof metadata !== "object") return null;
  const from =
    metadata.from ??
    metadata.fromStatus ??
    metadata.previousStatus ??
    metadata.fromPaymentStatus ??
    metadata.previousPaymentStatus;
  const to =
    metadata.to ??
    metadata.toStatus ??
    metadata.newStatus ??
    metadata.toPaymentStatus ??
    metadata.paymentStatus;
  if (from == null || to == null) return null;
  const fromLabel = formatTag(from);
  const toLabel = formatTag(to);
  if (fromLabel === toLabel) return null;
  return { from: fromLabel, to: toLabel };
}

/**
 * Compact activity/audit list for HQ6 view modals (sale, purchase, expense, payment).
 */
export function Hq6AuditTrail({
  entityType,
  entityId,
  title = "Activity",
  className,
  enabled = true,
}: {
  entityType: string;
  entityId: string | null | undefined;
  title?: string;
  className?: string;
  enabled?: boolean;
}) {
  const tenantId = useTenantId();
  const { entries, isLoading } = useAuditHistoryFeed(
    entityType,
    entityId ?? undefined,
    tenantId,
    { enabled: enabled && Boolean(entityId) },
  );

  if (!entityId) return null;

  return (
    <div className={cn("hq6-audit-trail mt-4", className)}>
      <h3 className="hq6-sale-activity-heading mb-2 text-[var(--color-text)]">
        {title}
      </h3>
      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading activity…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-2.5 border-t border-[var(--color-border)] pt-2">
          {entries.map((entry) => {
            const movement = movementFromMetadata(entry.metadata ?? null);
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="hq6-sale-activity-action">
                    <span className="hq6-sale-activity-action-label">
                      {entry.title}
                    </span>
                    {movement ? (
                      <span
                        className="hq6-sale-activity-badges"
                        title={`${movement.from} → ${movement.to}`}
                      >
                        <span className="hq6-sale-activity-badge">
                          {movement.from}
                        </span>
                        <span className="hq6-sale-activity-arrow" aria-hidden>
                          →
                        </span>
                        <span className="hq6-sale-activity-badge hq6-sale-activity-badge-to">
                          {movement.to}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {entry.subtitle ? (
                    <span className="mt-0.5 block text-sm text-[var(--color-text-muted)]">
                      {entry.subtitle}
                    </span>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-[var(--color-text-muted)] tabular-nums">
                  {entry.date}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
