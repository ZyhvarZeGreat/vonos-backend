"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Dims and blocks interaction while a CRUD mutation is running. */
export function BusyFormShell({
  busy,
  children,
  className,
}: {
  busy: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative", className)}
      aria-busy={busy || undefined}
    >
      {children}
      {busy ? (
        <div
          className="absolute inset-0 z-10 cursor-wait rounded-lg bg-card/40"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
