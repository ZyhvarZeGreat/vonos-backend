import {
  getStatusTone,
  type StatusVocabulary,
} from "@/lib/registries/statusVocabularies";
import { cn } from "@/lib/utils/cn";

export interface StatusPillProps {
  status: string;
  vocabulary: StatusVocabulary;
  className?: string;
}

/** home.jsx uses rounded-md pills e.g. bg-emerald-100 text-emerald-700 */
const toneClasses = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  error: "bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  neutral: "bg-[var(--color-neutral-bg)] text-[var(--color-neutral)]",
} as const;

export function StatusPill({ status, vocabulary, className }: StatusPillProps) {
  const tone = getStatusTone(vocabulary, status);
  const label =
    vocabulary === "stockStatus"
      ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium capitalize",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
