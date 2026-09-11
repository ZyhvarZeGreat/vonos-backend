"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CmsPostEditor } from "@/components/pages/cms/CmsPostEditor";
import { CmsPostsListView } from "@/components/pages/cms/CmsPostsListView";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { tenantPath } from "@/lib/utils/tenantMount";

function TenantCmsViewInner() {
  const { tenantCode } = useRouteTenant();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isNew = searchParams.get("new") === "1";
  const basePath = tenantPath(tenantCode, "content");

  if (isNew) {
    return <CmsPostEditor basePath={basePath} />;
  }

  if (editId) {
    return <CmsPostEditor postId={editId} basePath={basePath} />;
  }

  return (
    <CmsPostsListView
      basePath={basePath}
      title="Content"
      subtitle={`Manage public content for ${tenantCode}`}
    />
  );
}

export function TenantCmsView() {
  return (
    <Suspense
      fallback={
        <div className="hq6-page p-4 text-sm text-[#64748b]">Loading content…</div>
      }
    >
      <TenantCmsViewInner />
    </Suspense>
  );
}
