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
import { buildCursorQuery } from '../../common/utils/pagination';
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

function serializeCustomer(
  row: {
    id: string;
    tenantId: string;
    name: string;
    email: string | null;
    phone: string | null;
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
    transactionHistory?: CustomerTransactionHistoryEntry[];
  },
): CustomerProfile {
  const sales = row.sales ?? [];
  let totalSell = 0;
  let totalSellDue = 0;
  let totalSellPaid = 0;
  for (const sale of sales) {
    const total = toNumber(sale.total);
    totalSell += total;
    const paid = (sale.payments ?? []).reduce(
      (sum, p) => sum + toNumber(p.amount),
      0,
    );
    totalSellPaid += paid;
    if (sale.paymentStatus === 'due' || sale.paymentStatus === 'partial') {
      totalSellDue += Math.max(0, total - paid);
    }
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    totalSpend: sales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
    visitCount: sales.length,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    contactId: extras?.contactId ?? row.id.slice(0, 8).toUpperCase(),
    businessName: row.name,
    taxNumber: null,
    openingBalance: 0,
    totalSell: extras?.totalSell ?? totalSell,
    totalSellDue: extras?.totalSellDue ?? totalSellDue,
    totalSellPaid: extras?.totalSellPaid ?? totalSellPaid,
    status: 'active',
    transactionHistory: extras?.transactionHistory ?? [],
  };
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly auditService: AuditService,
  ) {}

  async list(filters: CustomerFilters): Promise<Customer[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const [rows, legacyIds] = await Promise.all([
      this.tenantDb.db.customer.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(filters.search
            ? {
                OR: [
                  { name: { contains: filters.search, mode: 'insensitive' } },
                  { email: { contains: filters.search, mode: 'insensitive' } },
                  { phone: { contains: filters.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          sales: {
            where: { deletedAt: null },
            select: {
              total: true,
              paymentStatus: true,
              payments: { where: { deletedAt: null }, select: { amount: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
        ...buildCursorQuery(filters.cursor, filters.limit ?? 50),
      }),
      this.tenantDb.db.migrationLegacyId.findMany({
        where: { tenantId, entityType: 'customer' },
        select: { newId: true, legacyId: true },
      }),
    ]);

    const legacyById = new Map(
      legacyIds.map((l) => [l.newId, `CU${String(l.legacyId).padStart(4, '0')}`]),
    );

    return rows.map((row) =>
      serializeCustomer(row, { contactId: legacyById.get(row.id) ?? null }),
    );
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
        ...createdBy,
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

    let totalSell = 0;
    let totalSellDue = 0;
    let totalSellPaid = 0;
    for (const sale of row.sales) {
      const total = toNumber(sale.total);
      totalSell += total;
      const paid = sale.payments.reduce(
        (sum, p) => sum + toNumber(p.amount),
        0,
      );
      totalSellPaid += paid;
      if (sale.paymentStatus === 'due' || sale.paymentStatus === 'partial') {
        totalSellDue += Math.max(0, total - paid);
      }
    }

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
      totalSell,
      totalSellDue,
      totalSellPaid,
      transactionHistory,
    });
  }

  async getSummary(id: string): Promise<ContactDueSummary> {
    const profile = await this.getById(id);
    return {
      contactId: profile.id,
      totalAmount: profile.totalSell ?? profile.totalSpend,
      totalPaid: profile.totalSellPaid ?? 0,
      totalDue: profile.totalSellDue ?? 0,
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
      },
      orderBy: { date: 'desc' },
      ...buildCursorQuery(cursor, limit),
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
