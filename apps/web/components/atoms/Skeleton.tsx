import { cn } from "@/lib/utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Renders a circle (avatars, icons). */
  circle?: boolean;
}

export function Skeleton({ className, circle = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--color-surface-muted)]",
        circle ? "rounded-full" : "rounded-md",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}
