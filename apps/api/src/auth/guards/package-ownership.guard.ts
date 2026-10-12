import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PackageOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string = request.user?.id;
    const userRole: string = request.user?.role;
    const packageId = Number(request.params.packageId);

    if (!userId || isNaN(packageId)) {
      throw new ForbiddenException('Missing user or package identifier');
    }

    // Admin can access any package
    if (userRole === 'Admin') {
      return true;
    }

    const pkg = await this.prisma.packages.findUnique({
      where: { package_id: packageId },
      select: { user_id: true },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    if (pkg.user_id !== userId) {
      throw new ForbiddenException('You do not own this package');
    }

    return true;
  }
}
