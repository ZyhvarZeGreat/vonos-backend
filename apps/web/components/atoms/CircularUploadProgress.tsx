"use client";

import { cn } from "@/lib/utils/cn";

type CircularUploadProgressProps = {
  /** 0–100. When indeterminate (preparing), pass null. */
  progress: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Show percent text in the center (Apple install shows ring only; we show %). */
  showLabel?: boolean;
};

/**
 * Apple “Installing…” style circular progress ring — white stroke on a
 * dimmed overlay, used over product image previews while uploading.
 */
export function CircularUploadProgress({
  progress,
  size = 56,
  strokeWidth = 3.5,
  className,
  showLabel = true,
}: CircularUploadProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const indeterminate = progress == null;
  const clamped = indeterminate
    ? 0
    : Math.max(0, Math.min(100, progress));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      aria-label={
        indeterminate
          ? "Preparing upload"
          : `Uploading ${Math.round(clamped)} percent`
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(indeterminate && "animate-spin")}
        style={indeterminate ? { animationDuration: "1.1s" } : undefined}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={
            indeterminate
              ? `${circumference * 0.22} ${circumference}`
              : circumference
          }
          strokeDashoffset={indeterminate ? 0 : dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: indeterminate
              ? undefined
              : "stroke-dashoffset 180ms ease-out",
          }}
        />
      </svg>
      {showLabel && !indeterminate ? (
        <span
          className="pointer-events-none absolute text-[11px] font-semibold tabular-nums tracking-tight text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
        >
          {Math.round(clamped)}
        </span>
      ) : null}
    </div>
  );
}
