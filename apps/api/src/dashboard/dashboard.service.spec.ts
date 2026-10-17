import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { EmailVerificationService } from '../auth/email-verification.service.js';

describe('DashboardService.updateProfile', () => {
  let service: DashboardService;
  let prisma: { users: { findUnique: any; update: any } };
  let auth: { requestEmailChange: any };

  beforeEach(async () => {
    prisma = {
      users: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id?: string } }) =>
          Promise.resolve(where.id ? { email: 'old@b.c' } : null),
        ),
        update: vi.fn(),
      },
    };
    auth = { requestEmailChange: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: { get: vi.fn(), set: vi.fn(), del: vi.fn() } },
        { provide: EmailVerificationService, useValue: auth },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('should update the username without asking for the password', async () => {
    await expect(service.updateProfile('u1', { username: 'newname' })).resolves.toEqual({
      pendingEmail: undefined,
    });
    expect(auth.requestEmailChange).not.toHaveBeenCalled();
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { username: 'newname' },
    });
  });

  it('should request an email change instead of updating the email', async () => {
    const result = await service.updateProfile('u1', {
      email: 'new@b.c',
      current_password: 'secret',
      ava: 3,
    });

    expect(result).toEqual({ pendingEmail: 'new@b.c' });
    expect(auth.requestEmailChange).toHaveBeenCalledWith('u1', 'new@b.c', 'secret');
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { ava: 3 } });
  });

  it('should ignore an unchanged email', async () => {
    await expect(service.updateProfile('u1', { email: 'old@b.c' })).resolves.toEqual({
      pendingEmail: undefined,
    });
    expect(auth.requestEmailChange).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('should not update anything when the email change is rejected', async () => {
    auth.requestEmailChange.mockRejectedValue(new ForbiddenException());

    await expect(
      service.updateProfile('u1', { email: 'new@b.c', current_password: 'bad', username: 'x12' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});

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
      packages: { findMany: vi.fn().mockResolvedValue([{ package_id: 9, package_name: 'Animals' }]) },
    };
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() };
    const service = new DashboardService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      {} as EmailVerificationService,
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
