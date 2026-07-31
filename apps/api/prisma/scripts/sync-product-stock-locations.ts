/**
 * Set VW / VISP / VSP tenant `config.businessLocations` to the product stock
 * homes (VW, VISP, VSP). Merges address fields from existing rows when codes match.
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/sync-product-stock-locations.ts
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const PRODUCT_STOCK_BUSINESS_LOCATIONS = [
  { code: "VW", name: "Vonos Warehouse" },
  { code: "VISP", name: "Vonos Institute Spare Parts" },
  { code: "VSP", name: "Vonos SP Marketplace" },
] as const;

const TARGET_CODES = ["VW", "VISP", "VSP"] as const;

type Loc = {
  code: string;
  name: string;
  landmark?: string;
  city?: string;
  zipCode?: string;
  state?: string;
  country?: string;
  mobile?: string;
  alternateNumber?: string;
  email?: string;
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.tenant.findMany({
      where: { code: { in: [...TARGET_CODES] } },
      select: { id: true, code: true, config: true },
    });

    for (const tenant of tenants) {
      const config = (tenant.config ?? {}) as Record<string, unknown>;
      const existing = Array.isArray(config.businessLocations)
        ? (config.businessLocations as Loc[])
        : [];
      const byCode = new Map(
        existing.map((row) => [row.code.trim().toUpperCase(), row]),
      );

      const next: Loc[] = PRODUCT_STOCK_BUSINESS_LOCATIONS.map((base) => {
        const prev = byCode.get(base.code);
        if (!prev) return { ...base };
        return {
          ...base,
          landmark: prev.landmark,
          city: prev.city,
          zipCode: prev.zipCode,
          state: prev.state,
          country: prev.country,
          mobile: prev.mobile,
          alternateNumber: prev.alternateNumber,
          email: prev.email,
        };
      });

      const nextConfig = {
        ...config,
        businessLocations: next,
      } as unknown as Prisma.InputJsonValue;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { config: nextConfig },
      });

      console.log(
        `Updated ${tenant.code}: ${next.map((l) => l.code).join(", ")}`,
      );
    }

    console.log(`Done. ${tenants.length} tenant(s) updated.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
