import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { packages_mode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

const INVALID_ID_MESSAGE = 'Identifiant du package manquant ou invalide';

@Injectable()
export class PackageOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.user?.id;
    // Handlers read the id from different places (params, query or body): every id sent must be
    // the same, otherwise a request could pass the check with one id and act on another
    const ids = [request.params?.packageId, request.query?.packageId, request.body?.packageId]
      .filter((id) => id !== undefined)
      .map(Number);
    const packageId = ids[0];

    if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException(INVALID_ID_MESSAGE);
    }
    if (!userId || ids.some((id) => id !== packageId)) {
      throw new ForbiddenException(INVALID_ID_MESSAGE);
    }

    const pkg = await this.prisma.packages.findUnique({
      where: { package_id: packageId },
      select: { user_id: true, mode: true },
    });

    if (!pkg) {
      throw new NotFoundException('Package non trouvé');
    }

    // Read by InvalidateDashboardInterceptor: the stale dashboard is the owner's
    request.packageOwnerId = pkg.user_id;

    if (pkg.user_id === userId || this.allowsNonOwner(pkg.mode)) {
      return true;
    }

    throw new ForbiddenException("Vous n'êtes pas autorisé à accéder à ce package");
  }

  protected allowsNonOwner(_mode: packages_mode): boolean {
    return false;
  }
}
