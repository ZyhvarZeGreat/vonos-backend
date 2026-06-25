import { ActivityFeedItem } from "@/components/molecules/ActivityFeedItem";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Skeleton } from "@/components/atoms/Skeleton";
import type { IconComponent } from "@/lib/utils/icons";
import { cn } from "@/lib/utils/cn";

export interface ActivityFeedEntry {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon?: IconComponent;
}

export interface ActivityFeedPanelProps {
  title?: string;
  subtitle?: string;
  items: ActivityFeedEntry[];
  isLoading?: boolean;
  error?: string | null;
  showViewAll?: boolean;
  className?: string;
}

export function ActivityFeedPanel({
  title = "Activity Feed",
  subtitle = "Recent warehouse events and alerts",
  items,
  isLoading = false,
  error = null,
  showViewAll = true,
  className,
}: ActivityFeedPanelProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {showViewAll ? (
          <Button variant="secondary" size="sm">
            View all
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-6" aria-busy aria-label="Loading activity">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton circle className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[60%] max-w-[220px]" />
                <Skeleton className="h-3 w-full max-w-[320px]" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Unable to load activity" message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="No recent activity" message="Updates will appear here." />
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          {items.map((item) => (
            <ActivityFeedItem key={item.id} {...item} />
          ))}
        </div>
      )}
    </section>
  );
}
