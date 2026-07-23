import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MovementSource,
  MovementStatus,
  MovementType,
  PayContactDueRequest,
  PurchasePaymentStatus,
} from '@vonos/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { invalidateTenantDashboardCache } from '../../common/cache/cacheInvalidation';
import { applyDailyFinanceDelta } from '../../common/utils/dailyFinanceRollup';
import { refreshSupplierPurchaseRollups } from '../../common/utils/supplierRollups';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import type { PaginatedList } from '../../common/utils/paginatedList';
import { resolveListSort } from '../../common/utils/listSort';
import {
  computeStockStatus,
  parseMovementLines,
  shouldApplyInboundQty,
  shouldApplyOutboundQty,
} from '../../common/utils/stockQuantity';
import { toIso, toNumber } from '../../common/utils/serializers';
import { adjustItemLocationStock } from '../../common/utils/itemLocationStock';
import {
  serializeMovement,
  toMovementListRow,
  toTransferRow,
  type StockMovementListRow,
  type TransferRow,
  type TransferZoneSummary,
} from './stock-movements.mapper';
import { AuditService } from '../audit/audit.service';
import { InvoiceHubService } from '../invoices/invoice-hub.service';

function movementStatusWhere(
  status?: MovementStatus,
): { status: MovementStatus } | { status: { in: MovementStatus[] } } | Record<string, never> {
  if (!status) return {};
  // Purchase UI maps "Delivered" to Received or Delivered in DB
  if (status === 'Delivered') {
    return { status: { in: ['Received', 'Delivered'] } };
  }
  // Ordered / Pending and other statuses: exact match
  return { status };
}

/** Map transfer list UI status (or tab id) to DB MovementStatus values. */
function transferDbStatuses(
  status?: string,
): MovementStatus[] | undefined {
  if (!status || status === 'all') return undefined;
  switch (status) {
    case 'Pending':
    case 'pending':
      return ['Pending'];
    case 'In Transit':
    case 'in_transit':
      return ['Approved', 'Shipped'];
    case 'Completed':
    case 'completed':
      return ['Received', 'Delivered'];
    case 'Rejected':
    case 'rejected':
      // No dedicated Rejected status in MovementStatus — treat Ordered as cancelled/rejected transfers.
      return ['Ordered'];
    default:
      return undefined;
  }
}

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
    private readonly invoiceHub: InvoiceHubService,
  ) {}

  async list(filters: {
    type?: MovementType;
    status?: MovementStatus;
    source?: MovementSource;
    locationCode?: string;
    supplierId?: string;
    paymentStatus?: PurchasePaymentStatus;
    paymentMethod?: string;
    search?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
  }): Promise<PaginatedList<StockMovementListRow>> {
    const tenantId = this.tenantDb.requireTenantId();
    const dateFilter =
      filters.from || filters.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {};
    const sort = resolveListSort(filters.sortBy, filters.sortDir, {
      date: { field: 'date', type: 'date' },
      reference: { field: 'reference', type: 'string' },
      grandTotal: { field: 'grandTotal', type: 'number' },
      paymentDue: { field: 'paymentDue', type: 'number' },
      status: { field: 'status', type: 'string' },
      createdAt: { field: 'createdAt', type: 'date' },
    }, {
      sortField: 'date',
      sortDir: 'desc',
      sortValueType: 'date',
    });
    const pagination = buildCompositeCursorQuery({
      sortField: sort.sortField,
      sortDir: sort.sortDir,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: sort.sortValueType,
    });
    const baseWhere = {
      tenantId,
      deletedAt: null as null,
      ...(filters.type ? { type: filters.type } : {}),
      ...movementStatusWhere(filters.status),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.locationCode
        ? { locationCode: filters.locationCode }
        : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.paymentStatus
        ? filters.paymentStatus === 'due'
          ? // Migrated purchases often have null paymentStatus; treat as due.
            {
              OR: [
                { paymentStatus: 'due' as const },
                { paymentStatus: null },
              ],
            }
          : { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters.paymentMethod
        ? { paymentMethod: filters.paymentMethod }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                reference: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                supplier: {
                  name: {
                    contains: filters.search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              { notes: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...dateFilter,
    };
    const [rows, totalCount] = await Promise.all([
      this.tenantDb.db.stockMovement.findMany({
        where: {
          ...baseWhere,
          ...(pagination.where ?? {}),
        },
        include: { supplier: { select: { name: true } } },
        orderBy: [{ [sort.sortField]: sort.sortDir }, { id: sort.sortDir }],
        take: pagination.take,
      }),
      this.tenantDb.db.stockMovement.count({ where: baseWhere }),
    ]);
    return {
      items: rows.map(toMovementListRow),
      totalCount,
    };
  }

  async getById(id: string) {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.stockMovement.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Movement not found');
    return serializeMovement(row);
  }

  async updateStatus(id: string, status: MovementStatus) {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.stockMovement.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Movement not found');

    const lines = parseMovementLines(existing.lines);
    const applyInbound =
      existing.type === 'inbound' &&
      shouldApplyInboundQty(existing.status, status);
    const applyOutbound =
      existing.type === 'outbound' &&
      shouldApplyOutboundQty(existing.status, status);

    const inboundCost =
      applyInbound && status === 'Received'
        ? lines.reduce((sum, line) => {
            const unitCost = (line as { unitCost?: number }).unitCost ?? 0;
            return sum + unitCost * line.quantity;
          }, 0)
        : 0;

    if (applyInbound || applyOutbound) {
      const db = this.prisma.forTenant(tenantId);
      await db.$transaction(async (tx) => {
        for (const line of lines) {
          const item = await tx.item.findFirst({
            where: { id: line.itemId, tenantId, deletedAt: null },
          });
          if (!item) {
            throw new BadRequestException(
              `Item not found: ${line.sku || line.itemId}`,
            );
          }

          const delta = applyInbound ? line.quantity : -line.quantity;
          const nextQuantity = item.quantity + delta;
          if (nextQuantity < 0) {
            throw new BadRequestException(
              `Insufficient stock for ${line.sku || item.sku} (need ${line.quantity}, have ${item.quantity})`,
            );
          }

          await tx.item.update({
            where: { id: item.id },
            data: {
              quantity: nextQuantity,
              status: computeStockStatus(nextQuantity, item.reorderPoint),
            },
          });

          await adjustItemLocationStock(tx, {
            tenantId,
            itemId: item.id,
            locationCode: existing.locationCode ?? item.locationCode,
            binLocation: item.binLocation,
            delta,
          });
        }

        await tx.stockMovement.update({
          where: { id },
          data: { status },
        });

        if (applyInbound && status === 'Received') {
          const movementWithSupplier = await tx.stockMovement.findFirst({
            where: { id, tenantId },
            include: { supplier: { select: { name: true } } },
          });
          const invoice = movementWithSupplier
            ? await this.invoiceHub.ensurePurchaseInvoice(tx, {
                ...movementWithSupplier,
                status,
              })
            : null;

          const totalCost = inboundCost;
          if (totalCost > 0) {
            await tx.ledgerEntry.create({
              data: {
                tenantId,
                type: 'cost',
                amount: totalCost,
                currency: 'NGN',
                category: 'Purchases',
                description: `Inbound ${existing.reference}`,
                linkedRecordType: 'stock_movement',
                linkedRecordId: id,
                date: existing.date,
                invoiceId: invoice?.id ?? null,
              },
            });
          }
        }
      });
      if (inboundCost > 0) {
        void applyDailyFinanceDelta(
          this.prisma,
          tenantId,
          existing.date,
          'cost',
          inboundCost,
        );
      }
    } else {
      await this.tenantDb.db.stockMovement.update({
        where: { id },
        data: { status },
      });
    }

    const row = await this.tenantDb.db.stockMovement.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Movement not found');
    await this.auditService.log({
      action: 'updated',
      entityType: 'stockMovement',
      entityId: id,
      summary: `Status → ${status}`,
      metadata: { previousStatus: existing.status, status },
    });
    void invalidateTenantDashboardCache(this.cache, tenantId);
    if (existing.supplierId) {
      void refreshSupplierPurchaseRollups(this.tenantDb.db, existing.supplierId);
    }
    return serializeMovement(row);
  }

  /** Soft-delete purchase/movement (HQ6 Delete → Are you sure?). */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.stockMovement.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, reference: true, supplierId: true },
    });
    if (!existing) throw new NotFoundException('Movement not found');

    await this.tenantDb.db.stockMovement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (existing.supplierId) {
      await refreshSupplierPurchaseRollups(
        this.tenantDb.db,
        existing.supplierId,
      );
    }

    await this.auditService.log({
      action: 'deleted',
      entityType: 'stockMovement',
      entityId: id,
      summary: `Deleted movement ${existing.reference}`,
    });
    void invalidateTenantDashboardCache(this.cache, tenantId);
  }

  /** Pay against a single inbound purchase (HQ6 purchases “Add payment”). */
  async pay(
    id: string,
    dto: PayContactDueRequest,
  ): Promise<{
    movementId: string;
    amountApplied: number;
    currency: string;
    remainingDue: number;
    paymentStatus: string;
  }> {
    const tenantId = this.tenantDb.requireTenantId();
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const movement = await this.tenantDb.db.stockMovement.findFirst({
      where: { id, tenantId, deletedAt: null, type: 'inbound' },
    });
    if (!movement) throw new NotFoundException('Purchase not found');

    const total = parseMovementLines(movement.lines).reduce(
      (sum, line) =>
        sum +
        line.quantity * toNumber((line as { unitCost?: number }).unitCost ?? 0),
      0,
    );
    if (total <= 0) {
      throw new BadRequestException('Purchase has no payable amount');
    }
    if (movement.paymentStatus === 'paid') {
      throw new BadRequestException('Purchase is already paid');
    }

    const priorPaid = await this.tenantDb.db.payment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        paymentFor: 'purchase',
        paymentRefNo: movement.reference,
      },
      _sum: { amount: true },
    });
    const alreadyPaid = toNumber(priorPaid._sum.amount ?? 0);
    const due = Math.max(0, total - alreadyPaid);
    if (due <= 0) {
      throw new BadRequestException('No outstanding due on this purchase');
    }

    const apply = Math.min(amount, due);
    const paidOn = dto.paidOn ? new Date(dto.paidOn) : new Date();
    const method = dto.method?.trim() || 'cash';
    const createdBy = await this.auditService.createdByFields();

    await this.tenantDb.db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          amount: apply,
          currency: 'NGN',
          method,
          paidOn,
          paymentFor: 'purchase',
          paymentRefNo: movement.reference,
          accountId: dto.accountId?.trim() || null,
          note:
            dto.note?.trim() ||
            `Purchase payment — ${movement.reference}`,
          createdByName: createdBy.createdByName ?? null,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'cost',
          amount: apply,
          currency: 'NGN',
          category: 'Supplier Payment',
          description: `Payment on ${movement.reference}`,
          linkedRecordType: 'payment',
          linkedRecordId: payment.id,
          date: paidOn,
        },
      });

      const newPaid = alreadyPaid + apply;
      const paymentStatus = newPaid >= total - 0.001 ? 'paid' : 'partial';
      await tx.stockMovement.update({
        where: { id },
        data: { paymentStatus, paymentMethod: method },
      });
    });

    if (movement.supplierId) {
      await refreshSupplierPurchaseRollups(
        this.tenantDb.db,
        movement.supplierId,
      );
    }

    const remainingDue = Math.max(0, due - apply);
    await this.auditService.log({
      action: 'updated',
      entityType: 'stockMovement',
      entityId: id,
      summary: `Recorded payment of ${apply} on ${movement.reference}`,
    });

    return {
      movementId: id,
      amountApplied: apply,
      currency: 'NGN',
      remainingDue,
      paymentStatus: remainingDue <= 0 ? 'paid' : 'partial',
    };
  }

  async listPayments(id: string): Promise<
    Array<{
      id: string;
      amount: number;
      currency: string;
      method: string | null;
      paymentRefNo: string | null;
      paidOn: string | null;
      note: string | null;
      accountId: string | null;
      accountName: string | null;
      createdByName: string | null;
    }>
  > {
    const tenantId = this.tenantDb.requireTenantId();
    const movement = await this.tenantDb.db.stockMovement.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, reference: true },
    });
    if (!movement) throw new NotFoundException('Movement not found');

    const rows = await this.tenantDb.db.payment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        paymentFor: 'purchase',
        paymentRefNo: movement.reference,
      },
      include: { account: { select: { name: true } } },
      orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      amount: toNumber(row.amount),
      currency: row.currency,
      method: row.method,
      paymentRefNo: row.paymentRefNo,
      paidOn: row.paidOn ? toIso(row.paidOn) : null,
      note: row.note,
      accountId: row.accountId,
      accountName: row.account?.name ?? null,
      createdByName: row.createdByName,
    }));
  }

  async create(body: {
    type: MovementType;
    reference: string;
    status?: MovementStatus;
    paymentStatus?: PurchasePaymentStatus;
    paymentMethod?: string;
    lines: Array<{
      itemId: string;
      sku: string;
      name: string;
      quantity: number;
      unitCost?: number;
    }>;
    notes?: string;
    locationCode?: string;
    supplierId?: string;
    source?: MovementSource;
    date?: string;
  }) {
    const tenantId = this.tenantDb.requireTenantId();
    const createdBy = await this.auditService.createdByFields();
    const locationCode = await this.tenantDb.resolveBusinessLocation(
      body.locationCode,
    );
    const row = await this.tenantDb.db.stockMovement.create({
      data: {
        tenantId,
        type: body.type,
        reference: body.reference,
        status: body.status ?? 'Ordered',
        paymentStatus: body.paymentStatus ?? null,
        paymentMethod: body.paymentMethod?.trim() || null,
        lines: body.lines,
        notes: body.notes ?? null,
        supplierId: body.supplierId ?? null,
        source: body.source ?? 'standard',
        locationCode,
        date: body.date ? new Date(body.date) : new Date(),
        ...createdBy,
      },
      include: { supplier: { select: { name: true } } },
    });

    if (body.type === 'inbound') {
      await this.invoiceHub.ensurePurchaseInvoice(this.tenantDb.db, row);
    }
    await this.auditService.log({
      action: 'created',
      entityType: 'stockMovement',
      entityId: row.id,
      summary: `Created ${body.type} movement ${row.reference}`,
    });
    void invalidateTenantDashboardCache(this.cache, tenantId);
    if (row.supplierId) {
      void refreshSupplierPurchaseRollups(this.tenantDb.db, row.supplierId);
    }
    return serializeMovement(row);
  }

  async listTransfers(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
    from?: string;
    to?: string;
    status?: string;
  }): Promise<TransferRow[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const pagination = buildCompositeCursorQuery({
      sortField: 'date',
      sortDir: 'desc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'date',
    });
    const statusIn = transferDbStatuses(filters.status);
    const rows = await this.tenantDb.db.stockMovement.findMany({
      where: {
        tenantId,
        deletedAt: null,
        type: 'transfer',
        ...(statusIn ? { status: { in: statusIn } } : {}),
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  reference: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                { notes: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(pagination.where ?? {}),
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: pagination.take,
    });
    return rows.map(toTransferRow);
  }

  async transferZones(): Promise<TransferZoneSummary[]> {
    const tenantId = this.tenantDb.requireTenantId();
    type ZoneAgg = {
      zone: string;
      total_skus: bigint;
      total_units: bigint;
    };
    const zoneRows = await this.tenantDb.db.$queryRaw<ZoneAgg[]>`
      SELECT
        COALESCE(
          NULLIF(TRIM(SPLIT_PART("binLocation", '-', 1)), ''),
          'Main Warehouse'
        ) AS zone,
        COUNT(*)::bigint AS total_skus,
        COALESCE(SUM(quantity), 0)::bigint AS total_units
      FROM "Item"
      WHERE "tenantId" = ${tenantId}
        AND "deletedAt" IS NULL
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const pendingTotal = await this.tenantDb.db.stockMovement.count({
      where: {
        tenantId,
        deletedAt: null,
        type: 'transfer',
        status: 'Pending',
      },
    });

    if (zoneRows.length === 0) {
      return [
        {
          id: 'main',
          name: 'Main Warehouse',
          totalSkus: 0,
          totalUnits: 0,
          pendingTransfers: pendingTotal,
          utilizationPercent: 0,
        },
      ];
    }

    const maxUnits = Math.max(
      ...zoneRows.map((row: ZoneAgg) => Number(row.total_units)),
      1,
    );

    return zoneRows.map((row: ZoneAgg) => {
      const totalUnits = Number(row.total_units);
      return {
        id: row.zone.toLowerCase().replace(/\s+/g, '-'),
        name: row.zone,
        totalSkus: Number(row.total_skus),
        totalUnits,
        pendingTransfers: pendingTotal,
        utilizationPercent: Math.min(
          100,
          Math.round((totalUnits / maxUnits) * 100),
        ),
      };
    });
  }
}
