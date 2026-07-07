import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Requisition,
  RequisitionLine,
  RequisitionStatus,
} from '@vonos/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { AuditService } from '../audit/audit.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toIso } from '../../common/utils/serializers';
import { computeStockStatus } from '../../common/utils/stockQuantity';
import { adjustItemLocationStock } from '../../common/utils/itemLocationStock';

/** Default fulfilling entity for the warehouse-first workflow. */
const DEFAULT_SOURCE_CODE = 'VW';

function parseLines(value: unknown): RequisitionLine[] {
  if (!Array.isArray(value)) return [];
  const result: RequisitionLine[] = [];
  for (const raw of value) {
    const line = raw as Partial<RequisitionLine>;
    const sku = typeof line.sku === 'string' ? line.sku : '';
    const quantity = Number(line.quantity) || 0;
    if (!sku || quantity <= 0) continue;
    result.push({
      itemId: line.itemId ?? null,
      sku,
      name: typeof line.name === 'string' ? line.name : sku,
      quantity,
    });
  }
  return result;
}

function serialize(row: {
  id: string;
  tenantId: string;
  reference: string;
  status: string;
  jobId: string | null;
  notes: string | null;
  sourceTenantId: string | null;
  lines: unknown;
  fulfilledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Requisition {
  return {
    id: row.id,
    tenantId: row.tenantId,
    reference: row.reference,
    status: row.status as RequisitionStatus,
    jobId: row.jobId,
    notes: row.notes,
    sourceTenantId: row.sourceTenantId,
    lines: parseLines(row.lines),
    fulfilledAt: row.fulfilledAt ? toIso(row.fulfilledAt) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

@Injectable()
export class RequisitionsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<Requisition[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.requisition.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.search
          ? {
              OR: [
                {
                  reference: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                {
                  notes: { contains: filters.search, mode: 'insensitive' },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
    });
    return rows.map(serialize);
  }

  async getById(id: string): Promise<Requisition> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.requisition.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Requisition not found');
    return serialize(row);
  }

  async create(body: {
    reference: string;
    jobId?: string;
    notes?: string;
    sourceTenantCode?: string;
    lines?: RequisitionLine[];
  }): Promise<Requisition> {
    const tenantId = this.tenantDb.requireTenantId();
    const sourceTenantId = await this.resolveSourceTenantId(
      body.sourceTenantCode ?? DEFAULT_SOURCE_CODE,
    );
    const lines = parseLines(body.lines);
    const row = await this.tenantDb.db.requisition.create({
      data: {
        tenantId,
        reference: body.reference,
        status: 'Pending',
        jobId: body.jobId ?? null,
        notes: body.notes ?? null,
        sourceTenantId,
        lines:
          lines.length > 0
            ? (lines as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    });
    await this.auditService.log({
      action: 'created',
      entityType: 'requisition',
      entityId: row.id,
      summary: `Created requisition ${row.reference}`,
    });
    return serialize(row);
  }

  async approve(id: string): Promise<Requisition> {
    return this.setStatus(id, 'Approved', 'Pending');
  }

  async reject(id: string): Promise<Requisition> {
    return this.setStatus(id, 'Rejected', 'Pending');
  }

  /**
   * Fulfils an approved requisition as a warehouse-first transfer: decrement the
   * source entity's stock and increment the requesting entity's stock for each
   * line, keeping both single-quantity and per-location stock in sync. Stock
   * only moves between entities here — no money ledger (internal transfer
   * elimination is deferred per AGENTS.md).
   */
  async fulfill(id: string): Promise<Requisition> {
    const requestingTenantId = this.tenantDb.requireTenantId();
    const requisition = await this.tenantDb.db.requisition.findFirst({
      where: { id, tenantId: requestingTenantId, deletedAt: null },
    });
    if (!requisition) throw new NotFoundException('Requisition not found');
    if (requisition.status === 'Fulfilled') {
      throw new BadRequestException('Requisition already fulfilled');
    }
    if (requisition.status === 'Rejected') {
      throw new BadRequestException('Cannot fulfil a rejected requisition');
    }

    const lines = parseLines(requisition.lines);
    if (lines.length === 0) {
      throw new BadRequestException('Requisition has no line items to transfer');
    }

    const sourceTenantId =
      requisition.sourceTenantId ??
      (await this.resolveSourceTenantId(DEFAULT_SOURCE_CODE));
    if (!sourceTenantId) {
      throw new BadRequestException(
        'No source entity is configured to fulfil this requisition',
      );
    }
    if (sourceTenantId === requestingTenantId) {
      throw new BadRequestException(
        'Source and requesting entity must be different',
      );
    }

    const movementLines = lines.map((line) => ({
      itemId: line.itemId ?? '',
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
    }));

    await this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const sourceItem = await tx.item.findFirst({
          where: { tenantId: sourceTenantId, sku: line.sku, deletedAt: null },
        });
        if (!sourceItem) {
          throw new BadRequestException(
            `Source entity has no item with SKU ${line.sku}. Use external procurement instead.`,
          );
        }

        const sourceNext = sourceItem.quantity - line.quantity;
        await tx.item.update({
          where: { id: sourceItem.id },
          data: {
            quantity: sourceNext,
            status: computeStockStatus(sourceNext, sourceItem.reorderPoint),
          },
        });
        await adjustItemLocationStock(tx, {
          tenantId: sourceTenantId,
          itemId: sourceItem.id,
          locationCode: sourceItem.locationCode,
          binLocation: sourceItem.binLocation,
          delta: -line.quantity,
        });

        let destItem = await tx.item.findFirst({
          where: {
            tenantId: requestingTenantId,
            sku: line.sku,
            deletedAt: null,
          },
        });
        if (!destItem) {
          destItem = await tx.item.create({
            data: {
              tenantId: requestingTenantId,
              sku: line.sku,
              name: line.name || sourceItem.name,
              category: sourceItem.category,
              quantity: 0,
              costPrice: sourceItem.costPrice,
              currency: sourceItem.currency,
              reorderPoint: sourceItem.reorderPoint,
            },
          });
        }

        const destNext = destItem.quantity + line.quantity;
        await tx.item.update({
          where: { id: destItem.id },
          data: {
            quantity: destNext,
            status: computeStockStatus(destNext, destItem.reorderPoint),
          },
        });
        await adjustItemLocationStock(tx, {
          tenantId: requestingTenantId,
          itemId: destItem.id,
          locationCode: destItem.locationCode,
          binLocation: destItem.binLocation,
          delta: line.quantity,
        });
      }

      const now = new Date();
      await tx.stockMovement.create({
        data: {
          tenantId: sourceTenantId,
          type: 'outbound',
          reference: `${requisition.reference}-OUT`,
          status: 'Received',
          lines: movementLines,
          notes: `Transfer for requisition ${requisition.reference}`,
          date: now,
        },
      });
      await tx.stockMovement.create({
        data: {
          tenantId: requestingTenantId,
          type: 'inbound',
          reference: `${requisition.reference}-IN`,
          status: 'Received',
          lines: movementLines,
          notes: `Transfer from source for requisition ${requisition.reference}`,
          date: now,
        },
      });

      await tx.requisition.update({
        where: { id: requisition.id },
        data: {
          status: 'Fulfilled',
          sourceTenantId,
          fulfilledAt: now,
        },
      });
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'requisition',
      entityId: requisition.id,
      summary: `Fulfilled requisition ${requisition.reference}`,
      metadata: { sourceTenantId, lineCount: lines.length },
    });

    return this.getById(id);
  }

  private async setStatus(
    id: string,
    status: RequisitionStatus,
    requiredCurrent: RequisitionStatus,
  ): Promise<Requisition> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.requisition.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Requisition not found');
    if (existing.status !== requiredCurrent) {
      throw new BadRequestException(
        `Requisition must be ${requiredCurrent} to become ${status}`,
      );
    }
    await this.tenantDb.db.requisition.update({
      where: { id },
      data: { status },
    });
    await this.auditService.log({
      action: 'updated',
      entityType: 'requisition',
      entityId: id,
      summary: `Status → ${status}`,
      metadata: { previousStatus: existing.status, status },
    });
    return this.getById(id);
  }

  private async resolveSourceTenantId(code: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { code, deletedAt: null },
      select: { id: true },
    });
    return tenant?.id ?? null;
  }
}
