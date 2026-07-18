"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { updateTenantConfig } from "@/lib/api/tenants";
import { linesToList, listToLines } from "@/lib/utils/catalogConfig";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useTenantStore } from "@/stores/tenantStore";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";

const SETTINGS_TABS = [
  { id: "branding", label: "Branding" },
  { id: "terminology", label: "Terminology" },
  { id: "catalog", label: "Catalog" },
  { id: "notifications", label: "Notifications" },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("branding");
  const { tenantId, tenantName, tenantCode, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const terminology = config?.terminology ?? {};
  const [displayName, setDisplayName] = useState(config?.name ?? tenantName ?? "");
  const [itemLabel, setItemLabel] = useState(terminology.item ?? "Item");
  const [inventoryLabel, setInventoryLabel] = useState(terminology.inventory ?? "Inventory");
  const [categoriesText, setCategoriesText] = useState(listToLines(config?.itemCategories));
  const [saveError, setSaveError] = useState<string | null>(null);

  const accent = tenantCode ? accentForTenantCode(tenantCode) : "#2563eb";
  const locationsHref = tenantCode ? `/${tenantCode}/locations` : "#";

  useEffect(() => {
    setDisplayName(config?.name ?? tenantName ?? "");
    setItemLabel(terminology.item ?? "Item");
    setInventoryLabel(terminology.inventory ?? "Inventory");
    setCategoriesText(listToLines(config?.itemCategories));
  }, [
    config?.itemCategories,
    config?.name,
    tenantName,
    terminology.inventory,
    terminology.item,
  ]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, {
        name: displayName.trim() || undefined,
        terminology: {
          ...(itemLabel.trim() ? { item: itemLabel.trim() } : {}),
          ...(inventoryLabel.trim() ? { inventory: inventoryLabel.trim() } : {}),
        },
        ...(activeTab === "catalog"
          ? {
              itemCategories: linesToList(categoriesText),
            }
          : {}),
      });
    },
    successMessage: activeTab === "catalog" ? "Catalog saved" : "Settings saved",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  return (
    <div className="space-y-6">
      {tenantCode ? <EntityColorBadge code={tenantCode} className="mb-2" /> : null}
      <p className="text-sm text-muted">
        Settings for <span className="font-medium text-foreground">{tenantName}</span>.
      </p>
      <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground">
          {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
        </h3>
        <p className="mt-1 mb-6 text-sm text-muted">
          Tenant configuration — branding, terminology, and notification preferences.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (activeTab === "notifications") return;
            saveMutation.mutate();
          }}
        >
          {activeTab === "branding" && (
            <>
              <Input
                label="Entity display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">Entity color</span>
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-mono text-sm text-foreground">{accent}</p>
                    <p className="text-xs text-muted">
                      Applied to charts, finance, reports, and navigation for this entity.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === "terminology" && (
            <>
              <Input
                label="Item label"
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
              />
              <Input
                label="Inventory label"
                value={inventoryLabel}
                onChange={(e) => setInventoryLabel(e.target.value)}
              />
            </>
          )}
          {activeTab === "catalog" && (
            <>
              <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-muted">
                Branches, counters, and bin slots are managed on the{" "}
                <Link href={locationsHref} className="font-medium text-foreground underline">
                  Locations
                </Link>{" "}
                page.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item categories</label>
                <p className="text-xs text-muted">One category per line.</p>
                <textarea
                  value={categoriesText}
                  onChange={(e) => setCategoriesText(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground"
                />
              </div>
            </>
          )}
          {activeTab === "notifications" && (
            <p className="text-sm text-muted">
              Notification preferences will be configurable in a future release.
            </p>
          )}
          {saveError ? <p className="text-sm text-error">{saveError}</p> : null}
          {activeTab !== "notifications" ? (
            <Button type="submit" size="sm" isLoading={saveMutation.isPending} loadingText="Saving…">
              Save changes
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
