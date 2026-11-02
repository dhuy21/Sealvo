import { Injectable } from '@nestjs/common';
import type { DashboardStats, Level, PackageToReview } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../redis/cache-keys.constants.js';
import { dueWhereConditions } from '../common/domain/spaced-repetition.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const cached = await this.cache.get<DashboardStats>(CACHE_KEYS.dashboard(userId));
    if (cached) return cached;

    const [user, byLevel, packagesToReview] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: userId }, select: { streak: true } }),
      this.countWordsByLevel(userId),
      this.getPackagesToReview(userId),
    ]);

    const totalWords = Object.values(byLevel).reduce((sum, n) => sum + n, 0);
    const learnedWords = byLevel.v;
    const newWords = byLevel.x;
    const stats: DashboardStats = {
      streak: user?.streak ?? 0,
      totalWords,
      learnedWords,
      newWords,
      islearningWords: totalWords - learnedWords - newWords,
      packagesToReview,
    };

    await this.cache.set(CACHE_KEYS.dashboard(userId), stats, CACHE_TTL.DASHBOARD);
    return stats;
  }

  private async countWordsByLevel(userId: string): Promise<Record<Level, number>> {
    const rows = await this.prisma.learning.groupBy({
      by: ['level'],
      where: { packages: { user_id: userId } },
      _count: { _all: true },
    });
    const counts: Record<Level, number> = { x: 0, level_0: 0, level_1: 0, level_2: 0, v: 0 };
    for (const row of rows) counts[row.level] = row._count._all;
    return counts;
  }

  private async getPackagesToReview(userId: string): Promise<PackageToReview[]> {
    const results = await this.prisma.learning.groupBy({
      by: ['package_id'],
      where: {
        packages: { user_id: userId, is_active: true },
        OR: dueWhereConditions(),
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
