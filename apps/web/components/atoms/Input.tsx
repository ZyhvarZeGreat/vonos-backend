import { cn } from "@/lib/utils/cn";
import { RequiredMark } from "@/components/atoms/RequiredMark";
import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";

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
  type,
  value,
  onChange,
  disabled,
  name,
  autoFocus,
  placeholder,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const dateMode =
    type === "datetime-local"
      ? ("datetime" as const)
      : type === "date"
        ? ("date" as const)
        : null;

  const fieldClass = cn(
    "h-[34px] rounded border border-border bg-card px-3 py-1.5 text-sm leading-normal text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
    error && "border-error focus:border-error focus:ring-error/20",
    className,
  );

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
      {dateMode ? (
        <Hq6DateTimeInput
          id={inputId}
          name={name}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          mode={dateMode}
          className={fieldClass}
          placeholder={placeholder}
          value={value == null ? "" : String(value)}
          onChange={(iso) => {
            if (!onChange) return;
            onChange({
              target: { value: iso },
              currentTarget: { value: iso },
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={fieldClass}
          {...props}
        />
      )}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
