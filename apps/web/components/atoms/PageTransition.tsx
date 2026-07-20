"use client";

import { cn } from "@/lib/utils/cn";

/** Light page wrapper — no pathname remount so sidebar nav feels instant. */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("motion-page-in motion-page-nav", className)}>
      {children}
    </div>
  );
}
