"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { updateTenantConfig } from "@/lib/api/tenants";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useTenantStore } from "@/stores/tenantStore";
import { hasPermission } from "@/lib/utils/permissions";
import { useAuthStore } from "@/stores/authStore";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import type { BusinessLocation } from "@vonos/types";

export function LocationsView() {
  const { tenantId, tenantCode, tenantName, config } = useRouteTenant();
  const authRole = useAuthStore((state) => state.role);
  const setTenantConfig = useTenantStore((state) => state.setTenantConfig);
  const queryClient = useQueryClient();
  const canEdit = authRole
    ? hasPermission(authRole, "editSettings") || hasPermission(authRole, "createRecord")
    : false;

  const [branches, setBranches] = useState<BusinessLocation[]>(
    config?.businessLocations ?? [],
  );
  const [storageSlots, setStorageSlots] = useState<string[]>(
    config?.storageLocations ?? [],
  );
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newCounter, setNewCounter] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setBranches(config?.businessLocations ?? []);
    setStorageSlots(config?.storageLocations ?? []);
  }, [config?.businessLocations, config?.storageLocations]);

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      return updateTenantConfig(tenantId, {
        businessLocations: branches,
        storageLocations: storageSlots,
      });
    },
    successMessage: "Locations saved",
    onSuccess: (updated) => {
      setTenantConfig(updated);
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ["tenantConfig", tenantId] });
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const accent = tenantCode ? accentForTenantCode(tenantCode) : undefined;

  const handleAddBranch = () => {
    const code = newBranchCode.trim();
    const name = newBranchName.trim();
    if (!code || !name) {
      setFormError("Branch code and name are required");
      return;
    }
    if (branches.some((row) => row.code.toLowerCase() === code.toLowerCase())) {
      setFormError("A branch with this code already exists");
      return;
    }
    setBranches((prev) => [...prev, { code, name }]);
    setNewBranchCode("");
    setNewBranchName("");
    setFormError(null);
  };

  const handleAddCounter = () => {
    const slot = newCounter.trim();
    if (!slot) {
      setFormError("Enter a counter or bin code");
      return;
    }
    if (storageSlots.some((row) => row.toLowerCase() === slot.toLowerCase())) {
      setFormError("This counter or bin already exists");
      return;
    }
    setStorageSlots((prev) => [...prev, slot]);
    setNewCounter("");
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      <EntityContextBanner
        module="Locations"
        description="Branches, counters, and bin slots used when stocking and finding products."
      />

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Location details</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Configure where products are stored for{" "}
              <span className="font-medium text-foreground">{tenantName}</span>. Staff assign a
              branch and counter or bin when adding inventory so products can be searched by
              location.
            </p>
          </div>
          {tenantCode ? <EntityColorBadge code={tenantCode} /> : null}
        </div>

        {canEdit ? (
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Add branch</h3>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Input
                  label="Branch code"
                  placeholder="BL004"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                />
                <Input
                  label="Branch name"
                  placeholder="VONOS HEAD OFFICE"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />
                <Button type="button" size="sm" onClick={handleAddBranch}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add branch
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Add counter / bin</h3>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Input
                  label="Counter or bin code"
                  placeholder="R1-S1-B3 or Counter 1"
                  value={newCounter}
                  onChange={(e) => setNewCounter(e.target.value)}
                />
                <Button type="button" size="sm" onClick={handleAddCounter}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add slot
                </Button>
              </div>
            </section>

            {formError ? <p className="text-sm text-error">{formError}</p> : null}
            {saveError ? <p className="text-sm text-error">{saveError}</p> : null}

            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save locations"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Only staff with create or settings access can add locations.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">Branches ({branches.length})</h3>
          <ul className="mt-3 space-y-2">
            {branches.length === 0 ? (
              <li className="text-sm text-muted">No branches configured yet.</li>
            ) : (
              branches.map((row) => (
                <li
                  key={row.code}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  style={{ borderLeftWidth: 3, borderLeftColor: accent }}
                >
                  <div>
                    <span className="font-medium text-foreground">{row.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted">{row.code}</span>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      className="text-muted hover:text-error"
                      aria-label={`Remove ${row.name}`}
                      onClick={() =>
                        setBranches((prev) => prev.filter((item) => item.code !== row.code))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground">
            Counters & bins ({storageSlots.length})
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {storageSlots.length === 0 ? (
              <li className="text-sm text-muted">No counter or bin slots yet.</li>
            ) : (
              storageSlots.map((slot) => (
                <li
                  key={slot}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[var(--color-surface-muted)] py-1 pl-3 pr-1 font-mono text-xs text-foreground"
                >
                  {slot}
                  {canEdit ? (
                    <button
                      type="button"
                      className="rounded-full p-1 text-muted hover:text-error"
                      aria-label={`Remove ${slot}`}
                      onClick={() =>
                        setStorageSlots((prev) => prev.filter((item) => item !== slot))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
