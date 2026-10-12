import { Module } from '@nestjs/common';
import { WordsController } from './words.controller.js';
import { WordsService } from './words.service.js';

@Module({
  controllers: [WordsController],
  providers: [WordsService],
  exports: [WordsService],
})
export class WordsModule {}
