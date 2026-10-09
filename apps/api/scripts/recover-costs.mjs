#!/usr/bin/env node
/**
 * Recover item costPrice from a storage tenant (default VISP) for items that
 * have no cost. Matches by SKU, then by exact name (case-insensitive).
 * Service-like names are skipped (they legitimately have no COGS).
 * Idempotent; dry-run by default; only fills items currently at cost 0.
 *
 *   npm run audit:recover-costs -- --tenant VA --source VISP --dry-run
 *   npm run audit:recover-costs -- --tenant VA --source VISP --apply
 */
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const APPLY = args.includes('--apply');
const DRY = !APPLY;
const TARGET = (opt('--tenant') ?? 'VA').toUpperCase();
const SOURCE = (opt('--source') ?? 'VISP').toUpperCase();
const prisma = new PrismaClient();
const num = (v) => Number(v ?? 0);
const money = (v) => num(v).toLocaleString('en-NG', { maximumFractionDigits: 0 });

const SERVICE = /(DIAGNOS|LABOUR|LABOR|WHEEL|ALIGN|BALANC|PROGRAMMING|INJECTOR|PANEL|ACADEMY|INSTAL|SWAP|CLEAN|WASH|LOGISTIC|CALIBRAT|RETHREAD|FIXING|TINT|POLISH|SERVICE|CLEARING|PAINT|UPHOLST|VULCAN|\bFEE\b|CHARGE|TRANSPORT|DELIVERY|BALANCING)/i;

async function main() {
  const t = await prisma.tenant.findUnique({ where: { code: TARGET }, select: { id: true, name: true } });
  const s = await prisma.tenant.findUnique({ where: { code: SOURCE }, select: { id: true, name: true } });
  if (!t || !s) throw new Error('tenant not found');
  console.log(`COST RECOVERY — ${TARGET} <- ${SOURCE}  [${APPLY ? 'APPLY' : 'dry-run'}]`);

  const targets = await prisma.item.findMany({ where: { tenantId: t.id, deletedAt: null, costPrice: { lte: 0 } }, select: { id: true, sku: true, name: true } });
  const sources = await prisma.item.findMany({ where: { tenantId: s.id, deletedAt: null, costPrice: { gt: 0 } }, select: { sku: true, name: true, costPrice: true } });
  const bySku = new Map(), byName = new Map();
  for (const i of sources) {
    if (i.sku) bySku.set(i.sku.trim().toUpperCase(), num(i.costPrice));
    if (i.name) { const k = i.name.trim().toUpperCase(); if (!byName.has(k)) byName.set(k, num(i.costPrice)); }
  }

  let applied = 0, skippedService = 0, none = 0, total = 0;
  for (const it of targets) {
    const nm = (it.name || '').trim();
    if (SERVICE.test(nm)) { skippedService++; continue; }
    const cost = bySku.get((it.sku || '').trim().toUpperCase()) ?? byName.get(nm.toUpperCase());
    if (!cost || cost <= 0) { none++; continue; }
    total += cost; applied++;
    if (!DRY) await prisma.item.update({ where: { id: it.id }, data: { costPrice: cost } });
  }
  console.log(`  target no-cost items: ${targets.length}`);
  console.log(`  recovered (set costPrice): ${applied}  | services skipped: ${skippedService}  | no source match: ${none}`);
  console.log(`  total cost values applied: ₦${money(total)}`);
  console.log(DRY ? 'dry run — re-run with --apply to write.' : 'done.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
