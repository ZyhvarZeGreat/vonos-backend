"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { updateTenantConfig } from "@/lib/api/tenants";
import { linesToList, listToLines } from "@/lib/utils/catalogConfig";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useTenantStore } from "@/stores/tenantStore";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { cn } from "@/lib/utils/cn";

const SETTINGS_TABS = [
  { id: "branding", label: "Branding" },
  { id: "terminology", label: "Terminology" },
  { id: "catalog", label: "Catalog" },
  { id: "notifications", label: "Notifications" },
];

const HQ6_SETTINGS_NAV = [
  { id: "business", label: "Business" },
  { id: "tax", label: "Tax" },
  { id: "product", label: "Product" },
  { id: "contact", label: "Contact" },
] as const;

export function SettingsView() {
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6BusinessSettingsView />;
  return <DefaultSettingsView />;
}

/** HQ6 Business Settings — screenshots-spacing-catalog/63_business__settings */
function Hq6BusinessSettingsView() {
  const { tenantId, tenantName, config } = useRouteTenant();
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const [nav, setNav] = useState<(typeof HQ6_SETTINGS_NAV)[number]["id"]>("business");
  const [displayName, setDisplayName] = useState(config?.name ?? tenantName ?? "");
  const [search, setSearch] = useState("");
  const [profitPercent, setProfitPercent] = useState("0.00");

  useEffect(() => {
    setDisplayName(config?.name ?? tenantName ?? "");
  }, [config?.name, tenantName]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, {
        name: displayName.trim() || undefined,
      });
    },
    successMessage: "Business settings saved",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
  });

  return (
    <div className="hq6-page">
      <section className="hq6-content-header">
        <h1>Business Settings</h1>
      </section>

      <div className="hq6-card flex items-center gap-2 px-3 py-2">
        <Search className="h-4 w-4 text-[#9ca3af]" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="hq6-card overflow-hidden md:grid md:grid-cols-[12rem_1fr]">
        <nav className="border-b border-[var(--hq6-border)] md:border-b-0 md:border-r">
          {HQ6_SETTINGS_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNav(item.id)}
              className={cn(
                "block w-full border-b border-[var(--hq6-border)] px-4 py-3 text-left text-sm font-medium",
                nav === item.id
                  ? "bg-[var(--hq6-blue)] text-white"
                  : "bg-white text-[#111827] hover:bg-[#f9fafb]",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 md:p-6">
          {nav === "business" ? (
            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <label className="hq6-field">
                <span>
                  Business Name:<span className="text-[var(--hq6-danger)]">*</span>
                </span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label className="hq6-field">
                <span>Start Date:</span>
                <input type="text" defaultValue="01-01-2023" />
              </label>
              <label className="hq6-field">
                <span>
                  Default profit percent:<span className="text-[var(--hq6-danger)]">*</span>
                </span>
                <input
                  value={profitPercent}
                  onChange={(e) => setProfitPercent(e.target.value)}
                />
              </label>
              <label className="hq6-field">
                <span>Currency:</span>
                <select defaultValue="NGN">
                  <option value="NGN">Nigeria - Nairas(NGN)</option>
                </select>
              </label>
              <label className="hq6-field">
                <span>Currency Symbol Placement:</span>
                <select defaultValue="before">
                  <option value="before">Before amount</option>
                  <option value="after">After amount</option>
                </select>
              </label>
              <label className="hq6-field">
                <span>Time zone:</span>
                <select defaultValue="Africa/Lagos">
                  <option value="Africa/Lagos">Africa/Lagos</option>
                </select>
              </label>
              <label className="hq6-field">
                <span>Financial year start month:</span>
                <select defaultValue="1">
                  <option value="1">January</option>
                  <option value="4">April</option>
                </select>
              </label>
              <label className="hq6-field">
                <span>
                  Stock Accounting Method:<span className="text-[var(--hq6-danger)]">*</span>
                </span>
                <select defaultValue="fifo">
                  <option value="fifo">FIFO</option>
                  <option value="lifo">LIFO</option>
                </select>
              </label>
              <div className="hq6-field">
                <span>Upload Logo:</span>
                <input type="file" accept="image/*" />
              </div>
              <div className="flex justify-end pt-2 sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="hq6-btn hq6-btn-blue !rounded-md"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving…" : "Update settings"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-[#6b7280]">
              {HQ6_SETTINGS_NAV.find((n) => n.id === nav)?.label} settings — configure from the
              related list pages (tax rates, products, contacts).
            </p>
          )}
        </div>
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All rights
        reserved.
      </p>
    </div>
  );
}

function DefaultSettingsView() {
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
