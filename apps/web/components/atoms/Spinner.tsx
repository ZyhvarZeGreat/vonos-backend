import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-8 w-8",
} as const;

export function Spinner({ className, size = "md" }: SpinnerProps) {
  const px = size === "lg" ? 32 : size === "sm" ? 14 : 16;
  return (
    <Loader2
      className={cn(
        "animate-spin shrink-0",
        sizeClasses[size],
        className,
      )}
      width={px}
      height={px}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}
