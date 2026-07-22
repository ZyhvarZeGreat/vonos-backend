import { isHq6Tenant } from "@/lib/utils/isHq6Tenant";

const LIST_SLUG_BY_RECORD_TYPE: Record<string, string> = {
  item: "inventory",
  sale: "sales",
  job: "jobs",
  purchase: "inbound",
  appointment: "appointments",
  customer: "customers",
  vehicle: "vehicles",
  movement: "inbound",
  stockMovement: "inbound",
};

export function recordDetailPath(
  tenantCode: string,
  recordType: string | null | undefined,
  recordId: string | null | undefined,
): string | null {
  if (!tenantCode || !recordType || !recordId) return null;
  const slug = LIST_SLUG_BY_RECORD_TYPE[recordType];
  if (!slug) return null;
  return `/${tenantCode}/${slug}/${recordId}`;
}

/**
 * Resolve the record id to open from a report table row.
 * Sale line / payment rows keep their own `id` for React keys but expose `saleId`
 * for navigation — never open `/sales/{lineOrPaymentId}`.
 */
export function reportRowRecordId(row: {
  id?: string | number;
  saleId?: string | number;
  recordType?: string;
}): string | null {
  const recordType = String(row.recordType ?? "");
  if (recordType === "sale") {
    const saleId = row.saleId != null && row.saleId !== "" ? String(row.saleId) : "";
    if (saleId) return saleId;
  }
  if (row.id == null || row.id === "") return null;
  return String(row.id);
}

/**
 * Path for opening a sale from reports / job panels.
 * HQ6 tenants use the list + `?record=` modal; others use the detail route.
 */
export function saleRecordPath(tenantCode: string, saleId: string): string {
  if (isHq6Tenant(tenantCode)) {
    return `/${tenantCode}/sales?record=${encodeURIComponent(saleId)}`;
  }
  return `/${tenantCode}/sales/${saleId}`;
}

/** Build a detail (or HQ6 modal) path for a report row. */
export function reportRowDetailPath(
  tenantCode: string,
  row: {
    id?: string | number;
    saleId?: string | number;
    recordType?: string;
  },
): string | null {
  const recordType = String(row.recordType ?? "");
  const recordId = reportRowRecordId(row);
  if (!recordType || !recordId) return null;
  if (recordType === "sale") return saleRecordPath(tenantCode, recordId);
  return recordDetailPath(tenantCode, recordType, recordId);
}
