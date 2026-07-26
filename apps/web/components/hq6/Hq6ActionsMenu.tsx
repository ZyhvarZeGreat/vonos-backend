"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import { hq6ActionIcon } from "@/lib/utils/hq6ActionIcon";
import { cn } from "@/lib/utils/cn";

export interface Hq6ActionItem {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Optional leading icon (lucide node). Falls back to id-based default. */
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
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
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
    <div ref={anchorRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-info hq6-actions-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {label}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      </button>
      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        align="start"
        className="hq6-actions-menu hq6-actions-menu-portal overflow-auto"
      >
        <ul
          id={menuId}
          role="menu"
          className="m-0 list-none p-0"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => {
            const leadingIcon = item.icon ?? hq6ActionIcon(item.id);
            return (
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
                  {leadingIcon ? (
                    <span className="hq6-actions-menu-icon" aria-hidden>
                      {leadingIcon}
                    </span>
                  ) : null}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </FloatingMenuPanel>
    </div>
  );
}

export function Hq6ActionsCell({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}
