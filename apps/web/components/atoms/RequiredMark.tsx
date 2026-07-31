import { cn } from "@/lib/utils/cn";

/** Red asterisk for required form fields (sits with the label). */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("text-[#dd4b39]", className)}
      aria-hidden
      title="Required"
    >
      *
    </span>
  );
}
