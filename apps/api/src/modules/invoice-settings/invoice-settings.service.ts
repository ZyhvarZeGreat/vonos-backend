import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateInvoiceSchemeInput,
  CreateReceiptPrinterInput,
  InvoiceLayout,
  InvoiceScheme,
  InvoiceSettings,
  ReceiptPrinter,
  UpdateInvoiceSchemeInput,
  UpdateInvoiceSettingsInput,
  UpdateReceiptPrinterInput,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import type { TenantScopedPrisma } from '../../common/prisma/prisma.service';
import { toIso } from '../../common/utils/serializers';

const DEFAULT_LAYOUTS = [
  { name: 'Classic', design: 'classic' },
  { name: 'Slim', design: 'slim' },
  { name: 'Detailed', design: 'detailed' },
] as const;

@Injectable()
export class InvoiceSettingsService {
  constructor(private readonly tenantDb: TenantDbService) {}

  private async seedDefaultsIfEmpty(
    tx: Parameters<Parameters<TenantScopedPrisma['$transaction']>[0]>[0],
    tenantId: string,
  ): Promise<void> {
    const [layoutCount, schemeCount] = await Promise.all([
      tx.invoiceLayout.count({ where: { tenantId, deletedAt: null } }),
      tx.invoiceScheme.count({ where: { tenantId, deletedAt: null } }),
    ]);

    if (layoutCount === 0) {
      await tx.invoiceLayout.createMany({
        data: DEFAULT_LAYOUTS.map((layout, index) => ({
          tenantId,
          name: layout.name,
          design: layout.design,
          isDefault: index === 0,
        })),
      });
    }

    if (schemeCount === 0) {
      await tx.invoiceScheme.create({
        data: {
          tenantId,
          name: 'Default',
          prefix: null,
          startNumber: 1,
          invoiceCount: 0,
          totalDigits: 4,
          isDefault: true,
        },
      });
    }
  }

  private async ensureDefaults(tenantId: string): Promise<void> {
    await this.tenantDb.db.$transaction(async (tx) => {
      await this.seedDefaultsIfEmpty(tx, tenantId);
    });
  }

  private async loadSettingsRows(tenantId: string) {
    return this.tenantDb.db.$transaction(async (tx) => {
      await this.seedDefaultsIfEmpty(tx, tenantId);

      const listOrder = [{ isDefault: 'desc' as const }, { name: 'asc' as const }];
      const where = { tenantId, deletedAt: null };

      const layouts = await tx.invoiceLayout.findMany({ where, orderBy: listOrder });
      const schemes = await tx.invoiceScheme.findMany({ where, orderBy: listOrder });
      const printers = await tx.receiptPrinter.findMany({ where, orderBy: listOrder });

      return { layouts, schemes, printers };
    });
  }

  async getSettings(): Promise<InvoiceSettings> {
    const tenantId = this.tenantDb.requireTenantId();
    const { layouts, schemes, printers } = await this.loadSettingsRows(tenantId);

    const defaultLayout = layouts.find((row) => row.isDefault) ?? layouts[0];
    const defaultScheme = schemes.find((row) => row.isDefault) ?? schemes[0];

    return {
      layouts: layouts.map((row) => this.serializeLayout(row)),
      schemes: schemes.map((row) => this.serializeScheme(row)),
      printers: printers.map((row) => this.serializePrinter(row)),
      defaultLayoutId: defaultLayout?.id ?? null,
      defaultSchemeId: defaultScheme?.id ?? null,
      termsText: defaultLayout?.termsText ?? null,
    };
  }

  async updateSettings(dto: UpdateInvoiceSettingsInput): Promise<InvoiceSettings> {
    const tenantId = this.tenantDb.requireTenantId();
    await this.ensureDefaults(tenantId);

    if (dto.defaultLayoutId) {
      const layout = await this.tenantDb.db.invoiceLayout.findFirst({
        where: { id: dto.defaultLayoutId, tenantId, deletedAt: null },
      });
      if (!layout) throw new NotFoundException('Invoice layout not found');
      await this.tenantDb.db.invoiceLayout.updateMany({
        where: { tenantId, deletedAt: null },
        data: { isDefault: false },
      });
      await this.tenantDb.db.invoiceLayout.update({
        where: { id: layout.id },
        data: {
          isDefault: true,
          ...(dto.termsText !== undefined ? { termsText: dto.termsText } : {}),
        },
      });
    } else if (dto.termsText !== undefined) {
      const current = await this.tenantDb.db.invoiceLayout.findFirst({
        where: { tenantId, deletedAt: null, isDefault: true },
      });
      if (current) {
        await this.tenantDb.db.invoiceLayout.update({
          where: { id: current.id },
          data: { termsText: dto.termsText },
        });
      }
    }

    if (dto.defaultSchemeId) {
      const scheme = await this.tenantDb.db.invoiceScheme.findFirst({
        where: { id: dto.defaultSchemeId, tenantId, deletedAt: null },
      });
      if (!scheme) throw new NotFoundException('Invoice scheme not found');
      await this.tenantDb.db.invoiceScheme.updateMany({
        where: { tenantId, deletedAt: null },
        data: { isDefault: false },
      });
      await this.tenantDb.db.invoiceScheme.update({
        where: { id: scheme.id },
        data: { isDefault: true },
      });
    }

    return this.getSettings();
  }

  async createScheme(dto: CreateInvoiceSchemeInput): Promise<InvoiceScheme> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Scheme name is required');

    const totalDigits = dto.totalDigits ?? 4;
    if (totalDigits < 1 || totalDigits > 10) {
      throw new BadRequestException('totalDigits must be between 1 and 10');
    }

    if (dto.isDefault) {
      await this.tenantDb.db.invoiceScheme.updateMany({
        where: { tenantId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const row = await this.tenantDb.db.invoiceScheme.create({
      data: {
        tenantId,
        name,
        prefix: dto.prefix?.trim() || null,
        startNumber: dto.startNumber ?? 1,
        totalDigits,
        isDefault: dto.isDefault ?? false,
      },
    });
    return this.serializeScheme(row);
  }

  async updateScheme(
    id: string,
    dto: UpdateInvoiceSchemeInput,
  ): Promise<InvoiceScheme> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.invoiceScheme.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Invoice scheme not found');

    if (
      dto.totalDigits !== undefined &&
      (dto.totalDigits < 1 || dto.totalDigits > 10)
    ) {
      throw new BadRequestException('totalDigits must be between 1 and 10');
    }

    if (dto.isDefault) {
      await this.tenantDb.db.invoiceScheme.updateMany({
        where: { tenantId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const row = await this.tenantDb.db.invoiceScheme.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.prefix !== undefined
          ? { prefix: dto.prefix?.trim() || null }
          : {}),
        ...(dto.startNumber !== undefined
          ? { startNumber: dto.startNumber }
          : {}),
        ...(dto.totalDigits !== undefined
          ? { totalDigits: dto.totalDigits }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
    return this.serializeScheme(row);
  }

  async deleteScheme(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.invoiceScheme.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Invoice scheme not found');
    await this.tenantDb.db.invoiceScheme.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listPrinters(): Promise<ReceiptPrinter[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.receiptPrinter.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.serializePrinter(row));
  }

  async createPrinter(dto: CreateReceiptPrinterInput): Promise<ReceiptPrinter> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Printer name is required');

    if (dto.isDefault) {
      await this.tenantDb.db.receiptPrinter.updateMany({
        where: { tenantId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const row = await this.tenantDb.db.receiptPrinter.create({
      data: {
        tenantId,
        name,
        printerType: dto.printerType?.trim() || 'browser',
        connectionString: dto.connectionString?.trim() || null,
        isDefault: dto.isDefault ?? false,
      },
    });
    return this.serializePrinter(row);
  }

  async updatePrinter(
    id: string,
    dto: UpdateReceiptPrinterInput,
  ): Promise<ReceiptPrinter> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.receiptPrinter.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Receipt printer not found');

    if (dto.isDefault) {
      await this.tenantDb.db.receiptPrinter.updateMany({
        where: { tenantId, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const row = await this.tenantDb.db.receiptPrinter.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.printerType !== undefined
          ? { printerType: dto.printerType.trim() || 'browser' }
          : {}),
        ...(dto.connectionString !== undefined
          ? { connectionString: dto.connectionString?.trim() || null }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
    return this.serializePrinter(row);
  }

  async deletePrinter(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.receiptPrinter.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Receipt printer not found');
    await this.tenantDb.db.receiptPrinter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private serializeLayout(row: {
    id: string;
    tenantId: string;
    name: string;
    design: string;
    headerText: string | null;
    footerText: string | null;
    termsText: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): InvoiceLayout {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      design: row.design,
      headerText: row.headerText,
      footerText: row.footerText,
      termsText: row.termsText,
      isDefault: row.isDefault,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  private serializeScheme(row: {
    id: string;
    tenantId: string;
    name: string;
    prefix: string | null;
    startNumber: number;
    invoiceCount: number;
    totalDigits: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): InvoiceScheme {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      prefix: row.prefix,
      startNumber: row.startNumber,
      invoiceCount: row.invoiceCount,
      totalDigits: row.totalDigits,
      isDefault: row.isDefault,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  private serializePrinter(row: {
    id: string;
    tenantId: string;
    name: string;
    printerType: string;
    connectionString: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ReceiptPrinter {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      printerType: row.printerType,
      connectionString: row.connectionString,
      isDefault: row.isDefault,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }
}
