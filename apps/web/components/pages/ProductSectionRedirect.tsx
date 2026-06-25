"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductSectionId } from "@/components/organisms/ProductMetaPanel";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";

function listSlugForArchetype(
  code: string,
  archetype: "stock" | "transaction" | "job" | "appointment" | undefined,
): string {
  if (archetype === "transaction") {
    return code === "VC" ? "menu-items" : "catalog";
  }
  return "inventory";
}

const SECTION_BY_SLUG: Record<string, ProductSectionId> = {
  categories: "categories",
  brands: "brands",
  units: "units",
  warranties: "warranties",
  "price-groups": "price-groups",
  "update-price": "products",
};

export function ProductSectionRedirect({ section }: { section: ProductSectionId }) {
  const router = useRouter();
  const { tenantCode, config } = useRouteTenant();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!tenantCode) return;
    const listSlug = listSlugForArchetype(tenantCode, config?.archetype ?? undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", section);
    router.replace(`/${tenantCode}/${listSlug}?${params.toString()}`);
  }, [tenantCode, config?.archetype, router, searchParams, section]);

  return null;
}

export function ProductSlugRedirect({ slug }: { slug: keyof typeof SECTION_BY_SLUG }) {
  const section = SECTION_BY_SLUG[slug] ?? "products";
  return <ProductSectionRedirect section={section} />;
}
