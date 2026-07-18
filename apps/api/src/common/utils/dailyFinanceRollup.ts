import type { LedgerEntryType, Prisma } from '@prisma/client';

type FinanceClient = {
  tenantDailyFinance: {
    upsert: (args: {
      where: { tenantId_date: { tenantId: string; date: Date } };
      create: {
        id: string;
        tenantId: string;
        date: Date;
        revenue: number;
        costs: number;
        expenses: number;
        net: number;
        currency: string;
      };
      update: {
        revenue: { increment: number };
        costs: { increment: number };
        expenses: { increment: number };
        net: { increment: number };
        currency: string;
      };
    }) => Promise<unknown>;
    aggregate: (args: {
      where: {
        tenantId: string;
        date: { gte: Date; lte: Date };
      };
      _sum: {
        revenue: true;
        costs: true;
        expenses: true;
        net: true;
      };
    }) => Promise<{
      _sum: {
        revenue: Prisma.Decimal | null;
        costs: Prisma.Decimal | null;
        expenses: Prisma.Decimal | null;
        net: Prisma.Decimal | null;
      };
    }>;
  };
};

function dayStart(date: Date): Date {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

function rollupId(tenantId: string, date: Date): string {
  return `${tenantId}:${dayStart(date).toISOString().slice(0, 10)}`;
}

function deltaForType(type: LedgerEntryType, amount: number) {
  return {
    revenue: type === 'revenue' ? amount : 0,
    costs: type === 'cost' ? amount : 0,
    expenses: type === 'expense' ? amount : 0,
    net:
      type === 'revenue'
        ? amount
        : type === 'cost' || type === 'expense'
          ? -amount
          : 0,
  };
}

export async function applyDailyFinanceDelta(
  db: FinanceClient,
  tenantId: string,
  date: Date,
  type: LedgerEntryType,
  amount: number,
  currency = 'NGN',
): Promise<void> {
  const day = dayStart(date);
  const delta = deltaForType(type, amount);

  await db.tenantDailyFinance.upsert({
    where: { tenantId_date: { tenantId, date: day } },
    create: {
      id: rollupId(tenantId, day),
      tenantId,
      date: day,
      revenue: delta.revenue,
      costs: delta.costs,
      expenses: delta.expenses,
      net: delta.net,
      currency,
    },
    update: {
      revenue: { increment: delta.revenue },
      costs: { increment: delta.costs },
      expenses: { increment: delta.expenses },
      net: { increment: delta.net },
      currency,
    },
  });
}

export async function sumDailyFinanceRollup(
  db: FinanceClient,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<{
  revenue: number;
  costs: number;
  expenses: number;
  net: number;
}> {
  const agg = await db.tenantDailyFinance.aggregate({
    where: {
      tenantId,
      date: { gte: dayStart(from), lte: dayStart(to) },
    },
    _sum: {
      revenue: true,
      costs: true,
      expenses: true,
      net: true,
    },
  });

  return {
    revenue: Number(agg._sum.revenue ?? 0),
    costs: Number(agg._sum.costs ?? 0),
    expenses: Number(agg._sum.expenses ?? 0),
    net: Number(agg._sum.net ?? 0),
  };
}
