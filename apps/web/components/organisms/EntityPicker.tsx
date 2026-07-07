"use client";

import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { AUTOS_GROUP_ENTITIES, type TenantCode } from "@/lib/registries/tenants";
import { tenantOverviewPath } from "@/lib/utils/authRedirect";
import { cn } from "@/lib/utils/cn";

export function EntityPicker() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {AUTOS_GROUP_ENTITIES.map((entity) => {
        const isActive = entity.status === "active";
        const href = isActive ? tenantOverviewPath(entity.code as TenantCode) : undefined;

        const card = (
          <div
            className={cn(
              "flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors",
              isActive && "hover:border-[var(--color-brand-primary)] hover:shadow-md",
              !isActive && "opacity-60",
            )}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-foreground">
                <Package className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-medium text-muted">
                {entity.code}
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground">{entity.name}</h3>
            <p className="mt-1 text-sm text-muted capitalize">{entity.status}</p>
            {isActive ? (
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                Enter
                <ArrowRight className="h-4 w-4" />
              </span>
            ) : (
              <span className="mt-4 text-sm text-muted">Coming soon</span>
            )}
          </div>
        );

        return isActive && href ? (
          <Link key={entity.code} href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]">
            {card}
          </Link>
        ) : (
          <div key={entity.code}>{card}</div>
        );
      })}
    </div>
  );
}
