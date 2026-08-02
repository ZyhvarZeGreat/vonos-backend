import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onSearch?: (value: string) => void;
  showShortcut?: boolean;
  /** When true (default unless showShortcut), show an explicit Search button. */
  showSearchButton?: boolean;
}

export function SearchBar({
  className,
  onSearch,
  showShortcut = false,
  showSearchButton,
  placeholder = "Search",
  value,
  defaultValue,
  onChange,
  onKeyDown,
  ...props
}: SearchBarProps) {
  const withButton = showSearchButton ?? !showShortcut;

  return (
    <div className={cn("relative flex items-stretch", className)}>
      {!withButton ? (
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      ) : null}
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        className={cn(
          "h-10 w-full border border-border bg-card text-base text-foreground shadow-sm placeholder:text-muted focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/10",
          withButton
            ? "rounded-l-lg rounded-r-none border-r-0 px-3"
            : "rounded-lg pl-9 pr-3",
        )}
        {...props}
        onChange={(event) => {
          onChange?.(event);
          if (!withButton) onSearch?.(event.target.value);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "Enter" && withButton) {
            event.preventDefault();
            onSearch?.(event.currentTarget.value);
          }
        }}
      />
      {withButton ? (
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-r-lg border border-[#2563eb] bg-[#2563eb] px-3 text-sm font-semibold text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
          aria-label="Search"
          onClick={(event) => {
            const root = event.currentTarget.parentElement;
            const input = root?.querySelector("input");
            onSearch?.(input?.value ?? (typeof value === "string" ? value : ""));
          }}
        >
          Search
        </button>
      ) : null}
    </div>
  );
}
