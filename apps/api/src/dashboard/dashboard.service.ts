import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constant.js';
import { INTERVALS } from '../learning/constants.js';

export interface PackageToReview {
  package_id: number;
  package_name: string;
  num_words: number;
}

export interface DashboardStats {
  streak: number;
  totalWords: number;
  learnedWords: number;
  newWords: number;
  islearningWords: number;
  packagesToReview: PackageToReview[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const cached = await this.cache.get<DashboardStats>(CACHE_KEYS.dashboard(userId));
    if (cached) return cached;

    const [user, totalWords, learnedWords, newWords, level0, level1, level2, packagesToReview] =
      await Promise.all([
        this.prisma.users.findUnique({ where: { id: userId }, select: { streak: true } }),
        this.countTotalWords(userId),
        this.countWordsByLevel(userId, 'v'),
        this.countWordsByLevel(userId, 'x'),
        this.countWordsByLevel(userId, 'level_0'),
        this.countWordsByLevel(userId, 'level_1'),
        this.countWordsByLevel(userId, 'level_2'),
        this.getPackagesToReview(userId),
      ]);

    const stats: DashboardStats = {
      streak: user?.streak ?? 0,
      totalWords,
      learnedWords,
      newWords,
      islearningWords: level0 + level1 + level2,
      packagesToReview,
    };

    await this.cache.set(CACHE_KEYS.dashboard(userId), stats, CACHE_TTL.DASHBOARD);
    return stats;
  }

  private async countTotalWords(userId: string): Promise<number> {
    return this.prisma.learning.count({
      where: { packages: { user_id: userId } },
    });
  }

  private async countWordsByLevel(userId: string, level: string): Promise<number> {
    return this.prisma.learning.count({
      where: {
        level: level as any,
        packages: { user_id: userId },
      },
    });
  }

  private async getPackagesToReview(userId: string): Promise<PackageToReview[]> {
    const now = new Date();

    // Build OR conditions for each level's interval
    const conditions = Object.entries(INTERVALS).map(([level, days]) => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      return {
        level: level as any,
        date_memorized: { lte: cutoff },
      };
    });

    const results = await this.prisma.learning.groupBy({
      by: ['package_id'],
      where: {
        packages: { user_id: userId, is_active: true },
        OR: conditions,
      },
      _count: { package_id: true },
    });

    if (results.length === 0) return [];

    const packageIds = results.map((r) => r.package_id);
    const packages = await this.prisma.packages.findMany({
      where: { package_id: { in: packageIds } },
      select: { package_id: true, package_name: true },
    });

    const nameMap = new Map(packages.map((p) => [p.package_id, p.package_name]));

    return results.map((r) => ({
      package_id: r.package_id,
      package_name: nameMap.get(r.package_id) ?? '',
      num_words: r._count.package_id,
    }));
  }
}
