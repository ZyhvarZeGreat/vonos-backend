import type { CSSProperties } from "react";
import type { TenantCode } from "@/lib/registries/tenants";

/**
 * Per-entity accent — drives --color-brand-accent per tenant shell.
 * Autos Group: VA, VP, VW, VISP, VSP (institute vs marketplace are distinct).
 */
export const TENANT_ACCENT: Record<TenantCode, string> = {
  VW: "#2563EB", // blue — Warehouse
  VA: "#16A34A", // green — Mechanic (merged VM + VMS)
  VP: "#EA580C", // orange — Painting (distinct from Mechanic green)
  VISP: "#0D9488", // teal — Institute Spare Parts
  VSP: "#0891B2", // cyan — SP Marketplace (distinct from VISP)
  VC: "#DC2626", // red — Cafe
  VKW: "#F59E0B", // amber — Kids Wear
  VS: "#DB2777", // pink — Saloon
};

/** Entity color legend for group admin / finance roll-ups. */
export const ENTITY_COLOR_LEGEND = (
  Object.entries(TENANT_ACCENT) as [TenantCode, string][]
).map(([code, color]) => ({ code, color }));

export const VAG_ACCENT = "#1E293B";

export function accentForTenantCode(code: string): string {
  if (code === "SP") return TENANT_ACCENT.VSP;
  if (code in TENANT_ACCENT) {
    return TENANT_ACCENT[code as TenantCode];
  }
  if (code === "VAG" || code === "admin") return VAG_ACCENT;
  return TENANT_ACCENT.VW;
}

/** Darken a #RRGGBB accent for HQ6 header hover / pressed states. */
export function darkenAccent(hex: string, factor = 0.82): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return hex;
  const channel = (start: number) => {
    const value = Number.parseInt(raw.slice(start, start + 2), 16);
    return Math.max(0, Math.min(255, Math.round(value * factor)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/** Ultimate POS shell reads --theme-700/800/900 on `html` for header, logo, buttons. */
export function uposThemeVars(code: string): Record<string, string> {
  const accent = accentForTenantCode(code);
  return {
    "--theme-700": accent,
    "--theme-800": darkenAccent(accent, 0.9),
    "--theme-900": darkenAccent(accent, 0.72),
  };
}

/** CSS custom properties applied on the tenant shell root. */
export function tenantAccentStyle(code: string): CSSProperties {
  const accent = accentForTenantCode(code);
  const header = accent;
  const headerHover = darkenAccent(accent);
  const theme = uposThemeVars(code);
  return {
    ["--color-brand-accent" as string]: accent,
    ["--color-brand-primary" as string]: accent,
    ["--color-brand-primary-hover" as string]: headerHover,
    ["--color-info" as string]: accent,
    ["--color-info-bg" as string]: `${accent}20`,
    ["--color-chart-bar-primary" as string]: accent,
    // HQ6 chrome reads these — one accent per operating entity.
    ["--hq6-header" as string]: header,
    ["--hq6-header-hover" as string]: headerHover,
    ["--theme-700" as string]: theme["--theme-700"],
    ["--theme-800" as string]: theme["--theme-800"],
    ["--theme-900" as string]: theme["--theme-900"],
  };
}

/**
 * CSS variables scoped to the top-bar header — renders in the entity accent
 * color with white text. Sidebar header mirrors this via sidebarHeaderStyle.
 */
export function topbarAccentStyle(code: string): CSSProperties {
  const accent = accentForTenantCode(code);
  return {
    ["--color-surface-topbar" as string]: accent,
    ["--color-topbar-text" as string]: "#ffffff",
    ["--color-topbar-text-muted" as string]: "rgba(255,255,255,0.7)",
    ["--color-topbar-border" as string]: "rgba(255,255,255,0.15)",
  };
}

/**
 * Accent-colored header area for the sidebar top (tenant switcher zone).
 * Matches the top bar so they read as one unified colored strip.
 */
export function sidebarHeaderStyle(code: string): CSSProperties {
  const accent = accentForTenantCode(code);
  return {
    backgroundColor: accent,
    color: "#ffffff",
  };
}

/**
 * CSS variables scoped to the sidebar element.
 * Surface stays light; active/hover use a soft tint of the entity accent.
 */
export function sidebarAccentStyle(code: string): CSSProperties {
  const accent = accentForTenantCode(code);
  return {
    ["--color-surface-sidebar" as string]: "#fdfdfd",
    ["--color-text-nav" as string]: "#111827",
    ["--color-text-nav-active" as string]: accent,
    ["--color-surface-nav-active" as string]: `${accent}18`,
    ["--color-surface-nav-hover" as string]: `${accent}0d`,
    ["--color-border" as string]: "#e5e7eb",
    ["--theme-700" as string]: accent,
    ["--theme-800" as string]: darkenAccent(accent, 0.9),
    ["--theme-900" as string]: darkenAccent(accent, 0.72),
    ["--hq6-header" as string]: accent,
  };
}
