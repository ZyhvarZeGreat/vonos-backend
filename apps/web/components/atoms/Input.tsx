import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
          error && "border-error focus:border-error focus:ring-error/20",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
