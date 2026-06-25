import type { CSSProperties } from "react";
import type { TenantCode } from "@/lib/registries/tenants";

/** Per-entity accent from DESIGN_PROMPTS.md — drives --color-brand-accent per tenant. */
export const TENANT_ACCENT: Record<TenantCode, string> = {
  VW: "#3B82F6",
  VKW: "#F59E0B",
  VISP: "#14B8A6",
  VSP: "#0D9488",
  VC: "#EA580C",
  VM: "#D97706",
  VMS: "#B45309",
  VS: "#DB2777",
};

export const VAG_ACCENT = "#1E293B";

export function accentForTenantCode(code: string): string {
  if (code in TENANT_ACCENT) {
    return TENANT_ACCENT[code as TenantCode];
  }
  if (code === "VAG" || code === "admin") return VAG_ACCENT;
  return TENANT_ACCENT.VW;
}

/** CSS custom properties applied on the tenant shell root. */
export function tenantAccentStyle(code: string): CSSProperties {
  const accent = accentForTenantCode(code);
  return {
    ["--color-brand-accent" as string]: accent,
    ["--color-info" as string]: accent,
    ["--color-info-bg" as string]: `${accent}20`,
    ["--color-chart-bar-primary" as string]: accent,
  };
}
