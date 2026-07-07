import type { TenantScopedPrisma } from '../../../common/prisma/prisma.service';
import { toNumber } from '../../../common/utils/serializers';
import { inWindow, resolveDateWindow, type DateWindow } from './date-utils';

export interface NormalizedJobMaterial {
  name: string;
  quantity: number;
  cost: number;
  itemId: string | null;
}

export interface NormalizedJobSale {
  id: string;
  reference: string;
  date: Date;
  revenue: number;
  directCost: number;
  customerName: string;
  locationCode: string | null;
  staffName: string | null;
  materials: NormalizedJobMaterial[];
  labourCost: number;
}

export interface JobReportContext {
  window: DateWindow;
  periodJobs: NormalizedJobSale[];
  currency: string;
}

function jobRevenue(
  invoiceAmount: unknown,
  quoteAmount: unknown,
): number {
  const invoice = invoiceAmount != null ? toNumber(invoiceAmount) : 0;
  if (invoice > 0) return invoice;
  return quoteAmount != null ? toNumber(quoteAmount) : 0;
}

export async function loadJobReportContext(
  db: TenantScopedPrisma,
  from?: string,
  to?: string,
): Promise<JobReportContext> {
  const window = resolveDateWindow(from, to);

  const jobs = await db.job.findMany({
    where: {
      deletedAt: null,
      status: 'Delivered',
      updatedAt: { gte: window.from, lte: window.to },
    },
    select: {
      id: true,
      reference: true,
      updatedAt: true,
      invoiceAmount: true,
      quoteAmount: true,
      customerName: true,
      locationCode: true,
      createdByName: true,
      customer: { select: { name: true } },
      materials: {
        select: {
          name: true,
          quantity: true,
          totalCost: true,
          itemId: true,
        },
      },
      labourEntries: { select: { totalCost: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const periodJobs: NormalizedJobSale[] = jobs
    .map((job) => {
      const materials = job.materials.map((line) => ({
        name: line.name,
        quantity: toNumber(line.quantity),
        cost: toNumber(line.totalCost),
        itemId: line.itemId,
      }));
      const materialCost = materials.reduce((sum, line) => sum + line.cost, 0);
      const labourCost = job.labourEntries.reduce(
        (sum, line) => sum + toNumber(line.totalCost),
        0,
      );
      const directCost = materialCost + labourCost;
      const revenue = jobRevenue(job.invoiceAmount, job.quoteAmount);

      return {
        id: job.id,
        reference: job.reference,
        date: job.updatedAt,
        revenue,
        directCost,
        customerName:
          job.customer?.name?.trim() ||
          job.customerName?.trim() ||
          'Walk-in',
        locationCode: job.locationCode,
        staffName: job.createdByName,
        materials,
        labourCost,
      };
    })
    .filter((job) => job.revenue > 0 || job.directCost > 0);

  return {
    window,
    periodJobs: periodJobs.filter((job) => inWindow(job.date, window)),
    currency: 'NGN',
  };
}

export async function computeJobRevenueTotal(
  db: TenantScopedPrisma,
  from?: string,
  to?: string,
): Promise<{ revenue: number; directCost: number }> {
  const ctx = await loadJobReportContext(db, from, to);
  return ctx.periodJobs.reduce(
    (acc, job) => ({
      revenue: acc.revenue + job.revenue,
      directCost: acc.directCost + job.directCost,
    }),
    { revenue: 0, directCost: 0 },
  );
}
