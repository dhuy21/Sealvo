import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GamesService } from './games.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('GamesService', () => {
  let service: GamesService;
  let prisma: {
    learning: { findMany: any };
    user_best_scores: { createMany: any; update: any; updateMany: any; findMany: any };
    $transaction: any;
  };

  beforeEach(async () => {
    prisma = {
      learning: { findMany: vi.fn() },
      user_best_scores: { createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
      $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(GamesService);
  });

  describe('getWordsForGame', () => {
    it('should throw on unknown game type', async () => {
      await expect(service.getWordsForGame(1, 'invalid_game'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw on prototype keys used as game type', async () => {
      await expect(service.getWordsForGame(1, 'constructor')).rejects.toThrow(BadRequestException);
      await expect(service.getWordsForGame(1, '__proto__')).rejects.toThrow(BadRequestException);
    });

    it('should return error message when not enough words', async () => {
      prisma.learning.findMany.mockResolvedValue([]);

      const result = await service.getWordsForGame(1, 'word_scramble');
      expect(result.errorMessage).toBe(
        'Vous devez avoir au moins 5 mots au niveau 0 dans votre vocabulaire pour jouer à ce jeu.',
      );
      expect(result.words).toHaveLength(0);
    });

    it('should return words when enough are available', async () => {
      const entries = Array.from({ length: 8 }, (_, i) => ({
        detail_id: i + 1,
        date_memorized: new Date(2020, 0, 1),
        word_details: {
          word_id: i + 1,
          meaning: `meaning ${i}`,
          pronunciation: null,
          example: null,
          synonyms: null,
          words: { word: `word${i}`, language_code: 'en-US' },
        },
      }));

      prisma.learning.findMany.mockResolvedValue(entries);

      const result = await service.getWordsForGame(1, 'flash_match');
      expect(result.errorMessage).toBeNull();
      expect(result.words.length).toBe(8);
      expect(result.gameType).toBe('flash_match');
    });

    const entry = (i: number, word: string, example: string | null = null) => ({
      detail_id: i,
      date_memorized: new Date(2020, 0, 1),
      word_details: {
        word_id: i,
        type: 'ph_v',
        meaning: `meaning ${i}`,
        pronunciation: null,
        example,
        synonyms: null,
        words: { word, language_code: 'en-US' },
      },
    });

    it('should include the word type', async () => {
      prisma.learning.findMany.mockResolvedValue([entry(1, 'look up')]);

      const result = await service.getWordsForGame(1, 'vocab_quiz');
      expect(result.words[0]).toMatchObject({ word: 'look up', type: 'ph_v' });
    });

    it('word_search: keeps at most 30 words under 14 bytes, checking the minimum before the filter', async () => {
      const long = Array.from({ length: 5 }, (_, i) => entry(i + 1, 'extraordinarily'));
      prisma.learning.findMany.mockResolvedValue(long);

      const onlyLong = await service.getWordsForGame(1, 'word_search');
      expect(onlyLong.words).toHaveLength(0);
      expect(onlyLong.wordCount).toBe(5);
      expect(onlyLong.errorMessage).toBe('Aucun mot trouvé dans votre vocabulaire.');

      const short = Array.from({ length: 40 }, (_, i) => entry(i + 10, `word${i}`));
      prisma.learning.findMany.mockResolvedValue([...long, entry(99, 'éléphantéé'), ...short]);

      const mixed = await service.getWordsForGame(1, 'word_search');
      expect(mixed.errorMessage).toBeNull();
      expect(mixed.words).toHaveLength(30);
      expect(mixed.words.every((w) => Buffer.byteLength(w.word) < 14)).toBe(true);
      expect(mixed.words.some((w) => w.word === 'éléphantéé')).toBe(false);
    });

    it('phrase_completion: blanks every **answer** of the example', async () => {
      prisma.learning.findMany.mockResolvedValue([
        entry(1, 'run', 'I **run** and she **runs**.'),
        entry(2, 'eat', 'No markers here'),
        entry(3, 'go', '  '),
      ]);

      const result = await service.getWordsForGame(1, 'phrase_completion');
      const byWord = Object.fromEntries(result.words.map((w) => [w.word, w]));
      expect(byWord.run).toMatchObject({
        phrase: 'I _____ and she _____.',
        correctWords: ['run', 'runs'],
      });
      expect(byWord.eat).toMatchObject({ phrase: 'No markers here', correctWords: [] });
      expect(byWord.go).toMatchObject({ phrase: '', correctWords: [] });
    });
  });

  describe('saveScore', () => {
    it('should report high score when no previous score', async () => {
      prisma.user_best_scores.createMany.mockResolvedValue({ count: 1 });

      const result = await service.saveScore('user1', 'flash_match', 100);
      expect(result.isHighScore).toBe(true);
      expect(prisma.user_best_scores.updateMany).not.toHaveBeenCalled();
    });

    it('should report high score when beating previous', async () => {
      prisma.user_best_scores.createMany.mockResolvedValue({ count: 0 });
      prisma.user_best_scores.update.mockResolvedValue({});
      prisma.user_best_scores.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.saveScore('user1', 'flash_match', 100);
      expect(result.isHighScore).toBe(true);
      expect(prisma.user_best_scores.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user1', game_type: 'flash_match', best_score: { lt: 100 } },
        data: { best_score: 100 },
      });
    });

    it('should not report high score when lower', async () => {
      prisma.user_best_scores.createMany.mockResolvedValue({ count: 0 });
      prisma.user_best_scores.update.mockResolvedValue({});
      prisma.user_best_scores.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.saveScore('user1', 'flash_match', 100);
      expect(result.isHighScore).toBe(false);
    });
  });
});
