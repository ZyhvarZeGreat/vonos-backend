import {
  Building2,
  Car,
  Coffee,
  Package,
  Scissors,
  Shirt,
  Wrench,
} from "lucide-react";
import type { TenantCode } from "@/lib/registries/tenants";

type TenantIcon = typeof Car;

/** Per-entity icon for switcher, cards, and sidebar header. */
export const TENANT_ICON: Record<TenantCode, TenantIcon> = {
  VA: Car,
  VP: Car,
  VW: Package,
  VISP: Wrench,
  VSP: Wrench,
  VC: Coffee,
  VS: Scissors,
  VKW: Shirt,
};

export const VAG_ICON: TenantIcon = Building2;

export function iconForTenantCode(code: string): TenantIcon {
  if (code === "VAG" || code === "admin") return VAG_ICON;
  if (code === "SP") return TENANT_ICON.VSP;
  if (code in TENANT_ICON) return TENANT_ICON[code as TenantCode];
  return Building2;
}
