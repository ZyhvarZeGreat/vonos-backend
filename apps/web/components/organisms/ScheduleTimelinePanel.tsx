"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils/cn";

export interface TimelineStylist {
  id: string;
  name: string;
}

export interface TimelineBlock {
  id: string;
  stylistId: string;
  startHour: number;
  spanHours: number;
  customerName: string;
  serviceName: string;
  status: string;
}

const STATUS_BLOCK_CLASS: Record<string, string> = {
  Booked: "bg-[var(--color-surface-muted)] border-border text-foreground",
  Confirmed: "bg-info-bg border-info/30 text-foreground",
  "In Progress": "bg-info-bg border-info text-foreground",
  Completed: "bg-success-bg border-success/30 text-foreground",
  "No-show": "bg-error-bg border-error/30 text-foreground",
  Cancelled: "bg-error-bg/50 border-error/20 text-muted line-through",
};

export interface ScheduleTimelinePanelProps {
  title?: string;
  subtitle?: string;
  hours: readonly number[];
  stylists: TimelineStylist[];
  blocks: TimelineBlock[];
  className?: string;
}

function formatHour(hour: number): string {
  if (hour === 12) return "12pm";
  if (hour > 12) return `${hour - 12}pm`;
  return `${hour}am`;
}

export function ScheduleTimelinePanel({
  title = "Today's Schedule",
  subtitle = "Stylist × time slot grid",
  hours,
  stylists,
  blocks,
  className,
}: ScheduleTimelinePanelProps) {
  const hourSpan = hours.length;
  const firstHour = hours[0] ?? 9;
  const lastHour = hours[hours.length - 1] ?? 18;
  const totalHours = lastHour - firstHour + 1;

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[640px] gap-px rounded-lg border border-border bg-border"
          style={{
            gridTemplateColumns: `120px repeat(${hourSpan}, minmax(56px, 1fr))`,
          }}
        >
          <div className="bg-card p-2" />
          {hours.map((hour) => (
            <div
              key={hour}
              className="bg-card px-1 py-2 text-center text-xs font-medium text-muted"
            >
              {formatHour(hour)}
            </div>
          ))}
          {stylists.map((stylist) => {
            const stylistBlocks = blocks.filter((b) => b.stylistId === stylist.id);
            return (
              <Fragment key={stylist.id}>
                <div className="flex items-center bg-card px-3 py-2 text-sm font-medium text-foreground">
                  {stylist.name}
                </div>
                <div
                  className="relative col-span-1 bg-card"
                  style={{
                    gridColumn: `2 / span ${hourSpan}`,
                    minHeight: "3.5rem",
                  }}
                >
                  {stylistBlocks.map((block) => {
                    const offsetHours = block.startHour - firstHour;
                    const leftPct = (offsetHours / totalHours) * 100;
                    const widthPct = (block.spanHours / totalHours) * 100;
                    const blockClass =
                      STATUS_BLOCK_CLASS[block.status] ??
                      STATUS_BLOCK_CLASS.Booked;
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          "absolute top-1 bottom-1 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] leading-tight",
                          blockClass,
                        )}
                        style={{
                          left: `${leftPct}%`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                        title={`${block.customerName} — ${block.serviceName}`}
                      >
                        <p className="truncate font-semibold">{block.customerName}</p>
                        <p className="truncate opacity-80">{block.serviceName}</p>
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
