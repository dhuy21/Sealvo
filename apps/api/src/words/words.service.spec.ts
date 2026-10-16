import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WordsService } from './words.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import type { CreateWordDto } from './dto/create-word.dto.js';

describe('WordsService', () => {
  let service: WordsService;
  let gemini: GeminiService;
  let tx: {
    words: { findFirst: any; create: any };
    word_details: { create: any };
    learning: { create: any };
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
      words: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ word_id: 1 }),
      },
      word_details: { create: vi.fn().mockResolvedValue({ detail_id: 1 }) },
      learning: { create: vi.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WordsService,
        GeminiService,
        { provide: ConfigService, useValue: { get: () => undefined } },
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
          },
        },
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
  });
});
