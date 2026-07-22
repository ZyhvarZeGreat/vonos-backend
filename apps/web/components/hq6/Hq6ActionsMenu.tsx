"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Hq6ActionItem {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Optional leading icon (lucide node). */
  icon?: ReactNode;
  /** Render a separator line before this item. */
  dividerBefore?: boolean;
}

export function Hq6ActionsMenu({
  items,
  label = "Actions",
  className,
}: {
  items: Hq6ActionItem[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        className="hq6-actions-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="hq6-actions-menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <li key={item.id} role="none">
              {item.dividerBefore ? (
                <div className="hq6-actions-menu-divider" role="separator" />
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(
                  "hq6-actions-menu-item",
                  item.danger && "hq6-actions-menu-item-danger",
                )}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon ? (
                  <span className="hq6-actions-menu-icon" aria-hidden>
                    {item.icon}
                  </span>
                ) : null}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Hq6ActionsCell({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}
