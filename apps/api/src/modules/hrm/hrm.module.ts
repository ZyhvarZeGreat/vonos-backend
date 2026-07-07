import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';

@Module({
  imports: [AuthModule],
  controllers: [HrmController],
  providers: [HrmService],
  exports: [HrmService],
})
export class HrmModule {}
