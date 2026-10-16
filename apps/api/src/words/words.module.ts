import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { WordsController } from './words.controller.js';
import { WordsService } from './words.service.js';

@Module({
  imports: [GeminiModule],
  controllers: [WordsController],
  providers: [WordsService],
  exports: [WordsService],
})
export class WordsModule {}
