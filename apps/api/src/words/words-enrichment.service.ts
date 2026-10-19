import { Injectable } from '@nestjs/common';
import {
  GeminiService,
  type ExamplePayload,
  type GeneratedExample,
} from '../gemini/gemini.service.js';
import type { CreateWordDto } from './dto/create-word.dto.js';
import type { UpdateWordDto } from './dto/update-word.dto.js';

const GEMINI_BATCH_SIZE = 25;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Sets `example` on each word whose array index matches a returned `id`. */
export function replaceExample(words: { example?: string }[], replacements: GeneratedExample[]) {
  words.forEach((word, id) => {
    const found = replacements.find((r) => Number(r.id) === id);
    if (typeof found?.example === 'string') word.example = found.example;
  });
}

@Injectable()
export class WordsEnrichmentService {
  constructor(private readonly gemini: GeminiService) {}

  /**
   * Generate missing examples / correct existing ones so the target word is wrapped in **...**
   * (required by the phrase_completion game). Mutates `words` in place; never throws.
   */
  async enrichWithGemini(
    words: (CreateWordDto | UpdateWordDto)[],
    onProcessed?: (count: number) => Promise<unknown>,
  ) {
    const wordsNoExample: ExamplePayload[] = [];
    const wordsWithExample: ExamplePayload[] = [];

    words.forEach((w, id) => {
      if (!w.meaning || !w.type || !w.word) return;
      const payload = {
        id,
        word: w.word,
        language_code: w.language_code,
        meaning: w.meaning,
        type: w.type,
      };
      if (!w.example) wordsNoExample.push(payload);
      else wordsWithExample.push({ ...payload, example: w.example });
    });

    let processed = 0;
    for (const batch of chunk(wordsNoExample, GEMINI_BATCH_SIZE)) {
      replaceExample(words, await this.gemini.generateExample(batch));
      processed += batch.length;
      await onProcessed?.(processed);
    }
    for (const batch of chunk(wordsWithExample, GEMINI_BATCH_SIZE)) {
      replaceExample(words, await this.gemini.modifyExample(batch));
      processed += batch.length;
      await onProcessed?.(processed);
    }
  }
}
