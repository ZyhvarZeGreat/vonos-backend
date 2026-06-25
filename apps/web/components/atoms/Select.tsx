import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export function Select({
  label,
  options,
  error,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(
          "h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
          error && "border-error",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
