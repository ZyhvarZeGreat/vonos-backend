"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  panelClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className,
      )}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-card shadow-lg",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between px-4 py-3">
      <div>
        <h2 className="text-base font-medium tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-muted hover:bg-[var(--color-surface-muted)] hover:text-foreground"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 px-4 pb-4">{children}</div>
  );
}
