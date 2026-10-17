import { BadRequestException } from '@nestjs/common';
import { LearningService } from './learning.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS } from '../redis/cache-keys.constant.js';

describe('LearningService', () => {
  let service: LearningService;
  let store: Map<string, Map<string, string>>;
  let cache: { hSet: any; hGetAll: any; hDel: any };
  let prisma: {
    learning: { findMany: any; updateMany: any };
    users: { findUnique: any; updateMany: any };
  };
  const key = CACHE_KEYS.levelProgress('u1');

  beforeEach(() => {
    store = new Map();
    cache = {
      hSet: vi.fn(async (k: string, field: string, value: string) => {
        if (!store.has(k)) store.set(k, new Map());
        store.get(k)!.set(field, value);
        return true;
      }),
      hGetAll: vi.fn(async (k: string) => Object.fromEntries(store.get(k) ?? [])),
      hDel: vi.fn(async (k: string, fields: string[]) => fields.filter((f) => store.get(k)?.delete(f)).length),
    };
    prisma = {
      learning: {
        findMany: vi.fn().mockResolvedValue([
          { detail_id: 1, date_memorized: new Date(2020, 0, 1) },
          { detail_id: 2, date_memorized: null },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      users: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    service = new LearningService(prisma as unknown as PrismaService, cache as unknown as CacheService);
  });

  describe('trackGameCompletion', () => {
    it('rejects an unknown game type', async () => {
      const error = await service.trackGameCompletion('u1', 'chess', true, 7).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as Error).message).toBe('Type de jeu non reconnu');
    });

    it('leaves progress untouched when the game was not completed', async () => {
      await expect(service.trackGameCompletion('u1', 'flash_match', false, 7)).resolves.toEqual({
        success: true,
        level_completed: false,
        message: 'Partie non terminée, aucun changement de progression',
      });
      expect(cache.hSet).not.toHaveBeenCalled();
    });

    it('records partial progress with a 3h TTL and lists the missing games', async () => {
      await expect(service.trackGameCompletion('u1', 'flash_match', true, 7)).resolves.toEqual({
        success: true,
        level_completed: false,
        game_tracked: 'flash_match',
        missing_games: ['vocab_quiz', 'test_pronun'],
      });
      expect(cache.hSet).toHaveBeenCalledWith(key, 'x:flash_match', '1', 3 * 60 * 60);
      expect(prisma.learning.updateMany).not.toHaveBeenCalled();
    });

    it('promotes the due words and clears the level once every game is done', async () => {
      await service.trackGameCompletion('u1', 'flash_match', true, 7);
      await service.trackGameCompletion('u1', 'vocab_quiz', true, 7);
      await service.trackGameCompletion('u1', 'word_scramble', true, 7);

      await expect(service.trackGameCompletion('u1', 'test_pronun', true, 7)).resolves.toEqual({
        success: true,
        level_completed: true,
        words_updated: 1,
        from_level: 'x',
        to_level: 'level_0',
      });
      expect(prisma.learning.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { package_id: 7, level: 'x' } }),
      );
      expect(prisma.learning.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.learning.updateMany).toHaveBeenCalledWith({
        where: { package_id: 7, detail_id: { in: [1] }, level: 'x' },
        data: { level: 'level_0', date_memorized: expect.any(Date) },
      });
      await expect(service.getLevelProgress('u1')).resolves.toEqual({ level_0: { word_scramble: true } });
    });

    it('promotes only once when two last games complete concurrently', async () => {
      await service.trackGameCompletion('u1', 'flash_match', true, 7);

      const results = await Promise.all([
        service.trackGameCompletion('u1', 'vocab_quiz', true, 7),
        service.trackGameCompletion('u1', 'test_pronun', true, 7),
      ]);

      expect(results.map((r) => r.level_completed)).toEqual([true, true]);
      expect(results.map((r) => r.words_updated)).toEqual([1, 0]);
      expect(prisma.learning.updateMany).toHaveBeenCalledTimes(1);
    });

    it('does not count a game whose HSET failed while Redis is up, keeping the stored progress', async () => {
      await service.trackGameCompletion('u1', 'flash_match', true, 7);
      await service.trackGameCompletion('u1', 'vocab_quiz', true, 7);
      cache.hSet.mockResolvedValueOnce(false);

      await expect(service.trackGameCompletion('u1', 'test_pronun', true, 7)).resolves.toEqual({
        success: true,
        level_completed: false,
        game_tracked: 'test_pronun',
        missing_games: ['test_pronun'],
      });
      expect(cache.hDel).not.toHaveBeenCalled();
      expect(prisma.learning.updateMany).not.toHaveBeenCalled();
      await expect(service.getLevelProgress('u1')).resolves.toEqual({ x: { flash_match: true, vocab_quiz: true } });
    });

    it('still promotes a single-game level when Redis is unavailable', async () => {
      cache.hSet.mockResolvedValue(false);
      cache.hGetAll.mockResolvedValue(null);
      cache.hDel.mockResolvedValue(null);

      await expect(service.trackGameCompletion('u1', 'speed_vocab', true, 7)).resolves.toMatchObject({
        level_completed: true,
        words_updated: 1,
        from_level: 'level_1',
        to_level: 'level_2',
      });
    });
  });

  it('getLevelProgress rebuilds the { level: { game: true } } shape', async () => {
    await service.trackGameCompletion('u1', 'flash_match', true, 7);
    await service.trackGameCompletion('u1', 'word_scramble', true, 7);

    await expect(service.getLevelProgress('u1')).resolves.toEqual({
      x: { flash_match: true },
      level_0: { word_scramble: true },
    });
    await expect(service.getLevelProgress('nobody')).resolves.toEqual({});
  });

  it('resetLevelProgress clears only the given level', async () => {
    await service.trackGameCompletion('u1', 'flash_match', true, 7);
    await service.trackGameCompletion('u1', 'vocab_quiz', true, 7);
    await service.trackGameCompletion('u1', 'word_scramble', true, 7);

    await expect(service.resetLevelProgress('u1', 'x')).resolves.toEqual({
      message: 'Progression du niveau x réinitialisée',
    });
    await expect(service.getLevelProgress('u1')).resolves.toEqual({ level_0: { word_scramble: true } });
  });

  describe('checkAndUpdateStreak', () => {
    const now = new Date(2026, 9, 17, 10, 0);
    const conditionalUpdate = (streak: number) => ({
      where: { id: 'u1', OR: [{ streak_updated_at: null }, { streak_updated_at: { lt: new Date(2026, 9, 17) } }] },
      data: { streak, streak_updated_at: now },
    });

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 0 for an unknown user', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.checkAndUpdateStreak('u1')).resolves.toEqual({ updated: false, streak: 0 });
    });

    it('starts the streak at 1 on the first activity', async () => {
      prisma.users.findUnique.mockResolvedValue({ streak: 0, streak_updated_at: null });

      await expect(service.checkAndUpdateStreak('u1')).resolves.toEqual({ updated: true, streak: 1 });
      expect(prisma.users.updateMany).toHaveBeenCalledWith(conditionalUpdate(1));
    });

    it('does nothing when already updated today', async () => {
      prisma.users.findUnique.mockResolvedValue({ streak: 4, streak_updated_at: new Date(2026, 9, 17, 0, 5) });

      await expect(service.checkAndUpdateStreak('u1')).resolves.toEqual({
        updated: false,
        streak: 4,
        reason: "Déjà mis à jour aujourd'hui",
      });
      expect(prisma.users.updateMany).not.toHaveBeenCalled();
    });

    it('increments on a consecutive day', async () => {
      prisma.users.findUnique.mockResolvedValue({ streak: 4, streak_updated_at: new Date(2026, 9, 16, 23, 59) });

      await expect(service.checkAndUpdateStreak('u1')).resolves.toEqual({ updated: true, streak: 5 });
      expect(prisma.users.updateMany).toHaveBeenCalledWith(conditionalUpdate(5));
    });

    it('resets to 1 after a gap', async () => {
      prisma.users.findUnique.mockResolvedValue({ streak: 4, streak_updated_at: new Date(2026, 9, 15, 12, 0) });

      await expect(service.checkAndUpdateStreak('u1')).resolves.toEqual({ updated: true, streak: 1 });
      expect(prisma.users.updateMany).toHaveBeenCalledWith(conditionalUpdate(1));
    });

    it('reports already updated when a concurrent request wrote first', async () => {
      prisma.users.findUnique
        .mockResolvedValueOnce({ streak: 4, streak_updated_at: new Date(2026, 9, 16, 9, 0) })
        .mockResolvedValueOnce({ streak: 5 });
      prisma.users.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.checkAndUpdateStreak('u1')).resolves.toEqual({
        updated: false,
        streak: 5,
        reason: "Déjà mis à jour aujourd'hui",
      });
    });
  });
});
