import { Module } from '@nestjs/common';
import { GamesController } from './games.controller.js';
import { GamesService } from './games.service.js';

@Module({
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
