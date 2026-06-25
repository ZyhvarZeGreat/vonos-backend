const LIST_SLUG_BY_RECORD_TYPE: Record<string, string> = {
  item: "inventory",
  sale: "sales",
  job: "jobs",
  appointment: "appointments",
  customer: "customers",
  vehicle: "vehicles",
  movement: "inbound",
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
