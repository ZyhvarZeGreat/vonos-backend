"use client";

import { useParams } from "next/navigation";
import { isTenantCode } from "@/lib/registries/tenants";
import { TenantOverviewView } from "@/components/pages/TenantOverviewView";
import { WarehouseOverviewView } from "@/components/pages/WarehouseOverviewView";

export default function TenantOverviewPage() {
  const params = useParams<{ tenant: string }>();

  if (!isTenantCode(params.tenant)) {
    return null;
  }

  if (params.tenant === "VW") {
    return <WarehouseOverviewView />;
  }

  return <TenantOverviewView tenantCode={params.tenant} />;
}
