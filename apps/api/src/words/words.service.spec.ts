import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WordsService } from './words.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import type { CreateWordDto } from './dto/create-word.dto.js';

describe('WordsService', () => {
  let service: WordsService;
  let gemini: GeminiService;
  let prisma: {
    $transaction: any;
    learning: { findUnique: any; findMany: any; deleteMany: any };
    word_details: { deleteMany: any };
  };
  let tx: {
    words: { upsert: any };
    word_details: { create: any; update: any };
    learning: { create: any; count: any; update: any };
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
      words: { upsert: vi.fn().mockResolvedValue({ word_id: 1 }) },
      word_details: {
        create: vi.fn().mockResolvedValue({ detail_id: 1 }),
        update: vi.fn(),
      },
      learning: { create: vi.fn(), count: vi.fn(), update: vi.fn() },
    };
    prisma = {
      $transaction: vi.fn((arg: unknown) =>
        typeof arg === 'function' ? arg(tx) : Promise.all(arg as Promise<unknown>[]),
      ),
      learning: { findUnique: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
      word_details: { deleteMany: vi.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WordsService,
        GeminiService,
        { provide: ConfigService, useValue: { get: () => undefined } },
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
      const onPhase = vi.fn().mockResolvedValue(undefined);

      const result = await service.addWords(1, [word(), word({ example: 'A cat.' })], onPhase);

      expect(result.successCount).toBe(2);
      expect(savedExamples()).toEqual(['', 'A cat.']);
      expect(onPhase.mock.calls).toEqual([['gemini'], ['saving']]);
    });

    it('should upsert the base word on its unique key with a long transaction timeout', async () => {
      await service.addWords(1, [word()]);

      expect(tx.words.upsert).toHaveBeenCalledWith({
        where: { word_subject_language_code: { word: 'cat', subject: 'Daily', language_code: 'en-US' } },
        update: {},
        create: { word: 'cat', subject: 'Daily', language_code: 'en-US' },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: expect.any(Number), maxWait: expect.any(Number) }),
      );
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
      prisma.learning.findUnique.mockResolvedValue({ detail_id: 7, package_id: 2, word_details: detail });
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
