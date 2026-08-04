"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { cn } from "@/lib/utils/cn";

export interface Hq6ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  bodyClassName?: string;
  /**
   * Optional back control (reports / deep links). Defaults to onClose when
   * `showBack` is true and `onBack` is omitted.
   */
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** Hide title bar (still shows close / use for alert-style dialogs). */
  hideHeader?: boolean;
}

const SIZE_CLASS: Record<NonNullable<Hq6ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

function subscribeNoop() {
  return () => undefined;
}

/** True on client from the first paint — no useEffect frame delay before portal. */
function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function Hq6Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
  showBack = false,
  onBack,
  backLabel = "Back",
  hideHeader = false,
}: Hq6ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const handleBack = onBack ?? onClose;

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

  if (!open || !isClient) return null;

  return createPortal(
    <div
      className={cn(
        "hq6-modal-root fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4",
        className,
      )}
      data-hq6="true"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      <button
        type="button"
        className="hq6-modal-backdrop fixed inset-0"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          "hq6-modal-panel relative z-10 my-auto w-full overflow-hidden",
          SIZE_CLASS[size],
        )}
      >
        {hideHeader ? (
          <button
            type="button"
            className="hq6-modal-close absolute right-3 top-3 z-20"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <div className="hq6-modal-header">
            <div className="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-2">
              {showBack ? (
                <button
                  type="button"
                  className="hq6-modal-btn hq6-modal-btn-close tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1"
                  onClick={handleBack}
                  aria-label={backLabel}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="tw-hidden sm:tw-inline">{backLabel}</span>
                </button>
              ) : null}
              <h4 className="hq6-modal-title tw-min-w-0 tw-truncate">{title}</h4>
            </div>
            <button
              type="button"
              className="hq6-modal-close"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={cn("hq6-modal-body", bodyClassName)}>{children}</div>
        {footer ? <div className="hq6-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Hq6ModalSaveClose({
  onSave,
  onClose,
  saveLabel = "Save",
  closeLabel = "Close",
  saving = false,
  saveDisabled = false,
  savingLabel = "Saving…",
}: {
  onSave?: () => void;
  onClose: () => void;
  saveLabel?: string;
  closeLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  savingLabel?: string;
}) {
  return (
    <>
      {onSave ? (
        <Hq6BusyButton
          className="hq6-modal-btn hq6-modal-btn-save"
          busy={saving}
          busyLabel={savingLabel}
          disabled={saveDisabled}
          onClick={onSave}
        >
          {saveLabel}
        </Hq6BusyButton>
      ) : null}
      <button
        type="button"
        className="hq6-modal-btn hq6-modal-btn-close"
        disabled={saving}
        onClick={onClose}
      >
        {closeLabel}
      </button>
    </>
  );
}

export function Hq6Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("hq6-modal-field", className)}>
      <span>
        {label}
        {required ? ":*" : ":"}
        {hint}
      </span>
      {children}
    </label>
  );
}
