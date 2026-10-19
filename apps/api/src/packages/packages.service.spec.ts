import { NotFoundException } from '@nestjs/common';
import { PackagesService } from './packages.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: {
    packages: { findUnique: any; findMany: any; delete: any };
    learning: { findMany: any };
    word_details: { deleteMany: any };
    user_activities: { create: any };
    $transaction: any;
    $executeRaw: any;
  };

  beforeEach(() => {
    prisma = {
      packages: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
      learning: { findMany: vi.fn() },
      word_details: { deleteMany: vi.fn() },
      user_activities: { create: vi.fn() },
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
      $executeRaw: vi.fn(),
    };
    service = new PackagesService(
      prisma as unknown as PrismaService,
      new ActivityLogService(undefined as never),
    );
  });

  it('findOne returns the package with a flat username and isOwner', async () => {
    prisma.packages.findUnique.mockResolvedValue({
      package_id: 5,
      package_name: 'Animals',
      package_description: null,
      mode: 'public',
      is_active: false,
      user_id: 'owner01',
      users: { username: 'alice' },
    });

    await expect(service.findOne(5, 'me00001')).resolves.toEqual({
      package_id: 5,
      package_name: 'Animals',
      package_description: null,
      mode: 'public',
      is_active: false,
      username: 'alice',
      isOwner: false,
    });
    await expect(service.findOne(5, 'owner01')).resolves.toMatchObject({ isOwner: true });
  });

  it('findOne throws when the package does not exist', async () => {
    prisma.packages.findUnique.mockResolvedValue(null);
    await expect(service.findOne(5, 'me00001')).rejects.toThrow(NotFoundException);
  });

  it('findPublicPackages exposes a flat username', async () => {
    prisma.packages.findMany.mockResolvedValue([
      { package_id: 1, package_name: 'A', user_id: 'owner01', users: { username: 'alice' } },
    ]);

    await expect(service.findPublicPackages()).resolves.toEqual([
      { package_id: 1, package_name: 'A', user_id: 'owner01', username: 'alice' },
    ]);
  });

  it('delete removes word_details no longer referenced, in the same transaction', async () => {
    prisma.packages.findUnique.mockResolvedValue({
      user_id: 'owner01',
      package_name: 'Animals',
    });
    prisma.learning.findMany.mockResolvedValue([{ detail_id: 3 }, { detail_id: 4 }]);

    await service.delete(9);

    expect(prisma.packages.delete).toHaveBeenCalledWith({ where: { package_id: 9 } });
    expect(prisma.word_details.deleteMany).toHaveBeenCalledWith({
      where: { detail_id: { in: [3, 4] }, learning: { none: {} } },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(prisma.user_activities.create.mock.calls[0][0].data).toMatchObject({
      user_id: 'owner01',
      type: 'package_delete',
      package_id: 9,
      package_name: 'Animals',
    });
  });

  describe('toggleActivation', () => {
    it('flips the flag in one statement and reports the new state', async () => {
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.packages.findUnique.mockResolvedValue({ is_active: false });

      await expect(service.toggleActivation(5)).resolves.toEqual({
        message: 'Package désactivé avec succès',
        isActive: false,
      });
      const [sql, packageId] = prisma.$executeRaw.mock.calls[0];
      expect(sql.join('?')).toBe(
        'UPDATE packages SET is_active = NOT is_active WHERE package_id = ?',
      );
      expect(packageId).toBe(5);
    });

    it('answers 404 when the package no longer exists', async () => {
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(service.toggleActivation(5)).rejects.toThrow(NotFoundException);
      expect(prisma.packages.findUnique).not.toHaveBeenCalled();
    });
  });
});
