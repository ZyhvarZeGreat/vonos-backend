import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  ContactDueSummary,
  ContactLedgerEntry,
  CreateCustomerInput,
  Customer,
  CustomerFilters,
  CustomerProfile,
  CustomerTransactionHistoryEntry,
  CsvImportResult,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import type { PaginatedList } from '../../common/utils/paginatedList';
import { parseCsv, pickCsvField } from '../../common/utils/csvImport';
import { toIso, toNumber } from '../../common/utils/serializers';
import { AuditService } from '../audit/audit.service';

type SaleRow = {
  id?: string;
  reference?: string;
  total: string | number | { toString(): string } | null;
  currency?: string;
  status?: string;
  paymentStatus?: string | null;
  date?: Date;
  payments?: { amount: string | number | { toString(): string } | null }[];
};

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function saleTotals(sales: SaleRow[]) {
  let totalSell = 0;
  let totalSellDue = 0;
  let totalSellPaid = 0;
  let totalSellReturn = 0;
  for (const sale of sales) {
    const total = toNumber(sale.total);
    const paid = (sale.payments ?? []).reduce(
      (sum, p) => sum + toNumber(p.amount),
      0,
    );
    const isReturn =
      sale.status === 'refunded' ||
      sale.status === 'partially_refunded' ||
      sale.status === 'written_off';
    if (isReturn) {
      totalSellReturn += total;
    } else {
      totalSell += total;
      totalSellPaid += paid;
      if (sale.paymentStatus === 'due' || sale.paymentStatus === 'partial') {
        totalSellDue += Math.max(0, total - paid);
      }
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

function serializeCustomer(
  row: {
    id: string;
    tenantId: string;
    name: string;
    email: string | null;
    phone: string | null;
    customerGroupId?: string | null;
    customerGroup?: { name: string } | null;
    assignedToUserId?: string | null;
    assignedToUser?: { name: string } | null;
    openingBalance?: { toString(): string } | number | null;
    totalSell?: { toString(): string } | number | null;
    totalSellDue?: { toString(): string } | number | null;
    totalSellPaid?: { toString(): string } | number | null;
    totalSellReturn?: { toString(): string } | number | null;
    totalAdvance?: { toString(): string } | number | null;
    visitCount?: number | null;
    status?: string | null;
    createdByUserId: string | null;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
    sales?: SaleRow[];
  },
  extras?: {
    contactId?: string | null;
    totalSell?: number;
    totalSellDue?: number;
    totalSellPaid?: number;
    totalSellReturn?: number;
    totalAdvance?: number;
    transactionHistory?: CustomerTransactionHistoryEntry[];
  },
): CustomerProfile {
  const sales = row.sales ?? [];
  const computed = sales.length > 0 ? saleTotals(sales) : null;
  const openingBalance = toNumber(row.openingBalance ?? 0);
  const storedTotalSell = row.totalSell != null ? toNumber(row.totalSell) : null;
  const storedVisitCount = row.visitCount ?? null;

  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    customerGroupId: row.customerGroupId ?? null,
    customerGroupName: row.customerGroup?.name ?? null,
    assignedToUserId: row.assignedToUserId ?? null,
    assignedToName: row.assignedToUser?.name ?? null,
    openingBalance,
    totalSpend: storedTotalSell ?? computed?.totalSell ?? 0,
    visitCount: storedVisitCount ?? computed?.visitCount ?? 0,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    contactId: extras?.contactId ?? row.id.slice(0, 8).toUpperCase(),
    businessName: row.name,
    taxNumber: null,
    totalSell: extras?.totalSell ?? storedTotalSell ?? computed?.totalSell ?? 0,
    totalSellDue: extras?.totalSellDue ?? (row.totalSellDue != null ? toNumber(row.totalSellDue) : computed?.totalSellDue ?? 0),
    totalSellPaid: extras?.totalSellPaid ?? (row.totalSellPaid != null ? toNumber(row.totalSellPaid) : computed?.totalSellPaid ?? 0),
    totalSellReturn: extras?.totalSellReturn ?? (row.totalSellReturn != null ? toNumber(row.totalSellReturn) : computed?.totalSellReturn ?? 0),
    totalAdvance: extras?.totalAdvance ?? (row.totalAdvance != null ? toNumber(row.totalAdvance) : computed?.totalAdvance ?? 0),
    status: (row.status === 'inactive' ? 'inactive' : 'active') as
      | 'active'
      | 'inactive',
    transactionHistory: extras?.transactionHistory ?? [],
  };
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly auditService: AuditService,
  ) {}

  async list(filters: CustomerFilters): Promise<PaginatedList<Customer>> {
    const tenantId = this.tenantDb.requireTenantId();
    const sinceCutoff =
      filters.hasNoSellMonths != null
        ? monthsAgo(filters.hasNoSellMonths)
        : null;
    const pagination = buildCompositeCursorQuery({
      sortField: 'name',
      sortDir: 'asc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'string',
    });

    const baseWhere = {
      tenantId,
      deletedAt: null,
      ...(filters.customerGroupId
        ? { customerGroupId: filters.customerGroupId }
        : {}),
      ...(filters.assignedToUserId
        ? { assignedToUserId: filters.assignedToUserId }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.openingBalance ? { openingBalance: { gt: 0 } } : {}),
      ...(filters.sellDue ? { totalSellDue: { gt: 0 } } : {}),
      ...(filters.advanceBalance ? { totalAdvance: { gt: 0 } } : {}),
      ...(filters.sellReturn ? { totalSellReturn: { gt: 0 } } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              { email: { contains: filters.search, mode: 'insensitive' as const } },
              { phone: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(sinceCutoff
        ? {
            NOT: {
              sales: {
                some: {
                  deletedAt: null,
                  status: 'completed' as const,
                  date: { gte: sinceCutoff },
                },
              },
            },
          }
        : {}),
    };

    const [rows, totalCount] = await Promise.all([
      this.tenantDb.db.customer.findMany({
        where: {
          ...baseWhere,
          ...(pagination.where ?? {}),
        },
        include: {
          customerGroup: { select: { name: true } },
          assignedToUser: { select: { name: true } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: pagination.take,
      }),
      this.tenantDb.db.customer.count({ where: baseWhere }),
    ]);

    if (rows.length === 0) return { items: [], totalCount };

    // Only the current page — never the whole tenant's legacy map.
    const legacyIds = await this.tenantDb.db.migrationLegacyId.findMany({
      where: {
        tenantId,
        entityType: 'customer',
        newId: { in: rows.map((row) => row.id) },
      },
      select: { newId: true, legacyId: true },
    });
    const legacyById = new Map(
      legacyIds.map((l) => [l.newId, `CU${String(l.legacyId).padStart(4, '0')}`]),
    );

    const items = rows.map((row) =>
      serializeCustomer(row, { contactId: legacyById.get(row.id) ?? null }),
    );

    return { items, totalCount };
  }

  async create(dto: CreateCustomerInput): Promise<Customer> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Customer name is required');
    }
    const createdBy = await this.auditService.createdByFields();
    const row = await this.tenantDb.db.customer.create({
      data: {
        tenantId,
        name,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        customerGroupId: dto.customerGroupId?.trim() || null,
        assignedToUserId: dto.assignedToUserId?.trim() || null,
        openingBalance: dto.openingBalance ?? 0,
        status: dto.status ?? 'active',
        ...createdBy,
      },
      include: {
        customerGroup: { select: { name: true } },
        assignedToUser: { select: { name: true } },
      },
    });
    await this.auditService.log({
      action: 'created',
      entityType: 'customer',
      entityId: row.id,
      summary: `Created customer ${row.name}`,
    });
    return serializeCustomer({ ...row, sales: [] });
  }

  async getById(id: string): Promise<CustomerProfile> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customerGroup: { select: { name: true } },
        assignedToUser: { select: { name: true } },
        sales: {
          where: { deletedAt: null },
          select: {
            id: true,
            reference: true,
            total: true,
            currency: true,
            status: true,
            paymentStatus: true,
            date: true,
            payments: { where: { deletedAt: null }, select: { amount: true } },
          },
          orderBy: { date: 'desc' },
          take: 100,
        },
        jobs: {
          where: { deletedAt: null },
          select: {
            id: true,
            reference: true,
            status: true,
            invoiceAmount: true,
            quoteAmount: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        appointments: {
          where: { deletedAt: null },
          select: {
            id: true,
            serviceName: true,
            servicePrice: true,
            currency: true,
            status: true,
            startTime: true,
          },
          orderBy: { startTime: 'desc' },
          take: 50,
        },
      },
    });
    if (!row) throw new NotFoundException('Customer not found');

    const computed = saleTotals(row.sales);

    const transactionHistory: CustomerTransactionHistoryEntry[] = [
      ...row.sales.map((sale) => ({
        id: sale.id,
        kind: 'sale' as const,
        reference: sale.reference,
        date: toIso(sale.date),
        amount: toNumber(sale.total),
        currency: sale.currency,
        status: sale.status,
        paymentStatus: sale.paymentStatus,
      })),
      ...row.jobs.map((job) => ({
        id: job.id,
        kind: 'job' as const,
        reference: job.reference,
        date: toIso(job.dueDate ?? job.createdAt),
        amount: toNumber(job.invoiceAmount ?? job.quoteAmount ?? 0),
        currency: 'NGN',
        status: job.status,
        paymentStatus: null,
      })),
      ...row.appointments.map((appt) => ({
        id: appt.id,
        kind: 'appointment' as const,
        reference: appt.serviceName,
        date: toIso(appt.startTime),
        amount: toNumber(appt.servicePrice),
        currency: appt.currency,
        status: appt.status,
        paymentStatus: null,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return serializeCustomer(row, {
      ...computed,
      transactionHistory,
    });
  }

  async getContact(id: string): Promise<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    totalSellDue: number;
    visitCount: number;
    createdAt: string;
    status: 'active' | 'inactive';
  }> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        totalSellDue: true,
        visitCount: true,
        createdAt: true,
        status: true,
      },
    });
    if (!row) throw new NotFoundException('Customer not found');
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      totalSellDue: toNumber(row.totalSellDue),
      visitCount: row.visitCount,
      createdAt: toIso(row.createdAt),
      status: row.status === 'inactive' ? 'inactive' : 'active',
    };
  }

  async getSummary(id: string): Promise<ContactDueSummary> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        totalSell: true,
        totalSellPaid: true,
        totalSellDue: true,
      },
    });
    if (!row) throw new NotFoundException('Customer not found');
    return {
      contactId: row.id,
      totalAmount: toNumber(row.totalSell),
      totalPaid: toNumber(row.totalSellPaid),
      totalDue: toNumber(row.totalSellDue),
      currency: 'NGN',
    };
  }

  async getLedger(
    id: string,
    cursor?: string,
    limit = 50,
  ): Promise<ContactLedgerEntry[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const customer = await this.tenantDb.db.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const sales = await this.tenantDb.db.sale.findMany({
      where: { tenantId, customerId: id, deletedAt: null },
      select: { id: true, reference: true },
    });
    const saleIds = sales.map((sale) => sale.id);
    const saleRefById = new Map(sales.map((sale) => [sale.id, sale.reference]));

    const pagination = buildCompositeCursorQuery({
      sortField: 'date',
      sortDir: 'desc',
      cursor,
      limit,
      sortValueType: 'date',
    });
    const ledgerRows = await this.tenantDb.db.ledgerEntry.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { linkedRecordType: 'sale', linkedRecordId: { in: saleIds } },
          {
            linkedRecordType: 'payment',
            linkedRecordId: {
              in: (
                await this.tenantDb.db.payment.findMany({
                  where: { tenantId, saleId: { in: saleIds }, deletedAt: null },
                  select: { id: true },
                })
              ).map((payment) => payment.id),
            },
          },
        ],
        ...(pagination.where ?? {}),
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: pagination.take,
    });

    return ledgerRows.map((entry) => ({
      id: entry.id,
      date: toIso(entry.date),
      type: entry.type,
      description: entry.description,
      amount: toNumber(entry.amount),
      currency: entry.currency,
      linkedRecordType: entry.linkedRecordType,
      linkedRecordId: entry.linkedRecordId,
      reference:
        entry.linkedRecordType === 'sale' && entry.linkedRecordId
          ? (saleRefById.get(entry.linkedRecordId) ?? null)
          : null,
    }));
  }

  async importCsv(csv: string): Promise<CsvImportResult> {
    const rows = parseCsv(csv);
    const result: CsvImportResult = { created: 0, updated: 0, errors: [] };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const name = pickCsvField(row, 'name', 'business name', 'customer name');
      if (!name) {
        result.errors.push({ row: index + 2, message: 'Name is required' });
        continue;
      }
      try {
        await this.create({
          name,
          email: pickCsvField(row, 'email') || undefined,
          phone: pickCsvField(row, 'phone', 'mobile', 'contact number') || undefined,
        });
        result.created += 1;
      } catch (error) {
        result.errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Import failed',
        });
      }
    }

    return result;
  }
}
