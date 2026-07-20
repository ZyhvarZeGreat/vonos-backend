import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ContactDueSummary,
  ContactLedgerEntry,
  CsvImportResult,
  Supplier,
  SupplierFilters,
  SupplierListRow,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { AuditService } from '../audit/audit.service';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import type { PaginatedList } from '../../common/utils/paginatedList';
import { parseCsv, pickCsvField } from '../../common/utils/csvImport';
import { toIso, toNumber } from '../../common/utils/serializers';
import { supplierActivityStatus } from '../../common/utils/supplierRollups';

export interface SupplierKpiSummary {
  totalSuppliers: number;
  onTimeRate: number;
  avgLeadTimeDays: number;
  openPoValue: number;
  currency: string;
}

function serializeSupplier(row: {
  id: string;
  tenantId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  locationCode: string | null;
  notes: string | null;
  openingBalance?: { toString(): string } | number | null;
  assignedToUserId?: string | null;
  assignedToUser?: { name: string } | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Supplier {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    locationCode: row.locationCode,
    notes: row.notes,
    openingBalance: toNumber(row.openingBalance ?? 0),
    assignedToUserId: row.assignedToUserId ?? null,
    assignedToName: row.assignedToUser?.name ?? null,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toListRow(
  row: Parameters<typeof serializeSupplier>[0] & {
    totalPurchase?: { toString(): string } | number;
    totalPurchaseDue?: { toString(): string } | number;
    totalPurchasePaid?: { toString(): string } | number;
    totalPurchaseReturn?: { toString(): string } | number;
    totalAdvance?: { toString(): string } | number;
    lastPurchaseAt?: Date | null;
  },
  extras?: {
    contactId?: string | null;
  },
): SupplierListRow {
  return {
    ...serializeSupplier(row),
    category: 'General',
    leadTimeDays: 7,
    location: row.locationCode ?? row.address ?? '—',
    rating: 4.5,
    contactId: extras?.contactId ?? row.id.slice(0, 8).toUpperCase(),
    businessName: row.name,
    taxNumber: null,
    payTerm: null,
    totalPurchase: toNumber(row.totalPurchase ?? 0),
    totalPurchaseDue: toNumber(row.totalPurchaseDue ?? 0),
    totalPurchasePaid: toNumber(row.totalPurchasePaid ?? 0),
    totalPurchaseReturn: toNumber(row.totalPurchaseReturn ?? 0),
    totalAdvance: toNumber(row.totalAdvance ?? 0),
    status: supplierActivityStatus(row.lastPurchaseAt),
  };
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly auditService: AuditService,
  ) {}

  async list(filters: SupplierFilters = {}): Promise<PaginatedList<SupplierListRow>> {
    const tenantId = this.tenantDb.requireTenantId();
    const activeSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const pagination = buildCompositeCursorQuery({
      sortField: 'name',
      sortDir: 'asc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'string',
    });

    const baseWhere = {
      tenantId,
      deletedAt: null as null,
      ...(filters.assignedToUserId
        ? { assignedToUserId: filters.assignedToUserId }
        : {}),
      ...(filters.openingBalance ? { openingBalance: { gt: 0 } } : {}),
      ...(filters.purchaseDue ? { totalPurchaseDue: { gt: 0 } } : {}),
      ...(filters.purchaseReturn ? { totalPurchaseReturn: { gt: 0 } } : {}),
      ...(filters.advanceBalance ? { totalAdvance: { gt: 0 } } : {}),
      ...(filters.status === 'active'
        ? { lastPurchaseAt: { gte: activeSince } }
        : {}),
      ...(filters.status === 'inactive'
        ? {
            OR: [
              { lastPurchaseAt: null },
              { lastPurchaseAt: { lt: activeSince } },
            ],
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              {
                contactName: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
              { email: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, totalCount] = await Promise.all([
      this.tenantDb.db.supplier.findMany({
        where: {
          ...baseWhere,
          ...(pagination.where ?? {}),
        },
        include: { assignedToUser: { select: { name: true } } },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: pagination.take,
      }),
      this.tenantDb.db.supplier.count({ where: baseWhere }),
    ]);

    if (rows.length === 0) return { items: [], totalCount };

    const legacyIds = await this.tenantDb.db.migrationLegacyId.findMany({
      where: {
        tenantId,
        entityType: 'supplier',
        newId: { in: rows.map((row) => row.id) },
      },
      select: { newId: true, legacyId: true },
    });
    const legacyById = new Map(
      legacyIds.map((l) => [l.newId, `CO${String(l.legacyId).padStart(4, '0')}`]),
    );

    return {
      items: rows.map((row) =>
        toListRow(row, { contactId: legacyById.get(row.id) ?? null }),
      ),
      totalCount,
    };
  }

  async kpiSummary(): Promise<SupplierKpiSummary> {
    const tenantId = this.tenantDb.requireTenantId();
    const total = await this.tenantDb.db.supplier.count({
      where: { tenantId, deletedAt: null },
    });
    return {
      totalSuppliers: total,
      onTimeRate: 92,
      avgLeadTimeDays: 7,
      openPoValue: 0,
      currency: 'NGN',
    };
  }

  async getById(id: string): Promise<SupplierListRow> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { assignedToUser: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Supplier not found');
    return toListRow(row);
  }

  async getMeta(id: string): Promise<{ id: string; name: string }> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!row) throw new NotFoundException('Supplier not found');
    return row;
  }

  async create(body: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    locationCode?: string;
    notes?: string;
    openingBalance?: number;
    assignedToUserId?: string;
  }): Promise<SupplierListRow> {
    const tenantId = this.tenantDb.requireTenantId();
    const createdBy = await this.auditService.createdByFields();
    const locationCode = await this.tenantDb.resolveBusinessLocation(
      body.locationCode,
    );
    const row = await this.tenantDb.db.supplier.create({
      data: {
        tenantId,
        name: body.name,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        locationCode,
        notes: body.notes ?? null,
        openingBalance: body.openingBalance ?? 0,
        assignedToUserId: body.assignedToUserId ?? null,
        ...createdBy,
      },
      include: { assignedToUser: { select: { name: true } } },
    });
    await this.auditService.log({
      action: 'created',
      entityType: 'supplier',
      entityId: row.id,
      summary: `Created supplier ${row.name}`,
    });
    return toListRow(row);
  }

  async update(
    id: string,
    body: Partial<{
      name: string;
      contactName: string;
      email: string;
      phone: string;
      address: string;
      notes: string;
      openingBalance: number;
      assignedToUserId: string;
    }>,
  ): Promise<SupplierListRow> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Supplier not found');

    const row = await this.tenantDb.db.supplier.update({
      where: { id },
      data: body,
      include: { assignedToUser: { select: { name: true } } },
    });
    await this.auditService.log({
      action: 'updated',
      entityType: 'supplier',
      entityId: id,
      summary: `Updated supplier ${row.name}`,
    });
    return toListRow(row);
  }

  async getSummary(id: string): Promise<ContactDueSummary> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        totalPurchase: true,
        totalPurchasePaid: true,
        totalPurchaseDue: true,
      },
    });
    if (!row) throw new NotFoundException('Supplier not found');
    return {
      contactId: row.id,
      totalAmount: toNumber(row.totalPurchase),
      totalPaid: toNumber(row.totalPurchasePaid),
      totalDue: toNumber(row.totalPurchaseDue),
      currency: 'NGN',
    };
  }

  async getLedger(
    id: string,
    cursor?: string,
    limit = 50,
  ): Promise<ContactLedgerEntry[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const supplier = await this.tenantDb.db.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const movements = await this.tenantDb.db.stockMovement.findMany({
      where: { tenantId, supplierId: id, deletedAt: null },
      select: { id: true, reference: true },
    });
    const movementIds = movements.map((movement) => movement.id);
    const refById = new Map(
      movements.map((movement) => [movement.id, movement.reference]),
    );

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
        linkedRecordType: 'stock_movement',
        linkedRecordId: { in: movementIds },
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
        entry.linkedRecordId != null
          ? (refById.get(entry.linkedRecordId) ?? null)
          : null,
    }));
  }

  async importCsv(csv: string): Promise<CsvImportResult> {
    const rows = parseCsv(csv);
    const result: CsvImportResult = { created: 0, updated: 0, errors: [] };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const name = pickCsvField(row, 'name', 'supplier name', 'business name');
      if (!name) {
        result.errors.push({ row: index + 2, message: 'Name is required' });
        continue;
      }
      try {
        await this.create({
          name,
          contactName: pickCsvField(row, 'contact name') || undefined,
          email: pickCsvField(row, 'email') || undefined,
          phone: pickCsvField(row, 'phone', 'mobile') || undefined,
          address: pickCsvField(row, 'address') || undefined,
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
