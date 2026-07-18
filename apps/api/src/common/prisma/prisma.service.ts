import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_RETRY_DELAY_MS = 2_000;
const DEFAULT_CONNECTION_LIMIT = 10;
const DEFAULT_POOL_TIMEOUT_S = 30;

function resolveDatabaseUrl(url?: string): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set(
        'connection_limit',
        process.env.PRISMA_CONNECTION_LIMIT ?? String(DEFAULT_CONNECTION_LIMIT),
      );
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set(
        'pool_timeout',
        process.env.PRISMA_POOL_TIMEOUT ?? String(DEFAULT_POOL_TIMEOUT_S),
      );
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const tenantScopedModels = new Set([
  'Item',
  'Job',
  'LedgerEntry',
  'Supplier',
  'StockMovement',
  'User',
  'Customer',
  'Sale',
  'Payment',
  'PaymentAccount',
  'AccountTransaction',
  'Appointment',
  'AuditLog',
  'Vehicle',
  'Requisition',
  'SalonService',
  'CafeTable',
  'Expense',
  'ExpenseCategory',
  'Payroll',
  'PayrollGroup',
  'PayComponent',
  'Designation',
  'Employee',
  'CustomerGroup',
]);

const modelsWithoutSoftDelete = new Set([
  'Notification',
  'AuditLog',
  'MigrationLegacyId',
  'AuthToken',
  'ItemLocationStock',
  'SaleLine',
  'JobMaterial',
  'JobLabour',
  'TenantDailyFinance',
]);

function applySoftDeleteFilter(args: { where?: Record<string, unknown> }) {
  if (!args.where) args.where = {};
  if (args.where.deletedAt === undefined) {
    args.where.deletedAt = null;
  }
}

function prismaLogQueriesEnabled(): boolean {
  return process.env.PRISMA_LOG_QUERIES === 'true';
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private databaseConnected = false;
  private readonly tenantClients = new Map<string, TenantScopedPrisma>();

  constructor() {
    super({
      datasources: {
        db: {
          url: resolveDatabaseUrl(process.env.DATABASE_URL),
        },
      },
      ...(prismaLogQueriesEnabled()
        ? { log: [{ emit: 'event', level: 'query' }] }
        : {}),
    });

    if (prismaLogQueriesEnabled()) {
      // Prisma event typing is narrow; cast keeps query logging opt-in only.
      (
        this as PrismaClient & {
          $on(event: 'query', cb: (e: { duration: number; query: string }) => void): void;
        }
      ).$on('query', (event) => {
        const sql = event.query.length > 200 ? `${event.query.slice(0, 200)}…` : event.query;
        this.logger.debug(`query ${event.duration}ms ${sql}`);
      });
    }
  }

  async onModuleInit() {
    void this.connectInBackground();
  }

  async onModuleDestroy() {
    this.tenantClients.clear();
    try {
      await this.$disconnect();
      this.databaseConnected = false;
      this.logger.log('Database disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Database disconnect failed (${message})`);
    }
  }

  isDatabaseConnected(): boolean {
    return this.databaseConnected;
  }

  private async connectInBackground(): Promise<void> {
    for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        this.databaseConnected = true;
        this.logger.log('Database connected');
        return;
      } catch (error) {
        const isLast = attempt === CONNECT_MAX_ATTEMPTS;
        const message = error instanceof Error ? error.message : String(error);
        if (isLast) {
          this.logger.error(
            `Database unavailable after ${CONNECT_MAX_ATTEMPTS} attempts (${message}). API will start without DB.`,
          );
          return;
        }
        this.logger.warn(
          `Database connect attempt ${attempt}/${CONNECT_MAX_ATTEMPTS} failed (${message}). Retrying in ${CONNECT_RETRY_DELAY_MS}ms…`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, CONNECT_RETRY_DELAY_MS),
        );
      }
    }
  }

  /** Returns a PrismaClient-shaped client; cast keeps query result types intact. */
  forTenant(tenantId: string | null): PrismaClient {
    const cacheKey = tenantId ?? '__global__';
    const cached = this.tenantClients.get(cacheKey);
    if (cached) return cached;

    const client = this.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            if (!modelsWithoutSoftDelete.has(model))
              applySoftDeleteFilter(args);
            return query(args);
          },
          async findFirst({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            if (!modelsWithoutSoftDelete.has(model))
              applySoftDeleteFilter(args);
            return query(args);
          },
          async findUnique({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async create({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.data = { ...args.data, tenantId } as typeof args.data;
            }
            return query(args);
          },
          async update({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
          async count({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            if (!modelsWithoutSoftDelete.has(model))
              applySoftDeleteFilter(args);
            return query(args);
          },
          async aggregate({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            if (!modelsWithoutSoftDelete.has(model))
              applySoftDeleteFilter(args);
            return query(args);
          },
          async groupBy({ model, args, query }) {
            if (tenantId !== null && tenantScopedModels.has(model)) {
              args.where = { ...args.where, tenantId };
            }
            if (!modelsWithoutSoftDelete.has(model))
              applySoftDeleteFilter(args);
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;

    this.tenantClients.set(cacheKey, client);
    return client;
  }
}

export type TenantScopedPrisma = ReturnType<PrismaService['forTenant']>;
