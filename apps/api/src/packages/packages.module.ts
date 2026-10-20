import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { PackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';

@Module({
  imports: [ActivityModule],
  controllers: [PackagesController],
  providers: [PackagesService],
})
export class PackagesModule {}
