"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Button } from "@/components/atoms/Button";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { cn } from "@/lib/utils/cn";

export interface RecordViewModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Optional deep-link for users who need the full detail page. */
  fullPageHref?: string;
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  panelClassName?: string;
  /** Show Back in the header (returns via onBack / onClose). */
  showBack?: boolean;
  onBack?: () => void;
}

function RecordViewBody({
  isLoading,
  error,
  children,
  hq6,
}: {
  isLoading: boolean;
  error: string | null;
  children: ReactNode;
  hq6: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-2" aria-busy aria-label="Loading record">
        <div
          className={cn(
            "h-4 w-2/5 animate-pulse rounded",
            hq6 ? "bg-gray-200" : "bg-[var(--color-surface-muted)]",
          )}
        />
        <div
          className={cn(
            "h-3 w-full animate-pulse rounded",
            hq6 ? "bg-gray-200" : "bg-[var(--color-surface-muted)]",
          )}
        />
        <div
          className={cn(
            "h-3 w-11/12 animate-pulse rounded",
            hq6 ? "bg-gray-200" : "bg-[var(--color-surface-muted)]",
          )}
        />
        <div
          className={cn(
            "mt-4 h-40 w-full animate-pulse rounded-lg",
            hq6 ? "bg-gray-100" : "bg-[var(--color-surface-muted)]",
          )}
        />
        <p
          className={cn(
            "pt-2 text-center text-sm",
            hq6 ? "text-[#6b7280]" : "text-muted",
          )}
        >
          Loading…
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <p
        className={cn(
          "py-8 text-center text-sm",
          hq6 ? "text-[#dc2626]" : "text-error",
        )}
      >
        {error}
      </p>
    );
  }
  return <>{children}</>;
}

function RecordViewFooter({
  fullPageHref,
  onClose,
  hq6,
}: {
  fullPageHref?: string;
  onClose: () => void;
  hq6: boolean;
}) {
  if (hq6) {
    return (
      <>
        {fullPageHref ? (
          <a
            href={fullPageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hq6-modal-btn hq6-modal-btn-view"
          >
            <ExternalLink className="mr-1.5 inline h-4 w-4" />
            Open full page
          </a>
        ) : null}
        <button
          type="button"
          className="hq6-modal-btn hq6-modal-btn-close"
          onClick={onClose}
        >
          Close
        </button>
      </>
    );
  }

  return (
    <ModalFooter>
      {fullPageHref ? (
        <a
          href={fullPageHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-[var(--color-surface-muted)]"
        >
          <ExternalLink className="mr-1.5 h-4 w-4" />
          Open full page
        </a>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onClose}>
        Close
      </Button>
    </ModalFooter>
  );
}

export function RecordViewModal({
  open,
  title,
  subtitle,
  onClose,
  fullPageHref,
  children,
  footer,
  isLoading = false,
  error = null,
  panelClassName,
  showBack = false,
  onBack,
}: RecordViewModalProps) {
  const isHq6 = useIsVaHq6();

  if (isHq6) {
    return (
      <Hq6Modal
        open={open}
        onClose={onClose}
        title={subtitle ? `${title} — ${subtitle}` : title}
        size="lg"
        className={panelClassName}
        showBack={showBack}
        onBack={onBack ?? onClose}
        footer={
          footer ?? (
            <RecordViewFooter
              fullPageHref={fullPageHref}
              onClose={onClose}
              hq6
            />
          )
        }
      >
        <RecordViewBody isLoading={isLoading} error={error} hq6>
          {children}
        </RecordViewBody>
      </Hq6Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      panelClassName={cn("max-w-3xl", panelClassName)}
    >
      <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
      <div className="max-h-[min(70vh,640px)] overflow-y-auto border-t border-border px-4 py-4">
        <RecordViewBody isLoading={isLoading} error={error} hq6={false}>
          {children}
        </RecordViewBody>
      </div>
      {footer ?? (
        <RecordViewFooter
          fullPageHref={fullPageHref}
          onClose={onClose}
          hq6={false}
        />
      )}
    </Modal>
  );
}
