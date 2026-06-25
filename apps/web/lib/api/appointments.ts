import type { AppointmentListRow, CreateAppointmentRequest } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export type { AppointmentListRow };

export async function getAppointments(tenantId: string): Promise<AppointmentListRow[]> {
  const path = withTenantQuery("/appointments", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch appointments");
  return response.json();
}

export async function getAppointment(id: string): Promise<AppointmentListRow> {
  const response = await apiFetch(`/appointments/${id}`);
  if (!response.ok) throw new Error("Failed to fetch appointment");
  return response.json();
}

export async function createAppointment(
  tenantId: string,
  body: CreateAppointmentRequest,
): Promise<AppointmentListRow> {
  const path = withTenantQuery("/appointments", tenantId);
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create appointment");
  return response.json();
}
