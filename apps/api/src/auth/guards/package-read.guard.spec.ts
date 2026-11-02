import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  type ExecutionContext,
} from '@nestjs/common';
import { PackageReadGuard } from './package-read.guard.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const PACKAGES: Record<number, { user_id: string; mode: string }> = {
  1: { user_id: 'me', mode: 'private' },
  2: { user_id: 'someone-else', mode: 'public' },
  3: { user_id: 'someone-else', mode: 'protected' },
  4: { user_id: 'someone-else', mode: 'private' },
};

function contextFor(packageId: string, request: Record<string, unknown> = {}) {
  const req = { user: { id: 'me', role: 'User' }, params: { packageId }, query: {}, ...request };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('PackageReadGuard', () => {
  let guard: PackageReadGuard;

  beforeEach(() => {
    const prisma = {
      packages: {
        findUnique: vi.fn(({ where }: { where: { package_id: number } }) =>
          Promise.resolve(PACKAGES[where.package_id] ?? null),
        ),
      },
    };
    guard = new PackageReadGuard(prisma as unknown as PrismaService);
  });

  it('allows the owner of a private package and records the owner', async () => {
    const { context, req } = contextFor('1');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req).toMatchObject({ packageOwnerId: 'me' });
  });

  it("allows anyone to read another user's public or protected package", async () => {
    await expect(guard.canActivate(contextFor('2').context)).resolves.toBe(true);
    await expect(guard.canActivate(contextFor('3').context)).resolves.toBe(true);
  });

  it("rejects another user's private package, even for an admin", async () => {
    await expect(guard.canActivate(contextFor('4').context)).rejects.toThrow(ForbiddenException);
    await expect(
      guard.canActivate(contextFor('4', { user: { id: 'me', role: 'Admin' } }).context),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown package', async () => {
    await expect(guard.canActivate(contextFor('99').context)).rejects.toThrow(NotFoundException);
  });

  it('rejects a malformed id with a 400', async () => {
    await expect(guard.canActivate(contextFor('abc').context)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(contextFor('0').context)).rejects.toThrow(BadRequestException);
  });
});
