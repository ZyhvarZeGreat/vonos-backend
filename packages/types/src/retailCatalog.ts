/**
 * Enabled modules for Ultimate POS–style retail catalog tenants (VISP + VSP).
 * Legacy `visp.vonosautomarket.com` and `vsp.vonosautomarket.com` share the same
 * Laravel module tree; Vonos uses one wiring profile with per-tenant labels only.
 */
export const RETAIL_CATALOG_ENABLED_MODULES = [
  "sales",
  "returns",
  "customers",
  "inventory",
  "suppliers",
  "purchases",
  "paymentAccounts",
  "pos",
  "quotations",
  "reports",
  "finance",
  "hrm",
] as const;

export type RetailCatalogModule = (typeof RETAIL_CATALOG_ENABLED_MODULES)[number];
