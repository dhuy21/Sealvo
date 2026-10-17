import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  type ExecutionContext,
} from '@nestjs/common';
import { PackageOwnershipGuard } from './package-ownership.guard.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

const OWN_PACKAGE = 1;
const OTHER_PACKAGE = 2;

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'me', role: 'User' }, params: {}, query: {}, ...request }),
    }),
  } as unknown as ExecutionContext;
}

describe('PackageOwnershipGuard', () => {
  let guard: PackageOwnershipGuard;

  beforeEach(() => {
    const prisma = {
      packages: {
        findUnique: vi.fn(({ where }: { where: { package_id: number } }) =>
          Promise.resolve(
            where.package_id === OWN_PACKAGE
              ? { user_id: 'me' }
              : where.package_id === OTHER_PACKAGE
                ? { user_id: 'someone-else' }
                : null,
          ),
        ),
      },
    };
    guard = new PackageOwnershipGuard(prisma as unknown as PrismaService);
  });

  it('allows the owner whatever the id source', async () => {
    await expect(guard.canActivate(contextFor({ params: { packageId: '1' } }))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor({ query: { packageId: '1' } }))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor({ body: { packageId: 1 } }))).resolves.toBe(true);
  });

  it('rejects a package owned by someone else', async () => {
    await expect(guard.canActivate(contextFor({ body: { packageId: OTHER_PACKAGE } }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects an admin acting on a package owned by someone else', async () => {
    await expect(
      guard.canActivate(
        contextFor({ user: { id: 'me', role: 'Admin' }, params: { packageId: String(OTHER_PACKAGE) } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an own id in the query combined with a foreign id in the body', async () => {
    await expect(
      guard.canActivate(
        contextFor({ query: { packageId: String(OWN_PACKAGE) }, body: { packageId: OTHER_PACKAGE } }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a request without package id with a 400, and an unknown package with a 404', async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      new BadRequestException('Identifiant du package manquant ou invalide'),
    );
    await expect(guard.canActivate(contextFor({ params: { packageId: '99' } }))).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each(['abc', '1.5', '0', '-1', ''])('rejects the malformed id %j with a 400', async (packageId) => {
    await expect(guard.canActivate(contextFor({ params: { packageId } }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a non-positive or fractional body id with a 400', async () => {
    await expect(guard.canActivate(contextFor({ body: { packageId: 1.5 } }))).rejects.toThrow(
      BadRequestException,
    );
    await expect(guard.canActivate(contextFor({ body: { packageId: null } }))).rejects.toThrow(
      BadRequestException,
    );
  });
});
