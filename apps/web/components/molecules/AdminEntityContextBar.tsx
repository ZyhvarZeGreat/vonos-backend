"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AUTOS_GROUP_ENTITIES,
  getTenantByCode,
  type TenantCode,
} from "@/lib/registries/tenants";
import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { iconForTenantCode } from "@/lib/registries/tenantIcons";
import { cn } from "@/lib/utils/cn";
import { prefetchAdminEntity } from "@/lib/admin/prefetchAdminEntity";
import { dateRangePresetToApiBounds } from "@/lib/utils/dateRange";
import {
  useAdminEntityStore,
  type AdminViewingCode,
} from "@/stores/adminEntityStore";
import { useUiStore } from "@/stores/uiStore";

export function AdminEntityContextBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const viewingCode = useAdminEntityStore((s) => s.viewingCode);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const dateRange = useUiStore((s) => s.dateRange);
  const customDateRange = useUiStore((s) => s.customDateRange);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const warmedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const active = viewingCode ? getTenantByCode(viewingCode) : null;
  const label = active
    ? `${active.name} (${active.code})`
    : "All entities (Group)";
  const ActiveIcon = viewingCode
    ? iconForTenantCode(viewingCode)
    : Building2;

  const warmEntity = (code: TenantCode) => {
    const key = `${pathname}:${code}`;
    if (warmedRef.current.has(key)) return;
    warmedRef.current.add(key);
    const bounds = dateRangePresetToApiBounds(dateRange, new Date(), customDateRange);
    void prefetchAdminEntity(queryClient, {
      code,
      pathname,
      dateBounds: bounds,
    }).catch(() => {
      warmedRef.current.delete(key);
    });
  };

  const warmAllEntities = () => {
    for (const entity of AUTOS_GROUP_ENTITIES) {
      warmEntity(entity.code as TenantCode);
    }
  };

  const pick = (code: AdminViewingCode) => {
    setViewingCode(code);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[var(--color-surface-muted)]/80 px-4 py-2.5 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Viewing
        </p>
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">
          Finance writes and entity-scoped modules use this selection. Group
          reports stay consolidated until you pick an entity.
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => {
              const next = !v;
              if (next) warmAllEntities();
              return next;
            });
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-[var(--color-surface-muted)]"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-white"
            style={{
              backgroundColor: viewingCode
                ? accentForTenantCode(viewingCode)
                : accentForTenantCode("VAG"),
            }}
          >
            <ActiveIcon className="h-3.5 w-3.5" />
          </span>
          Switch entity
          <ChevronDown
            className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
            role="listbox"
          >
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
              {AUTOS_GROUP_ENTITIES.map((entity) => {
                const Icon = iconForTenantCode(entity.code as TenantCode);
                const isActive = viewingCode === entity.code;
                return (
                  <button
                    key={entity.code}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => warmEntity(entity.code as TenantCode)}
                    onFocus={() => warmEntity(entity.code as TenantCode)}
                    onClick={() => pick(entity.code as TenantCode)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-[var(--color-surface-nav-hover)]",
                      isActive && "bg-[var(--color-surface-nav-active)]",
                    )}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md text-white"
                      style={{
                        backgroundColor: accentForTenantCode(entity.code as TenantCode),
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{entity.name}</span>
                      <span className="block text-xs text-muted">{entity.code}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
