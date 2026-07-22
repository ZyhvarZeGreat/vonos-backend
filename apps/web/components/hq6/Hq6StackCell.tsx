"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Multi-line primary cell (HQ6 Name / Customer name columns). */
export function Hq6StackCell({
  primary,
  secondary,
  tertiary,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("leading-snug", className)}>
      <div className="text-[#111827]">{primary}</div>
      {secondary ? (
        <div className="text-[0.75rem] text-[#6b7280]">{secondary}</div>
      ) : null}
      {tertiary ? (
        <div className="text-[0.75rem] text-[#9ca3af]">{tertiary}</div>
      ) : null}
    </div>
  );
}
