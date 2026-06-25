"use client";

import { X } from "lucide-react";
import { IconButton } from "@/components/atoms/IconButton";
import { useToastStore, type ToastType } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-success/30 bg-success-bg text-success",
  error: "border-error/30 bg-error-bg text-error",
  warning: "border-warning/30 bg-warning-bg text-warning",
  info: "border-info/30 bg-info-bg text-info",
};

export function ToastStack() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-card",
            TYPE_STYLES[item.type],
          )}
          role="status"
        >
          <p className="flex-1 text-sm font-medium text-foreground">{item.message}</p>
          <IconButton
            label="Dismiss notification"
            className="h-7 w-7 shrink-0 text-muted hover:text-foreground"
            onClick={() => dismiss(item.id)}
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
