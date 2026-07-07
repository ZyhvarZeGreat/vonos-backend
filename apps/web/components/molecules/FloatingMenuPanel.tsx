"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type Align = "start" | "end";

function menuPosition(anchor: HTMLElement, align: Align): CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const gap = 4;

  if (align === "end") {
    return {
      position: "fixed",
      top: rect.bottom + gap,
      left: rect.right,
      transform: "translateX(-100%)",
      zIndex: 50,
    };
  }

  return {
    position: "fixed",
    top: rect.bottom + gap,
    left: rect.left,
    zIndex: 50,
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

/** Renders dropdown panels in a portal so they escape overflow-hidden table shells. */
export function FloatingMenuPanel({
  open,
  anchorRef,
  menuRef,
  align = "start",
  className,
  children,
}: FloatingMenuPanelProps) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
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
    <div ref={menuRef} style={style} className={className}>
      {children}
    </div>,
    document.body,
  );
}
