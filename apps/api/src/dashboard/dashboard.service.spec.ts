import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';

describe('DashboardService.getStats', () => {
  it('counts words per level with one groupBy and keeps the response shape', async () => {
    const groupBy = vi.fn(({ by }: { by: string[] }) =>
      Promise.resolve(
        by[0] === 'level'
          ? [
              { level: 'x', _count: { _all: 4 } },
              { level: 'level_0', _count: { _all: 2 } },
              { level: 'level_2', _count: { _all: 1 } },
              { level: 'v', _count: { _all: 3 } },
            ]
          : [{ package_id: 9, _count: { package_id: 2 } }],
      ),
    );
    const prisma = {
      users: { findUnique: vi.fn().mockResolvedValue({ streak: 5 }) },
      learning: { groupBy },
      packages: {
        findMany: vi.fn().mockResolvedValue([{ package_id: 9, package_name: 'Animals' }]),
      },
    };
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() };
    const service = new DashboardService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
    );

    await expect(service.getStats('u1')).resolves.toEqual({
      streak: 5,
      totalWords: 10,
      learnedWords: 3,
      newWords: 4,
      islearningWords: 3,
      packagesToReview: [{ package_id: 9, package_name: 'Animals', num_words: 2 }],
    });
    expect(groupBy).toHaveBeenCalledWith({
      by: ['level'],
      where: { packages: { user_id: 'u1' } },
      _count: { _all: true },
    });
  });
});
