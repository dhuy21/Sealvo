import { Module } from '@nestjs/common';
import { ImportModule } from '../import/import.module.js';
import { WordsCoreModule } from './words-core.module.js';
import { WordsController } from './words.controller.js';

@Module({
  imports: [WordsCoreModule, ImportModule],
  controllers: [WordsController],
})
export class WordsModule {}
