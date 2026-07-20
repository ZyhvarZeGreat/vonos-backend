import type { QueryClient } from "@tanstack/react-query";
import { getWorkforce } from "@/lib/api/hrm";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";

/** Prefetch entity HRM dashboard workforce on sidebar hover (VA and other entities). */
export function prefetchEntityHrm(
  queryClient: QueryClient,
  tenantId: string,
): void {
  if (!tenantId) return;
  void queryClient.prefetchQuery({
    queryKey: ["workforce", tenantId, "dashboard"],
    queryFn: () => getWorkforce(tenantId),
    staleTime: ADMIN_ENTITY_STALE_MS,
  });
}
