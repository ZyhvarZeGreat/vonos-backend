import { TopBar } from "@/components/organisms/TopBar";
import { StatusStepper, type StepperConfig } from "@/components/organisms/StatusStepper";
import { DetailPanelSection } from "@/components/organisms/DetailPanelSection";
import { Button } from "@/components/atoms/Button";
import type { SectionInstance } from "@/lib/registries/sectionTypes";
import { cn } from "@/lib/utils/cn";

export interface HeaderConfig {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}

export interface ActionConfig {
  label: string;
  onClick: () => void;
}

export interface ListDetailTemplateProps {
  sidebar: React.ReactNode;
  title?: string;
  list: React.ReactNode;
  header?: HeaderConfig;
  stepper?: StepperConfig | null;
  sections?: SectionInstance[];
  mode: "view" | "edit" | "create";
  primaryAction?: ActionConfig;
  className?: string;
}

export function ListDetailTemplate({
  sidebar,
  title = "Records",
  list,
  header,
  stepper = null,
  sections = [],
  mode,
  primaryAction,
  className,
}: ListDetailTemplateProps) {
  return (
    <div className={cn("flex min-h-screen bg-background", className)}>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          primaryAction={
            primaryAction ? (
              <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
            ) : undefined
          }
        />
        <main className="grid flex-1 gap-6 p-6 xl:grid-cols-[1.2fr_1fr]">
          <section>{list}</section>
          <section className="space-y-4">
            {header ? (
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {mode === "create" ? `New ${header.title}` : header.title}
                    </h2>
                    {header.subtitle ? (
                      <p className="mt-1 text-sm text-muted">{header.subtitle}</p>
                    ) : null}
                  </div>
                  {header.badge}
                </div>
              </div>
            ) : null}
            {stepper ? <StatusStepper config={stepper} /> : null}
            <DetailPanelSection sections={sections} />
          </section>
        </main>
      </div>
    </div>
  );
}
