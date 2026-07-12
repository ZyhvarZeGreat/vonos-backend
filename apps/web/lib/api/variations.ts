import type {
  CreateVariationTemplateRequest,
  UpdateVariationTemplateRequest,
  VariationTemplate,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { DEFAULT_TABLE_PAGE_SIZE, type ListPage } from "@/lib/api/fetchAllPages";
import { fetchTenantListPage } from "@/lib/api/listPageHelpers";

export async function getVariationsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<VariationTemplate>> {
  return fetchTenantListPage("/variations", tenantId, cursor, limit);
}

export async function createVariation(
  tenantId: string,
  body: CreateVariationTemplateRequest,
): Promise<VariationTemplate> {
  const response = await apiFetch(withTenantQuery("/variations", tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to create variation template");
  return response.json();
}

export async function updateVariation(
  tenantId: string,
  id: string,
  body: UpdateVariationTemplateRequest,
): Promise<VariationTemplate> {
  const response = await apiFetch(withTenantQuery(`/variations/${id}`, tenantId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update variation template");
  return response.json();
}

export async function deleteVariation(tenantId: string, id: string): Promise<void> {
  const response = await apiFetch(withTenantQuery(`/variations/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete variation template");
}
