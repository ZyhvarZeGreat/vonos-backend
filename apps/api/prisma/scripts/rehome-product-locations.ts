/**
 * Remap Item / ItemLocationStock location codes onto each tenant's own
 * product home (VSP→VSP, VISP→VISP, …).
 *
 * Legacy shared-catalog imports left many marketplace rows with
 * locationCode = "VW" ("Vonos Warehouse"), which made VSP pricing feel like
 * a warehouse-only edit.
 *
 * Usage:
 *   npx tsx prisma/scripts/rehome-product-locations.ts
 *   TENANTS=VSP,VISP npx tsx prisma/scripts/rehome-product-locations.ts --execute
 */
import { PrismaClient } from '@prisma/client';

const DEFAULT_TENANTS = ['VSP', 'VISP'] as const;
const SISTER_CODES = new Set(['VA', 'VP', 'VW', 'VISP', 'VSP']);

const execute = process.argv.includes('--execute');
const tenantFilter = (process.env.TENANTS ?? DEFAULT_TENANTS.join(','))
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

async function main() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.tenant.findMany({
      where: { code: { in: tenantFilter }, deletedAt: null },
      select: { id: true, code: true },
    });

    if (tenants.length === 0) {
      console.log(`No tenants matched: ${tenantFilter.join(', ')}`);
      return;
    }

    console.log(
      execute
        ? 'EXECUTE — rewriting foreign product homes to own tenant'
        : 'DRY RUN (pass --execute to apply)',
    );

    for (const tenant of tenants) {
      const home = tenant.code.trim().toUpperCase();
      const foreign = [...SISTER_CODES].filter((c) => c !== home);

      const itemCount = await prisma.item.count({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          locationCode: { in: foreign },
        },
      });

      const stockCount = await prisma.itemLocationStock.count({
        where: {
          item: { tenantId: tenant.id, deletedAt: null },
          locationCode: { in: foreign },
        },
      });

      const blankItems = await prisma.item.count({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          OR: [{ locationCode: null }, { locationCode: '' }],
        },
      });

      console.log(
        `${home}: ${itemCount} item(s) with foreign location, ` +
          `${stockCount} locationStock row(s), ${blankItems} blank location(s)`,
      );

      if (!execute) continue;

      const itemResult = await prisma.item.updateMany({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          locationCode: { in: foreign },
        },
        data: { locationCode: home },
      });

      const blankResult = await prisma.item.updateMany({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          OR: [{ locationCode: null }, { locationCode: '' }],
        },
        data: { locationCode: home },
      });

      // Merge stock rows that would collide after remap (same item + bin).
      const stockRows = await prisma.itemLocationStock.findMany({
        where: {
          item: { tenantId: tenant.id, deletedAt: null },
          locationCode: { in: foreign },
        },
        select: {
          id: true,
          itemId: true,
          locationCode: true,
          binLocation: true,
          quantity: true,
        },
      });

      let stockUpdated = 0;
      let stockMerged = 0;
      for (const row of stockRows) {
        const bin = row.binLocation ?? null;
        const existing = await prisma.itemLocationStock.findFirst({
          where: {
            itemId: row.itemId,
            locationCode: home,
            binLocation: bin,
            NOT: { id: row.id },
          },
          select: { id: true, quantity: true },
        });

        if (existing) {
          await prisma.itemLocationStock.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + row.quantity },
          });
          await prisma.itemLocationStock.delete({ where: { id: row.id } });
          stockMerged += 1;
        } else {
          await prisma.itemLocationStock.update({
            where: { id: row.id },
            data: { locationCode: home },
          });
          stockUpdated += 1;
        }
      }

      console.log(
        `  → items: ${itemResult.count} remapped, ${blankResult.count} filled; ` +
          `stock: ${stockUpdated} remapped, ${stockMerged} merged`,
      );
    }

    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
