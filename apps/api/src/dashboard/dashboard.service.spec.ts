import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { AuthService } from '../auth/auth.service.js';

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
        { provide: AuthService, useValue: auth },
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
