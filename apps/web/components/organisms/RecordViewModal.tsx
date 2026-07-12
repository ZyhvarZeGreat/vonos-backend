"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Button } from "@/components/atoms/Button";
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
}: RecordViewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      panelClassName={cn("max-w-3xl", panelClassName)}
    >
      <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
      <div className="max-h-[min(70vh,640px)] overflow-y-auto border-t border-border px-4 py-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-error">{error}</p>
        ) : (
          children
        )}
      </div>
      {footer ?? (
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
      )}
    </Modal>
  );
}
