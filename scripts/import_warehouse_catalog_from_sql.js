/**
 * Resume: set imageUrls + import missing products for VA/VISP/VSP.
 * Uses bulk SQL for image updates (Neon-friendly).
 */
const { PrismaClient, StockStatus, Prisma } = require("@prisma/client");
const { createId } = require("@paralleldrive/cuid2");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const catalog = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../tmp/warehouse_catalog_import.json"),
    "utf8",
  ),
);

const TENANTS = [
  { id: "tenant_vw_001", code: "VW", retail: false },
  { id: "tenant_va_001", code: "VA", retail: false },
  { id: "tenant_visp_001", code: "VISP", retail: true },
  { id: "tenant_vsp_001", code: "VSP", retail: true },
];

function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function bulkSetImages(updates) {
  let set = 0;
  for (let i = 0; i < updates.length; i += 200) {
    const chunk = updates.slice(i, i + 200);
    // UPDATE ... FROM (VALUES ...)
    const values = chunk
      .map(
        (u, idx) =>
          `($${idx * 2 + 1}::text, $${idx * 2 + 2}::text)`,
      )
      .join(",");
    const params = chunk.flatMap((u) => [u.id, u.imageUrl]);
    await prisma.$executeRawUnsafe(
      `UPDATE "Item" AS i
       SET "imageUrl" = v.url, "updatedAt" = NOW()
       FROM (VALUES ${values}) AS v(id, url)
       WHERE i.id = v.id`,
      ...params,
    );
    set += chunk.length;
    console.log(`  images ${set}/${updates.length}`);
  }
  return set;
}

async function upsertTenant(tenant) {
  console.log(`\n=== ${tenant.code} ===`);
  const existing = await prisma.$queryRaw`
    SELECT id, sku, "imageUrl"
    FROM "Item"
    WHERE "tenantId" = ${tenant.id} AND "deletedAt" IS NULL
  `;
  const bySku = new Map(
    existing.map((i) => [String(i.sku).trim().toLowerCase(), i]),
  );
  console.log(`  existing=${existing.length}`);

  const toCreate = [];
  const imageUpdates = [];

  for (const row of catalog) {
    const sku = String(row.sku || "").trim();
    const name = String(row.name || "Unknown").trim();
    if (!sku && !name) continue;
    const skuKey = (sku || name).toLowerCase();
    const hit = bySku.get(skuKey);
    const imageUrl = row.imageUrl || null;
    const cost = money(row.costPrice);
    const sell = row.sellPrice != null ? money(row.sellPrice) : null;
    const availableForRetail = tenant.retail
      ? true
      : Boolean(row.availableForRetail);

    if (!hit) {
      const id = `imp_${createId().slice(0, 24)}`;
      const finalSku = (sku || `SKU-${id}`).slice(0, 191);
      toCreate.push({
        id,
        tenantId: tenant.id,
        sku: finalSku,
        name: name.slice(0, 255),
        quantity: 0,
        costPrice: new Prisma.Decimal(cost),
        sellPrice: sell != null ? new Prisma.Decimal(sell) : null,
        currency: "NGN",
        status: StockStatus.out_of_stock,
        availableForRetail,
        imageUrl,
      });
      bySku.set(finalSku.toLowerCase(), { id, sku: finalSku, imageUrl });
    } else if (imageUrl && hit.imageUrl !== imageUrl) {
      imageUpdates.push({ id: hit.id, imageUrl });
    }
  }

  console.log(
    `  toCreate=${toCreate.length} imageUpdates=${imageUpdates.length}`,
  );

  let created = 0;
  for (let i = 0; i < toCreate.length; i += 250) {
    const chunk = toCreate.slice(i, i + 250);
    await prisma.item.createMany({ data: chunk });
    created += chunk.length;
    console.log(`  created ${created}/${toCreate.length}`);
  }

  const imagesSet = await bulkSetImages(imageUpdates);
  const withImg = await prisma.item.count({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      imageUrl: { not: null },
    },
  });
  const total = await prisma.item.count({
    where: { tenantId: tenant.id, deletedAt: null },
  });
  const result = { created, imagesSet, total, withImg };
  console.log(result);
  return result;
}

async function main() {
  console.log(`catalog=${catalog.length}`);
  const results = {};
  for (const t of TENANTS) {
    results[t.code] = await upsertTenant(t);
  }
  fs.writeFileSync(
    path.join(__dirname, "../tmp/warehouse_catalog_import_result.json"),
    JSON.stringify(results, null, 2),
  );
  console.log("\nDone");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
