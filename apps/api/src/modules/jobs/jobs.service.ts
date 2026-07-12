import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Job, JobLabour, JobMaterial } from '@vonos/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { AuditService } from '../audit/audit.service';
import { getNextStage } from '../../common/utils/jobStages';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toIso, toNumber } from '../../common/utils/serializers';

export interface JobDetail extends Job {
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  vehicle?: {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    year: number | null;
  } | null;
  materials: JobMaterial[];
  labourEntries: JobLabour[];
}

@Injectable()
export class JobsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(filters: {
    status?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<Job[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.job.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  reference: { contains: filters.search, mode: 'insensitive' },
                },
                {
                  description: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                {
                  customerName: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 50),
    });
    return rows.map((row) => this.serializeJob(row));
  }

  async getById(id: string): Promise<JobDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.job.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        materials: true,
        labourEntries: true,
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Job not found');
    const vehicle = row.vehicleId
      ? await this.tenantDb.db.vehicle.findFirst({
          where: { id: row.vehicleId, tenantId, deletedAt: null },
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            year: true,
          },
        })
      : null;
    return {
      ...this.serializeJob(row),
      customer: row.customer
        ? {
            id: row.customer.id,
            name: row.customer.name,
            email: row.customer.email,
            phone: row.customer.phone,
          }
        : null,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
          }
        : null,
      materials: row.materials.map((m) => ({
        id: m.id,
        jobId: m.jobId,
        itemId: m.itemId,
        name: m.name,
        quantity: toNumber(m.quantity),
        unitCost: toNumber(m.unitCost),
        totalCost: toNumber(m.totalCost),
        source: m.source,
        sourceType: (m.sourceType as JobMaterial['sourceType']) ?? null,
        sourceDepartment: m.sourceDepartment,
        supplierId: m.supplierId,
        supplierName: m.supplierName,
        purchaseMovementId: m.purchaseMovementId,
      })),
      labourEntries: await this.resolveLabourWithStaffNames(row.labourEntries),
    };
  }

  async create(body: {
    reference: string;
    description: string;
    customerName?: string;
    customerId?: string;
    vehicleId?: string;
    locationCode?: string;
    hasQuote?: boolean;
    quoteAmount?: number;
    dueDate?: string;
  }): Promise<Job> {
    const tenantId = this.tenantDb.requireTenantId();
    const createdBy = await this.auditService.createdByFields();
    const locationCode = await this.tenantDb.resolveBusinessLocation(
      body.locationCode,
    );
    let customerName = body.customerName ?? null;
    let customerId = body.customerId ?? null;
    if (customerId) {
      const customer = await this.tenantDb.db.customer.findFirst({
        where: { id: customerId, tenantId, deletedAt: null },
        select: { name: true },
      });
      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
      customerName = customer.name;
    }
    const row = await this.tenantDb.db.job.create({
      data: {
        tenantId,
        reference: body.reference,
        description: body.description,
        status: 'Received',
        hasQuote: body.hasQuote ?? false,
        quoteAmount: body.quoteAmount ?? null,
        customerId,
        customerName,
        vehicleId: body.vehicleId ?? null,
        locationCode,
        assignedStaffIds: [],
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        ...createdBy,
      },
    });
    await this.auditService.log({
      action: 'created',
      entityType: 'job',
      entityId: row.id,
      summary: `Created job ${row.reference}`,
    });
    return this.serializeJob(row);
  }

  /** Link (or unlink with null) a vehicle to a job. */
  async setVehicle(jobId: string, vehicleId: string | null): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const tenantId = this.tenantDb.requireTenantId();

    let summary: string;
    if (vehicleId) {
      const vehicle = await this.tenantDb.db.vehicle.findFirst({
        where: { id: vehicleId, tenantId, deletedAt: null },
        select: { id: true, plateNumber: true },
      });
      if (!vehicle) {
        throw new BadRequestException('Vehicle not found');
      }
      summary = `Linked vehicle ${vehicle.plateNumber} to ${job.reference}`;
    } else {
      summary = `Unlinked vehicle from ${job.reference}`;
    }

    await this.tenantDb.db.job.update({
      where: { id: job.id },
      data: { vehicleId },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary,
      metadata: { vehicleId },
    });

    return this.getById(jobId);
  }

  async advanceStatus(id: string): Promise<Job> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Job not found');

    const next = getNextStage(existing.status, existing.hasQuote);
    if (!next) {
      throw new BadRequestException('Job is already at the final stage');
    }

    const row = await this.tenantDb.db.job.update({
      where: { id },
      data: { status: next },
    });
    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: id,
      summary: `Status → ${next}`,
      metadata: { previousStatus: existing.status, status: next },
    });
    return this.serializeJob(row);
  }

  async updateBilling(
    id: string,
    body: {
      hasQuote?: boolean;
      quoteAmount?: number | null;
      quoteNotes?: string | null;
      quoteValidUntil?: string | null;
      invoiceAmount?: number | null;
      invoiceNotes?: string | null;
    },
  ): Promise<JobDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Job not found');

    const hasQuote =
      body.hasQuote ??
      (body.quoteAmount != null ? true : existing.hasQuote);

    await this.tenantDb.db.job.update({
      where: { id },
      data: {
        hasQuote,
        ...(body.quoteAmount !== undefined
          ? { quoteAmount: body.quoteAmount }
          : {}),
        ...(body.quoteNotes !== undefined
          ? { quoteNotes: body.quoteNotes }
          : {}),
        ...(body.quoteValidUntil !== undefined
          ? {
              quoteValidUntil: body.quoteValidUntil
                ? new Date(body.quoteValidUntil)
                : null,
            }
          : {}),
        ...(body.invoiceAmount !== undefined
          ? { invoiceAmount: body.invoiceAmount }
          : {}),
        ...(body.invoiceNotes !== undefined
          ? { invoiceNotes: body.invoiceNotes }
          : {}),
      },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: id,
      summary: `Updated quote/invoice draft for ${existing.reference}`,
    });

    return this.getById(id);
  }

  async updateQc(
    id: string,
    body: {
      qcChecklist?: Record<string, boolean> | null;
      qcNotes?: string | null;
    },
  ): Promise<JobDetail> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Job not found');

    await this.tenantDb.db.job.update({
      where: { id },
      data: {
        ...(body.qcChecklist !== undefined
          ? {
              qcChecklist:
                body.qcChecklist === null
                  ? Prisma.JsonNull
                  : body.qcChecklist,
            }
          : {}),
        ...(body.qcNotes !== undefined ? { qcNotes: body.qcNotes } : {}),
      },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: id,
      summary: `Updated QC checklist for ${existing.reference}`,
    });

    return this.getById(id);
  }

  async addMaterial(
    jobId: string,
    body: {
      itemId?: string;
      name: string;
      quantity: number;
      unitCost: number;
      source?: string;
      sourceType?: JobMaterial['sourceType'];
      sourceDepartment?: string;
      supplierId?: string;
    },
  ): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const tenantId = this.tenantDb.requireTenantId();
    const quantity = body.quantity;
    const unitCost = body.unitCost;
    const name = body.name?.trim();
    if (!name) {
      throw new BadRequestException('Material name is required');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new BadRequestException('Invalid unit cost');
    }

    const sourceType = body.sourceType ?? 'shop';
    let sourceDepartment: string | null = null;
    let supplierId: string | null = null;
    let supplierName: string | null = null;

    if (sourceType === 'internal') {
      const code = body.sourceDepartment?.trim();
      if (!code) {
        throw new BadRequestException(
          'Select the department supplying this part',
        );
      }
      const department = await this.prisma.tenant.findFirst({
        where: { code, deletedAt: null },
        select: { code: true },
      });
      if (!department) {
        throw new BadRequestException(`Unknown department "${code}"`);
      }
      sourceDepartment = department.code;
    } else if (sourceType === 'external') {
      if (!body.supplierId) {
        throw new BadRequestException(
          'Select a supplier for the external purchase',
        );
      }
      const supplier = await this.tenantDb.db.supplier.findFirst({
        where: { id: body.supplierId, tenantId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!supplier) {
        throw new BadRequestException('Supplier not found');
      }
      supplierId = supplier.id;
      supplierName = supplier.name;
    }

    const totalCost = quantity * unitCost;

    // External parts are procured from a supplier — log a purchase (inbound
    // movement) so it shows in Purchases. It does not touch sellable stock:
    // the part is consumed by the job and billed on the customer invoice.
    let purchaseMovementId: string | null = null;
    if (sourceType === 'external' && supplierId) {
      const suffix = Date.now().toString(36).slice(-4).toUpperCase();
      const purchase = await this.tenantDb.db.stockMovement.create({
        data: {
          tenantId,
          type: 'inbound',
          reference: `${job.reference}-P${suffix}`,
          status: 'Received',
          supplierId,
          lines: [
            {
              itemId: body.itemId ?? null,
              name,
              quantity,
              unitCost,
              total: totalCost,
            },
          ] as unknown as Prisma.InputJsonValue,
          notes: `External purchase for job ${job.reference} | ${supplierName}`,
          date: new Date(),
        },
      });
      purchaseMovementId = purchase.id;
    }

    await this.tenantDb.db.jobMaterial.create({
      data: {
        jobId: job.id,
        itemId: body.itemId ?? null,
        name,
        quantity,
        unitCost,
        totalCost,
        source: body.source?.trim() || null,
        sourceType,
        sourceDepartment,
        supplierId,
        supplierName,
        purchaseMovementId,
      },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary: `Added material ${name} to ${job.reference}`,
      metadata: {
        quantity,
        unitCost,
        totalCost,
        sourceType,
        sourceDepartment,
        supplierId,
        purchaseMovementId,
      },
    });

    return this.getById(jobId);
  }

  async updateMaterial(
    jobId: string,
    materialId: string,
    body: {
      name?: string;
      quantity?: number;
      unitCost?: number;
      source?: string | null;
    },
  ): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const existing = await this.tenantDb.db.jobMaterial.findFirst({
      where: { id: materialId, jobId: job.id },
    });
    if (!existing) throw new NotFoundException('Material not found');

    const quantity =
      body.quantity !== undefined ? body.quantity : toNumber(existing.quantity);
    const unitCost =
      body.unitCost !== undefined ? body.unitCost : toNumber(existing.unitCost);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new BadRequestException('Invalid unit cost');
    }

    await this.tenantDb.db.jobMaterial.update({
      where: { id: materialId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        ...(body.source !== undefined ? { source: body.source } : {}),
      },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary: `Updated material on ${job.reference}`,
      metadata: { materialId },
    });

    return this.getById(jobId);
  }

  async removeMaterial(jobId: string, materialId: string): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const existing = await this.tenantDb.db.jobMaterial.findFirst({
      where: { id: materialId, jobId: job.id },
    });
    if (!existing) throw new NotFoundException('Material not found');

    // Void the linked external purchase so Purchases stays consistent.
    if (existing.purchaseMovementId) {
      await this.tenantDb.db.stockMovement.updateMany({
        where: { id: existing.purchaseMovementId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    await this.tenantDb.db.jobMaterial.delete({ where: { id: materialId } });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary: `Removed material ${existing.name} from ${job.reference}`,
      metadata: { materialId, purchaseMovementId: existing.purchaseMovementId },
    });

    return this.getById(jobId);
  }

  async addLabour(
    jobId: string,
    body: { staffId: string; hours: number; rate: number },
  ): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const hours = body.hours;
    const rate = body.rate;
    if (!body.staffId?.trim()) {
      throw new BadRequestException('Staff is required');
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new BadRequestException('Hours must be greater than zero');
    }
    if (!Number.isFinite(rate) || rate < 0) {
      throw new BadRequestException('Invalid rate');
    }

    const staff = await this.prisma.user.findFirst({
      where: {
        id: body.staffId,
        tenantId: job.tenantId,
        status: 'active',
      },
      select: { id: true },
    });
    if (!staff) throw new BadRequestException('Staff member not found');

    const totalCost = hours * rate;
    await this.tenantDb.db.jobLabour.create({
      data: {
        jobId: job.id,
        staffId: body.staffId,
        hours,
        rate,
        totalCost,
      },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary: `Added labour entry to ${job.reference}`,
      metadata: { staffId: body.staffId, hours, rate, totalCost },
    });

    return this.getById(jobId);
  }

  async updateLabour(
    jobId: string,
    labourId: string,
    body: { staffId?: string; hours?: number; rate?: number },
  ): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const existing = await this.tenantDb.db.jobLabour.findFirst({
      where: { id: labourId, jobId: job.id },
    });
    if (!existing) throw new NotFoundException('Labour entry not found');

    const hours =
      body.hours !== undefined ? body.hours : toNumber(existing.hours);
    const rate = body.rate !== undefined ? body.rate : toNumber(existing.rate);
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new BadRequestException('Hours must be greater than zero');
    }
    if (!Number.isFinite(rate) || rate < 0) {
      throw new BadRequestException('Invalid rate');
    }

    if (body.staffId) {
      const staff = await this.prisma.user.findFirst({
        where: {
          id: body.staffId,
          tenantId: job.tenantId,
          status: 'active',
        },
        select: { id: true },
      });
      if (!staff) throw new BadRequestException('Staff member not found');
    }

    await this.tenantDb.db.jobLabour.update({
      where: { id: labourId },
      data: {
        ...(body.staffId !== undefined ? { staffId: body.staffId } : {}),
        hours,
        rate,
        totalCost: hours * rate,
      },
    });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary: `Updated labour on ${job.reference}`,
      metadata: { labourId },
    });

    return this.getById(jobId);
  }

  async removeLabour(jobId: string, labourId: string): Promise<JobDetail> {
    const job = await this.requireJob(jobId);
    const existing = await this.tenantDb.db.jobLabour.findFirst({
      where: { id: labourId, jobId: job.id },
    });
    if (!existing) throw new NotFoundException('Labour entry not found');

    await this.tenantDb.db.jobLabour.delete({ where: { id: labourId } });

    await this.auditService.log({
      action: 'updated',
      entityType: 'job',
      entityId: jobId,
      summary: `Removed labour entry from ${job.reference}`,
      metadata: { labourId },
    });

    return this.getById(jobId);
  }

  private async requireJob(id: string) {
    const tenantId = this.tenantDb.requireTenantId();
    const job = await this.tenantDb.db.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private async resolveLabourWithStaffNames(
    rows: Array<{
      id: string;
      jobId: string;
      staffId: string;
      hours: { toString(): string };
      rate: { toString(): string };
      totalCost: { toString(): string };
    }>,
  ): Promise<JobLabour[]> {
    if (rows.length === 0) return [];

    const staffIds = [...new Set(rows.map((row) => row.staffId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((user) => [user.id, user.name]));

    return rows.map((row) => ({
      id: row.id,
      jobId: row.jobId,
      staffId: row.staffId,
      staffName: nameById.get(row.staffId) ?? null,
      hours: toNumber(row.hours),
      rate: toNumber(row.rate),
      totalCost: toNumber(row.totalCost),
    }));
  }

  private serializeJob(row: {
    id: string;
    tenantId: string;
    reference: string;
    description: string;
    status: string;
    hasQuote: boolean;
    quoteAmount: { toString(): string } | null;
    quoteNotes: string | null;
    quoteValidUntil: Date | null;
    invoiceAmount: { toString(): string } | null;
    invoiceNotes: string | null;
    customerName: string | null;
    customerId: string | null;
    vehicleId: string | null;
    locationCode: string | null;
    assignedStaffIds: string[];
    dueDate: Date | null;
    qcChecklist: unknown;
    qcNotes: string | null;
    createdByUserId: string | null;
    createdByName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Job {
    const qcChecklist =
      row.qcChecklist &&
      typeof row.qcChecklist === 'object' &&
      !Array.isArray(row.qcChecklist)
        ? (row.qcChecklist as Record<string, boolean>)
        : null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      reference: row.reference,
      description: row.description,
      status: row.status,
      hasQuote: row.hasQuote,
      quoteAmount: row.quoteAmount ? toNumber(row.quoteAmount) : null,
      quoteNotes: row.quoteNotes ?? null,
      quoteValidUntil: row.quoteValidUntil
        ? toIso(row.quoteValidUntil).slice(0, 10)
        : null,
      invoiceAmount: row.invoiceAmount ? toNumber(row.invoiceAmount) : null,
      invoiceNotes: row.invoiceNotes ?? null,
      customerId: row.customerId,
      customerName: row.customerName,
      vehicleId: row.vehicleId,
      locationCode: row.locationCode,
      assignedStaffIds: row.assignedStaffIds,
      dueDate: row.dueDate ? toIso(row.dueDate).slice(0, 10) : null,
      qcChecklist,
      qcNotes: row.qcNotes,
      createdByUserId: row.createdByUserId,
      createdByName: row.createdByName,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }
}
