"use client";

import { Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface NotificationListItem {
  id: string;
  message: string;
  timeAgo: string;
  read?: boolean;
}

export interface NotificationPanelProps {
  open: boolean;
  items: NotificationListItem[];
  onItemClick?: (id: string) => void;
  className?: string;
}

export function NotificationPanel({
  open,
  items,
  onItemClick,
  className,
}: NotificationPanelProps) {
  if (!open) return null;

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div
      className={cn(
        "absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,26rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg",
        className,
      )}
    >
      <div className="flex h-[54px] items-center justify-between border-b border-[var(--color-border-subtle)] px-4">
        <p className="font-heading text-base font-medium text-foreground">Notifications</p>
        <button
          type="button"
          className="text-muted hover:text-foreground"
          aria-label="Notification settings"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto border-b border-[var(--color-border-subtle)] px-4">
        <button
          type="button"
          className="shrink-0 border-b-2 border-foreground py-2.5 text-xs font-medium text-foreground"
        >
          Inbox ({unreadCount})
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No notifications</p>
        ) : (
          items.map((item, index) => (
            <div key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-nav-hover)]",
                  !item.read && "bg-[var(--color-surface-muted)]/50",
                )}
                onClick={() => onItemClick?.(item.id)}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-error text-[10px] font-bold text-white">
                  V
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted">{item.timeAgo}</p>
                </div>
              </button>
              {index < items.length - 1 ? (
                <div className="mx-4 h-px bg-[var(--color-border-subtle)]" />
              ) : null}
            </div>
          ))
        )}
      </div>
      <p className="border-t border-[var(--color-border-subtle)] px-4 py-3 text-center text-xs text-foreground">
        Your notifications will be kept for 9 months
      </p>
    </div>
  );
}
