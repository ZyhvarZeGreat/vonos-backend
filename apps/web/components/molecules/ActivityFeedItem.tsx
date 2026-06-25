import type { IconComponent } from "@/lib/utils/icons";
import { cn } from "@/lib/utils/cn";

export interface ActivityFeedItemProps {
  title: string;
  description: string;
  timestamp: string;
  icon?: IconComponent;
  className?: string;
}

export function ActivityFeedItem({
  title,
  description,
  timestamp,
  icon: Icon,
  className,
}: ActivityFeedItemProps) {
  return (
    <div className={cn("flex gap-4 border-t border-[var(--color-border-subtle)] pt-6 first:border-0 first:pt-0", className)}>
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-accent)] text-white shadow-sm">
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </div>
      <div className="flex flex-1 items-start justify-between pt-0.5">
        <div>
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        <span className="text-sm text-muted">{timestamp}</span>
      </div>
    </div>
  );
}
