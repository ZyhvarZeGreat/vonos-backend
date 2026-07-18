import { Check } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { cn } from "@/lib/utils/cn";

export interface StepperConfig {
  stages: string[];
  currentStage: string;
}

export interface StatusStepperProps {
  config: StepperConfig;
  onAdvance?: () => void;
  advanceLabel?: string;
  /** When true, advance button renders in header area (caller handles placement). */
  hideAdvanceButton?: boolean;
  className?: string;
}

function getNextStage(stages: string[], currentStage: string): string | null {
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stages.length - 1) return null;
  return stages[currentIndex + 1] ?? null;
}

export function getAdvanceLabel(currentStage: string, nextStage: string | null): string {
  if (!nextStage) return "Complete";
  const labels: Record<string, string> = {
    Received: "Mark Received",
    Quoted: "Send Quote",
    Approved: "Mark Approved",
    "In Progress": "Start Work",
    QC: "Send to QC",
    Delivered: "Mark Delivered",
    Preparing: "Start Preparing",
    Ready: "Mark Ready",
    Served: "Mark Served",
  };
  return labels[nextStage] ?? `Mark ${nextStage}`;
}

export function StatusStepper({
  config,
  onAdvance,
  advanceLabel,
  hideAdvanceButton = false,
  className,
}: StatusStepperProps) {
  const { stages, currentStage } = config;
  const currentIndex = stages.indexOf(currentStage);
  const nextStage = getNextStage(stages, currentStage);
  const actionLabel = advanceLabel ?? getAdvanceLabel(currentStage, nextStage);

  return (
    <div className={cn("space-y-4", className)}>
      <ol className="flex flex-wrap items-start justify-between gap-y-4">
        {stages.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = stage === currentStage;
          const isFuture = index > currentIndex;

          return (
            <li
              key={stage}
              className={cn(
                "flex min-w-[4.5rem] flex-1 flex-col items-center",
                index < stages.length - 1 && "relative",
              )}
            >
              {index < stages.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-[calc(50%+1.25rem)] top-5 h-0.5 w-[calc(100%-2.5rem)]",
                    isComplete ? "bg-[var(--color-brand-accent)]" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 transition-all",
                  isCurrent && "h-10 w-10 border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-white shadow-sm",
                  isComplete && "h-8 w-8 border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-white",
                  isFuture && "h-8 w-8 border-border bg-card text-muted",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                {isCurrent ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-2 max-w-[5.5rem] text-center text-xs font-medium leading-tight",
                  isCurrent && "text-[var(--color-brand-accent)]",
                  isComplete && "text-foreground",
                  isFuture && "text-muted",
                )}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ol>
      {!hideAdvanceButton && nextStage && onAdvance ? (
        <Button onClick={onAdvance}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}

export function buildAdaptiveJobStages(hasQuote: boolean): string[] {
  const base = ["Received"];
  if (hasQuote) base.push("Quoted");
  return [...base, "Approved", "In Progress", "QC", "Delivered"];
}

/** Align orphan statuses with the adaptive stage list for the stepper UI. */
export function coerceJobStatusForStepper(
  currentStage: string,
  hasQuote: boolean,
): string {
  if (currentStage === "Quoted" && !hasQuote) return "Received";
  const stages = buildAdaptiveJobStages(hasQuote);
  if (stages.includes(currentStage)) return currentStage;
  return stages[0] ?? "Received";
}
