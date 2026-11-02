import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailChangeService } from '../auth/email-change.service.js';
import { CacheService } from '../redis/cache.service.js';
import { CACHE_KEYS } from '../redis/cache-keys.constants.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly emailChange: EmailChangeService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<{ pendingEmail?: string }> {
    // Check uniqueness if username changed (email uniqueness: EmailChangeService.requestEmailChange)
    if (dto.username) {
      const existing = await this.prisma.users.findUnique({ where: { username: dto.username } });
      if (existing && existing.id !== userId) {
        throw new ConflictException("Ce nom d'utilisateur est déjà pris");
      }
    }

    let pendingEmail: string | undefined;
    if (dto.email) {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (dto.email !== user?.email) {
        await this.emailChange.requestEmailChange(userId, dto.email, dto.current_password);
        pendingEmail = dto.email;
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.username) data.username = dto.username;
    if (dto.ava) data.ava = dto.ava;

    if (Object.keys(data).length > 0) {
      await this.prisma.users.update({ where: { id: userId }, data });
      await this.cache.del(CACHE_KEYS.dashboard(userId));
    }

    return { pendingEmail };
  }
}
