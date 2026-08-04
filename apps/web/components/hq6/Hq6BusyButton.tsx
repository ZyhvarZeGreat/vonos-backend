"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/atoms/Spinner";
import { cn } from "@/lib/utils/cn";

export type Hq6BusyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true: disable + show spinner. */
  busy?: boolean;
  /** Label while busy (defaults to children if string, else "Please wait…"). */
  busyLabel?: ReactNode;
};

/**
 * HQ6 native buttons (`hq6-btn-purple`, modal save, etc.) with write loading.
 * Prefer this over bare `<button>` + "Saving…" text for API mutations.
 */
export function Hq6BusyButton({
  busy = false,
  busyLabel,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: Hq6BusyButtonProps) {
  const label =
    busyLabel ??
    (typeof children === "string" || typeof children === "number"
      ? children
      : "Please wait…");

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? (
        <>
          <Spinner size="sm" className="text-current" />
          <span className="truncate">{label}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
