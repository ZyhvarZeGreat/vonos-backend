"use client";

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

type Align = "start" | "end";

/** Above HQ6 sidebar (1000); stay below modal roots that use z-index 2000+. */
const FLOATING_MENU_Z = 1100;

function menuPosition(anchor: HTMLElement, align: Align): CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const estimatedMenuHeight = 320;
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const openUpward =
    spaceBelow < Math.min(160, estimatedMenuHeight) && rect.top > spaceBelow;

  const maxHeight = openUpward
    ? Math.max(120, rect.top - gap - 8)
    : Math.max(120, window.innerHeight - rect.bottom - gap - 8);

  const vertical = openUpward
    ? { bottom: window.innerHeight - rect.top + gap }
    : { top: rect.bottom + gap };

  if (align === "end") {
    return {
      position: "fixed",
      ...vertical,
      left: rect.right,
      transform: "translateX(-100%)",
      zIndex: FLOATING_MENU_Z,
      visibility: "visible" as const,
      maxHeight,
      ["--vonos-floating-max-h" as string]: `${maxHeight}px`,
    };
  }

  return {
    position: "fixed",
    ...vertical,
    left: Math.min(rect.left, window.innerWidth - 16),
    zIndex: FLOATING_MENU_Z,
    visibility: "visible" as const,
    maxHeight,
    ["--vonos-floating-max-h" as string]: `${maxHeight}px`,
  };
}

export interface FloatingMenuPanelProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef?: RefObject<HTMLDivElement | null>;
  align?: Align;
  className?: string;
  children: ReactNode;
}

/** Renders dropdown panels in a portal so they escape overflow-hidden shells. */
export function FloatingMenuPanel({
  open,
  anchorRef,
  menuRef,
  align = "start",
  className,
  children,
}: FloatingMenuPanelProps) {
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    zIndex: FLOATING_MENU_Z,
    visibility: "hidden",
    top: 0,
    left: 0,
  });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      if (!anchorRef.current) return;
      setStyle(menuPosition(anchorRef.current, align));
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, align, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-vonos-floating-menu=""
      style={style}
      className={cn("vonos-floating-menu", className)}
    >
      <div className="motion-pop-in">{children}</div>
    </div>,
    document.body,
  );
}
