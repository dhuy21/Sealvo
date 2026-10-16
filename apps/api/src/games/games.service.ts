import { BadRequestException, Injectable } from '@nestjs/common';
import type { user_best_scores_game_type } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { GAME_LEVEL } from '../learning/constants.js';
import { isDue, startOfToday } from '../learning/spaced-repetition.js';

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
    if (!Object.hasOwn(GAME_LEVEL, gameType)) {
      throw new BadRequestException(`Type de jeu inconnu : ${gameType}`);
    }
    const level = GAME_LEVEL[gameType];
    const dbLevel = level.replace('level_', '');

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
    const today = startOfToday();
    const dueWords = entries.filter((e) => isDue(level, e.date_memorized, today));

    // Count total words at this level (regardless of due date)
    const totalAtLevel = entries.length;
    const minRequired = MIN_WORDS[gameType] ?? DEFAULT_MIN_WORDS;

    let errorMessage: string | null = null;
    if (totalAtLevel < minRequired) {
      errorMessage = `Vous devez avoir au moins ${minRequired} mots au niveau ${dbLevel} dans votre vocabulaire pour jouer à ce jeu.`;
    } else if (dueWords.length < minRequired) {
      errorMessage = `Aujourd'hui, vous n'avez pas assez de mots à réviser au niveau ${dbLevel} pour jouer. Revenez quand vos mots seront prêts pour la révision.`;
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
   * Save game score. Each statement is atomic, so concurrent saves cannot
   * overwrite a higher best score (fix #62: no read-then-write).
   * Source: game_scores.js saveScore()
   */
  async saveScore(userId: string, gameType: string, score: number) {
    const gt = gameType as user_best_scores_game_type;
    const now = new Date();

    const { count: created } = await this.prisma.user_best_scores.createMany({
      data: [{ user_id: userId, game_type: gt, best_score: score, play_count: 1, last_played_at: now }],
      skipDuplicates: true,
    });
    if (created > 0) return { isHighScore: true };

    const [, raised] = await this.prisma.$transaction([
      this.prisma.user_best_scores.update({
        where: { user_id_game_type: { user_id: userId, game_type: gt } },
        data: { play_count: { increment: 1 }, last_played_at: now },
      }),
      this.prisma.user_best_scores.updateMany({
        where: { user_id: userId, game_type: gt, best_score: { lt: score } },
        data: { best_score: score },
      }),
    ]);

    return { isHighScore: raised.count > 0 };
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
