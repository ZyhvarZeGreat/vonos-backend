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
  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
      aria-hidden
    />
  );
}
