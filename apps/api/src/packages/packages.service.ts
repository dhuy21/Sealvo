import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PackageDetailDto, PackageDto } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { TX_OPTIONS } from '../prisma/tx-options.constants.js';
import { deleteOrphanDetails } from '../words/orphan-details.js';
import type { CreatePackageDto } from './dto/create-package.dto.js';
import type { UpdatePackageDto } from './dto/update-package.dto.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivityLogService,
  ) {}

  async findByUserId(userId: string): Promise<PackageDto[]> {
    return this.prisma.packages.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findPublicPackages(): Promise<PackageDto[]> {
    const packages = await this.prisma.packages.findMany({
      where: { mode: { in: ['public', 'protected'] } },
      include: { users: { select: { username: true } } },
      orderBy: { created_at: 'desc' },
    });
    return packages.map(({ users, ...pkg }) => ({ ...pkg, username: users.username }));
  }

  async findOne(packageId: number, userId: string): Promise<PackageDetailDto> {
    const pkg = await this.prisma.packages.findUnique({
      where: { package_id: packageId },
      select: {
        package_id: true,
        package_name: true,
        package_description: true,
        mode: true,
        is_active: true,
        user_id: true,
        users: { select: { username: true } },
      },
    });

    if (!pkg) {
      throw new NotFoundException('Package non trouvé');
    }

    const { user_id, users, ...rest } = pkg;
    return { ...rest, username: users.username, isOwner: user_id === userId };
  }

  async create(userId: string, dto: CreatePackageDto) {
    const isPublic = dto.mode === 'public';

    return this.prisma.$transaction(async (tx) => {
      const pkg = await tx.packages.create({
        data: {
          user_id: userId,
          package_name: dto.package_name,
          package_description: dto.package_description ?? null,
          mode: dto.mode ?? 'private',
          is_active: !isPublic, // auto-deactivate public packages
        },
      });
      await this.activities.succeeded(tx, {
        userId,
        type: 'package_create',
        packageId: pkg.package_id,
        packageName: pkg.package_name,
      });

      return {
        packageId: pkg.package_id,
        message: isPublic
          ? 'Package créé avec succès. Il a été automatiquement désactivé car il est public.'
          : 'Package créé avec succès',
      };
    });
  }

  async update(packageId: number, dto: UpdatePackageDto) {
    // A package made public is deactivated in the same update
    const isPublic = dto.mode === 'public';

    await this.prisma.packages.update({
      where: { package_id: packageId },
      data: {
        ...(dto.package_name !== undefined && { package_name: dto.package_name }),
        ...(dto.package_description !== undefined && {
          package_description: dto.package_description,
        }),
        ...(dto.mode !== undefined && { mode: dto.mode }),
        ...(isPublic && { is_active: false }),
      },
    });

    return {
      message: isPublic
        ? 'Package modifié avec succès. Il a été automatiquement désactivé car il est maintenant public.'
        : 'Package modifié avec succès',
    };
  }

  async delete(packageId: number) {
    await this.prisma.$transaction(async (tx) => {
      const pkg = await tx.packages.findUnique({
        where: { package_id: packageId },
        select: { user_id: true, package_name: true },
      });
      if (!pkg) throw new NotFoundException('Package non trouvé');

      const entries = await tx.learning.findMany({
        where: { package_id: packageId },
        select: { detail_id: true },
      });

      // Cascades to the package's learning rows
      await tx.packages.delete({ where: { package_id: packageId } });

      await deleteOrphanDetails(
        tx,
        entries.map((e) => e.detail_id),
      );
      await this.activities.succeeded(tx, {
        userId: pkg.user_id,
        type: 'package_delete',
        packageId,
        packageName: pkg.package_name,
      });
    }, TX_OPTIONS);

    return { message: 'Package supprimé avec succès' };
  }

  async toggleActivation(packageId: number) {
    // Flipped in SQL: two concurrent toggles cannot both read the same state and cancel out.
    // The row stays locked until commit, so the read returns this toggle's result.
    const pkg = await this.prisma.$transaction(async (tx) => {
      const updated =
        await tx.$executeRaw`UPDATE packages SET is_active = NOT is_active WHERE package_id = ${packageId}`;
      if (updated === 0) return null;
      return tx.packages.findUnique({
        where: { package_id: packageId },
        select: { is_active: true },
      });
    });

    if (!pkg) {
      throw new NotFoundException('Package non trouvé');
    }

    const newStatus = pkg.is_active;

    return {
      message: `Package ${newStatus ? 'activé' : 'désactivé'} avec succès`,
      isActive: newStatus,
    };
  }

  async copyPublicPackage(packageId: number, userId: string) {
    const source = await this.prisma.packages.findUnique({
      where: { package_id: packageId },
    });

    if (!source) {
      throw new NotFoundException('Package non trouvé');
    }

    if (source.mode !== 'public') {
      throw new ForbiddenException("Ce package n'est pas public");
    }

    const learningEntries = await this.prisma.learning.findMany({
      where: { package_id: packageId },
      include: {
        word_details: {
          include: { words: true },
        },
      },
    });

    // Transaction: create package + clone word_details + create learning entries (fix #46)
    return this.prisma.$transaction(async (tx) => {
      const newPkg = await tx.packages.create({
        data: {
          user_id: userId,
          package_name: source.package_name,
          package_description: source.package_description,
          mode: 'private',
          is_active: true,
        },
      });

      // Clone each word_detail to get new detail_ids (fix #46: no shared references)
      for (const entry of learningEntries) {
        const detail = entry.word_details;

        const newDetail = await tx.word_details.create({
          data: {
            word_id: detail.word_id,
            type: detail.type,
            meaning: detail.meaning,
            pronunciation: detail.pronunciation,
            synonyms: detail.synonyms,
            antonyms: detail.antonyms,
            example: detail.example,
            grammar: detail.grammar,
          },
        });

        await tx.learning.create({
          data: {
            package_id: newPkg.package_id,
            detail_id: newDetail.detail_id,
            level: 'x',
          },
        });
      }

      await this.activities.succeeded(tx, {
        userId,
        type: 'package_create',
        packageId: newPkg.package_id,
        packageName: newPkg.package_name,
      });

      return {
        packageId: newPkg.package_id,
        message: 'Package copié avec succès',
      };
    }, TX_OPTIONS);
  }
}
