"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  accentTenantCodeForVagUnit,
  VAG_VIEW_UNITS,
  type VagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { typographyRoles } from "@/lib/registries/typography";
import { cn } from "@/lib/utils/cn";
import { prefetchAdminEntity } from "@/lib/admin/prefetchAdminEntity";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import {
  useAdminEntityStore,
  type AdminViewingCode,
} from "@/stores/adminEntityStore";
import { useUiStore } from "@/stores/uiStore";

export interface AdminEntitySwitcherProps {
  className?: string;
  /** TopBar chrome (white-on-accent) vs context bar (light surface). */
  variant?: "topbar" | "bar";
}

/**
 * VAG viewing-unit switcher (Group / VA / VW / SP). Stays on the current
 * admin module — only the viewing scope changes.
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const warmedRef = useRef<Set<string>>(new Set());
  const isTopbar = variant === "topbar";

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const activeUnit = viewingCode
    ? VAG_VIEW_UNITS.find((u) => u.id === viewingCode)
    : null;
  const displayName = activeUnit?.name ?? "Vonos Autos Group";
  const displayMeta = activeUnit
    ? activeUnit.badge
    : "All entities (Group)";
  const ActiveIcon = viewingCode
    ? iconForTenantCode(accentTenantCodeForVagUnit(viewingCode))
    : Building2;
  const activeAccent = viewingCode
    ? accentForTenantCode(accentTenantCodeForVagUnit(viewingCode))
    : accentForTenantCode("VAG");

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

  const pick = (code: AdminViewingCode) => {
    setViewingCode(code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) warmAllUnits();
            return next;
          });
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md text-left transition-colors",
          isTopbar ? "px-2 py-1.5 hover:bg-white/10" : "hq6-btn hq6-btn-outline",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Viewing: ${displayName}. Switch entity.`}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md text-white",
            isTopbar ? "h-8 w-8 bg-white/20" : "h-7 w-7",
          )}
          style={isTopbar ? undefined : { backgroundColor: activeAccent }}
        >
          <ActiveIcon className={isTopbar ? "h-4 w-4" : "h-3.5 w-3.5"} />
        </span>
        {isTopbar ? (
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                typographyRoles.tenantTitle,
                "truncate !text-white",
              )}
            >
              {displayName}
            </p>
            <p
              className={cn(
                typographyRoles.tenantMeta,
                "truncate !text-white/70",
              )}
            >
              {displayMeta}
            </p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-2">
            Switch entity
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            isTopbar ? "text-white/60 hidden sm:block" : "text-muted h-4 w-4",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg",
            isTopbar
              ? "left-0 top-full mt-2 w-80"
              : "right-0 top-full mt-2 w-80",
          )}
          role="listbox"
        >
          <div className="border-b border-border px-3 py-2">
            <p className={typographyRoles.caption}>Switch entity</p>
          </div>
          <button
            type="button"
            role="option"
            aria-selected={!viewingCode}
            onClick={() => pick(null)}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--color-surface-nav-hover)]",
              !viewingCode && "bg-[var(--color-surface-nav-active)]",
            )}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md text-white"
              style={{ backgroundColor: accentForTenantCode("VAG") }}
            >
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <span>
              <span className="block font-medium">All entities (Group)</span>
              <span className="block text-xs text-muted">Consolidated view</span>
            </span>
          </button>
          <div className="max-h-72 overflow-y-auto border-t border-border p-1">
            {VAG_VIEW_UNITS.map((unit) => {
              const Icon = iconForTenantCode(unit.enterCode);
              const isActive = viewingCode === unit.id;
              return (
                <button
                  key={unit.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => warmUnit(unit.id)}
                  onFocus={() => warmUnit(unit.id)}
                  onClick={() => pick(unit.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[var(--color-surface-nav-hover)]",
                    isActive && "bg-[var(--color-surface-nav-active)]",
                  )}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white"
                    style={{
                      backgroundColor: accentForTenantCode(unit.enterCode),
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{unit.name}</span>
                    <span className="block text-xs text-muted">
                      {unit.description ?? unit.badge}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
