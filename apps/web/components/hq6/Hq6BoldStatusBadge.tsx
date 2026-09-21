"use client";

import {
  hq6BoldStatusBadgeClass,
} from "@/lib/utils/hq6PaymentBadge";
import { cn } from "@/lib/utils/cn";

export type Hq6BoldStatusBadgeProps = {
  status: string;
  /** `payment` = due/partial/paid · `payroll` = draft/final */
  kind?: "payment" | "payroll";
  className?: string;
};

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** UPOS / HQ6 bold status pill — solid green, yellow, blue; white text. */
export function Hq6BoldStatusBadge({
  status,
  kind = "payment",
  className,
}: Hq6BoldStatusBadgeProps) {
  return (
    <span className={cn(hq6BoldStatusBadgeClass(status, kind), className)}>
      {formatStatusLabel(status)}
    </span>
  );
}
