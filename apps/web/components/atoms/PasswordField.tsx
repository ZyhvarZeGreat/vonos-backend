"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PasswordStrengthMeter } from "@/components/atoms/PasswordStrengthMeter";
import { cn } from "@/lib/utils/cn";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  requiredMark?: boolean;
  /** Show live strength meter under the field. */
  showStrength?: boolean;
  /** Wrapper class (form-group / field). */
  className?: string;
  /** Input class — defaults to form-control for HQ6. */
  inputClassName?: string;
  error?: string | null;
  hint?: string;
};

/**
 * Password input with eye toggle docked inside the field.
 * Inline styles keep the toggle aligned even when Tailwind is absent (UPOS/HQ6 CSS).
 */
export function PasswordField({
  label,
  requiredMark,
  showStrength = false,
  className,
  inputClassName = "form-control",
  error,
  hint,
  id,
  value,
  style,
  ...inputProps
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const passwordValue = typeof value === "string" ? value : "";

  return (
    <div className={className} style={{ width: "100%" }}>
      {label ? (
        <label htmlFor={id}>
          {label}
          {requiredMark ? <span className="req">*</span> : null}
        </label>
      ) : null}
      <div
        style={{
          position: "relative",
          display: "block",
          width: "100%",
        }}
      >
        <input
          {...inputProps}
          id={id}
          type={show ? "text" : "password"}
          value={value}
          className={cn(inputClassName)}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            paddingRight: "2.75rem",
            ...(typeof style === "object" && style ? style : {}),
          }}
          autoComplete={inputProps.autoComplete ?? "new-password"}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            // Avoid blur→toggle races that flip visibility twice.
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShow((prev) => !prev);
          }}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: 0,
            background: "transparent",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            color: "#6b7280",
            zIndex: 2,
          }}
        >
          {show ? (
            <EyeOff style={{ width: 16, height: 16 }} aria-hidden />
          ) : (
            <Eye style={{ width: 16, height: 16 }} aria-hidden />
          )}
        </button>
      </div>
      {showStrength ? <PasswordStrengthMeter password={passwordValue} /> : null}
      {hint && !error ? <p className="help-block">{hint}</p> : null}
      {error ? (
        <p className="help-block" style={{ color: "#dc2626" }} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
