"use client";

import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Button } from "@/components/atoms/Button";
import {
  StatusStepper,
  getAdvanceLabel,
  type StepperConfig,
} from "@/components/organisms/StatusStepper";
import { DetailPanelSection } from "@/components/organisms/DetailPanelSection";
import type { SectionInstance } from "@/lib/registries/sectionTypes";
import { cn } from "@/lib/utils/cn";

export type DetailLayout = "default" | "twoColumn" | "narrow";

export interface DetailPageShellProps {
  backHref: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status?: {
    label: string;
    vocabulary:
      | "stockStatus"
      | "movementStatus"
      | "jobStatus"
      | "orderStatus"
      | "appointmentStatus"
      | "saleReturnStatus";
  };
  stepper?: StepperConfig | null;
  onAdvance?: () => void;
  advanceLabel?: string;
  /** Primary action in header (e.g. job status advance). */
  headerAction?: { label: string; onClick: () => void };
  headerLeading?: React.ReactNode;
  layout?: DetailLayout;
  sections?: SectionInstance[];
  sidebarSections?: SectionInstance[];
  footer?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function DetailPageShell({
  backHref,
  backLabel = "Back to list",
  title,
  subtitle,
  meta,
  status,
  stepper,
  onAdvance,
  advanceLabel,
  headerAction,
  headerLeading,
  layout = "default",
  sections = [],
  sidebarSections = [],
  footer,
  actions,
  className,
}: DetailPageShellProps) {
  const isNarrow = layout === "narrow";
  const isTwoColumn = layout === "twoColumn";

  const headerBlock = (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {headerLeading ?? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-brand-accent)]">
              <Package className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className={cn("font-semibold text-foreground", isNarrow ? "text-2xl" : "text-xl")}>
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
            {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status ? <StatusPill status={status.label} vocabulary={status.vocabulary} /> : null}
          {headerAction ? (
            <Button onClick={headerAction.onClick}>{headerAction.label}</Button>
          ) : null}
          {actions}
        </div>
      </div>
      {stepper ? (
        <div className="mt-6 border-t border-border pt-6">
          <StatusStepper
            config={stepper}
            onAdvance={onAdvance}
            advanceLabel={advanceLabel}
            hideAdvanceButton={Boolean(headerAction)}
          />
        </div>
      ) : null}
    </div>
  );

  const mainContent =
    sections.length > 0 ? <DetailPanelSection sections={sections} /> : null;
  const sidebarContent =
    sidebarSections.length > 0 ? (
      <DetailPanelSection sections={sidebarSections} />
    ) : null;

  return (
    <div
      className={cn(
        "space-y-6",
        isNarrow && "mx-auto max-w-2xl",
        className,
      )}
    >
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {headerBlock}

      {isTwoColumn ? (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-4">{mainContent}</div>
          <div className="space-y-4">{sidebarContent}</div>
        </div>
      ) : (
        <>
          {mainContent}
          {sidebarContent}
        </>
      )}

      {footer}
    </div>
  );
}

export function getStepperHeaderAction(
  stepper: StepperConfig,
  onAdvance?: () => void,
  advanceLabel?: string,
): { label: string; onClick: () => void } | undefined {
  if (!onAdvance) return undefined;
  const currentIndex = stepper.stages.indexOf(stepper.currentStage);
  const nextStage =
    currentIndex >= 0 && currentIndex < stepper.stages.length - 1
      ? stepper.stages[currentIndex + 1]
      : null;
  if (!nextStage) return undefined;
  return {
    label: advanceLabel ?? getAdvanceLabel(stepper.currentStage, nextStage),
    onClick: onAdvance,
  };
}
