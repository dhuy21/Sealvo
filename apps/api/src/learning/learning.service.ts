import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { learning_level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { GAME_LEVEL, INTERVALS, LEVEL_GAMES, NEXT_LEVEL } from './constants.js';

const LEVEL_PROGRESS_TTL = 3 * 60 * 60; // 3 hours

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Track game completion and promote level if all games done
   * Source: LevelProgressController.js trackGameCompletion()
   */
  async trackGameCompletion(
    userId: string,
    gameType: string,
    completed: boolean,
    packageId: number,
  ) {
    // Ownership check (fix #78: IDOR on trackGameCompletion)
    await this.verifyPackageOwnership(userId, packageId);

    const currentLevel = GAME_LEVEL[gameType];
    if (!currentLevel) {
      throw new BadRequestException(`Unknown game type: ${gameType}`);
    }

    if (!completed) {
      return { success: true, level_completed: false, message: 'Game not completed, no progress change' };
    }

    // Update progress
    const progress = await this.getUserProgress(userId);
    if (!progress[currentLevel]) {
      progress[currentLevel] = {};
    }
    progress[currentLevel][gameType] = true;
    await this.setUserProgress(userId, progress);

    // Check if all required games are done
    const requiredGames = LEVEL_GAMES[currentLevel];
    const allCompleted = requiredGames.every((g) => progress[currentLevel]?.[g]);

    if (allCompleted) {
      // Promote words: find due words at this level, move to next level
      const dueWords = await this.findWordsDueByLevel(packageId, currentLevel);
      const detailIds = dueWords.map((w) => w.detail_id);

      let updatedCount = 0;
      if (detailIds.length > 0) {
        updatedCount = await this.batchUpdateLevel(packageId, detailIds, currentLevel);
      }

      // Reset progress for this level
      delete progress[currentLevel];
      await this.setUserProgress(userId, progress);

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
    return this.getUserProgress(userId);
  }

  /**
   * Reset level progress for a specific level
   */
  async resetLevelProgress(userId: string, level: string) {
    const progress = await this.getUserProgress(userId);
    delete progress[level];
    await this.setUserProgress(userId, progress);
    return { message: `Progress for level ${level} reset` };
  }

  /**
   * Check and update daily streak
   * Source: streakService.js recordActivity()
   */
  async checkAndUpdateStreak(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { streak: true, streak_updated_at: true },
    });

    if (!user) {
      return { updated: false, streak: 0 };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (user.streak_updated_at) {
      const lastUpdate = new Date(user.streak_updated_at);
      const lastUpdateDay = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());

      // Already updated today
      if (lastUpdateDay.getTime() === today.getTime()) {
        return { updated: false, streak: user.streak, reason: 'Already updated today' };
      }

      // Check if yesterday (consecutive)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastUpdateDay.getTime() === yesterday.getTime()) {
        // Consecutive day → increment
        const newStreak = user.streak + 1;
        await this.prisma.users.update({
          where: { id: userId },
          data: { streak: newStreak, streak_updated_at: now },
        });
        return { updated: true, streak: newStreak };
      }

      // Streak broken → reset to 1
      await this.prisma.users.update({
        where: { id: userId },
        data: { streak: 1, streak_updated_at: now },
      });
      return { updated: true, streak: 1 };
    }

    // First ever activity
    await this.prisma.users.update({
      where: { id: userId },
      data: { streak: 1, streak_updated_at: now },
    });
    return { updated: true, streak: 1 };
  }

  /**
   * Find words due for review at a specific level
   */
  private async findWordsDueByLevel(packageId: number, level: learning_level) {
    const interval = INTERVALS[level] ?? 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId, level },
      select: { detail_id: true, date_memorized: true },
    });

    return entries.filter((e) => {
      const memorized = new Date(e.date_memorized ?? now);
      memorized.setHours(0, 0, 0, 0);
      const dueDate = new Date(memorized);
      dueDate.setDate(dueDate.getDate() + interval);
      return dueDate <= now;
    });
  }

  /**
   * Batch update level for words (promote to next level)
   * Source: learning.js batchUpdateLevel()
   */
  private async batchUpdateLevel(
    packageId: number,
    detailIds: number[],
    currentLevel: learning_level,
  ) {
    const newLevel = NEXT_LEVEL[currentLevel];
    if (!newLevel) return 0;

    const result = await this.prisma.learning.updateMany({
      where: {
        package_id: packageId,
        detail_id: { in: detailIds },
        level: currentLevel,
      },
      data: {
        level: newLevel,
        date_memorized: new Date(),
      },
    });

    return result.count;
  }

  private async verifyPackageOwnership(userId: string, packageId: number) {
    const pkg = await this.prisma.packages.findUnique({
      where: { package_id: packageId },
      select: { user_id: true },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    if (pkg.user_id !== userId) {
      throw new ForbiddenException('You do not own this package');
    }
  }

  private async getUserProgress(userId: string): Promise<Record<string, Record<string, boolean>>> {
    const cached = await this.cache.get<Record<string, Record<string, boolean>>>(`level_progress:${userId}`);
    return cached ?? {};
  }

  private async setUserProgress(userId: string, progress: Record<string, Record<string, boolean>>): Promise<void> {
    await this.cache.set(`level_progress:${userId}`, progress, LEVEL_PROGRESS_TTL);
  }
}
