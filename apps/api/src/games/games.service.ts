import { Injectable } from '@nestjs/common';
import type { user_best_scores_game_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { GAME_LEVEL, INTERVALS } from '../learning/constants.js';

/** Minimum words required per game */
const MIN_WORDS: Record<string, number> = {
  flash_match: 6,
};
const DEFAULT_MIN_WORDS = 5;

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get words for a game (filtered by level + spaced repetition interval)
   * Source: GameController.js showGame() + learning.js findWordsWithDetailsByLevel()
   */
  async getWordsForGame(packageId: number, gameType: string) {
    const level = GAME_LEVEL[gameType];
    if (!level) {
      return { error: 'Unknown game type' };
    }

    const interval = INTERVALS[level] ?? 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Get all words at this level in the package
    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId, level },
      include: {
        word_details: {
          include: { words: true },
        },
      },
    });

    // Filter by spaced repetition interval (due today)
    const dueWords = entries.filter((e) => {
      const memorized = new Date(e.date_memorized ?? now);
      memorized.setHours(0, 0, 0, 0);
      const dueDate = new Date(memorized);
      dueDate.setDate(dueDate.getDate() + interval);
      return dueDate <= now;
    });

    // Count total words at this level (regardless of due date)
    const totalAtLevel = entries.length;
    const minRequired = MIN_WORDS[gameType] ?? DEFAULT_MIN_WORDS;

    let errorMessage: string | null = null;
    if (totalAtLevel < minRequired) {
      errorMessage = `You need at least ${minRequired} words at level ${level} to play this game.`;
    } else if (dueWords.length < minRequired) {
      errorMessage = `Not enough words due for review at level ${level} today. Come back when your words are ready.`;
    }

    const words = dueWords.map((e) => ({
      detail_id: e.detail_id,
      word_id: e.word_details.word_id,
      word: e.word_details.words.word,
      language_code: e.word_details.words.language_code,
      meaning: e.word_details.meaning,
      pronunciation: e.word_details.pronunciation,
      example: e.word_details.example,
      synonyms: e.word_details.synonyms,
    }));

    return {
      gameType,
      level,
      words,
      wordCount: dueWords.length,
      totalAtLevel,
      errorMessage,
    };
  }

  /**
   * Save game score (atomic upsert with GREATEST)
   * Source: game_scores.js saveScore() — fix #62: single upsert
   */
  async saveScore(userId: string, gameType: string, score: number) {
    const gt = gameType as user_best_scores_game_type;

    // Atomic upsert — fix #62: no pre-query, determine isHighScore from result
    const existing = await this.prisma.user_best_scores.findUnique({
      where: { user_id_game_type: { user_id: userId, game_type: gt } },
      select: { best_score: true },
    });

    const isHighScore = !existing || score > existing.best_score;

    await this.prisma.user_best_scores.upsert({
      where: { user_id_game_type: { user_id: userId, game_type: gt } },
      create: {
        user_id: userId,
        game_type: gt,
        best_score: score,
        play_count: 1,
        last_played_at: new Date(),
      },
      update: {
        best_score: isHighScore ? score : undefined,
        play_count: { increment: 1 },
        last_played_at: new Date(),
      },
    });

    return { isHighScore };
  }

  /**
   * Get all best scores for a user
   */
  async getUserScores(userId: string) {
    return this.prisma.user_best_scores.findMany({
      where: { user_id: userId },
      select: {
        game_type: true,
        best_score: true,
        play_count: true,
        last_played_at: true,
      },
    });
  }
}
