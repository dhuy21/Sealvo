import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { WordsEnrichmentService } from './words-enrichment.service.js';
import { WordsService } from './words.service.js';

/** WordsService without the HTTP layer, so ImportModule can use it while WordsModule imports ImportModule */
@Module({
  imports: [GeminiModule],
  providers: [WordsService, WordsEnrichmentService],
  exports: [WordsService],
})
export class WordsCoreModule {}
