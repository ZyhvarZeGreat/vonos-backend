"use client";

import { useParams } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ReportRunView } from "@/components/pages/ReportRunView";
import { resolveHq6ReportRegistrySlug } from "@/lib/registries/hq6ReportRoutes";

/**
 * HQ6-style nested report URLs: `/VA/reports/profit-loss`, `/VA/reports/tax`, …
 * Maps path segment → registry slug used by ReportRunView.
 */
export default function TenantHq6ReportPage() {
  const params = useParams<{ tenant: string; reportSlug: string }>();
  const registrySlug = resolveHq6ReportRegistrySlug(params.reportSlug ?? "");

  if (!registrySlug) {
    return (
      <EmptyState
        title="Report not found"
        message="This report is not available."
      />
    );
  }

  return <ReportRunView slug={registrySlug} />;
}
