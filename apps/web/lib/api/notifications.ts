import type { Notification } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function getNotifications(tenantId?: string): Promise<Notification[]> {
  const path = withTenantQuery("/notifications", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await apiFetch(`/notifications/${id}/read`, {
    method: "PATCH",
  });
  if (!response.ok) throw new Error("Failed to mark notification read");
}
