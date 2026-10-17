import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { formatDuration } from '../common/utils/format-duration.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

const VERIFICATION_TOKEN_TTL_MS = 3 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_MAX_ATTEMPTS = 5;
const EMAIL_CHANGE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_CHANGE_MAX_PER_WINDOW = 3;
const RESEND_VERIFICATION_MESSAGE =
  'Si un compte non vérifié correspond, un nouvel email de vérification a été envoyé.';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
    private readonly emailQueue: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const verification = await this.prisma.email_verification.findFirst({
      where: {
        token_hash: tokenHash,
        status: 'pending',
        used_at: null,
        expires_at: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new BadRequestException("Le jeton de vérification de l'email n'est pas valide");
    }

    const newEmail = verification.new_email;
    if (newEmail) {
      const owner = await this.prisma.users.findUnique({
        where: { email: newEmail },
        select: { id: true },
      });
      if (owner && owner.id !== verification.user_id) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    await this.prisma.$transaction([
      this.prisma.email_verification.update({
        where: { id: verification.id },
        data: { status: 'used', used_at: new Date() },
      }),
      this.prisma.users.update({
        where: { id: verification.user_id },
        data: { is_verified: true, ...(newEmail ? { email: newEmail } : {}) },
      }),
    ]);

    return {
      message: newEmail
        ? 'Votre nouvelle adresse email a été confirmée avec succès'
        : 'Votre email a été vérifié avec succès',
    };
  }

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
      throw new ConflictException('Cet email est déjà utilisé');
    }

    await this.sendVerificationEmail(user, newEmail);
  }

  async resendVerification(username: string): Promise<{ message: string }> {
    // Same response whether or not an unverified account matches (OWASP: no user enumeration)
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (user && !user.is_verified) {
      try {
        await this.sendVerificationEmail(user);
      } catch (error) {
        this.logger.error(
          `Verification email could not be resent to user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { message: RESEND_VERIFICATION_MESSAGE };
  }

  async sendVerificationEmail(
    user: { id: string; username: string; email: string },
    newEmail?: string,
  ) {
    const { token, tokenHash } = await this.generateVerificationToken();

    await this.prisma.$transaction([
      this.prisma.email_verification.updateMany({
        where: { user_id: user.id },
        data: { status: 'revoked' },
      }),
      this.prisma.email_verification.create({
        data: {
          id: randomBytes(32).toString('hex'),
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
          new_email: newEmail,
        },
      }),
    ]);

    const baseUrl = this.app.frontendUrl;
    const htmlContent = this.emailService.compileTemplate('mailVerification.hbs', {
      username: user.username,
      verificationLink: `${baseUrl}/verify-email?token=${token}`,
      expiresIn: formatDuration(VERIFICATION_TOKEN_TTL_MS),
    });

    const sent = await this.emailQueue.enqueue({
      to: newEmail ?? user.email,
      content: htmlContent,
      subject: newEmail
        ? 'Confirmation de votre nouvelle adresse email'
        : 'Vérification de votre email',
    });

    if (!sent) {
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'envoi de l'email de vérification.",
      );
    }
  }

  /** Sent when someone registers with the email of a verified account */
  async sendAccountExistsEmail(user: { username: string; email: string }) {
    const baseUrl = this.app.frontendUrl;
    const sent = await this.emailQueue.enqueue({
      to: user.email,
      content: this.emailService.compileTemplate('mailAccountExists.hbs', {
        username: user.username,
        loginLink: `${baseUrl}/login`,
        forgotPasswordLink: `${baseUrl}/forgot-password`,
      }),
      subject: 'Votre compte SealVo existe déjà',
    });

    // Same error as sendVerificationEmail: the response must not tell both cases apart
    if (!sent) {
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'envoi de l'email de vérification.",
      );
    }
  }

  private async generateVerificationToken() {
    for (let attempt = 0; attempt < VERIFICATION_TOKEN_MAX_ATTEMPTS; attempt++) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const existing = await this.prisma.email_verification.findFirst({
        where: { token_hash: tokenHash },
        select: { id: true },
      });
      if (!existing) return { token, tokenHash };
    }
    throw new InternalServerErrorException(
      'Une erreur est survenue. Veuillez réessayer plus tard.',
    );
  }
}
