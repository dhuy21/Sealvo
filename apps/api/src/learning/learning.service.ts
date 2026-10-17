import { Injectable } from '@nestjs/common';
import { GAME_LEVEL, LEVEL_GAMES, type GameType, type Level } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS } from '../redis/cache-keys.constants.js';
import { NEXT_LEVEL } from './learning.constants.js';
import { isDue, startOfToday } from './spaced-repetition.js';

const LEVEL_PROGRESS_TTL = 3 * 60 * 60; // 3 hours

/** Hash field of the level-progress key: one per completed game */
const progressField = (level: string, gameType: string) => `${level}:${gameType}`;

/** Rebuild the { level: { game: true } } shape from the hash fields */
function toProgress(fields: Record<string, string>): Record<string, Record<string, boolean>> {
  const progress: Record<string, Record<string, boolean>> = {};
  for (const field of Object.keys(fields)) {
    const [level, gameType] = field.split(':');
    progress[level] = { ...progress[level], [gameType]: true };
  }
  return progress;
}

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Track game completion and promote level if all games done */
  async trackGameCompletion(
    userId: string,
    gameType: GameType,
    completed: boolean,
    packageId: number,
  ) {
    const currentLevel = GAME_LEVEL[gameType];

    if (!completed) {
      return {
        success: true,
        level_completed: false,
        message: 'Partie non terminée, aucun changement de progression',
      };
    }

    const key = CACHE_KEYS.levelProgress(userId);
    const stored = await this.cache.hSet(
      key,
      progressField(currentLevel, gameType),
      '1',
      LEVEL_PROGRESS_TTL,
    );

    const fields = await this.cache.hGetAll(key);
    const progress = toProgress(fields ?? {});
    // Without Redis (null) the current game alone counts; with Redis it counts only once stored,
    // otherwise the HDEL below would wipe the saved games without promoting
    if (stored || fields === null) {
      progress[currentLevel] = { ...progress[currentLevel], [gameType]: true };
    }

    const requiredGames = LEVEL_GAMES[currentLevel];
    const allCompleted = requiredGames.every((g) => progress[currentLevel]?.[g]);

    if (allCompleted) {
      // Concurrent completions can all see the level complete: only the request whose HDEL
      // removed the whole set promotes (null = no Redis, nothing to race on)
      const removed = await this.cache.hDel(
        key,
        requiredGames.map((g) => progressField(currentLevel, g)),
      );

      let updatedCount = 0;
      if (removed === null || removed === requiredGames.length) {
        const dueWords = await this.findWordsDueByLevel(packageId, currentLevel);
        const detailIds = dueWords.map((w) => w.detail_id);

        if (detailIds.length > 0) {
          updatedCount = await this.batchUpdateLevel(packageId, detailIds, currentLevel);
        }
      }

      return {
        success: true,
        level_completed: true,
        words_updated: updatedCount,
        from_level: currentLevel,
        to_level: NEXT_LEVEL[currentLevel],
      };
    }

    return {
      success: true,
      level_completed: false,
      game_tracked: gameType,
      missing_games: requiredGames.filter((g) => !progress[currentLevel]?.[g]),
    };
  }

  /**
   * Get current level progress for a user
   */
  async getLevelProgress(userId: string) {
    return toProgress((await this.cache.hGetAll(CACHE_KEYS.levelProgress(userId))) ?? {});
  }

  /**
   * Reset level progress for a specific level
   */
  async resetLevelProgress(userId: string, level: Exclude<Level, 'v'>) {
    await this.cache.hDel(
      CACHE_KEYS.levelProgress(userId),
      LEVEL_GAMES[level].map((g) => progressField(level, g)),
    );
    return { message: `Progression du niveau ${level} réinitialisée` };
  }

  /** Check and update daily streak */
  async checkAndUpdateStreak(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { streak: true, streak_updated_at: true },
    });

    if (!user) {
      return { updated: false, streak: 0 };
    }

    const now = new Date();
    const today = startOfToday();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const last = user.streak_updated_at;
    if (last && last >= today) {
      return { updated: false, streak: user.streak, reason: "Déjà mis à jour aujourd'hui" };
    }

    // Consecutive day → increment; first ever activity or streak broken → 1
    const newStreak = last && last >= yesterday ? user.streak + 1 : 1;

    // Only one of several concurrent requests of the day may write
    const { count } = await this.prisma.users.updateMany({
      where: {
        id: userId,
        OR: [{ streak_updated_at: null }, { streak_updated_at: { lt: today } }],
      },
      data: { streak: newStreak, streak_updated_at: now },
    });

    if (count === 0) {
      const current = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { streak: true },
      });
      return {
        updated: false,
        streak: current?.streak ?? 0,
        reason: "Déjà mis à jour aujourd'hui",
      };
    }

    return { updated: true, streak: newStreak };
  }

  /**
   * Find words due for review at a specific level
   */
  private async findWordsDueByLevel(packageId: number, level: Level) {
    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId, level },
      select: { detail_id: true, date_memorized: true },
    });

    const today = startOfToday();
    return entries.filter((e) => isDue(level, e.date_memorized, today));
  }

  /** Batch update level for words (promote to next level) */
  private async batchUpdateLevel(
    packageId: number,
    detailIds: number[],
    currentLevel: Exclude<Level, 'v'>,
  ) {
    const result = await this.prisma.learning.updateMany({
      where: {
        package_id: packageId,
        detail_id: { in: detailIds },
        level: currentLevel,
      },
      data: {
        level: NEXT_LEVEL[currentLevel],
        date_memorized: new Date(),
      },
    });

    return result.count;
  }
}
