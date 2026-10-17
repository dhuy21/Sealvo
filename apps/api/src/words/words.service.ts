import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type learning_level, type word_details_type } from '@prisma/client';
import type { ReviewWordDto, WordDto } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { retryOnDeadlock } from '../prisma/deadlock.js';
import { TX_OPTIONS } from '../prisma/tx-options.constants.js';
import { isDue, startOfToday } from '../common/domain/spaced-repetition.js';
import type { CreateWordDto } from './dto/create-word.dto.js';
import type { UpdateWordDto } from './dto/update-word.dto.js';
import { deleteOrphanDetails } from './orphan-details.js';
import { WordsEnrichmentService } from './words-enrichment.service.js';

type WordEntry = Prisma.learningGetPayload<{
  include: { word_details: { include: { words: true } } };
}>;

function toWordDto(e: WordEntry): WordDto {
  return {
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
  };
}

/**
 * Find or create the base word on its (word, subject, language_code) unique key, in one statement.
 * Prisma's upsert on MySQL is a SELECT then an INSERT: two imports adding the same new word at once
 * would fail with P2002. Here MySQL waits for the other transaction and returns the existing id.
 */
async function upsertWord(
  tx: Prisma.TransactionClient,
  key: { word: string; subject: string; language_code: string },
): Promise<{ word_id: number }> {
  await tx.$executeRaw`
    INSERT INTO words (word, subject, language_code) VALUES (${key.word}, ${key.subject}, ${key.language_code})
    ON DUPLICATE KEY UPDATE word_id = LAST_INSERT_ID(word_id)`;
  const [{ id }] = await tx.$queryRaw<[{ id: bigint }]>`SELECT LAST_INSERT_ID() AS id`;
  return { word_id: Number(id) };
}

type WordKey = Pick<CreateWordDto, 'word' | 'subject' | 'language_code'>;
const wordKey = (w: WordKey) => JSON.stringify([w.word, w.subject, w.language_code]);

/**
 * Upserts each distinct base word once, in sorted order: two imports sharing words then lock them
 * in the same order instead of deadlocking. Returns the word_id of each wordKey.
 */
async function upsertWords(
  tx: Prisma.TransactionClient,
  words: WordKey[],
): Promise<Map<string, number>> {
  const distinct = [...new Map(words.map((w) => [wordKey(w), w])).entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const ids = new Map<string, number>();
  for (const [key, w] of distinct) {
    ids.set(
      key,
      (await upsertWord(tx, { word: w.word, subject: w.subject, language_code: w.language_code }))
        .word_id,
    );
  }
  return ids;
}

/** Record the job inside the import transaction; false when an earlier delivery already committed it */
async function claimJob(tx: Prisma.TransactionClient, jobId: string): Promise<boolean> {
  try {
    await tx.applied_jobs.create({ data: { job_id: jobId } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return false;
    throw error;
  }
}

@Injectable()
export class WordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrichment: WordsEnrichmentService,
  ) {}

  /** Get all words for a package (joined: words + word_details + learning) */
  async findByPackageId(packageId: number): Promise<WordDto[]> {
    return (await this.findEntries(packageId)).map(toWordDto);
  }

  /** Get the package's words, flagged with whether they are due for review today */
  async findWordsToReview(packageId: number): Promise<ReviewWordDto[]> {
    const today = startOfToday();
    return (await this.findEntries(packageId)).map((e) => ({
      ...toWordDto(e),
      dueToday: isDue(e.level, e.date_memorized, today),
    }));
  }

  private findEntries(packageId: number) {
    return this.prisma.learning.findMany({
      where: { package_id: packageId },
      include: {
        word_details: {
          include: { words: true },
        },
      },
      orderBy: { word_details: { words: { word: 'asc' } } },
    });
  }

  /**
   * Add words to a package (Gemini enrichment, then single transaction, fix #63)
   * With a jobId, a job already applied by an earlier delivery saves nothing again.
   */
  async addWords(
    packageId: number,
    wordsData: CreateWordDto[],
    {
      jobId,
      onProgress,
    }: {
      jobId?: string;
      /** current = words saved so far */
      onProgress?: (phase: 'gemini' | 'saving', current: number) => Promise<unknown>;
    } = {},
  ) {
    if (jobId && (await this.isJobApplied(jobId))) {
      return this.addWordsResult(wordsData.length, true);
    }

    await onProgress?.('gemini', 0);
    await this.enrichment.enrichWithGemini(wordsData);
    await onProgress?.('saving', 0);

    let successCount = 0;

    const applied = await retryOnDeadlock(() =>
      this.prisma.$transaction(async (tx) => {
        if (jobId && !(await claimJob(tx, jobId))) return false;
        successCount = 0;

        const wordIds = await upsertWords(tx, wordsData);
        for (const wordData of wordsData) {
          const detail = await tx.word_details.create({
            data: {
              word_id: wordIds.get(wordKey(wordData))!,
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
          // Not awaited: a Redis round trip per word would keep the transaction (and its locks) open longer
          void onProgress?.('saving', successCount)?.catch(() => {});
        }
        return true;
      }, TX_OPTIONS),
    );

    return applied
      ? this.addWordsResult(successCount, false)
      : this.addWordsResult(wordsData.length, true);
  }

  /** Whether an import job's transaction committed (its id is recorded in that transaction) */
  async isJobApplied(jobId: string): Promise<boolean> {
    return (await this.prisma.applied_jobs.findUnique({ where: { job_id: jobId } })) !== null;
  }

  /** An already applied job reports every word: the earlier transaction was all-or-nothing */
  private addWordsResult(successCount: number, alreadyApplied: boolean) {
    return {
      message: `${successCount} mot(s) ajouté(s) avec succès`,
      successCount,
      alreadyApplied,
    };
  }

  /** Update a word (word base + details + level) */
  async updateWord(packageId: number, detailId: number, dto: UpdateWordDto) {
    const entry = await this.prisma.learning.findUnique({
      where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
      include: { word_details: { include: { words: true } } },
    });

    if (!entry) {
      throw new NotFoundException('Mot introuvable');
    }

    if (dto.example !== undefined) await this.enrichment.enrichWithGemini([dto]);

    const targetId = await retryOnDeadlock(() =>
      this.prisma.$transaction(async (tx) => {
        const current = entry.word_details;
        const currentWord = current.words;
        let targetId = detailId;

        // Check if base word changed (all 3 fields form unique key: word + subject + language_code)
        const wordChanged =
          (dto.word !== undefined && dto.word !== currentWord.word) ||
          (dto.language_code !== undefined && dto.language_code !== currentWord.language_code) ||
          (dto.subject !== undefined && dto.subject !== currentWord.subject);

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

          const wordRecord = await upsertWord(tx, {
            word: newWord,
            subject: newSubject,
            language_code: newLang,
          });

          detailUpdate.word_id = wordRecord.word_id;
        }

        if (Object.keys(detailUpdate).length > 0) {
          // Packages copied by the old app share word_details rows: give this package its own copy
          // before editing, so other packages keep their version
          const refs = await tx.learning.count({ where: { detail_id: detailId } });
          if (refs > 1) {
            const { detail_id: _, words: __, ...fields } = current;
            const clone = await tx.word_details.create({ data: fields });
            await tx.learning.update({
              where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
              data: { detail_id: clone.detail_id },
            });
            targetId = clone.detail_id;
          }

          // Single word_details update (merged word_id + fields)
          await tx.word_details.update({
            where: { detail_id: targetId },
            data: detailUpdate,
          });
        }

        if (dto.level !== undefined) {
          await tx.learning.update({
            where: { detail_id_package_id: { detail_id: targetId, package_id: packageId } },
            data: { level: dto.level as learning_level },
          });
        }

        return targetId;
      }),
    );

    return { message: 'Mot modifié avec succès', detailId: targetId };
  }

  /** Delete a single word from a package */
  async deleteWord(packageId: number, detailId: number) {
    const entry = await this.prisma.learning.findUnique({
      where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
    });

    if (!entry) {
      throw new NotFoundException('Mot introuvable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.learning.delete({
        where: { detail_id_package_id: { detail_id: detailId, package_id: packageId } },
      });
      await deleteOrphanDetails(tx, [detailId]);
    });

    return { message: 'Mot supprimé avec succès' };
  }

  /** Delete all words from a package */
  async deleteAllWords(packageId: number) {
    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId },
      select: { detail_id: true },
    });

    const detailIds = entries.map((e) => e.detail_id);

    if (detailIds.length === 0) {
      return { message: 'Aucun mot à supprimer', count: 0 };
    }

    await this.prisma.$transaction([
      this.prisma.learning.deleteMany({ where: { package_id: packageId } }),
      deleteOrphanDetails(this.prisma, detailIds),
    ]);

    return { message: 'Le(s) mot(s) supprimé(s) avec succès', count: detailIds.length };
  }
}
