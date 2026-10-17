import { BadRequestException, Injectable } from '@nestjs/common';
import { GAME_LEVEL, levelLabel, type GameType } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { isDue, startOfToday } from '../learning/spaced-repetition.js';

/** Minimum words required per game */
const MIN_WORDS: Partial<Record<GameType, number>> = {
  flash_match: 6,
};
const DEFAULT_MIN_WORDS = 5;

const WORD_SEARCH_MAX_WORDS = 30;
/** The old query filtered with MySQL LENGTH(), which counts bytes, not characters */
const WORD_SEARCH_MAX_BYTES = 13;

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Route params are unvalidated: `hasOwn` also rejects prototype keys such as `constructor` */
function isGameType(value: string): value is GameType {
  return Object.hasOwn(GAME_LEVEL, value);
}

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get words for a game (filtered by level + spaced repetition interval) */
  async getWordsForGame(packageId: number, gameType: string) {
    if (!isGameType(gameType)) {
      throw new BadRequestException(`Type de jeu inconnu : ${gameType}`);
    }
    const level = GAME_LEVEL[gameType];
    const dbLevel = levelLabel(level);

    const entries = await this.prisma.learning.findMany({
      where: { package_id: packageId, level },
      include: {
        word_details: {
          include: { words: true },
        },
      },
    });

    const today = startOfToday();
    const dueWords = entries.filter((e) => isDue(level, e.date_memorized, today));

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
      type: e.word_details.type,
      meaning: e.word_details.meaning,
      pronunciation: e.word_details.pronunciation,
      example: e.word_details.example,
      synonyms: e.word_details.synonyms,
    }));

    const result = {
      gameType,
      level,
      words,
      wordCount: dueWords.length,
      totalAtLevel,
      errorMessage,
    };

    if (gameType === 'word_search') {
      // The minimum checks above count every due word, before this filter (as the old game page did).
      // The shuffle picks a random subset: the web keeps the words it receives.
      const playable = shuffle(
        words.filter((w) => Buffer.byteLength(w.word) <= WORD_SEARCH_MAX_BYTES),
      ).slice(0, WORD_SEARCH_MAX_WORDS);
      return {
        ...result,
        words: playable,
        errorMessage:
          errorMessage ?? (playable.length === 0 ? 'Aucun mot trouvé dans votre vocabulaire.' : null),
      };
    }

    return result;
  }

  /**
   * Save game score. Each statement is atomic, so concurrent saves cannot
   * overwrite a higher best score (fix #62: no read-then-write).
   */
  async saveScore(userId: string, gt: GameType, score: number) {
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
