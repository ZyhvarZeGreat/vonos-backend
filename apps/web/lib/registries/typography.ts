/**
 * Text roles for shell chrome and page content.
 * Pair with matching utility classes in styles/globals.css.
 */
export const typographyRoles = {
  /** Sidebar / top-bar entity name (Plus Jakarta Sans) */
  tenantTitle: "type-tenant-title",
  /** Entity code, archetype, or secondary tenant line */
  tenantMeta: "type-tenant-meta",
  /** Current screen title in TopBar (Overview, Inventory, …) */
  pageTitle: "type-page-title",
  /** Sidebar section labels (Menu, Inventory, …) — 14px */
  navSection: "type-nav-section",
  /** Sidebar nav item labels and bottom links (14px) */
  navItem: "type-nav-item",
  /** Default body copy */
  body: "type-body",
  /** Secondary / helper body text */
  bodyMuted: "type-body-muted",
  /** Timestamps, table meta, captions */
  caption: "type-caption",
} as const;

export type TypographyRole = keyof typeof typographyRoles;

const ARCHETYPE_LABELS = {
  stock: "Stock-centric",
  transaction: "Transaction-centric",
  job: "Job-centric",
  appointment: "Appointment-centric",
} as const;

export function archetypeLabel(archetype: keyof typeof ARCHETYPE_LABELS): string {
  return ARCHETYPE_LABELS[archetype];
}
