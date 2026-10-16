import { Injectable, NotFoundException } from '@nestjs/common';
import type { learning_level, word_details_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService, type ExamplePayload } from '../gemini/gemini.service.js';
import { isDue, startOfToday } from '../learning/spaced-repetition.js';
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

@Injectable()
export class WordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * Generate missing examples / correct existing ones so the target word is wrapped in **...**
   * (required by the phrase_completion game). Mutates `words` in place; never throws.
   * Source: wordProcessingService.js enrichWithGemini()
   */
  private async enrichWithGemini(words: (CreateWordDto | UpdateWordDto)[]) {
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

    for (const batch of chunk(wordsNoExample, GEMINI_BATCH_SIZE)) {
      this.gemini.replaceExample(words, await this.gemini.generateExample(batch));
    }
    for (const batch of chunk(wordsWithExample, GEMINI_BATCH_SIZE)) {
      this.gemini.replaceExample(words, await this.gemini.modifyExample(batch));
    }
  }

  /**
   * Get all words for a package (joined: words + word_details + learning)
   * Source: words.js findWordsByPackageId()
   */
  async findByPackageId(packageId: number) {
    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId },
      include: {
        word_details: {
          include: { words: true },
        },
      },
      orderBy: { word_details: { words: { word: 'asc' } } },
    });

    return entries.map((e) => ({
      detail_id: e.detail_id,
      word_id: e.word_details.word_id,
      word: e.word_details.words.word,
      language_code: e.word_details.words.language_code,
      subject: e.word_details.words.subject,
      type: e.word_details.type,
      meaning: e.word_details.meaning,
      pronunciation: e.word_details.pronunciation,
      synonyms: e.word_details.synonyms,
      antonyms: e.word_details.antonyms,
      example: e.word_details.example,
      grammar: e.word_details.grammar,
      level: e.level,
      package_id: e.package_id,
    }));
  }

  /**
   * Get words due for review today (spaced repetition)
   * Source: learning.js findWordsTodayToLearn()
   */
  async findWordsToReview(packageId: number) {
    const words = await this.findByPackageId(packageId);
    const today = startOfToday();

    // Get date_memorized for filtering
    const learningEntries = await this.prisma.learning.findMany({
      where: { package_id: packageId },
      select: { detail_id: true, level: true, date_memorized: true },
    });

    const dueDetailIds = new Set(
      learningEntries
        .filter((entry) => isDue(entry.level, entry.date_memorized, today))
        .map((e) => e.detail_id),
    );

    return words.map((w) => ({
      ...w,
      dueToday: dueDetailIds.has(w.detail_id),
    }));
  }

  /**
   * Add words to a package (Gemini enrichment, then single transaction)
   * Source: wordProcessingService.js processWords() + words.js create() — fix #63: batch in single transaction
   */
  async addWords(
    packageId: number,
    wordsData: CreateWordDto[],
    onPhase?: (phase: 'gemini' | 'saving') => Promise<unknown>,
  ) {
    await onPhase?.('gemini');
    await this.enrichWithGemini(wordsData);
    await onPhase?.('saving');

    let successCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const wordData of wordsData) {
        // Find or create the base word (fix #56: use all 3 fields)
        let wordRecord = await tx.words.findFirst({
          where: {
            word: wordData.word,
            subject: wordData.subject,
            language_code: wordData.language_code,
          },
        });

        if (!wordRecord) {
          wordRecord = await tx.words.create({
            data: {
              word: wordData.word,
              subject: wordData.subject,
              language_code: wordData.language_code,
            },
          });
        }

        const detail = await tx.word_details.create({
          data: {
            word_id: wordRecord.word_id,
            type: wordData.type as word_details_type,
            meaning: wordData.meaning,
            pronunciation: wordData.pronunciation ?? '',
            synonyms: wordData.synonyms ?? '',
            antonyms: wordData.antonyms ?? '',
            example: wordData.example ?? '',
            grammar: wordData.grammar ?? '',
          },
        });

        const level = (wordData.level ?? 'x') as learning_level;

        await tx.learning.create({
          data: {
            package_id: packageId,
            detail_id: detail.detail_id,
            level,
          },
        });

        successCount++;
      }
    });

    return {
      message: `${successCount} word(s) added successfully`,
      successCount,
    };
  }

  /**
   * Update a word (word base + details + level)
   * Source: words.js updateWord() + wordProcessingService.js enrichSingleWord() — fix #56: correct subject in WHERE
   */
  async updateWord(packageId: number, detailId: number, dto: UpdateWordDto) {
    const entry = await this.prisma.learning.findUnique({
      where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
      include: { word_details: { include: { words: true } } },
    });

    if (!entry) {
      throw new NotFoundException('Word not found in this package');
    }

    if (dto.example !== undefined) await this.enrichWithGemini([dto]);

    await this.prisma.$transaction(async (tx) => {
      const current = entry.word_details;
      const currentWord = current.words;

      // Check if base word changed (all 3 fields form unique key: word + subject + language_code)
      const wordChanged =
        (dto.word !== undefined && dto.word !== currentWord.word) ||
        (dto.language_code !== undefined && dto.language_code !== currentWord.language_code) ||
        (dto.subject !== undefined && dto.subject !== currentWord.subject);

      // Build word_details update payload
      const detailUpdate: Record<string, unknown> = {};
      if (dto.type !== undefined) detailUpdate.type = dto.type as word_details_type;
      if (dto.meaning !== undefined) detailUpdate.meaning = dto.meaning;
      if (dto.pronunciation !== undefined) detailUpdate.pronunciation = dto.pronunciation;
      if (dto.synonyms !== undefined) detailUpdate.synonyms = dto.synonyms;
      if (dto.antonyms !== undefined) detailUpdate.antonyms = dto.antonyms;
      if (dto.example !== undefined) detailUpdate.example = dto.example;
      if (dto.grammar !== undefined) detailUpdate.grammar = dto.grammar;

      if (wordChanged) {
        const newWord = dto.word ?? currentWord.word;
        const newLang = dto.language_code ?? currentWord.language_code;
        const newSubject = dto.subject ?? currentWord.subject;

        // Find or create the new base word (fix #56: include subject)
        let wordRecord = await tx.words.findFirst({
          where: { word: newWord, subject: newSubject, language_code: newLang },
        });

        if (!wordRecord) {
          wordRecord = await tx.words.create({
            data: { word: newWord, subject: newSubject, language_code: newLang },
          });
        }

        detailUpdate.word_id = wordRecord.word_id;
      }

      // Single word_details update (merged word_id + fields)
      if (Object.keys(detailUpdate).length > 0) {
        await tx.word_details.update({
          where: { detail_id: detailId },
          data: detailUpdate,
        });
      }

      // Update level if provided
      if (dto.level !== undefined) {
        await tx.learning.update({
          where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
          data: { level: dto.level as learning_level },
        });
      }
    });

    return { message: 'Word updated successfully' };
  }

  /**
   * Delete a single word from a package
   * Source: words.js deleteWord() — fix #47: clean up orphaned word_details
   */
  async deleteWord(packageId: number, detailId: number) {
    const entry = await this.prisma.learning.findUnique({
      where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
    });

    if (!entry) {
      throw new NotFoundException('Word not found in this package');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete learning entry
      await tx.learning.delete({
        where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
      });

      // Fix #47: clean up word_details if no other packages reference it
      const remainingRefs = await tx.learning.count({
        where: { detail_id: detailId },
      });

      if (remainingRefs === 0) {
        await tx.word_details.delete({ where: { detail_id: detailId } });
      }
    });

    return { message: 'Word deleted successfully' };
  }

  /**
   * Delete all words from a package
   * Source: words.js deleteAllWords()
   */
  async deleteAllWords(packageId: number) {
    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId },
      select: { detail_id: true },
    });

    const detailIds = entries.map((e) => e.detail_id);

    if (detailIds.length === 0) {
      return { message: 'No words to delete', count: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete all learning entries for this package
      await tx.learning.deleteMany({ where: { package_id: packageId } });

      // Fix #47: clean up orphaned word_details
      for (const detailId of detailIds) {
        const remaining = await tx.learning.count({ where: { detail_id: detailId } });
        if (remaining === 0) {
          await tx.word_details.delete({ where: { detail_id: detailId } });
        }
      }
    });

    return { message: `${detailIds.length} word(s) deleted successfully`, count: detailIds.length };
  }
}
