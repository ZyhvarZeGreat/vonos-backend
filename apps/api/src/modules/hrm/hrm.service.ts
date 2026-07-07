import { ForbiddenException, Injectable } from '@nestjs/common';
import type {
  PayComponent,
  Payroll,
  PayrollGroup,
  WorkforceMember,
  CreatePayrollRequest,
  CreatePayrollGroupRequest,
  CreatePayComponentRequest,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toIso, toNumber } from '../../common/utils/serializers';

@Injectable()
export class HrmService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async listWorkforce(filters: { search?: string } = {}): Promise<WorkforceMember[]> {
    const tenantId = this.tenantDb.requireTenantId();
    return this.queryWorkforce({ tenantId, search: filters.search });
  }

  async listWorkforceAllTenants(
    requestRole: string,
    filters: { search?: string } = {},
  ): Promise<WorkforceMember[]> {
    if (requestRole !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }
    return this.queryWorkforce({ search: filters.search });
  }

  private async queryWorkforce(options: {
    tenantId?: string;
    search?: string;
  }): Promise<WorkforceMember[]> {
    const rows = await this.tenantDb.db.payroll.findMany({
      where: {
        deletedAt: null,
        ...(options.tenantId ? { tenantId: options.tenantId } : {}),
        ...(options.search?.trim()
          ? {
              employeeName: {
                contains: options.search.trim(),
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      include: { tenant: { select: { code: true, name: true } } },
      orderBy: [{ tenantId: 'asc' }, { employeeName: 'asc' }, { payrollMonth: 'desc' }],
    });

    const grouped = new Map<string, WorkforceMember>();

    for (const row of rows) {
      const key = `${row.tenantId}::${row.employeeName}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: key,
          tenantId: row.tenantId,
          tenantCode: row.tenant.code,
          tenantName: row.tenant.name,
          employeeName: row.employeeName,
          employeeId: row.employeeId,
          locationCode: row.locationCode,
          payrollCount: 1,
          lastPayrollMonth: toIso(row.payrollMonth),
          totalNetPay: toNumber(row.netPay),
        });
        continue;
      }

      existing.payrollCount += 1;
      existing.totalNetPay += toNumber(row.netPay);
      if (row.employeeId && !existing.employeeId) {
        existing.employeeId = row.employeeId;
      }
      if (row.locationCode && !existing.locationCode) {
        existing.locationCode = row.locationCode;
      }
      if (row.payrollMonth > new Date(existing.lastPayrollMonth)) {
        existing.lastPayrollMonth = toIso(row.payrollMonth);
      }
    }

    return [...grouped.values()].sort((a, b) => {
      const tenantCompare = (a.tenantCode ?? '').localeCompare(b.tenantCode ?? '');
      if (tenantCompare !== 0) return tenantCompare;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }

  async listPayrolls(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<Payroll[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.payroll.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.search
          ? {
              employeeName: {
                contains: filters.search,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      include: { payrollGroup: true },
      orderBy: { payrollMonth: 'desc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
    });
    return rows.map((row) => this.serializePayroll(row));
  }

  async createPayroll(dto: CreatePayrollRequest): Promise<Payroll> {
    const tenantId = this.tenantDb.requireTenantId();
    const allowance = dto.totalAllowance ?? 0;
    const deduction = dto.totalDeduction ?? 0;
    const netPay = dto.grossPay + allowance - deduction;
    const row = await this.tenantDb.db.payroll.create({
      data: {
        tenantId,
        employeeName: dto.employeeName,
        employeeId: dto.employeeId ?? null,
        payrollGroupId: dto.payrollGroupId ?? null,
        locationCode: dto.locationCode ?? null,
        grossPay: dto.grossPay,
        totalAllowance: allowance,
        totalDeduction: deduction,
        netPay,
        payrollMonth: new Date(dto.payrollMonth),
        note: dto.note ?? null,
      },
      include: { payrollGroup: true },
    });
    return this.serializePayroll(row);
  }

  async listPayrollGroups(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<PayrollGroup[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.payrollGroup.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      include: { _count: { select: { payrolls: true } } },
      orderBy: { name: 'asc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
    });
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      payrollCount: row._count.payrolls,
      createdAt: toIso(row.createdAt),
    }));
  }

  async createPayrollGroup(dto: CreatePayrollGroupRequest): Promise<PayrollGroup> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.payrollGroup.create({
      data: { tenantId, name: dto.name },
      include: { _count: { select: { payrolls: true } } },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      payrollCount: row._count.payrolls,
      createdAt: toIso(row.createdAt),
    };
  }

  async listPayComponents(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<PayComponent[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.payComponent.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
    });
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      type: row.type as PayComponent['type'],
      amount: toNumber(row.amount),
      createdAt: toIso(row.createdAt),
    }));
  }

  async createPayComponent(dto: CreatePayComponentRequest): Promise<PayComponent> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.payComponent.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        amount: dto.amount,
      },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      type: row.type as PayComponent['type'],
      amount: toNumber(row.amount),
      createdAt: toIso(row.createdAt),
    };
  }

  private serializePayroll(
    row: Awaited<ReturnType<TenantDbService['db']['payroll']['findMany']>>[number] & {
      payrollGroup: { name: string } | null;
    },
  ): Payroll {
    return {
      id: row.id,
      tenantId: row.tenantId,
      payrollGroupId: row.payrollGroupId,
      payrollGroupName: row.payrollGroup?.name ?? null,
      employeeName: row.employeeName,
      employeeId: row.employeeId,
      locationCode: row.locationCode,
      grossPay: toNumber(row.grossPay),
      totalAllowance: toNumber(row.totalAllowance),
      totalDeduction: toNumber(row.totalDeduction),
      netPay: toNumber(row.netPay),
      status: row.status as Payroll['status'],
      paymentStatus: row.paymentStatus,
      payrollMonth: toIso(row.payrollMonth),
      note: row.note,
      createdAt: toIso(row.createdAt),
    };
  }
}
