import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service.js';

@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
