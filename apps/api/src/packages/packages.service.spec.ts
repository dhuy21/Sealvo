import { NotFoundException } from '@nestjs/common';
import { PackagesService } from './packages.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('PackagesService', () => {
  let service: PackagesService;
  let prisma: {
    packages: { findUnique: any; findMany: any; delete: any };
    learning: { findMany: any };
    word_details: { deleteMany: any };
    $transaction: any;
  };

  beforeEach(() => {
    prisma = {
      packages: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
      learning: { findMany: vi.fn() },
      word_details: { deleteMany: vi.fn() },
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    service = new PackagesService(prisma as unknown as PrismaService);
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
  });
});
