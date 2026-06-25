"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { KpiRow } from "@/components/organisms/KpiRow";
import { Sidebar } from "@/components/organisms/Sidebar";
import { parseTenantConfig, type TenantConfig } from "@vonos/types";
import { warehouseTenantConfig } from "@/lib/registries/tenantConfigs";

export default function ConfigPlaygroundPage() {
  const [rawConfig, setRawConfig] = useState(
    JSON.stringify(warehouseTenantConfig, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const parsedConfig = useMemo<TenantConfig | null>(() => {
    try {
      const parsed: unknown = JSON.parse(rawConfig);
      return parseTenantConfig(parsed);
    } catch {
      return null;
    }
  }, [rawConfig]);

  function handleApply() {
    try {
      parseTenantConfig(JSON.parse(rawConfig));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid tenant config");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[420px_1fr]">
      <aside className="border-r border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Config Playground</h1>
        <p className="mt-2 text-sm text-muted">
          Paste or edit a tenantConfig JSON blob and preview the shell live.
        </p>
        <textarea
          className="mt-4 h-[520px] w-full rounded-lg border border-border bg-[var(--color-surface-muted)] p-3 font-mono text-xs"
          value={rawConfig}
          onChange={(event) => setRawConfig(event.target.value)}
        />
        <Button className="mt-4" onClick={handleApply}>
          Validate Config
        </Button>
        {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
      </aside>

      <div className="min-w-0">
        {parsedConfig ? (
          <DashboardTemplate
            sidebar={
              <Sidebar
                navItems={parsedConfig.navItems}
                tenantName={parsedConfig.name ?? "Preview Tenant"}
                tenantCode={parsedConfig.code ?? "XX"}
              />
            }
            title="Config Preview"
            kpiRow={
              <KpiRow
                cards={parsedConfig.kpiCards}
                values={Object.fromEntries(
                  parsedConfig.kpiCards.map((card) => [card.metricKey, "—"]),
                )}
              />
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-error">
            Invalid JSON or schema — fix the config to preview.
          </div>
        )}
      </div>
    </div>
  );
}
