"use client";

import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { useMutationBusyStore } from "@/stores/mutationBusyStore";
import { useNavigationBusyStore } from "@/stores/navigationBusyStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

/**
 * Top-of-viewport progress for route transitions, entity switches,
 * and React Query fetches. Writes use MutationProgressBar.
 */
export function TopProgressBar({ className }: { className?: string }) {
  /** Ignore modal/detail fetches that already show local Loading N% UI. */
  const fetching = useIsFetching({
    predicate: (query) => {
      const key = query.queryKey[0];
      if (typeof key !== "string") return true;
      return (
        key !== "sale-view" &&
        key !== "sale-view-payments" &&
        key !== "invoice-settings" &&
        key !== "purchase-view" &&
        key !== "customer-view" &&
        key !== "item-modal" &&
        key !== "job-modal" &&
        key !== "expense-modal" &&
        key !== "movement-modal" &&
        key !== "requisition-modal"
      );
    },
  });
  const writeBusy = useMutationBusyStore(
    (s) => s.pendingCount > 0 || s.finishing,
  );
  const navPending = useNavigationBusyStore((s) => s.pending);
  const navPercent = useNavigationBusyStore((s) => s.percent);
  const entitySwitch = useUiStore((s) => s.entitySwitch);
  const [fetchPercent, setFetchPercent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fetchingActive, setFetchingActive] = useState(false);

  const entityBusy = Boolean(entitySwitch);
  const readBusy =
    navPending || fetching > 0 || fetchingActive || entityBusy;
  const active = !writeBusy && readBusy;

  useEffect(() => {
    if (fetching > 0) {
      setFetchingActive(true);
      setFetchPercent(0);
      const tick = setInterval(() => {
        setFetchPercent((p) => {
          const gap = 90 - p;
          return Math.min(90, p + Math.max(0.8, gap * 0.12));
        });
      }, 80);
      return () => clearInterval(tick);
    }
    if (fetchingActive) {
      setFetchPercent(100);
      const t = setTimeout(() => {
        setFetchingActive(false);
        setFetchPercent(0);
      }, 280);
      return () => clearTimeout(t);
    }
  }, [fetching, fetchingActive]);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 220);
    return () => clearTimeout(t);
  }, [active]);

  if ((!visible && !active) || writeBusy) return null;

  const percent = navPending
    ? navPercent
    : entityBusy && fetching === 0 && !fetchingActive
      ? Math.min(90, Math.max(navPercent, 35))
      : fetchingActive || fetching > 0
        ? fetchPercent
        : navPercent > 0
          ? navPercent
          : entityBusy
            ? 40
            : 0;
  const display = Math.round(Math.min(100, Math.max(0, percent)));
  /** Floating pill only for entity switch — table/print use local "Loading N%" UI. */
  const showFloatingLabel = Boolean(entitySwitch);
  const label = entitySwitch
    ? `Loading ${entitySwitch.name}`
    : "Loading";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[199] transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div
        className="h-1 w-full overflow-hidden bg-black/5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={display}
        aria-valuetext={active ? `${label} ${display}%` : undefined}
        aria-hidden={!active}
      >
        <div
          className="h-full bg-[var(--color-brand-primary,#2563eb)] transition-[width] duration-100 ease-out"
          style={{ width: `${display}%` }}
        />
      </div>
      {showFloatingLabel ? (
        <div className="absolute right-3 top-2 rounded-md bg-[var(--color-brand-primary,#2563eb)] px-2.5 py-1 text-xs font-semibold tabular-nums text-white shadow-md">
          {label} {display}%
        </div>
      ) : null}
    </div>
  );
}
