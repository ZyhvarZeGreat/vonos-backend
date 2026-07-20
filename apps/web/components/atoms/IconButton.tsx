import { cn } from "@/lib/utils/cn";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

export function IconButton({
  label,
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-muted motion-press hover:bg-[var(--color-surface-muted)] hover:text-foreground",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
