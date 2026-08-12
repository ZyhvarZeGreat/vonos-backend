"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LayoutGrid } from "lucide-react";
import {
  getVagViewUnit,
  isVagViewUnitId,
  VAG_VIEW_UNITS,
  type VagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { publicAssetPath } from "@/lib/utils/basePath";
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
import {
  completeNavigationProgress,
  startNavigationProgress,
} from "@/stores/navigationBusyStore";
import { toast } from "@/stores/toastStore";

/** UPOS shell uses a prebuilt Tailwind CSS — arbitrary width classes are missing. */
const OPEN_APP_BUTTON_STYLE = {
  width: 200,
  minWidth: 200,
} as const;

const OPEN_APP_MENU_STYLE = {
  width: 420,
  minWidth: 420,
} as const;

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
  return raw === "VA" ||
    raw === "VP" ||
    raw === "VW" ||
    raw === "VISP" ||
    raw === "VSP"
    ? raw
    : null;
}

/**
 * Two distinct switchers for VAG admin:
 * - Topbar “Open app”: leave Group admin → that business’s full dashboard.
 * - Bar “Group info”: stay in Group admin; filter Reports / Finance / HRM / Stock.
 */
export function AdminEntitySwitcher({
  className,
  variant = "topbar",
}: AdminEntitySwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const dateRange = useUiStore((s) => s.dateRange);
  const customDateRange = useUiStore((s) => s.customDateRange);
  const beginEntitySwitch = useUiStore((s) => s.beginEntitySwitch);
  const warmedRef = useRef<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isTopbar = variant === "topbar";
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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
    startNavigationProgress();
    void queryClient
      .invalidateQueries({
        predicate: (query) => {
          const root = query.queryKey[0];
          return root !== "tenantConfig" && root !== "groupOverview";
        },
      })
      .finally(() => {
        // Hand off to TopProgressBar's isFetching tracking.
        window.setTimeout(() => completeNavigationProgress(), 120);
      });
  };

  /** Soft navigate so top progress bar + entity chrome stay in sync. */
  const go = (href: string) => {
    navigatingRef.current = true;
    startNavigationProgress();
    router.push(href);
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

    const enterCode = raw as TenantCode;
    const unit = isVagViewUnitId(raw)
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
    toast.success(`Now viewing: ${unit.name} (${enter.code})`);
    go(href);
  };

  /** Context bar: change Reports / Finance / HRM scope inside VAG. */
  const setModuleScope = (code: AdminViewingCode) => {
    if (code === viewingCode) return;
    setViewingCode(code);
    refreshScopedQueries();
    if (!code) {
      toast.info("Group info: all businesses (Reports / Finance / HRM / Stock)");
      return;
    }
    const unit = getVagViewUnit(code);
    toast.success(
      `Group info: ${shortName(unit.name)} — still in Group admin`,
    );
  };

  const scopeOptions = useMemo(
    () => [
      {
        value: "",
        label: "All businesses (combined)",
      },
      ...VAG_VIEW_UNITS.map((unit) => ({
        value: unit.id,
        label: `${shortName(unit.name)}${
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
        ref={menuRef}
        className={cn("tw-relative tw-z-30 tw-shrink-0", className)}
        onMouseEnter={warmAllUnits}
      >
        <button
          type="button"
          id="upos-admin-workspace-switcher"
          style={OPEN_APP_BUTTON_STYLE}
          className="tw-inline-flex tw-h-10 tw-items-center tw-justify-between tw-gap-2 tw-rounded-md tw-border tw-border-white/35 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-900 tw-shadow-none hover:tw-bg-gray-50"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Open an app — leave Group admin and open a business dashboard"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <LayoutGrid className="tw-h-4 tw-w-4 tw-shrink-0 tw-text-gray-500" />
          <span className="tw-flex-1 tw-truncate tw-text-left">Open app</span>
          <ChevronDown
            className={cn(
              "tw-h-4 tw-w-4 tw-shrink-0 tw-text-gray-500 tw-transition-transform",
              menuOpen && "tw-rotate-180",
            )}
          />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            aria-labelledby="upos-admin-workspace-switcher"
            style={{ ...OPEN_APP_MENU_STYLE, top: "calc(100% + 8px)" }}
            className="tw-absolute tw-left-0 tw-z-50 tw-overflow-hidden tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-shadow-lg"
          >
            <div className="tw-border-b tw-border-gray-100 tw-bg-gray-50 tw-px-4 tw-py-3">
              <p className="tw-mb-0 tw-text-sm tw-font-semibold tw-text-gray-900">
                Open a business app
              </p>
              <p className="tw-mb-0 tw-mt-1.5 tw-text-xs tw-leading-relaxed tw-text-gray-500">
                Leaves Group admin and opens that business’s full dashboard.
                To filter Reports / Finance here, use{" "}
                <span className="tw-font-semibold">Show info for</span> below.
              </p>
            </div>
            <ul className="tw-m-0 tw-list-none tw-space-y-0.5 tw-p-3">
              {VAG_VIEW_UNITS.map((unit) => {
                const accent = accentForTenantCode(unit.enterCode);
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className="tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-md tw-px-4 tw-py-3 tw-text-left tw-text-sm tw-text-gray-800 hover:tw-bg-gray-100"
                      onClick={() => {
                        setMenuOpen(false);
                        enterEntityDashboard(unit.enterCode);
                      }}
                    >
                      <span
                        className="tw-relative tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-md tw-border tw-border-gray-200 tw-bg-white"
                        style={{ boxShadow: `inset 0 0 0 2px ${accent}33` }}
                      >
                        <Image
                          src={publicAssetPath("/brand/vonos-autos-mark.png")}
                          alt=""
                          width={28}
                          height={28}
                          className="tw-object-contain"
                        />
                      </span>
                      <span className="tw-min-w-0 tw-flex-1">
                        <span className="tw-block tw-font-medium tw-text-gray-900">
                          {shortName(unit.name)}
                        </span>
                        <span className="tw-mt-1 tw-block tw-text-xs tw-text-gray-500">
                          {unit.tenantCodes.length > 1
                            ? unit.tenantCodes.join(" · ")
                            : unit.enterCode}
                        </span>
                      </span>
                      <span
                        className="tw-shrink-0 tw-rounded tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-white"
                        style={{ backgroundColor: accent }}
                      >
                        {unit.enterCode}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn("tw-relative tw-min-w-0", className)}
      onMouseEnter={warmAllUnits}
      title="Stay in Group admin — filters Reports, Finance, HRM, and Stock"
    >
      <select
        id="upos-admin-report-entity"
        className="form-control select2 upos-admin-entity-scope-select"
        value={viewingCode ?? ""}
        aria-label={`Group information for: ${
          viewingCode ? getVagViewUnit(viewingCode).name : "All businesses"
        }. Stay in Group admin — changes Reports, Finance, HRM, and Stock.`}
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
