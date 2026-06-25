"use client";

import { useParams } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { getEntityPage } from "@/lib/registries/entityPages";
import { useTenantStore } from "@/stores/tenantStore";

export default function TenantSlugPage() {
  const params = useParams<{ tenant: string; listSlug: string }>();
  const tenantConfig = useTenantStore((state) => state.tenantConfig);
  const slug = params.listSlug;
  const pageConfig = getEntityPage(params.tenant, slug);

  if (pageConfig) {
    const PageView = pageConfig.View;
    return <PageView />;
  }

  const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

  return (
    <EmptyState
      title={`${tenantConfig?.name ?? params.tenant} · ${title}`}
      message="This screen is not configured for this entity yet."
    />
  );
}
