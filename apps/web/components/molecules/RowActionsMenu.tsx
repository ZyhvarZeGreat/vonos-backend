"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import { cn } from "@/lib/utils/cn";

export interface RowAction {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface RowActionsMenuProps {
  actions: RowAction[];
  className?: string;
}

export function RowActionsMenu({ actions, className }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={anchorRef} className={cn("relative text-right", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        align="end"
        className="min-w-[10rem] rounded-md border border-border bg-card py-1 shadow-lg"
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={cn(
              "block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--color-surface-muted)]",
              action.destructive && "text-red-600",
            )}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              action.onClick();
            }}
          >
            {action.label}
          </button>
        ))}
      </FloatingMenuPanel>
    </div>
  );
}
