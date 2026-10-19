import { Test } from '@nestjs/testing';
import { geminiConfig } from '../config/gemini.config.js';
import { Prisma } from '@prisma/client';
import { WordsService } from './words.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { WordsEnrichmentService } from './words-enrichment.service.js';
import type { CreateWordDto } from './dto/create-word.dto.js';

describe('WordsService', () => {
  let service: WordsService;
  let gemini: GeminiService;
  let prisma: {
    $transaction: any;
    applied_jobs: { findUnique: any };
    learning: { findUnique: any; findMany: any; deleteMany: any };
    word_details: { deleteMany: any };
  };
  let tx: {
    applied_jobs: { create: any };
    $executeRaw: any;
    $queryRaw: any;
    word_details: { create: any; update: any; deleteMany: any };
    learning: { create: any; count: any; update: any; delete: any };
  };

  const word = (overrides: Partial<CreateWordDto> = {}): CreateWordDto => ({
    word: 'cat',
    language_code: 'en-US',
    subject: 'Daily',
    type: 'noun',
    meaning: 'chat',
    example: '',
    ...overrides,
  });
  const savedExamples = () =>
    tx.word_details.create.mock.calls.map(
      ([arg]: [{ data: { example: string } }]) => arg.data.example,
    );

  beforeEach(async () => {
    tx = {
      applied_jobs: { create: vi.fn() },
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ id: 1n }]),
      word_details: {
        create: vi.fn().mockResolvedValue({ detail_id: 1 }),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      learning: { create: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
    };
    prisma = {
      $transaction: vi.fn((arg: unknown) =>
        typeof arg === 'function' ? arg(tx) : Promise.all(arg as Promise<unknown>[]),
      ),
      applied_jobs: { findUnique: vi.fn().mockResolvedValue(null) },
      learning: { findUnique: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
      word_details: { deleteMany: vi.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WordsService,
        WordsEnrichmentService,
        GeminiService,
        { provide: geminiConfig.KEY, useValue: { apiKey: undefined } },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WordsService);
    gemini = module.get(GeminiService);
  });

  describe('addWords', () => {
    it('should save generated and corrected examples with **markup**', async () => {
      const generate = vi
        .spyOn(gemini, 'generateExample')
        .mockResolvedValue([{ id: 0, example: 'The **cat** sleeps.' }]);
      const modify = vi
        .spyOn(gemini, 'modifyExample')
        .mockResolvedValue([{ id: '1', example: 'I **ran** home.' }]);

      await service.addWords(1, [
        word(),
        word({ word: 'run', type: 'verb', example: 'I run home' }),
      ]);

      expect(generate).toHaveBeenCalledWith([expect.objectContaining({ id: 0, word: 'cat' })]);
      expect(modify).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1, example: 'I run home' }),
      ]);
      expect(savedExamples()).toEqual(['The **cat** sleeps.', 'I **ran** home.']);
    });

    it('should send words to Gemini in batches of 25', async () => {
      const generate = vi.spyOn(gemini, 'generateExample').mockResolvedValue([]);

      await service.addWords(
        1,
        Array.from({ length: 30 }, () => word()),
      );

      expect(generate.mock.calls.map(([batch]) => batch.length)).toEqual([25, 5]);
      expect(generate.mock.calls[1][0][0].id).toBe(25);
    });

    it('should still save words unchanged when GEMINI_API_KEY is missing', async () => {
      const result = await service.addWords(1, [word(), word({ example: 'A cat.' })]);

      expect(result.successCount).toBe(2);
      expect(savedExamples()).toEqual(['', 'A cat.']);
    });

    it('should report the gemini phase, then saving progress after each word', async () => {
      const onProgress = vi.fn().mockResolvedValue(undefined);

      await service.addWords(1, [word(), word()], { onProgress });

      expect(onProgress.mock.calls).toEqual([
        ['gemini', 0],
        ['gemini', 2],
        ['saving', 0],
        ['saving', 1],
        ['saving', 2],
      ]);
    });

    it('should record the job id in the transaction before saving the words', async () => {
      const result = await service.addWords(1, [word()], { jobId: 'job-1' });

      expect(tx.applied_jobs.create).toHaveBeenCalledWith({ data: { job_id: 'job-1' } });
      expect(tx.applied_jobs.create.mock.invocationCallOrder[0]).toBeLessThan(
        tx.$executeRaw.mock.invocationCallOrder[0],
      );
      expect(result).toMatchObject({ successCount: 1, alreadyApplied: false });
    });

    it('should save nothing again when the job was already applied by an earlier delivery', async () => {
      tx.applied_jobs.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: 'PRIMARY' },
        }),
      );

      const result = await service.addWords(1, [word(), word()], { jobId: 'job-1' });

      expect(tx.$executeRaw).not.toHaveBeenCalled();
      expect(tx.word_details.create).not.toHaveBeenCalled();
      expect(tx.learning.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: '2 mot(s) ajouté(s) avec succès',
        successCount: 2,
        alreadyApplied: true,
      });
    });

    it('should skip Gemini and the transaction when the job is already recorded', async () => {
      prisma.applied_jobs.findUnique.mockResolvedValue({ job_id: 'job-1' });
      const generate = vi.spyOn(gemini, 'generateExample');

      const result = await service.addWords(1, [word(), word()], { jobId: 'job-1' });

      expect(generate).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toMatchObject({ successCount: 2, alreadyApplied: true });
    });

    it('should not record a marker without a job id (synchronous save)', async () => {
      await service.addWords(1, [word()]);

      expect(tx.applied_jobs.create).not.toHaveBeenCalled();
      expect(tx.learning.create).toHaveBeenCalledTimes(1);
    });

    it('should upsert the base word in one statement on its unique key with a long transaction timeout', async () => {
      tx.$queryRaw.mockResolvedValue([{ id: 42n }]);

      await service.addWords(1, [word()]);

      const [sql, ...values] = tx.$executeRaw.mock.calls[0];
      expect(sql.join('?')).toMatch(
        /INSERT INTO words .* ON DUPLICATE KEY UPDATE word_id = LAST_INSERT_ID\(word_id\)/s,
      );
      expect(values).toEqual(['cat', 'Daily', 'en-US']);
      expect(tx.word_details.create.mock.calls[0][0].data).toMatchObject({ word_id: 42 });
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: expect.any(Number), maxWait: expect.any(Number) }),
      );
    });

    it('should upsert each base word once, in sorted order, so concurrent imports lock alike', async () => {
      tx.$queryRaw
        .mockResolvedValueOnce([{ id: 1n }])
        .mockResolvedValueOnce([{ id: 2n }])
        .mockResolvedValueOnce([{ id: 3n }]);

      await service.addWords(1, [
        word({ word: 'dog' }),
        word({ word: 'cat' }),
        word({ word: 'dog', type: 'verb' }),
        word({ word: 'Cat' }),
      ]);

      expect(tx.$executeRaw.mock.calls.map((call: unknown[]) => call[1])).toEqual([
        'Cat',
        'cat',
        'dog',
      ]);
      expect(
        tx.word_details.create.mock.calls.map(
          ([arg]: [{ data: { word_id: number } }]) => arg.data.word_id,
        ),
      ).toEqual([3, 2, 3, 1]);
    });

    it('should rerun the transaction InnoDB picked as a deadlock victim', async () => {
      tx.$executeRaw.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Deadlock found', {
          code: 'P2010',
          clientVersion: 'test',
          meta: { code: '1213' },
        }),
      );

      await expect(service.addWords(1, [word()])).resolves.toMatchObject({ successCount: 1 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateWord', () => {
    const detail = {
      detail_id: 7,
      word_id: 1,
      type: 'noun',
      meaning: 'chat',
      pronunciation: '',
      synonyms: '',
      antonyms: '',
      example: 'A **cat**.',
      grammar: '',
      words: { word: 'cat', subject: 'Daily', language_code: 'en-US' },
    };

    beforeEach(() => {
      prisma.learning.findUnique.mockResolvedValue({
        detail_id: 7,
        package_id: 2,
        word_details: detail,
      });
    });

    it('should clone a word_details row shared with another package before editing it', async () => {
      tx.learning.count.mockResolvedValue(2);
      tx.word_details.create.mockResolvedValue({ detail_id: 42 });

      const result = await service.updateWord(2, 7, { meaning: 'félin', level: 'level_0' });

      const { detail_id: _, words: __, ...fields } = detail;
      expect(tx.word_details.create).toHaveBeenCalledWith({ data: fields });
      expect(tx.learning.update).toHaveBeenCalledWith({
        where: { detail_id_package_id: { detail_id: 7, package_id: 2 } },
        data: { detail_id: 42 },
      });
      expect(tx.word_details.update).toHaveBeenCalledWith({
        where: { detail_id: 42 },
        data: { meaning: 'félin' },
      });
      expect(tx.learning.update).toHaveBeenLastCalledWith({
        where: { detail_id_package_id: { detail_id: 42, package_id: 2 } },
        data: { level: 'level_0' },
      });
      expect(result.detailId).toBe(42);
    });

    it('should edit an unshared word_details row in place', async () => {
      tx.learning.count.mockResolvedValue(1);

      const result = await service.updateWord(2, 7, { meaning: 'félin' });

      expect(tx.word_details.create).not.toHaveBeenCalled();
      expect(tx.word_details.update).toHaveBeenCalledWith({
        where: { detail_id: 7 },
        data: { meaning: 'félin' },
      });
      expect(result.detailId).toBe(7);
    });

    it('should not clone when only the level changes', async () => {
      await service.updateWord(2, 7, { level: 'v' });

      expect(tx.learning.count).not.toHaveBeenCalled();
      expect(tx.word_details.create).not.toHaveBeenCalled();
    });
  });

  describe('findWordsToReview', () => {
    it('flags the words due today from a single query', async () => {
      const entry = (detail_id: number, date_memorized: Date | null) => ({
        detail_id,
        package_id: 3,
        level: 'x',
        date_memorized,
        word_details: {
          word_id: detail_id,
          type: 'noun',
          meaning: 'm',
          pronunciation: null,
          synonyms: null,
          antonyms: null,
          example: null,
          grammar: null,
          words: { word: `w${detail_id}`, language_code: 'en-US', subject: 'Daily' },
        },
      });
      prisma.learning.findMany.mockResolvedValue([entry(1, new Date(2020, 0, 1)), entry(2, null)]);

      const words = await service.findWordsToReview(3);

      expect(prisma.learning.findMany).toHaveBeenCalledTimes(1);
      expect(words.map((w) => [w.detail_id, w.dueToday])).toEqual([
        [1, true],
        [2, false],
      ]);
      expect(words[0]).toEqual({
        detail_id: 1,
        word_id: 1,
        word: 'w1',
        language_code: 'en-US',
        subject: 'Daily',
        type: 'noun',
        meaning: 'm',
        pronunciation: null,
        synonyms: null,
        antonyms: null,
        example: null,
        grammar: null,
        level: 'x',
        package_id: 3,
        dueToday: true,
      });
    });
  });

  describe('deleteWord', () => {
    it('removes the learning row, then its word_details only if no package references it', async () => {
      prisma.learning.findUnique.mockResolvedValue({ detail_id: 7, package_id: 2 });

      await expect(service.deleteWord(2, 7)).resolves.toEqual({
        message: 'Mot supprimé avec succès',
      });

      expect(tx.learning.delete).toHaveBeenCalledWith({
        where: { detail_id_package_id: { detail_id: 7, package_id: 2 } },
      });
      expect(tx.word_details.deleteMany).toHaveBeenCalledWith({
        where: { detail_id: { in: [7] }, learning: { none: {} } },
      });
    });
  });

  describe('deleteAllWords', () => {
    it('should delete orphaned word_details in a single query', async () => {
      prisma.learning.findMany.mockResolvedValue([{ detail_id: 1 }, { detail_id: 2 }]);

      const result = await service.deleteAllWords(3);

      expect(prisma.word_details.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.word_details.deleteMany).toHaveBeenCalledWith({
        where: { detail_id: { in: [1, 2] }, learning: { none: {} } },
      });
      expect(result.count).toBe(2);
    });
  });
});
