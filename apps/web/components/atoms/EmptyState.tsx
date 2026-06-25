import type { IconComponent } from "@/lib/utils/icons";
import { Inbox } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  icon?: IconComponent;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  ctaLabel,
  onCta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-muted">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message ? <p className="mt-2 max-w-sm text-sm text-muted">{message}</p> : null}
      {ctaLabel && onCta ? (
        <Button className="mt-4" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
