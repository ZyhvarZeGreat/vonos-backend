import type { Prisma } from '@prisma/client';
import type { TenantScopedPrisma } from '../prisma/prisma.service';
import { toNumber } from './serializers';

type SaleRollupRow = {
  total: Prisma.Decimal;
  status: string;
  paymentStatus: string | null;
  payments: { amount: Prisma.Decimal }[];
};

function saleTotalsFromRows(sales: SaleRollupRow[]) {
  let totalSell = 0;
  let totalSellDue = 0;
  let totalSellPaid = 0;
  let totalSellReturn = 0;

  for (const sale of sales) {
    const total = toNumber(sale.total);
    const paid = sale.payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );
    const isReturn =
      sale.status === 'refunded' ||
      sale.status === 'partially_refunded' ||
      sale.status === 'written_off';

    if (isReturn) {
      totalSellReturn += total;
      continue;
    }

    totalSell += total;
    totalSellPaid += paid;
    if (sale.paymentStatus === 'due' || sale.paymentStatus === 'partial') {
      totalSellDue += Math.max(0, total - paid);
    }
  }

  const totalAdvance = Math.max(0, totalSellPaid - totalSell);
  const visitCount = sales.filter(
    (sale) =>
      sale.status !== 'refunded' &&
      sale.status !== 'partially_refunded' &&
      sale.status !== 'written_off',
  ).length;

  return {
    totalSell,
    totalSellDue,
    totalSellPaid,
    totalSellReturn,
    totalAdvance,
    visitCount,
  };
}

/** Recompute denormalized customer financial rollups from sales history. */
export async function refreshCustomerFinancialRollups(
  db: TenantScopedPrisma,
  customerId: string,
): Promise<void> {
  const sales = await db.sale.findMany({
    where: { customerId, deletedAt: null },
    select: {
      total: true,
      status: true,
      paymentStatus: true,
      payments: {
        where: { deletedAt: null },
        select: { amount: true },
      },
    },
  });

  const totals = saleTotalsFromRows(sales);
  await db.customer.update({
    where: { id: customerId },
    data: totals,
  });
}
