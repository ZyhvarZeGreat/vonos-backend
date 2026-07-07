"use client";

import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";

export interface EntityContextBannerProps {
  module: string;
  description?: string;
}

export function EntityContextBanner({ module, description }: EntityContextBannerProps) {
  const { tenantCode, tenantName } = useRouteTenant();
  if (!tenantCode) return null;

  const accent = accentForTenantCode(tenantCode);

  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-3 shadow-card"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EntityColorBadge code={tenantCode} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{module}</span>
      </div>
      <p className="mt-2 text-sm text-foreground">
        <span className="font-medium">{tenantName ?? tenantCode}</span>
        {description ? (
          <span className="text-muted"> — {description}</span>
        ) : (
          <span className="text-muted"> — color-coded reporting for this business unit.</span>
        )}
      </p>
    </div>
  );
}
