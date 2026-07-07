import { apiFetch, withTenantQuery } from "@/lib/api/client";

export async function fixReportLocationStock(body: {
  itemId: string;
  locationCode: string;
  binLocation?: string;
  quantity: number;
  tenantId?: string;
}) {
  const path = withTenantQuery("/reports/actions/fix-location-stock", body.tenantId);
  const response = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemId: body.itemId,
      locationCode: body.locationCode,
      binLocation: body.binLocation,
      quantity: body.quantity,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fix stock");
  }
  return response.json() as Promise<{ ok: boolean }>;
}

export async function updateReportMovementLineExpiry(body: {
  movementId: string;
  lineSku: string;
  expDate: string;
  tenantId?: string;
}) {
  const path = withTenantQuery(
    "/reports/actions/movement-line-expiry",
    body.tenantId,
  );
  const response = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      movementId: body.movementId,
      lineSku: body.lineSku,
      expDate: body.expDate,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to update expiry");
  }
  return response.json() as Promise<{ ok: boolean }>;
}
