import type { AuditLogEntry, AuditLogFilters } from "@vonos/types";
import { apiFetch, withTenantQuery } from "./client";

export async function getAuditLog(
  filters: AuditLogFilters,
  tenantId?: string | null,
): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const path = withTenantQuery(`/audit${qs ? `?${qs}` : ""}`, tenantId ?? undefined);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch audit log");
  return response.json();
}

export async function getRecentAudit(
  tenantId?: string | null,
  limit = 10,
): Promise<AuditLogEntry[]> {
  const path = withTenantQuery(`/audit/recent?limit=${limit}`, tenantId ?? undefined);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch recent audit");
  return response.json();
}
