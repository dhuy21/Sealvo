import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { errorMessage } from '../common/utils/error-message.js';
import { formatDuration } from '../common/utils/format-duration.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import { hashToken, newToken } from './crypto.js';

const VERIFICATION_TOKEN_TTL_MS = 3 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_MAX_ATTEMPTS = 5;
const INVALID_TOKEN_MESSAGE = "Le jeton de vérification de l'email n'est pas valide";
export const EMAIL_TAKEN_MESSAGE = 'Cet email est déjà utilisé';
/** Also answered when the registered email belongs to an account: both cases must look the same */
export const VERIFICATION_EMAIL_FAILED_MESSAGE =
  "Une erreur est survenue lors de l'envoi de l'email de vérification.";
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
    const tokenHash = hashToken(token);
    const verification = await this.prisma.email_verification.findFirst({
      where: {
        token_hash: tokenHash,
        status: 'pending',
        used_at: null,
        expires_at: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    const newEmail = verification.new_email;
    if (newEmail) {
      const owner = await this.prisma.users.findUnique({
        where: { email: newEmail },
        select: { id: true },
      });
      if (owner && owner.id !== verification.user_id) {
        throw new ConflictException(EMAIL_TAKEN_MESSAGE);
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Only one request consumes the token: a second click, or a resend that revoked it meanwhile,
        // matches nothing here
        const { count } = await tx.email_verification.updateMany({
          where: { id: verification.id, status: 'pending', used_at: null },
          data: { status: 'used', used_at: new Date() },
        });
        if (count !== 1) throw new BadRequestException(INVALID_TOKEN_MESSAGE);

        await tx.users.update({
          where: { id: verification.user_id },
          data: { is_verified: true, ...(newEmail ? { email: newEmail } : {}) },
        });
      });
    } catch (error) {
      // Another account took the address after the check above
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(EMAIL_TAKEN_MESSAGE);
      }
      throw error;
    }

    return {
      message: newEmail
        ? 'Votre nouvelle adresse email a été confirmée avec succès'
        : 'Votre email a été vérifié avec succès',
    };
  }

  async resendVerification(username: string): Promise<{ message: string }> {
    // Same response whether or not an unverified account matches (OWASP: no user enumeration)
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (user && !user.is_verified) {
      try {
        await this.sendVerificationEmail(user);
      } catch (error) {
        this.logger.error(
          `Verification email could not be resent to user ${user.id}: ${errorMessage(error)}`,
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

    await this.emailQueue.enqueueOrFail(
      {
        to: newEmail ?? user.email,
        content: htmlContent,
        subject: newEmail
          ? 'Confirmation de votre nouvelle adresse email'
          : 'Vérification de votre email',
      },
      VERIFICATION_EMAIL_FAILED_MESSAGE,
    );
  }

  private async generateVerificationToken() {
    for (let attempt = 0; attempt < VERIFICATION_TOKEN_MAX_ATTEMPTS; attempt++) {
      const token = newToken();
      const tokenHash = hashToken(token);
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
