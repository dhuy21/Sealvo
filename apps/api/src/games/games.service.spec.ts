import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GamesService } from './games.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('GamesService', () => {
  let service: GamesService;
  let prisma: {
    learning: { findMany: any };
    user_best_scores: { findUnique: any; upsert: any; findMany: any };
  };

  beforeEach(async () => {
    prisma = {
      learning: { findMany: vi.fn() },
      user_best_scores: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
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

    it('should return error message when not enough words', async () => {
      prisma.learning.findMany.mockResolvedValue([]);

      const result = await service.getWordsForGame(1, 'flash_match');
      expect(result.errorMessage).toBeTruthy();
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
      prisma.user_best_scores.findUnique.mockResolvedValue(null);
      prisma.user_best_scores.upsert.mockResolvedValue({});

      const result = await service.saveScore('user1', 'flash_match', 100);
      expect(result.isHighScore).toBe(true);
    });

    it('should report high score when beating previous', async () => {
      prisma.user_best_scores.findUnique.mockResolvedValue({ best_score: 50 });
      prisma.user_best_scores.upsert.mockResolvedValue({});

      const result = await service.saveScore('user1', 'flash_match', 100);
      expect(result.isHighScore).toBe(true);
    });

    it('should not report high score when lower', async () => {
      prisma.user_best_scores.findUnique.mockResolvedValue({ best_score: 200 });
      prisma.user_best_scores.upsert.mockResolvedValue({});

      const result = await service.saveScore('user1', 'flash_match', 100);
      expect(result.isHighScore).toBe(false);
    });
  });
});
