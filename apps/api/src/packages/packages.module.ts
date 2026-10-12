import { Module } from '@nestjs/common';
import { PackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';

@Module({
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
