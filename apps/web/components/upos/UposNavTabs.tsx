"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface UposTab {
  id: string;
  label: string;
  iconClass?: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Ultimate POS Custom Tabs — converted from nav-tabs-custom (product/index.blade.php).
 */
export function UposNavTabs({
  tabs,
  actions,
  children,
}: {
  tabs: UposTab[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="nav-tabs-custom">
      <ul className="nav nav-tabs">
        {tabs.map((tab) => (
          <li key={tab.id} className={cn(tab.active && "active")}>
            <a
              href={`#${tab.id}`}
              aria-expanded={tab.active}
              onClick={(e) => {
                e.preventDefault();
                tab.onClick?.();
              }}
            >
              {tab.iconClass ? (
                <i className={tab.iconClass} aria-hidden />
              ) : null}{" "}
              {tab.label}
            </a>
          </li>
        ))}
        {actions ? (
          <li className="pull-right" style={{ float: "right", marginLeft: "auto" }}>
            {actions}
          </li>
        ) : null}
      </ul>
      <div className="tab-content">{children}</div>
    </div>
  );
}

export function UposGradientActionButton({
  label,
  icon = "plus",
  onClick,
  href,
}: {
  label: string;
  icon?: "plus" | "download";
  onClick?: () => void;
  href?: string;
}) {
  // Do not use AdminLTE `pull-right` here — floats escape #scrollable-container
  // and land off-screen. Parent toolbar uses flex instead (HQ6 visual position).
  const className =
    "upos-gradient-action tw-dw-btn tw-bg-gradient-to-r tw-from-indigo-600 tw-to-blue-500 tw-font-bold tw-text-white tw-border-none tw-rounded-full";

  const iconSvg =
    icon === "download" ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="icon icon-tabler icons-tabler-outline icon-tabler-download"
        aria-hidden
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
        <path d="M7 11l5 5l5 -5" />
        <path d="M12 4l0 12" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="icon icon-tabler icons-tabler-outline icon-tabler-plus"
        aria-hidden
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M12 5l0 14" />
        <path d="M5 12l14 0" />
      </svg>
    );

  if (href) {
    return (
      <Link className={className} href={href}>
        {iconSvg} {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {iconSvg} {label}
    </button>
  );
}

/** Right-aligned action row for Add / Download Excel (replaces float pull-right). */
export function UposTabPaneActions({ children }: { children: ReactNode }) {
  return <div className="upos-tab-pane-actions clearfix">{children}</div>;
}
