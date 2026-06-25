import { TopBar } from "@/components/organisms/TopBar";
import { cn } from "@/lib/utils/cn";

export interface FormTemplateProps {
  sidebar: React.ReactNode;
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FormTemplate({
  sidebar,
  title = "Settings",
  description,
  children,
  actions,
  className,
}: FormTemplateProps) {
  return (
    <div className={cn("flex min-h-screen bg-background", className)}>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} primaryAction={actions} />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 shadow-card">
            {description ? (
              <p className="mb-6 text-sm text-muted">{description}</p>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
