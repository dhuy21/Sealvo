import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';

@Module({
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
