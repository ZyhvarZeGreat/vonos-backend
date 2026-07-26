"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Ultimate POS filters card — components/filters.blade.php (fa-filter link).
 * Avoid Bootstrap's `collapse` class name — Tailwind maps it to
 * `visibility: collapse`, which hides open filter bodies.
 */
export function UposFiltersPanel({
  title = "Filters",
  defaultOpen = true,
  children,
}: {
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const reactId = useId().replace(/:/g, "");
  const filterId = `collapseFilter_${reactId}`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="tw-transition-all tw-mb-4 lg:tw-col-span-1 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
      <div
        className="box-header with-border"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={filterId}
      >
        <h3 className="box-title tw-pt-2 tw-pb-2 tw-pl-2">
          <a
            href={`#${filterId}`}
            onClick={(e) => e.preventDefault()}
          >
            <i className="fa fa-filter" aria-hidden /> {title}
          </a>
        </h3>
      </div>
      <div
        id={filterId}
        className="upos-filters-body tw-pt-4 tw-pb-4"
        aria-expanded={open}
        hidden={!open}
        style={{ display: open ? "block" : "none" }}
      >
        <div className="box-body">{children}</div>
      </div>
    </div>
  );
}
