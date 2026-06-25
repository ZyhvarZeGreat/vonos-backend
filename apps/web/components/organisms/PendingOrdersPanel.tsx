"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { cn } from "@/lib/utils/cn";

export interface PendingOrderRow {
  id: string;
  ref: string;
  name: string;
  date: string;
  carrier: string;
  status: string;
}

export interface PendingOrdersPanelProps {
  title?: string;
  subtitle?: string;
  orders: PendingOrderRow[];
  tabs?: string[];
  defaultTab?: string;
  embedded?: boolean;
  className?: string;
}

export function PendingOrdersPanel({
  title = "Pending Orders",
  subtitle = "Orders awaiting fulfillment or receipt",
  orders,
  tabs = ["Outbound", "Inbound", "Transfers"],
  defaultTab = "Outbound",
  embedded = false,
  className,
}: PendingOrdersPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <section
      className={cn(
        embedded ? undefined : "rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      {!embedded ? (
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <Button variant="secondary" size="sm">
            View all
          </Button>
        </div>
      ) : null}

      <div className="mb-4 flex gap-6 border-b border-[var(--color-border-subtle)]">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative top-px px-1 pb-3 text-base transition-colors",
              activeTab === tab
                ? "border-b-2 border-foreground font-medium text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {orders.map((order) => (
          <div
            key={order.id}
            className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] items-center gap-4 border-b border-[var(--color-border-subtle)] py-4 last:border-0"
          >
            <span className="text-base text-muted">{order.ref}</span>
            <span className="text-base font-medium text-foreground">{order.name}</span>
            <span className="text-base text-muted">{order.date}</span>
            <span className="text-base text-foreground">{order.carrier}</span>
            <StatusPill status={order.status} vocabulary="orderStatus" />
          </div>
        ))}
      </div>
    </section>
  );
}
