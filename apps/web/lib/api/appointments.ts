import type { AppointmentListRow, CreateAppointmentRequest } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

export type { AppointmentListRow };

const LIST_PATH = "/appointments";

async function fetchAppointmentsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<AppointmentListRow[]> {
  const tenantPath = withTenantQuery(LIST_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch appointments");
  return response.json();
}

export async function getAppointmentsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<AppointmentListRow>> {
  return fetchTenantListPage(LIST_PATH, tenantId, cursor, limit);
}

/** Full appointment list for export — not for table rendering. */
export async function getAllAppointments(
  tenantId: string,
): Promise<AppointmentListRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchAppointmentsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getAppointments(
  tenantId: string,
): Promise<AppointmentListRow[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchAppointmentsRaw(tenantId, cursor, limit),
  );
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
