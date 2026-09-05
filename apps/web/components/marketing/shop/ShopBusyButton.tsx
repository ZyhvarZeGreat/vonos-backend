"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ShopBusyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel?: ReactNode;
};

/** Shop CTA with inline spinner while async work runs. */
export default function ShopBusyButton({
  busy = false,
  busyLabel,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ShopBusyButtonProps) {
  const label =
    busyLabel ??
    (typeof children === "string" || typeof children === "number"
      ? children
      : "Please wait…");

  return (
    <button
      type={type}
      className={`ve-shop-btn ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 className="ve-shop-lucide ve-shop-spinner" aria-hidden />
          <span>{label}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
