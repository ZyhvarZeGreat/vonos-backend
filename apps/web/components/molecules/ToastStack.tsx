"use client";

import { X } from "lucide-react";
import { IconButton } from "@/components/atoms/IconButton";
import { Spinner } from "@/components/atoms/Spinner";
import {
  useToastStore,
  type Toast,
  type ToastType,
} from "@/stores/toastStore";
import { useMutationBusyStore } from "@/stores/mutationBusyStore";
import { useNavigationBusyStore } from "@/stores/navigationBusyStore";
import { cn } from "@/lib/utils/cn";

const TYPE_STYLES: Record<Exclude<ToastType, "progress">, string> = {
  success: "border-success/30 bg-success-bg text-success",
  error: "border-error/30 bg-error-bg text-error",
  warning: "border-warning/30 bg-warning-bg text-warning",
  info: "border-info/30 bg-info-bg text-info",
};

function ProgressToastBody({ item }: { item: Toast }) {
  const navPercent = useNavigationBusyStore((s) => s.percent);
  const mutationPercent = useMutationBusyStore((s) => s.percent);
  const percent =
    item.source === "navigation"
      ? navPercent
      : item.source === "mutation"
        ? mutationPercent
        : (item.percent ?? 0);
  const display = Math.round(Math.min(100, Math.max(0, percent)));

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-start gap-3">
        <Spinner size="sm" className="mt-0.5 shrink-0 text-info" />
        <p className="flex-1 text-sm font-medium text-foreground">
          {item.message}
        </p>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
          {display}%
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-border/80"
        role="progressbar"
        aria-valuenow={display}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={item.message}
      >
        <div
          className="h-full rounded-full bg-info transition-[width] duration-100 ease-out"
          style={{ width: `${Math.max(display, display > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export function ToastStack() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[220] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => {
        if (item.type === "progress") {
          return (
            <div
              key={item.id}
              className="pointer-events-auto rounded-lg border border-info/30 bg-info-bg px-4 py-3 shadow-card"
              role="status"
              aria-live="polite"
              aria-busy
            >
              <ProgressToastBody item={item} />
            </div>
          );
        }

        const assertive = item.type === "error" || item.type === "warning";
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-card",
              TYPE_STYLES[item.type],
            )}
            role={assertive ? "alert" : "status"}
            aria-live={assertive ? "assertive" : "polite"}
          >
            <p className="flex-1 text-sm font-medium text-foreground">
              {item.message}
            </p>
            <IconButton
              label="Dismiss notification"
              className="h-7 w-7 shrink-0 text-muted hover:text-foreground"
              onClick={() => dismiss(item.id)}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
