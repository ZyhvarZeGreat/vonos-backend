import type { CreateFlowKey } from "@/lib/registries/createFlows";
import { getEntityPage } from "@/lib/registries/entityPages";

/** Layout/TopBar needs — excludes View so callers signal intent clearly. */
export interface EntityPageMeta {
  title: string;
  primaryActionLabel?: string;
  openCreateOnPrimary?: boolean;
  createFlowKey?: CreateFlowKey;
  createCopy?: { title: string; subtitle: string; submitLabel: string };
  /** @deprecated use createCopy */
  newOrderCopy?: { title: string; subtitle: string; submitLabel: string };
}

export function getEntityPageMeta(
  tenantCode: string,
  slug: string,
): EntityPageMeta | null {
  const page = getEntityPage(tenantCode, slug);
  if (!page) return null;
  return {
    title: page.title,
    primaryActionLabel: page.primaryActionLabel,
    openCreateOnPrimary: page.openCreateOnPrimary,
    createFlowKey: page.createFlowKey,
    createCopy: page.createCopy,
    newOrderCopy: page.newOrderCopy,
  };
}
