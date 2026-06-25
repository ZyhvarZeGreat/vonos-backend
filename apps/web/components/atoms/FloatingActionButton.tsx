import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FloatingActionButtonProps {
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function FloatingActionButton({
  label = "New message",
  className,
  onClick,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-white shadow-lg transition-colors hover:bg-[var(--color-brand-primary-hover)]",
        className,
      )}
    >
      <MessageSquarePlus className="h-6 w-6" />
    </button>
  );
}
