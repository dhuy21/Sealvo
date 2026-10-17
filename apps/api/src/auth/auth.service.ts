import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { API_ERROR_CODES } from '@sealvo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';
import { appConfig, type AppConfig } from '../config/app.config.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import {
  EmailVerificationService,
  VERIFICATION_EMAIL_FAILED_MESSAGE,
} from './email-verification.service.js';
import { createUser } from './create-user.js';
import { hashPassword } from './crypto.js';
import { errorMessage } from '../common/utils/error-message.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const REGISTER_RESPONSE = {
  success: true,
  message: 'Un email de vérification a été envoyé à votre adresse email',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly emailVerification: EmailVerificationService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailService: EmailService,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
  ) {}

  async register(dto: RegisterDto) {
    // Separate lookups: the case-insensitive collation matches 'john' with 'John'
    const usernameTaken = await this.prisma.users.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });
    if (usernameTaken) {
      throw new ConflictException("Ce nom d'utilisateur est déjà utilisé");
    }

    // Hashed before the email lookup so both outcomes below take the same time
    const password = await hashPassword(dto.password);

    // No user enumeration: a taken email gets the same response, its owner is emailed instead.
    // Never a verification link, even for an unverified account: whoever registered it first knows
    // its password, so the owner must go through the password reset.
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
      select: { username: true, email: true },
    });
    if (existing) {
      await this.sendAccountExistsEmail(existing);
      return REGISTER_RESPONSE;
    }

    const user = await createUser(this.prisma, {
      username: dto.username,
      email: dto.email,
      password,
      ava: dto.avatar ?? 1,
    });

    await this.emailVerification.sendVerificationEmail(user);

    return REGISTER_RESPONSE;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException("Nom d'utilisateur ou mot de passe incorrect");
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("Nom d'utilisateur ou mot de passe incorrect");
    }

    if (!user.is_verified) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: "Votre compte n'est pas vérifié",
        error: 'Unauthorized',
        code: API_ERROR_CODES.ACCOUNT_UNVERIFIED,
      });
    }

    return this.tokens.issueTokens(user);
  }

  async refreshTokens(refreshToken: string | undefined) {
    const rotated = await this.sessions.rotate(refreshToken);
    if (!rotated) {
      throw new UnauthorizedException('Votre session est invalide ou a expiré');
    }

    const user = await this.prisma.users.findUnique({ where: { id: rotated.userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return { accessToken: this.tokens.signAccessToken(user), refreshToken: rotated.token };
  }

  /** `last_login` holds the time of the last logout, as in the old app */
  async logout(userId: string, refreshToken: string | undefined): Promise<void> {
    try {
      await this.prisma.users.update({ where: { id: userId }, data: { last_login: new Date() } });
    } catch (error) {
      this.logger.error(`Failed to update last login for user ${userId}: ${errorMessage(error)}`);
    }
    await this.sessions.revoke(userId, refreshToken);
  }

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        ava: true,
        is_verified: true,
        streak: true,
        created_at: true,
        last_login: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return user;
  }

  /** Sent when someone registers with the email of an existing account, verified or not */
  private async sendAccountExistsEmail(user: { username: string; email: string }) {
    const baseUrl = this.app.frontendUrl;
    await this.emailQueue.enqueueOrFail(
      {
        to: user.email,
        content: this.emailService.compileTemplate('mailAccountExists.hbs', {
          username: user.username,
          loginLink: `${baseUrl}/login`,
          forgotPasswordLink: `${baseUrl}/forgot-password`,
        }),
        subject: 'Votre compte SealVo existe déjà',
      },
      VERIFICATION_EMAIL_FAILED_MESSAGE,
    );
  }
}
