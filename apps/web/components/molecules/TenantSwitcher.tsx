"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, Flame } from "lucide-react";
import {
  ENTITY_LIST,
  getTenantByCode,
} from "@/lib/registries/tenants";
import { archetypeLabel, typographyRoles } from "@/lib/registries/typography";
import { cn } from "@/lib/utils/cn";
import { resolveEntitySwitchPath } from "@/lib/utils/tenantRoutes";
import { useAuthStore } from "@/stores/authStore";

export interface TenantSwitcherProps {
  tenantCode: string;
  tenantName?: string;
  variant?: "sidebar" | "topbar";
  className?: string;
}

export function TenantSwitcher({
  tenantCode,
  tenantName,
  variant = "topbar",
  className,
}: TenantSwitcherProps) {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.role);
  const canSwitchEntities = role === "super_admin";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tenant = getTenantByCode(tenantCode);
  const displayName = tenantName ?? tenant?.name ?? tenantCode;
  const meta = tenant
    ? `${tenant.code} · ${archetypeLabel(tenant.archetype)}`
    : tenantCode;
  const isSidebar = variant === "sidebar";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const entityButtonContent = (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white",
          isSidebar ? "h-10 w-10" : "h-8 w-8",
        )}
      >
        {isSidebar ? (
          <Flame className="h-5 w-5 fill-current" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(typographyRoles.tenantTitle, "truncate")}>{displayName}</p>
        <p className={cn(typographyRoles.tenantMeta, "truncate")}>{meta}</p>
      </div>
    </>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {canSwitchEntities ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg text-left transition-colors hover:bg-[var(--color-surface-muted)]",
            isSidebar ? "p-0" : "px-2 py-1.5",
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Current entity: ${displayName}. Switch entity.`}
        >
          {entityButtonContent}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              open && "rotate-180",
              isSidebar ? "" : "hidden sm:block",
            )}
          />
        </button>
      ) : (
        <div
          className={cn(
            "flex w-full items-center gap-2 rounded-lg text-left",
            isSidebar ? "p-0" : "px-2 py-1.5",
          )}
        >
          {entityButtonContent}
        </div>
      )}

      {open && canSwitchEntities ? (
        <div
          className={cn(
            "absolute z-50 overflow-hidden rounded-xl border border-border bg-card shadow-lg",
            isSidebar ? "left-0 right-0 top-full mt-2" : "left-0 top-full mt-2 w-72",
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <p className={typographyRoles.caption}>Switch entity</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {ENTITY_LIST.map((entity) => {
              const isActive = entity.code === tenantCode;
              const href = resolveEntitySwitchPath(entity.code, pathname);
              return (
                <Link
                  key={entity.code}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 transition-colors",
                    isActive
                      ? "bg-[var(--color-surface-nav-active)]"
                      : "hover:bg-[var(--color-surface-nav-hover)]",
                  )}
                >
                  <p className={typographyRoles.caption}>{entity.code}</p>
                  <p
                    className={cn(
                      typographyRoles.tenantTitle,
                      "text-sm",
                      !isActive && "font-medium text-foreground",
                    )}
                  >
                    {entity.name}
                  </p>
                  <p className={typographyRoles.tenantMeta}>{archetypeLabel(entity.archetype)}</p>
                </Link>
              );
            })}
            <Link
              href="/admin/overview"
              onClick={() => setOpen(false)}
              className="mt-1 block rounded-md border-t border-border px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-nav-hover)]"
            >
              <p className={typographyRoles.caption}>VAG</p>
              <p className={cn(typographyRoles.tenantTitle, "text-sm font-medium")}>
                Vonos Autos Group
              </p>
              <p className={typographyRoles.tenantMeta}>Group overview</p>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
