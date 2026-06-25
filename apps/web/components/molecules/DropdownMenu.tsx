"use client";

import { useEffect, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((current) => !current)}>{trigger}</div>
      {open ? (
        <div
          className={cn(
            "absolute z-40 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card py-0.5 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
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
        </div>
      ) : null}
    </div>
  );
}
