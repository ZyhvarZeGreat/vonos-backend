"use client";

import { getPasswordCriteria, passwordStrengthScore } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils/cn";

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

/**
 * Live password rules + progress bar for create/reset password fields.
 */
export function PasswordStrengthMeter({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const criteria = getPasswordCriteria(password);
  const score = passwordStrengthScore(password);
  const pct = password ? (score / criteria.length) * 100 : 0;
  const label = STRENGTH_LABELS[score] ?? STRENGTH_LABELS[0];

  const barColor =
    score <= 1
      ? "#dc2626"
      : score === 2
        ? "#d97706"
        : score === 3
          ? "#2563eb"
          : "#16a34a";

  return (
    <div className={cn("tw-mt-2 tw-space-y-2", className)} aria-live="polite">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <div
          className="tw-h-1.5 tw-flex-1 tw-overflow-hidden tw-rounded-full tw-bg-[#e5e7eb]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={`Password strength: ${label}`}
        >
          <div
            className="tw-h-full tw-rounded-full tw-transition-[width] tw-duration-200"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <span
          className="tw-shrink-0 tw-text-xs tw-font-medium"
          style={{ color: password ? barColor : "#6b7280" }}
        >
          {password ? label : "Strength"}
        </span>
      </div>
      <ul className="tw-m-0 tw-list-none tw-space-y-1 tw-p-0 tw-text-xs">
        {criteria.map((c) => (
          <li
            key={c.id}
            className={cn(
              "tw-flex tw-items-center tw-gap-1.5",
              c.met ? "tw-text-[#16a34a]" : "tw-text-[#6b7280]",
            )}
          >
            <span aria-hidden>{c.met ? "✓" : "○"}</span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
