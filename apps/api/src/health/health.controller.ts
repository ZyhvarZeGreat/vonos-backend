import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database: 'connected' | 'disconnected' = 'disconnected';
    if (this.prisma.isDatabaseConnected()) {
      database = 'connected';
    } else {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        database = 'connected';
      } catch {
        database = 'disconnected';
      }
    }

    return {
      status: 'ok',
      service: 'vonos-api',
      database,
    };
  }
}
