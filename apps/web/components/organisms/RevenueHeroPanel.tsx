"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/atoms/Button";
import { ChevronDown } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

export interface RevenueHeroPanelProps {
  title?: string;
  subtitle?: string;
  data: { label: string; revenue: number }[];
  revenueToday: string;
  accentColor?: string;
  periodLabel?: string;
  className?: string;
}

export function RevenueHeroPanel({
  title = "Revenue Today",
  subtitle = "Live sales — updates throughout the day",
  data,
  revenueToday,
  accentColor = "#14B8A6",
  periodLabel = "Today",
  className,
}: RevenueHeroPanelProps) {
  return (
    <section
      className={cn(
        "relative flex h-[var(--space-chart-height)] flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <Button variant="secondary" size="sm" className="gap-2">
          {periodLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <p className="absolute left-6 top-[5.5rem] z-10 text-3xl font-bold tracking-tight text-foreground">
        {revenueToday}
      </p>
      <div className="min-h-0 flex-1 pt-10">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(value) => [
                formatCurrencyCompact(Number(value ?? 0), "NGN"),
                "Revenue",
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={accentColor}
              fill="url(#revenueGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
