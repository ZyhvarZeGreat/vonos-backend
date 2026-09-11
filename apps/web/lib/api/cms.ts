import type {
  CmsPost,
  CmsPostListPage,
  CmsPostStatus,
  CreateCmsPostInput,
  UpdateCmsPostInput,
} from "@vonos/types";
import { apiFetch } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";

export async function listCmsPosts(params?: {
  scope?: "group" | string;
  status?: CmsPostStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}): Promise<CmsPostListPage> {
  const query = new URLSearchParams();
  if (params?.scope) query.set("scope", params.scope);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit != null) query.set("limit", String(params.limit));
  const qs = query.toString();
  const res = await apiFetch(`/cms/posts${qs ? `?${qs}` : ""}`);
  if (!res.ok) return throwApiError(res, "Failed to load CMS posts");
  return res.json() as Promise<CmsPostListPage>;
}

export async function getCmsPost(
  id: string,
  scope?: "group" | string,
): Promise<CmsPost> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  const res = await apiFetch(`/cms/posts/${id}${query}`);
  if (!res.ok) return throwApiError(res, "Failed to load CMS post");
  return res.json() as Promise<CmsPost>;
}

export async function createCmsPost(
  input: CreateCmsPostInput,
  scope?: "group" | string,
): Promise<CmsPost> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  const res = await apiFetch(`/cms/posts${query}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) return throwApiError(res, "Failed to create CMS post");
  return res.json() as Promise<CmsPost>;
}

export async function updateCmsPost(
  id: string,
  input: UpdateCmsPostInput,
  scope?: "group" | string,
): Promise<CmsPost> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  const res = await apiFetch(`/cms/posts/${id}${query}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!res.ok) return throwApiError(res, "Failed to update CMS post");
  return res.json() as Promise<CmsPost>;
}

export async function deleteCmsPost(
  id: string,
  scope?: "group" | string,
): Promise<{ ok: true }> {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  const res = await apiFetch(`/cms/posts/${id}${query}`, {
    method: "DELETE",
  });
  if (!res.ok) return throwApiError(res, "Failed to delete CMS post");
  return res.json() as Promise<{ ok: true }>;
}
