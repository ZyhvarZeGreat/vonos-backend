"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, Flame } from "lucide-react";
import {
  AUTOS_GROUP_ENTITIES,
  getTenantByCode,
} from "@/lib/registries/tenants";
import { typographyRoles } from "@/lib/registries/typography";
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
  const meta = tenant ? tenant.code : tenantCode;
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
          "flex shrink-0 items-center justify-center rounded-lg",
          isSidebar
            ? "h-10 w-10 bg-white/15 text-white"
            : "h-8 w-8 bg-white/20 text-white",
        )}
      >
        {isSidebar ? (
          <Flame className="h-5 w-5 fill-current" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            typographyRoles.tenantTitle,
            "truncate",
            isSidebar ? "!text-white" : "!text-white",
          )}
        >
          {displayName}
        </p>
        <p
          className={cn(
            typographyRoles.tenantMeta,
            "truncate",
            isSidebar ? "!text-white/70" : "!text-white/70",
          )}
        >
          {meta}
        </p>
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
            "flex w-full items-center gap-2 rounded-lg text-left transition-colors",
            isSidebar ? "p-0 hover:bg-white/8" : "px-2 py-1.5 hover:bg-white/10",
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Current entity: ${displayName}. Switch entity.`}
        >
          {entityButtonContent}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              "text-white/60",
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
            "absolute z-50 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg",
            isSidebar ? "left-0 right-0 top-full mt-2" : "left-0 top-full mt-2 w-72",
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <p className={typographyRoles.caption}>Switch entity</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {AUTOS_GROUP_ENTITIES.map((entity) => {
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
                  <p className={typographyRoles.tenantMeta}>{entity.code}</p>
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
