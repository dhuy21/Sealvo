import { Injectable } from '@nestjs/common';
import type { learning_level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { GAME_LEVEL, INTERVALS, LEVEL_GAMES, NEXT_LEVEL } from '../common/constants/spaced-repetition.js';

@Injectable()
export class LearningService {
  // In-memory level progress (Phase 4 will move to Redis)
  private levelProgress = new Map<string, Record<string, Record<string, boolean>>>();

  constructor(private readonly prisma: PrismaService) {}

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
    const currentLevel = GAME_LEVEL[gameType];
    if (!currentLevel) {
      return { success: false, message: 'Unknown game type' };
    }

    if (!completed) {
      return { success: true, level_completed: false, message: 'Game not completed, no progress change' };
    }

    // Update progress
    const progress = this.getUserProgress(userId);
    if (!progress[currentLevel]) {
      progress[currentLevel] = {};
    }
    progress[currentLevel][gameType] = true;
    this.setUserProgress(userId, progress);

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
      this.setUserProgress(userId, progress);

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
  getLevelProgress(userId: string) {
    return this.getUserProgress(userId);
  }

  /**
   * Reset level progress for a specific level
   */
  resetLevelProgress(userId: string, level: string) {
    const progress = this.getUserProgress(userId);
    delete progress[level];
    this.setUserProgress(userId, progress);
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

  private getUserProgress(userId: string): Record<string, Record<string, boolean>> {
    return this.levelProgress.get(userId) ?? {};
  }

  private setUserProgress(userId: string, progress: Record<string, Record<string, boolean>>) {
    this.levelProgress.set(userId, progress);
  }
}
