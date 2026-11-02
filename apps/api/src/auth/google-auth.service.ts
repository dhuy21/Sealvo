import { randomBytes } from 'crypto';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH_LIMITS } from '@sealvo/shared';
import { normalizeEmail } from '../common/utils/normalize-email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import { hashPassword, newToken } from './crypto.js';
import { createUser } from './create-user.js';
import { errorMessage } from '../common/utils/error-message.js';
import { authConfig, type AuthConfig } from '../config/auth.config.js';
import { ActivityLogService } from '../activity/activity-log.service.js';

const USERNAME_MAX_ATTEMPTS = 5;

/** A hung Google endpoint must not hold the login redirect (the callback then sends to /login?error) */
const GOOGLE_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly tokens: TokenService,
    private readonly activities: ActivityLogService,
  ) {}

  getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope: 'email profile',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async googleLogin(code: string) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: this.config.google.clientId,
        client_secret: this.config.google.clientSecret,
        redirect_uri: this.config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    });
    if (!tokenResponse.ok) {
      throw new UnauthorizedException(
        `Échec de l'échange du code d'autorisation Google (${tokenResponse.status})`,
      );
    }
    const { access_token } = (await tokenResponse.json()) as { access_token: string };

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
    });
    if (!profileResponse.ok) {
      throw new UnauthorizedException(
        `Impossible de récupérer le profil Google (${profileResponse.status})`,
      );
    }
    const profile = (await profileResponse.json()) as {
      email: string;
      name: string;
      verified_email: boolean;
    };

    // Accounts are matched by email, so an unverified Google email would allow account takeover
    if (!profile.verified_email) {
      throw new UnauthorizedException("Votre adresse email Google n'est pas vérifiée");
    }

    // Accounts registered by form store the normalized email; older Google accounts may store it raw
    const email = normalizeEmail(profile.email);
    const matches = await this.prisma.users.findMany({
      where: { email: { in: [email, profile.email] } },
    });
    let user =
      matches.find((match) => match.email.toLowerCase() === email.toLowerCase()) ?? matches[0];
    if (!user) {
      user = await createUser(this.prisma, {
        email,
        username: await this.generateUsername(profile.name, profile.email),
        password: await hashPassword(newToken()),
        is_verified: true,
      });
    } else if (!user.is_verified) {
      // Whoever registered this unverified account may not own the email: drop their password and sessions
      await this.prisma.$transaction([
        this.prisma.users.update({
          where: { id: user.id },
          data: {
            is_verified: true,
            password: await hashPassword(newToken()),
          },
        }),
        this.prisma.refresh_sessions.deleteMany({ where: { user_id: user.id } }),
        this.prisma.email_verification.updateMany({
          where: { user_id: user.id, status: 'pending' },
          data: { status: 'revoked' },
        }),
      ]);
    }

    const tokens = await this.tokens.issueTokens(user);
    try {
      await this.activities.succeeded(this.prisma, { userId: user.id, type: 'login' });
    } catch (error) {
      this.logger.error(`Login journal failed for user ${user.id}: ${errorMessage(error)}`);
    }
    return tokens;
  }

  private async generateUsername(name: string | undefined, email: string) {
    const sanitize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_.-]/g, '')
        .slice(0, 40);
    const base =
      [sanitize(name ?? ''), sanitize(email.split('@')[0])].find(
        (candidate) => candidate.length >= AUTH_LIMITS.USERNAME_MIN,
      ) ?? 'user';

    for (let attempt = 0; attempt < USERNAME_MAX_ATTEMPTS; attempt++) {
      const username = attempt === 0 ? base : `${base}_${randomBytes(3).toString('hex')}`;
      const taken = await this.prisma.users.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!taken) return username;
    }
    throw new InternalServerErrorException(
      'Une erreur est survenue. Veuillez réessayer plus tard.',
    );
  }
}
