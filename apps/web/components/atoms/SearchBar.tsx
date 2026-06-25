import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onSearch?: (value: string) => void;
  showShortcut?: boolean;
}

export function SearchBar({
  className,
  onSearch,
  showShortcut = false,
  placeholder = "Search",
  ...props
}: SearchBarProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
      <input
        type="search"
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-base text-foreground shadow-sm placeholder:text-muted focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/10"
        onChange={(event) => onSearch?.(event.target.value)}
        {...props}
      />
      {showShortcut ? (
        <div className="pointer-events-none absolute right-3 flex items-center justify-center rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-xs font-medium text-muted">
          ⌘K
        </div>
      ) : null}
    </div>
  );
}
