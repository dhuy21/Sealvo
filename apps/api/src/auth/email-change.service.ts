import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatDuration } from '../common/utils/format-duration.js';
import { EMAIL_TAKEN_MESSAGE, EmailVerificationService } from './email-verification.service.js';

const EMAIL_CHANGE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_CHANGE_MAX_PER_WINDOW = 3;

@Injectable()
export class EmailChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  /** The email only changes once the link sent to `newEmail` is opened (see verifyEmail) */
  async requestEmailChange(
    userId: string,
    newEmail: string,
    currentPassword: string | undefined,
  ): Promise<void> {
    if (!currentPassword) {
      throw new BadRequestException("Le mot de passe actuel est requis pour modifier l'email");
    }

    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // 403, not 401: the web client treats 401 as an expired access token and refreshes
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new ForbiddenException('Mot de passe actuel incorrect');
    }

    // Per account, not per IP: each request emails an address the caller chooses
    const recentChanges = await this.prisma.email_verification.count({
      where: {
        user_id: userId,
        new_email: { not: null },
        created_at: { gt: new Date(Date.now() - EMAIL_CHANGE_WINDOW_MS) },
      },
    });
    if (recentChanges >= EMAIL_CHANGE_MAX_PER_WINDOW) {
      throw new HttpException(
        `Trop de demandes de changement d'email. Réessayez dans ${formatDuration(EMAIL_CHANGE_WINDOW_MS)}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const existing = await this.prisma.users.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException(EMAIL_TAKEN_MESSAGE);
    }

    await this.emailVerification.sendVerificationEmail(user, newEmail);
  }
}
