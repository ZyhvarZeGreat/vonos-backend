"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Ultimate POS widget card — box-solid + tw rounded ring shell used on report
 * summaries and DataTables (stock report, P/L columns, tax cards).
 */
export function Hq6UposCard({
  children,
  className,
  bodyClassName,
  title,
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  title?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "box-solid tw-mb-4 tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200",
        className,
      )}
    >
      <div className={cn("tw-p-2 sm:tw-p-3", bodyClassName)}>
        {title ? (
          <div className="box-header">
            <h3 className="box-title">{title}</h3>
          </div>
        ) : null}
        <div className="tw-flow-root tw-border-gray-200">
          <div className="tw-py-2 tw-align-middle sm:tw-px-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
