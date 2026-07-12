import { Spinner } from "@/components/atoms/Spinner";
import { cn } from "@/lib/utils/cn";

export interface TableFetchingOverlayProps {
  className?: string;
  label?: string;
}

/** Semi-transparent overlay while stale rows stay visible during pagination/refetch. */
export function TableFetchingOverlay({
  className,
  label = "Updating table",
}: TableFetchingOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center bg-card/55 backdrop-blur-[1px]",
        className,
      )}
      aria-busy
      aria-label={label}
    >
      <Spinner size="md" className="text-[var(--color-brand-primary)]" />
    </div>
  );
}
