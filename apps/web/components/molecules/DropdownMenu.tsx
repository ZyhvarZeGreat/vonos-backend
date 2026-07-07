"use client";

import { useEffect, useRef, useState } from "react";
import { FloatingMenuPanel } from "@/components/molecules/FloatingMenuPanel";
import { cn } from "@/lib/utils/cn";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenu({
  trigger,
  options,
  value,
  onSelect,
  align = "start",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={anchorRef} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((current) => !current)}>{trigger}</div>
      <FloatingMenuPanel
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        align={align}
        className="min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card py-0.5 shadow-lg"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex w-full px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-[var(--color-surface-muted)]",
              value === option.value && "bg-[var(--color-surface-muted)]",
            )}
            onClick={() => {
              onSelect(option.value);
              setOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </FloatingMenuPanel>
    </div>
  );
}
