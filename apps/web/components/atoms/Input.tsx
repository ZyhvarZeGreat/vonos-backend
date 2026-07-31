import { cn } from "@/lib/utils/cn";
import { RequiredMark } from "@/components/atoms/RequiredMark";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className,
  id,
  required,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <>
              {" "}
              <RequiredMark />
            </>
          ) : null}
        </label>
      ) : null}
      <input
        id={inputId}
        required={required}
        className={cn(
          "h-[34px] rounded border border-border bg-card px-3 py-1.5 text-sm leading-normal text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
          error && "border-error focus:border-error focus:ring-error/20",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
