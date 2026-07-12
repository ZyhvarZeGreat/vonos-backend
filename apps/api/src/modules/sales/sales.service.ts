import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CsvImportResult,
  PaymentStatus,
  Sale,
  SaleDetail,
  SaleFilters,
  SaleLine,
  SaleStatus,
} from '@vonos/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { computeStockStatus } from '../../common/utils/stockQuantity';
import { adjustItemLocationStock } from '../../common/utils/itemLocationStock';
import {
  parseCsv,
  pickCsvField,
} from '../../common/utils/csvImport';
import {
  mapSaleStatusToUi,
  saleStatusWhereClause,
  toIso,
  toNumber,
} from '../../common/utils/serializers';

function normalizeCreateStatus(
  status?: SaleStatus | 'final',
): SaleStatus {
  if (!status || status === 'final') return 'completed';
  return status;
}

type SaleLineInput = {
  itemId?: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
};

function computeLineTotal(line: {
  quantity: number;
  unitPrice: number;
  discountAmount?: number | null;
}): number {
  const discount = line.discountAmount ?? 0;
  return Math.max(0, line.quantity * line.unitPrice - discount);
}

function buildSaleLineRows(lines: SaleLineInput[]) {
  return lines.map((line) => {
    const discountAmount = line.discountAmount ?? 0;
    const lineTotal = computeLineTotal({ ...line, discountAmount });
    return {
      itemId: line.itemId ?? null,
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal,
      discountAmount: discountAmount > 0 ? discountAmount : null,
    };
  });
}

function computeSaleTotal(
  lineRows: Array<{ lineTotal: number }>,
  orderDiscount = 0,
  taxAmount = 0,
): number {
  const subtotal = lineRows.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = Math.min(subtotal, Math.max(0, orderDiscount));
  const tax = Math.max(0, taxAmount);
  return Math.max(0, subtotal - discount + tax);
}

@Injectable()
export class SalesService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  async list(filters: SaleFilters): Promise<Sale[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.sale.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...saleStatusWhereClause(filters),
        ...(filters.search
          ? {
              OR: [
                {
                  reference: { contains: filters.search, mode: 'insensitive' },
                },
                {
                  customer: {
                    name: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        lines: true,
      },
      orderBy: { date: 'desc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 50),
    });

    return rows.map((row) => this.toSale(row));
  }

  async getById(id: string): Promise<SaleDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        customer: true,
        lines: true,
        originalSale: { select: { reference: true } },
      },
    });
    if (!row) throw new NotFoundException('Sale not found');
    return this.toSaleDetail(row);
  }

  async create(body: {
    reference: string;
    customerName?: string;
    locationCode?: string;
    lines: SaleLineInput[];
    currency?: string;
    date?: string;
    status?: SaleStatus | 'final';
    shippingStatus?: string;
    shippingAddress?: string;
    trackingNumber?: string;
    discountAmount?: number;
    taxAmount?: number;
    notes?: string;
    payments?: Array<{
      amount: number;
      method?: string;
      note?: string;
      accountId?: string;
    }>;
  }): Promise<SaleDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const createdBy = await this.auditService.createdByFields();
    const locationCode = await this.tenantDb.resolveBusinessLocation(
      body.locationCode,
    );
    const currency = body.currency ?? 'NGN';
    const saleDate = body.date ? new Date(body.date) : new Date();
    const status = normalizeCreateStatus(body.status);
    const isProvisional = status === 'draft' || status === 'quotation';

    let customerId: string | null = null;
    if (body.customerName?.trim()) {
      const existing = await this.tenantDb.db.customer.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { equals: body.customerName.trim(), mode: 'insensitive' },
        },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const customer = await this.tenantDb.db.customer.create({
          data: {
            tenantId,
            name: body.customerName.trim(),
            ...createdBy,
          },
        });
        customerId = customer.id;
      }
    }

    const lineData = buildSaleLineRows(body.lines);
    const orderDiscount = body.discountAmount ?? 0;
    const taxAmount = body.taxAmount ?? 0;
    const total = computeSaleTotal(lineData, orderDiscount, taxAmount);

    const paymentRows =
      !isProvisional && body.payments && body.payments.length > 0
        ? body.payments
        : isProvisional
          ? []
          : [{ amount: total, method: 'cash' }];

    const paidTotal = paymentRows.reduce((sum, row) => sum + row.amount, 0);
    let paymentStatus: PaymentStatus | null = isProvisional ? 'due' : 'paid';
    if (!isProvisional) {
      if (paidTotal <= 0) {
        paymentStatus = 'due';
      } else if (paidTotal < total) {
        paymentStatus = 'partial';
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (!isProvisional) {
        for (const line of body.lines) {
          if (!line.itemId) continue;
          const item = await tx.item.findFirst({
            where: { id: line.itemId, deletedAt: null },
          });
          if (!item) {
            throw new BadRequestException(`Item not found: ${line.sku}`);
          }
          const currentQty = toNumber(item.quantity);
          const nextQuantity = currentQty - line.quantity;
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
            locationCode: locationCode ?? item.locationCode,
            binLocation: item.binLocation,
            delta: -line.quantity,
          });
        }
      }

      const sale = await tx.sale.create({
        data: {
          tenantId,
          reference: body.reference,
          customerId,
          total,
          discountAmount: orderDiscount > 0 ? orderDiscount : null,
          taxAmount: taxAmount > 0 ? taxAmount : null,
          notes: body.notes?.trim() || null,
          currency,
          status,
          paymentStatus,
          locationCode,
          shippingStatus: body.shippingStatus ?? (isProvisional ? null : 'pending'),
          shippingAddress: body.shippingAddress?.trim() || null,
          trackingNumber: body.trackingNumber?.trim() || null,
          date: saleDate,
          lines: { create: lineData },
          ...createdBy,
        },
        include: { customer: true, lines: true },
      });

      if (!isProvisional) {
        await tx.ledgerEntry.create({
          data: {
            tenantId,
            type: 'revenue',
            amount: total,
            currency,
            category: 'Sales',
            description: `Sale ${sale.reference}`,
            linkedRecordType: 'sale',
            linkedRecordId: sale.id,
            date: saleDate,
          },
        });

        for (const payment of paymentRows) {
          if (payment.amount <= 0) continue;
          await tx.payment.create({
            data: {
              tenantId,
              amount: payment.amount,
              currency,
              method: payment.method ?? 'cash',
              paidOn: saleDate,
              paymentFor: 'sale',
              saleId: sale.id,
              accountId: payment.accountId ?? null,
              note: payment.note ?? null,
              createdByName: createdBy.createdByName ?? null,
            },
          });
        }
      }

      return sale;
    });

    await this.auditService.log({
      action: 'created',
      entityType: 'sale',
      entityId: row.id,
      summary: `Recorded sale ${row.reference}`,
      metadata: { total, paymentStatus },
    });

    const tenantIdForCache = this.tenantDb.requireTenantId();
    void Promise.all([
      this.cache.invalidatePrefix(`entity-overview:${tenantIdForCache}`),
      this.cache.invalidatePrefix(`report-dash:${tenantIdForCache}`),
      this.cache.invalidatePrefix('group-overview:'),
      this.cache.invalidatePrefix('report-group:'),
    ]);

    return this.toSaleDetail(row);
  }

  /** Convert a draft or quotation into a completed sale (stock + ledger + payments). */
  async finalize(
    id: string,
    body: {
      payments?: Array<{
        amount: number;
        method?: string;
        note?: string;
        accountId?: string;
      }>;
    } = {},
  ): Promise<SaleDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, lines: true },
    });
    if (!existing) throw new NotFoundException('Sale not found');
    if (existing.status !== 'draft' && existing.status !== 'quotation') {
      throw new BadRequestException('Only drafts and quotations can be finalized');
    }

    const total = toNumber(existing.total);
    const paymentRows =
      body.payments && body.payments.length > 0
        ? body.payments
        : [{ amount: total, method: 'cash' }];
    const paidTotal = paymentRows.reduce((sum, row) => sum + row.amount, 0);
    let paymentStatus: PaymentStatus = 'paid';
    if (paidTotal <= 0) paymentStatus = 'due';
    else if (paidTotal < total) paymentStatus = 'partial';

    const row = await this.prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
        if (!line.itemId) continue;
        const item = await tx.item.findFirst({
          where: { id: line.itemId, deletedAt: null },
        });
        if (!item) {
          throw new BadRequestException(`Item not found: ${line.sku}`);
        }
        const currentQty = toNumber(item.quantity);
        const qty = toNumber(line.quantity);
        const nextQuantity = currentQty - qty;
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
          delta: -qty,
        });
      }

      const sale = await tx.sale.update({
        where: { id },
        data: {
          status: 'completed',
          paymentStatus,
          shippingStatus: existing.shippingStatus ?? 'pending',
        },
        include: { customer: true, lines: true },
      });

      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'revenue',
          amount: total,
          currency: existing.currency,
          category: 'Sales',
          description: `Sale ${sale.reference}`,
          linkedRecordType: 'sale',
          linkedRecordId: sale.id,
          date: existing.date,
        },
      });

      for (const payment of paymentRows) {
        if (payment.amount <= 0) continue;
        await tx.payment.create({
          data: {
            tenantId,
            amount: payment.amount,
            currency: existing.currency,
            method: payment.method ?? 'cash',
            paidOn: existing.date,
            paymentFor: 'sale',
            saleId: sale.id,
            accountId: payment.accountId ?? null,
            note: payment.note ?? null,
            createdByName: existing.createdByName ?? null,
          },
        });
      }

      return sale;
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'sale',
      entityId: id,
      summary: `Finalized sale ${row.reference}`,
      metadata: { paymentStatus },
    });

    const tenantIdForCache = this.tenantDb.requireTenantId();
    void Promise.all([
      this.cache.invalidatePrefix(`entity-overview:${tenantIdForCache}`),
      this.cache.invalidatePrefix(`report-dash:${tenantIdForCache}`),
      this.cache.invalidatePrefix('group-overview:'),
      this.cache.invalidatePrefix('report-group:'),
    ]);

    return this.toSaleDetail(row);
  }

  /** Record a return against a completed sale (refund, restock, or write-off). */
  async createReturn(
    id: string,
    body: {
      disposition: 'refunded' | 'restocked' | 'written_off';
      notes?: string;
      lines?: Array<{ saleLineId: string; quantity: number }>;
    },
  ): Promise<SaleDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const createdBy = await this.auditService.createdByFields();
    const original = await this.tenantDb.db.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, lines: true },
    });
    if (!original) throw new NotFoundException('Sale not found');
    if (original.status !== 'completed') {
      throw new BadRequestException('Only completed sales can be returned');
    }
    if (original.originalSaleId) {
      throw new BadRequestException('Returns cannot be created from another return');
    }

    const existingReturn = await this.tenantDb.db.sale.findFirst({
      where: {
        tenantId,
        originalSaleId: id,
        deletedAt: null,
        status: { in: ['refunded', 'partially_refunded', 'written_off'] },
      },
    });
    if (existingReturn) {
      throw new BadRequestException('A return already exists for this sale');
    }

    const returnStatus: SaleStatus =
      body.disposition === 'restocked'
        ? 'partially_refunded'
        : body.disposition === 'written_off'
          ? 'written_off'
          : 'refunded';

    const lineById = new Map(original.lines.map((line) => [line.id, line]));
    const requestedLines =
      body.lines && body.lines.length > 0
        ? body.lines
        : original.lines.map((line) => ({
            saleLineId: line.id,
            quantity: toNumber(line.quantity),
          }));

    const returnLineRows: SaleLineInput[] = [];
    let returnTotal = 0;
    for (const req of requestedLines) {
      const source = lineById.get(req.saleLineId);
      if (!source) {
        throw new BadRequestException(`Unknown sale line: ${req.saleLineId}`);
      }
      const maxQty = toNumber(source.quantity);
      if (!Number.isFinite(req.quantity) || req.quantity <= 0) {
        throw new BadRequestException('Return quantity must be positive');
      }
      if (req.quantity > maxQty) {
        throw new BadRequestException(
          `Return quantity exceeds sold quantity for ${source.sku}`,
        );
      }
      const unitPrice = toNumber(source.unitPrice);
      const lineTotal = unitPrice * req.quantity;
      returnTotal += lineTotal;
      returnLineRows.push({
        itemId: source.itemId ?? undefined,
        sku: source.sku,
        name: source.name,
        quantity: req.quantity,
        unitPrice,
        discountAmount: source.discountAmount
          ? toNumber(source.discountAmount)
          : undefined,
      });
    }

    if (returnLineRows.length === 0) {
      throw new BadRequestException('No lines to return');
    }

    const isFullReturn =
      requestedLines.length === original.lines.length &&
      requestedLines.every((req) => {
        const source = lineById.get(req.saleLineId);
        return source && req.quantity === toNumber(source.quantity);
      });
    if (isFullReturn) {
      returnTotal = toNumber(original.total);
    }

    let reference = `RET-${original.reference}`;
    let suffix = 1;
    while (
      await this.tenantDb.db.sale.findFirst({
        where: { tenantId, reference, deletedAt: null },
      })
    ) {
      reference = `RET-${original.reference}-${suffix}`;
      suffix += 1;
    }

    const saleDate = new Date();
    const lineData = buildSaleLineRows(returnLineRows);
    const notes = body.notes?.trim() || null;

    const row = await this.prisma.$transaction(async (tx) => {
      if (body.disposition === 'restocked') {
        for (const line of returnLineRows) {
          if (!line.itemId) continue;
          const item = await tx.item.findFirst({
            where: { id: line.itemId, deletedAt: null },
          });
          if (!item) {
            throw new BadRequestException(`Item not found: ${line.sku}`);
          }
          const currentQty = toNumber(item.quantity);
          const nextQuantity = currentQty + line.quantity;
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
            locationCode: original.locationCode ?? item.locationCode,
            binLocation: item.binLocation,
            delta: line.quantity,
          });
        }
      }

      const sale = await tx.sale.create({
        data: {
          tenantId,
          reference,
          originalSaleId: original.id,
          customerId: original.customerId,
          total: returnTotal,
          currency: original.currency,
          status: returnStatus,
          paymentStatus: 'paid',
          locationCode: original.locationCode,
          notes,
          date: saleDate,
          lines: { create: lineData },
          ...createdBy,
        },
        include: {
          customer: true,
          lines: true,
          originalSale: { select: { reference: true } },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          tenantId,
          type: 'expense',
          amount: returnTotal,
          currency: original.currency,
          category: 'Sales Returns',
          description: `Return ${sale.reference} for sale ${original.reference}`,
          linkedRecordType: 'sale',
          linkedRecordId: sale.id,
          date: saleDate,
        },
      });

      return sale;
    });

    await this.auditService.log({
      action: 'created',
      entityType: 'sale',
      entityId: row.id,
      summary: `Recorded return ${row.reference} for sale ${original.reference}`,
      metadata: { disposition: body.disposition, total: returnTotal },
    });

    const tenantIdForCache = this.tenantDb.requireTenantId();
    void Promise.all([
      this.cache.invalidatePrefix(`entity-overview:${tenantIdForCache}`),
      this.cache.invalidatePrefix(`report-dash:${tenantIdForCache}`),
      this.cache.invalidatePrefix('group-overview:'),
      this.cache.invalidatePrefix('report-group:'),
    ]);

    return this.toSaleDetail(row);
  }

  async updateShipping(
    id: string,
    body: {
      shippingStatus?: string | null;
      shippingAddress?: string | null;
      trackingNumber?: string | null;
    },
  ): Promise<SaleDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Sale not found');

    const row = await this.tenantDb.db.sale.update({
      where: { id },
      data: {
        shippingStatus: body.shippingStatus ?? undefined,
        shippingAddress: body.shippingAddress ?? undefined,
        trackingNumber: body.trackingNumber ?? undefined,
      },
      include: { customer: true, lines: true },
    });

    return this.toSaleDetail(row);
  }

  async importCsv(csv: string): Promise<CsvImportResult> {
    const rows = parseCsv(csv);
    const result: CsvImportResult = { created: 0, updated: 0, errors: [] };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const sku = pickCsvField(row, 'sku', 'product sku');
      const name = pickCsvField(row, 'name', 'product name', 'product');
      const quantityRaw = pickCsvField(row, 'quantity', 'qty');
      const priceRaw = pickCsvField(row, 'unit_price', 'price', 'unit price');
      const quantity = Number(quantityRaw || '1');
      const unitPrice = Number(priceRaw || '0');
      if (!sku && !name) {
        result.errors.push({
          row: index + 2,
          message: 'SKU or product name is required',
        });
        continue;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        result.errors.push({ row: index + 2, message: 'Invalid quantity' });
        continue;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        result.errors.push({ row: index + 2, message: 'Invalid unit price' });
        continue;
      }

      const reference =
        pickCsvField(row, 'reference', 'invoice no', 'invoice') ||
        `IMPORT-${Date.now().toString(36).toUpperCase()}-${index + 1}`;
      const customerName = pickCsvField(row, 'customer', 'customer name') || undefined;
      const dateRaw = pickCsvField(row, 'date', 'sale date');
      const paymentAmount = Number(
        pickCsvField(row, 'payment_amount', 'amount paid', 'paid') || String(quantity * unitPrice),
      );
      const paymentMethod = pickCsvField(row, 'payment_method', 'method') || 'cash';

      let itemId: string | undefined;
      if (sku) {
        const item = await this.tenantDb.db.item.findFirst({
          where: {
            tenantId: this.tenantDb.requireTenantId(),
            deletedAt: null,
            sku: { equals: sku, mode: 'insensitive' },
          },
        });
        itemId = item?.id;
      }

      try {
        await this.create({
          reference,
          customerName,
          date: dateRaw ? new Date(dateRaw).toISOString() : undefined,
          lines: [
            {
              itemId,
              sku: sku || `SKU-${index + 1}`,
              name: name || sku,
              quantity,
              unitPrice,
            },
          ],
          payments: [{ amount: paymentAmount, method: paymentMethod }],
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

  private toSale(row: {
    id: string;
    tenantId: string;
    reference: string;
    customerId: string | null;
    customer: { name: string } | null;
    total: { toString(): string };
    discountAmount: { toString(): string } | null;
    taxAmount: { toString(): string } | null;
    notes: string | null;
    originalSaleId?: string | null;
    originalSale?: { reference: string } | null;
    currency: string;
    status: string;
    paymentStatus: string | null;
    locationCode: string | null;
    shippingStatus: string | null;
    shippingAddress: string | null;
    trackingNumber: string | null;
    date: Date;
    createdByUserId: string | null;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
    lines: Array<unknown>;
  }): Sale {
    return {
      id: row.id,
      tenantId: row.tenantId,
      reference: row.reference,
      customerId: row.customerId,
      customerName: row.customer?.name ?? 'Walk-in',
      total: toNumber(row.total),
      discountAmount: row.discountAmount ? toNumber(row.discountAmount) : null,
      taxAmount: row.taxAmount ? toNumber(row.taxAmount) : null,
      notes: row.notes,
      originalSaleId: row.originalSaleId ?? null,
      originalSaleReference: row.originalSale?.reference ?? null,
      currency: row.currency,
      status: mapSaleStatusToUi(row.status),
      recordStatus: row.status as Sale['recordStatus'],
      paymentStatus: row.paymentStatus as PaymentStatus | null,
      locationCode: row.locationCode,
      shippingStatus: row.shippingStatus as Sale['shippingStatus'],
      shippingAddress: row.shippingAddress,
      trackingNumber: row.trackingNumber,
      itemCount: row.lines.length,
      date: toIso(row.date).slice(0, 10),
      createdByUserId: row.createdByUserId,
      createdByName: row.createdByName,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  private toSaleDetail(row: {
    id: string;
    tenantId: string;
    reference: string;
    customerId: string | null;
    customer: { name: string } | null;
    total: { toString(): string };
    discountAmount: { toString(): string } | null;
    taxAmount: { toString(): string } | null;
    notes: string | null;
    originalSaleId?: string | null;
    originalSale?: { reference: string } | null;
    currency: string;
    status: string;
    paymentStatus: string | null;
    locationCode: string | null;
    shippingStatus: string | null;
    shippingAddress: string | null;
    trackingNumber: string | null;
    date: Date;
    createdByUserId: string | null;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
    lines: Array<{
      id: string;
      saleId: string;
      itemId: string | null;
      sku: string;
      name: string;
      quantity: { toString(): string };
      unitPrice: { toString(): string };
      lineTotal: { toString(): string };
      discountAmount: { toString(): string } | null;
    }>;
  }): SaleDetail {
    const base = this.toSale(row);
    const lines: SaleLine[] = row.lines.map((line) => ({
      id: line.id,
      saleId: line.saleId,
      itemId: line.itemId,
      sku: line.sku,
      name: line.name,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
      lineTotal: toNumber(line.lineTotal),
      discountAmount: line.discountAmount
        ? toNumber(line.discountAmount)
        : null,
    }));
    return { ...base, lines };
  }
}
