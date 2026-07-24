import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';
import { HrmEssentialsService } from './hrm-essentials.service';

@Module({
  imports: [AuthModule, InvoicesModule],
  controllers: [HrmController],
  providers: [HrmService, HrmEssentialsService],
  exports: [HrmService, HrmEssentialsService],
})
export class HrmModule {}
