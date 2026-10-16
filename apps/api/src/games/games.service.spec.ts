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
