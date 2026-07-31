/**
 * Seed Ultimate POS HQ expense categories into Vonos tenants.
 * Source: legacy `expense_categories` (active rows from localhost dump).
 *
 * Usage (from apps/api):
 *   npx ts-node --transpile-only prisma/scripts/seed-expense-categories.ts
 *   TENANT_CODE=VA npx ts-node --transpile-only prisma/scripts/seed-expense-categories.ts
 *   npx ts-node --transpile-only prisma/scripts/seed-expense-categories.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const onlyCode = (process.env.TENANT_CODE ?? '').trim().toUpperCase();

const OPERATING = new Set([
  'VA',
  'VW',
  'VISP',
  'VSP',
  'VP',
  'VC',
  'VS',
  'VKW',
]);

/** Active HQ categories (deleted_at IS NULL) + DIRECT / INDIRECT. */
const EXPENSE_CATEGORIES: ReadonlyArray<{ name: string; code: string | null }> =
  [
    { name: 'AIRTIME AND DATA', code: null },
    { name: 'BOSS EXPENSES', code: null },
    { name: 'CASH BACK', code: null },
    { name: 'CLEARING OF CAR', code: null },
    { name: 'COMPANY BIKE EXPENSES', code: 'CBE' },
    { name: 'CUSTOMER WATER', code: null },
    { name: 'DETERGENT/WASHES', code: null },
    { name: 'DEVELOPMENT CONTROL', code: null },
    { name: 'DIESEL', code: null },
    { name: 'DIRECT', code: 'DR' },
    { name: 'ELECTRICAL MATERIALS', code: null },
    { name: 'Electricity bill', code: null },
    { name: 'EQUIPMENTS AND TOOLS', code: null },
    { name: 'I.O.U', code: null },
    { name: 'INDIRECT', code: 'IDR' },
    { name: 'INTEREST ON LOAN', code: null },
    { name: 'INTERNETS', code: null },
    { name: 'MISCELLANEOUS', code: null },
    { name: 'MONIE POINT LOAN', code: null },
    { name: 'NEW PLAZA', code: null },
    { name: 'OTHERS TRANSPORT', code: 'OT' },
    { name: 'PAINTING MATERIALS', code: 'P/M' },
    { name: 'PANEL BEATER MATERIAL FOR WORK', code: 'P/B/M/W' },
    { name: 'PENSION FUND', code: null },
    { name: 'PLAZA MAINTENANCE', code: null },
    { name: 'REMITTANCES', code: null },
    { name: 'REPAIRS/MAINTENACE OF EQUIPMENT AND TOOLS', code: null },
    { name: 'SALARY', code: null },
    { name: 'SANDRA WATER/DRINKS', code: null },
    { name: 'SOCIAL MEDIA', code: null },
    { name: 'STAFF AWARDS', code: null },
    { name: 'STAFF HOUSE RENT', code: null },
    { name: 'STAFF LOAN', code: null },
    { name: 'STAFF MEDICAL TREATMENT', code: 'SMT' },
    { name: 'STATIONARY MATERIALS', code: null },
    { name: 'SUBCONTRACTOR WORKMANSHIP', code: null },
    { name: 'TAX', code: null },
    { name: 'WEBSITE', code: null },
    { name: 'WORKSHOP FUEL USAGE', code: 'WFU' },
  ];

async function seedTenant(tenantId: string, code: string) {
  let created = 0;
  let existed = 0;
  let updated = 0;

  for (const cat of EXPENSE_CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: cat.name, mode: 'insensitive' },
      },
      select: { id: true, code: true },
    });

    if (existing) {
      existed += 1;
      if (cat.code && existing.code !== cat.code) {
        if (!dryRun) {
          await prisma.expenseCategory.update({
            where: { id: existing.id },
            data: { code: cat.code },
          });
        }
        updated += 1;
      }
      continue;
    }

    if (!dryRun) {
      await prisma.expenseCategory.create({
        data: {
          tenantId,
          name: cat.name,
          code: cat.code,
        },
      });
    }
    created += 1;
  }

  console.log(
    `${code}: created=${created}, already_present=${existed}, codes_updated=${updated}`,
  );
}

async function main() {
  const tenants = (
    await prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    })
  ).filter((t) => {
    const code = t.code.toUpperCase();
    if (onlyCode) return code === onlyCode;
    return OPERATING.has(code);
  });

  if (tenants.length === 0) {
    throw new Error(
      onlyCode
        ? `Tenant ${onlyCode} not found`
        : 'No operating tenants found to seed',
    );
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        categoryCount: EXPENSE_CATEGORIES.length,
        tenants: tenants.map((t) => t.code),
      },
      null,
      2,
    ),
  );

  for (const tenant of tenants) {
    await seedTenant(tenant.id, tenant.code);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
