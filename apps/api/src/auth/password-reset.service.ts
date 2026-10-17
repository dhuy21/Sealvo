import { createHash, randomBytes } from 'crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { formatDuration } from '../common/utils/format-duration.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const FORGOT_PASSWORD_MESSAGE =
  'Si un compte est associé à cet email, un lien de réinitialisation vous a été envoyé';
const INVALID_TOKEN_MESSAGE =
  "Le jeton de réinitialisation du mot de passe n'est pas valide ou a expiré";

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
    private readonly emailQueue: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Same response whether or not the account exists (OWASP: no user enumeration)
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // A new request replaces the previous token (#103: stored in DB, not only in Redis)
    await this.prisma.$transaction([
      this.prisma.password_reset_tokens.deleteMany({ where: { user_id: user.id } }),
      this.prisma.password_reset_tokens.create({
        data: {
          token_hash: tokenHash,
          user_id: user.id,
          expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    const baseUrl = this.app.frontendUrl;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const htmlContent = this.emailService.compileTemplate('mailResetPassword.hbs', {
      username: user.username,
      resetPasswordLink: resetLink,
      expiresIn: formatDuration(RESET_TOKEN_TTL_MS),
    });

    const sent = await this.emailQueue.enqueue({
      to: email,
      content: htmlContent,
      subject: 'Réinitialisation de mot de passe',
    });

    if (!sent) {
      this.logger.error(`Password reset email could not be queued for user ${user.id}`);
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.password_reset_tokens.findFirst({
      where: { token_hash: tokenHash, expires_at: { gt: new Date() } },
    });
    if (!resetToken) throw new BadRequestException(INVALID_TOKEN_MESSAGE);

    const userId = resetToken.user_id;
    const hashedPassword = await bcrypt.hash(password, 12);

    // New password: consume the token and log out every device (RFC 9700 §4.14.2). A pending email
    // change may come from whoever forced this reset: its confirmation link must stop working too.
    await this.prisma.$transaction(async (tx) => {
      // Two requests with the same token: only the one that deletes it changes the password
      const consumed = await tx.password_reset_tokens.deleteMany({ where: { token_hash: tokenHash } });
      if (consumed.count === 0) throw new BadRequestException(INVALID_TOKEN_MESSAGE);
      await tx.password_reset_tokens.deleteMany({ where: { user_id: userId } });
      await tx.users.update({ where: { id: userId }, data: { password: hashedPassword } });
      await tx.refresh_sessions.deleteMany({ where: { user_id: userId } });
      await tx.email_verification.updateMany({
        where: { user_id: userId, status: 'pending' },
        data: { status: 'revoked' },
      });
    });

    return { message: 'Votre mot de passe a été réinitialisé avec succès' };
  }
}
