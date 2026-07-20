"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/atoms/Spinner";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { cn } from "@/lib/utils/cn";
import { type EntitySwitchTarget, useUiStore } from "@/stores/uiStore";

const MIN_VISIBLE_MS = 450;
const SWITCH_TIMEOUT_MS = 12_000;

function hasReachedSwitchTarget(pathname: string, target: EntitySwitchTarget): boolean {
  if (target.code === "VAG") {
    return pathname === target.href || pathname.startsWith(`${target.href}/`);
  }
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment === target.code;
}

export function EntitySwitchIndicator() {
  const pathname = usePathname();
  const entitySwitch = useUiStore((state) => state.entitySwitch);
  const clearEntitySwitch = useUiStore((state) => state.clearEntitySwitch);

  useEffect(() => {
    if (!entitySwitch) return;

    if (!hasReachedSwitchTarget(pathname, entitySwitch)) return;

    const elapsed = Date.now() - entitySwitch.startedAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(clearEntitySwitch, remaining);
    return () => window.clearTimeout(timer);
  }, [pathname, entitySwitch, clearEntitySwitch]);

  useEffect(() => {
    if (!entitySwitch) return;

    const timer = window.setTimeout(clearEntitySwitch, SWITCH_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [entitySwitch, clearEntitySwitch]);

  if (!entitySwitch) return null;

  const Icon = iconForTenantCode(entitySwitch.code);
  const accent = accentForTenantCode(entitySwitch.code);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center px-4 pt-3"
      role="status"
      aria-live="polite"
      aria-label={`Switching to ${entitySwitch.name}`}
    >
      <div
        className={cn(
          "motion-pop-in flex max-w-md items-center gap-3 rounded-full border border-border",
          "bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-sm",
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            Switching to {entitySwitch.name}
          </p>
          <p className="text-xs text-muted">{entitySwitch.code}</p>
        </div>
        <Spinner size="sm" className="shrink-0 text-muted" />
      </div>
    </div>
  );
}
