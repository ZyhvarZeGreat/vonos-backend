"use client";

import { useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getVagViewUnit,
  VAG_VIEW_UNITS,
  type VagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { cn } from "@/lib/utils/cn";
import { tenantOverviewPath } from "@/lib/utils/authRedirect";
import { prefetchAdminEntity } from "@/lib/admin/prefetchAdminEntity";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import {
  useAdminEntityStore,
  type AdminViewingCode,
} from "@/stores/adminEntityStore";
import { useTenantStore } from "@/stores/tenantStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";

export interface AdminEntitySwitcherProps {
  className?: string;
  /**
   * `topbar` — leave VAG and open an entity’s full dashboard (`/{code}/overview`).
   * `bar` — stay in VAG; change Reports / Finance / HRM viewing scope only.
   */
  variant?: "topbar" | "bar";
}

function shortName(name: string): string {
  return name.replace(/^Vonos\s+/i, "");
}

function parseScopeId(raw: string): AdminViewingCode {
  return raw === "VA" || raw === "VW" || raw === "SP" ? raw : null;
}

/**
 * Two distinct switchers for VAG admin:
 * - Topbar: VAG ↔ entity workspaces (full dashboards).
 * - Bar: entity scope for Reports / Finance / HRM (stay on `/admin/*`).
 */
export function AdminEntitySwitcher({
  className,
  variant = "topbar",
}: AdminEntitySwitcherProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const dateRange = useUiStore((s) => s.dateRange);
  const customDateRange = useUiStore((s) => s.customDateRange);
  const beginEntitySwitch = useUiStore((s) => s.beginEntitySwitch);
  const warmedRef = useRef<Set<string>>(new Set());
  const isTopbar = variant === "topbar";
  const navigatingRef = useRef(false);

  const warmUnit = (unitId: VagViewUnitId) => {
    const unit = VAG_VIEW_UNITS.find((u) => u.id === unitId);
    if (!unit) return;
    for (const code of unit.tenantCodes) {
      const key = `${pathname}:${code}`;
      if (warmedRef.current.has(key)) continue;
      warmedRef.current.add(key);
      const bounds = dateRangePresetToApiBounds(
        dateRange,
        new Date(),
        customDateRange,
      );
      void prefetchAdminEntity(queryClient, {
        code,
        pathname,
        dateBounds: bounds,
      }).catch(() => {
        warmedRef.current.delete(key);
      });
    }
  };

  const warmAllUnits = () => {
    for (const unit of VAG_VIEW_UNITS) {
      warmUnit(unit.id);
    }
  };

  const refreshScopedQueries = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const root = query.queryKey[0];
        return root !== "tenantConfig" && root !== "groupOverview";
      },
    });
  };

  /** Hard navigate so admin → tenant layout switch always lands. */
  const go = (href: string) => {
    navigatingRef.current = true;
    window.location.assign(href);
  };

  /** Topbar: leave VAG → entity overview (full dashboard). */
  const enterEntityDashboard = (raw: string) => {
    if (navigatingRef.current) return;

    if (raw === "VAG" || raw === "") {
      setViewingCode(null);
      if (
        pathname === "/admin/overview" ||
        pathname.startsWith("/admin/overview/")
      ) {
        toast.info("Already on Group admin");
        return;
      }
      beginEntitySwitch({
        code: "VAG",
        name: "Vonos Autos Group",
        href: "/admin/overview",
      });
      toast.info("Opening Group admin");
      go("/admin/overview");
      return;
    }

    const enterCode = (raw === "SP" ? "VSP" : raw) as TenantCode;
    const unit =
      raw === "VA" || raw === "VW" || raw === "SP"
        ? getVagViewUnit(raw)
        : VAG_VIEW_UNITS.find((u) => u.enterCode === enterCode);
    const enter = getTenantByCode(enterCode);
    if (!enter || !unit) {
      toast.error("Unknown entity");
      return;
    }

    setViewingCode(null);
    if (enter.tenantId) {
      useTenantStore.getState().setActiveTenant(enter.tenantId);
    }

    const href = tenantOverviewPath(enter.code);
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "tenantConfig",
    });
    beginEntitySwitch({
      code: enter.code,
      name: unit.name,
      href,
    });
    toast.success(`Opening ${unit.name} dashboard`);
    go(href);
  };

  /** Context bar: change Reports / Finance / HRM scope inside VAG. */
  const setModuleScope = (code: AdminViewingCode) => {
    if (code === viewingCode) return;
    setViewingCode(code);
    refreshScopedQueries();
    if (!code) {
      toast.info("Module entity: Group (Reports / Finance / HRM / Stock)");
      return;
    }
    const unit = getVagViewUnit(code);
    toast.success(
      `Module entity: ${shortName(unit.name)} (stay in VAG)`,
    );
  };

  const topbarOptions = useMemo(
    () => [
      { value: "VAG", label: "VAG — Group admin" },
      ...VAG_VIEW_UNITS.map((unit) => ({
        value: unit.enterCode,
        label: `${unit.badge} — ${shortName(unit.name)} dashboard`,
      })),
    ],
    [],
  );

  const scopeOptions = useMemo(
    () => [
      {
        value: "",
        label: "Group — All entities (consolidated)",
      },
      ...VAG_VIEW_UNITS.map((unit) => ({
        value: unit.id,
        label: `${unit.badge} — ${shortName(unit.name)}${
          unit.tenantCodes.length > 1
            ? ` (${unit.tenantCodes.join(" + ")})`
            : ""
        }`,
      })),
    ],
    [],
  );

  if (isTopbar) {
    return (
      <div
        className={cn("tw-relative tw-z-20 tw-min-w-0", className)}
        onMouseEnter={warmAllUnits}
        title="Leaves VAG and opens that entity’s full dashboard"
      >
        {/*
          Uncontrolled + defaultValue: a controlled value stuck on "VAG"/""
          prevented native change from sticking and looked like a dead control.
          Hard assign() crosses admin → tenant layouts reliably.
          Hint lives in aria-label + option text — no stacked label (broke header).
        */}
        <select
          id="upos-admin-workspace-switcher"
          key={`workspace-${pathname}`}
          className="form-control select2 upos-header-entity-select"
          defaultValue="VAG"
          aria-label="Open app: leave VAG and open an entity’s full dashboard"
          onChange={(event) => {
            const next = event.target.value;
            if (next === "VAG") return;
            enterEntityDashboard(next);
          }}
        >
          {topbarOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className={cn("tw-relative tw-min-w-0", className)}
      onMouseEnter={warmAllUnits}
      title="Stay in VAG — scopes Reports, Finance, HRM, and Stock"
    >
      <select
        id="upos-admin-report-entity"
        className="form-control select2 upos-admin-entity-scope-select"
        value={viewingCode ?? ""}
        aria-label={`Module entity: ${
          viewingCode ? getVagViewUnit(viewingCode).name : "All entities"
        }. Stay in VAG — changes Reports, Finance, HRM, and Stock.`}
        onChange={(event) => setModuleScope(parseScopeId(event.target.value))}
      >
        {scopeOptions.map((option) => (
          <option key={option.value || "group"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
