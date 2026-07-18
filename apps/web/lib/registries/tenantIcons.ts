import {
  Building2,
  Car,
  Coffee,
  Package,
  Scissors,
  Shirt,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import type { TenantCode } from "@/lib/registries/tenants";

type TenantIcon = typeof Car;

/** Per-entity icon for switcher, cards, and sidebar header. */
export const TENANT_ICON: Record<TenantCode, TenantIcon> = {
  VA: Car,
  VW: Package,
  VISP: Wrench,
  VSP: ShoppingBag,
  VC: Coffee,
  VS: Scissors,
  VKW: Shirt,
};

export const VAG_ICON: TenantIcon = Building2;

export function iconForTenantCode(code: string): TenantIcon {
  if (code === "VAG" || code === "admin") return VAG_ICON;
  if (code in TENANT_ICON) return TENANT_ICON[code as TenantCode];
  return Building2;
}
