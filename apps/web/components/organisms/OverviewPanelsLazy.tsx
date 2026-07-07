"use client";

import { useQuery } from "@tanstack/react-query";
import type { OverviewPanel } from "@vonos/types";
import { EntityOverviewPanels } from "@/components/organisms/EntityOverviewPanels";
import {
  getPurchasePaymentDuesPanel,
  getSalesPaymentDuesPanel,
  getStockAlertPanel,
} from "@/lib/api/overview";
import type { TenantCode } from "@/lib/registries/tenants";

const PANEL_STALE_MS = 5 * 60_000;

interface OverviewPanelsLazyProps {
  tenantCode: TenantCode;
  enabled?: boolean;
}

export function OverviewPanelsLazy({
  tenantCode,
  enabled = true,
}: OverviewPanelsLazyProps) {
  const stockQuery = useQuery({
    queryKey: ["overview-panel", "stock-alert"],
    queryFn: getStockAlertPanel,
    enabled,
    staleTime: PANEL_STALE_MS,
  });

  const purchaseQuery = useQuery({
    queryKey: ["overview-panel", "purchase-payment-dues"],
    queryFn: getPurchasePaymentDuesPanel,
    enabled,
    staleTime: PANEL_STALE_MS,
  });

  const salesQuery = useQuery({
    queryKey: ["overview-panel", "sales-payment-dues"],
    queryFn: getSalesPaymentDuesPanel,
    enabled,
    staleTime: PANEL_STALE_MS,
  });

  const panels: OverviewPanel[] = [
    stockQuery.data,
    purchaseQuery.data,
    salesQuery.data,
  ].filter((panel): panel is OverviewPanel => Boolean(panel));

  const anyLoading =
    stockQuery.isLoading || purchaseQuery.isLoading || salesQuery.isLoading;

  if (panels.length === 0 && anyLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }

  return <EntityOverviewPanels panels={panels} tenantCode={tenantCode} />;
}
