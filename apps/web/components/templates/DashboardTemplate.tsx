import { TopBar } from "@/components/organisms/TopBar";
import { cn } from "@/lib/utils/cn";

export interface DashboardTemplateProps {
  sidebar: React.ReactNode;
  title?: string;
  tenantCode?: string;
  tenantName?: string;
  primaryAction?: React.ReactNode;
  /** Shown above TopBar (e.g. group admin viewing banner). */
  topSlot?: React.ReactNode;
  /** Shown at top of main content (e.g. data scope panel). */
  beforeContent?: React.ReactNode;
  kpiRow?: React.ReactNode;
  charts?: React.ReactNode;
  chartsLayout?: "twoColumn" | "stacked";
  feed?: React.ReactNode;
  table?: React.ReactNode;
  fab?: React.ReactNode;
  className?: string;
}

export function DashboardTemplate({
  sidebar,
  title,
  tenantCode,
  tenantName,
  primaryAction,
  topSlot,
  beforeContent,
  kpiRow,
  charts,
  chartsLayout = "twoColumn",
  feed,
  table,
  fab,
  className,
}: DashboardTemplateProps) {
  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", className)}>
      {sidebar}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {topSlot}
        <TopBar
          title={title}
          tenantCode={tenantCode}
          tenantName={tenantName}
          primaryAction={primaryAction}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-[var(--space-content-max)] space-y-6">
            {beforeContent}
            {kpiRow}
            {charts ? (
              <div
                className={
                  chartsLayout === "stacked"
                    ? "grid grid-cols-1 gap-6"
                    : "grid grid-cols-1 gap-6 lg:grid-cols-2"
                }
              >
                {charts}
              </div>
            ) : null}
            {feed || table ? (
              <div
                className={cn(
                  "grid grid-cols-1 gap-6",
                  table && feed ? "lg:grid-cols-[1fr_1.45fr]" : "lg:grid-cols-2",
                )}
              >
                {table}
                {feed}
              </div>
            ) : null}
            <div className="h-10" />
          </div>
        </main>
        {fab}
      </div>
    </div>
  );
}
