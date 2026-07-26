"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Ultimate POS / HQ6 inline row actions (Edit / View / Delete outline pills). */
export type Hq6InlineActionTone = "primary" | "info" | "error" | "success" | "warning";

export interface Hq6InlineAction {
  id: string;
  label: string;
  tone?: Hq6InlineActionTone;
  onClick: () => void;
  href?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

function DefaultIcon({ tone }: { tone: Hq6InlineActionTone }) {
  if (tone === "error") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="hq6-inline-action-icon" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
        <path d="M9 7v-2a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v2" />
      </svg>
    );
  }
  if (tone === "info") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="hq6-inline-action-icon" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
        <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
      </svg>
    );
  }
  // edit / primary
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="hq6-inline-action-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
      <path d="M16 5l3 3" />
    </svg>
  );
}

export function Hq6InlineActions({
  actions,
  className,
}: {
  actions: Hq6InlineAction[];
  className?: string;
}) {
  return (
    <div
      className={cn("hq6-inline-actions", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {actions.map((action) => {
        const tone = action.tone ?? "primary";
        const classNameBtn = cn(
          "tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline",
          tone === "primary" && "tw-dw-btn-primary",
          tone === "info" && "tw-dw-btn-info",
          tone === "error" && "tw-dw-btn-error",
          tone === "success" && "tw-dw-btn-success",
          tone === "warning" && "tw-dw-btn-warning",
        );
        const icon = action.icon ?? <DefaultIcon tone={tone} />;
        if (action.href) {
          return (
            <a
              key={action.id}
              href={action.href}
              className={classNameBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!action.disabled) action.onClick();
              }}
            >
              {icon} {action.label}
            </a>
          );
        }
        return (
          <button
            key={action.id}
            type="button"
            className={classNameBtn}
            disabled={action.disabled}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            {icon} {action.label}
          </button>
        );
      })}
    </div>
  );
}
