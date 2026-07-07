"use client";

import { useState } from "react";
import { ChevronDown, Database, Info } from "lucide-react";
import {
  getMigrationSource,
  type TenantMigrationSource,
} from "@/lib/registries/migrationSources";
import { archetypeLabel } from "@/lib/registries/typography";
import type { TenantCode } from "@/lib/registries/tenants";
import { cn } from "@/lib/utils/cn";

export function TenantDataContextPanel({
  tenantCode,
  tenantName,
  className,
}: {
  tenantCode: TenantCode;
  tenantName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const source = getMigrationSource(tenantCode);

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
      aria-label="Data scope for this entity"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="h-4 w-4 text-[var(--color-brand-primary)]" aria-hidden />
          Where this data comes from
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-4 text-sm">
          <ScopeGrid
            tenantCode={tenantCode}
            tenantName={tenantName}
            source={source}
          />
          {source.operatorNotes ? (
            <p className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-muted">
              {source.operatorNotes}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ScopeGrid({
  tenantCode,
  tenantName,
  source,
}: {
  tenantCode: TenantCode;
  tenantName: string;
  source: TenantMigrationSource;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <ScopeItem label="You are viewing">{tenantName}</ScopeItem>
      <ScopeItem label="Entity code">{tenantCode}</ScopeItem>
      <ScopeItem label="Archetype">{archetypeLabel(getArchetype(tenantCode))}</ScopeItem>
      <ScopeItem label="Database tenant id">
        <code className="text-xs">{source.tenantId}</code>
      </ScopeItem>
      <ScopeItem label="Legacy MySQL DB">
        <span className="inline-flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-muted" aria-hidden />
          <code className="text-xs">{source.legacyDatabase}</code>
        </span>
      </ScopeItem>
      <ScopeItem label="Legacy business name">{source.legacyBusinessName}</ScopeItem>
      <div className="sm:col-span-2">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">
          Records in this app
        </dt>
        <dd className="mt-1.5 flex flex-wrap gap-2">
          {source.dataInApp.map((item) => (
            <span
              key={item}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground"
            >
              {item}
            </span>
          ))}
        </dd>
      </div>
      <div className="sm:col-span-2 text-xs text-muted">
        API calls from this screen send <code className="text-foreground">tenantId={source.tenantId}</code>{" "}
        (and <code className="text-foreground">X-Viewing-Tenant</code> for group admins). Other entities
        use different tenant ids — switching entity in the top bar loads a separate dataset.
      </div>
    </dl>
  );
}

function ScopeItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function getArchetype(code: TenantCode): "stock" | "transaction" | "job" | "appointment" {
  const map: Record<TenantCode, "stock" | "transaction" | "job" | "appointment"> = {
    VW: "stock",
    VKW: "stock",
    VISP: "transaction",
    VSP: "transaction",
    VC: "transaction",
    VA: "job",
    VS: "appointment",
  };
  return map[code];
}
