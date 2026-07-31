"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { completeNavigationProgress } from "@/stores/navigationBusyStore";
import { type EntitySwitchTarget, useUiStore } from "@/stores/uiStore";

const MIN_VISIBLE_MS = 450;
const SWITCH_TIMEOUT_MS = 12_000;

function hasReachedSwitchTarget(
  pathname: string,
  target: EntitySwitchTarget,
): boolean {
  if (target.code === "VAG") {
    return pathname === target.href || pathname.startsWith(`${target.href}/`);
  }
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment === target.code;
}

/**
 * Clears entity-switch busy state once the target route settles.
 * TopProgressBar renders the actual loading UI.
 */
export function EntitySwitchIndicator() {
  const pathname = usePathname();
  const entitySwitch = useUiStore((state) => state.entitySwitch);
  const clearEntitySwitch = useUiStore((state) => state.clearEntitySwitch);

  useEffect(() => {
    if (!entitySwitch) return;
    if (!hasReachedSwitchTarget(pathname, entitySwitch)) return;

    const elapsed = Date.now() - entitySwitch.startedAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(() => {
      completeNavigationProgress();
      clearEntitySwitch();
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [pathname, entitySwitch, clearEntitySwitch]);

  useEffect(() => {
    if (!entitySwitch) return;
    const timer = window.setTimeout(() => {
      completeNavigationProgress();
      clearEntitySwitch();
    }, SWITCH_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [entitySwitch, clearEntitySwitch]);

  return null;
}
