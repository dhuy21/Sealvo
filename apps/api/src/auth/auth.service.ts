import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, type users_role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import { SessionService } from './session.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const USER_ID_MAX_ATTEMPTS = 5;
const VERIFICATION_TOKEN_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours, stated in mailVerification.hbs
const VERIFICATION_TOKEN_MAX_ATTEMPTS = 5;
const USERNAME_MIN_LENGTH = 3; // RegisterDto / UpdateProfileDto
const USERNAME_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_MESSAGE =
  'Si un compte est associé à cet email, un lien de réinitialisation vous a été envoyé';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.users.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existingUser) {
      const field = existingUser.username === dto.username ? 'username' : 'email';
      throw new ConflictException(`This ${field} is already taken`);
    }

    const user = await this.createUser({
      username: dto.username,
      email: dto.email,
      password: await bcrypt.hash(dto.password, 12),
      ava: dto.avatar ?? 1,
    });

    await this.sendVerificationEmail(user);

    return { id: user.id, username: user.username, email: user.email };
  }

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
      throw new UnauthorizedException('User not found');
    }

    // 403, not 401: the web client treats 401 as an expired access token and refreshes
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new ForbiddenException('Mot de passe actuel incorrect');
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

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException('Your account is not verified');
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    return this.issueTokens(user);
  }

  async refreshTokens(refreshToken: string | undefined) {
    const rotated = await this.sessions.rotate(refreshToken);
    if (!rotated) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = await this.prisma.users.findUnique({ where: { id: rotated.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { accessToken: this.signAccessToken(user), refreshToken: rotated.token };
  }

  logout(refreshToken: string | undefined): Promise<void> {
    return this.sessions.revoke(refreshToken);
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
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

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

    const baseUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const htmlContent = this.emailService.compileTemplate('mailResetPassword.hbs', {
      username: user.username,
      resetPasswordLink: resetLink,
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
    if (!resetToken) {
      throw new BadRequestException(
        "Le jeton de réinitialisation du mot de passe n'est pas valide ou a expiré",
      );
    }

    const userId = resetToken.user_id;
    const hashedPassword = await bcrypt.hash(password, 12);

    // New password: consume the token and log out every device (RFC 9700 §4.14.2)
    await this.prisma.$transaction([
      this.prisma.users.update({ where: { id: userId }, data: { password: hashedPassword } }),
      this.prisma.password_reset_tokens.deleteMany({ where: { user_id: userId } }),
      this.prisma.refresh_sessions.deleteMany({ where: { user_id: userId } }),
    ]);

    return { message: 'Votre mot de passe a été réinitialisé avec succès' };
  }

  getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async googleLogin(code: string) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      throw new UnauthorizedException(`Google token exchange failed (${tokenResponse.status})`);
    }
    const { access_token } = (await tokenResponse.json()) as { access_token: string };

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileResponse.ok) {
      throw new UnauthorizedException(`Google profile request failed (${profileResponse.status})`);
    }
    const profile = (await profileResponse.json()) as {
      email: string;
      name: string;
      verified_email: boolean;
    };

    // Accounts are matched by email, so an unverified Google email would allow account takeover
    if (!profile.verified_email) {
      throw new UnauthorizedException('Google email is not verified');
    }

    let user = await this.prisma.users.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await this.createUser({
        email: profile.email,
        username: await this.generateUsername(profile.name, profile.email),
        password: await bcrypt.hash(randomBytes(16).toString('hex'), 12),
        is_verified: true,
      });
    } else if (!user.is_verified) {
      // Whoever registered this unverified account may not own the email: drop their password and sessions
      await this.prisma.$transaction([
        this.prisma.users.update({
          where: { id: user.id },
          data: { is_verified: true, password: await bcrypt.hash(randomBytes(32).toString('hex'), 12) },
        }),
        this.prisma.refresh_sessions.deleteMany({ where: { user_id: user.id } }),
        this.prisma.email_verification.updateMany({
          where: { user_id: user.id, status: 'pending' },
          data: { status: 'revoked' },
        }),
      ]);
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    return this.issueTokens(user);
  }

  private async createUser(data: Omit<Prisma.usersCreateInput, 'id'>) {
    // Random 7-char IDs can collide: retry on a primary-key conflict (fix #48)
    for (let attempt = 0; attempt < USER_ID_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.users.create({
          data: { id: randomBytes(4).toString('hex').substring(0, 7), ...data },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          if (error.meta?.target === 'PRIMARY') continue;
          throw new ConflictException('Username or email is already taken');
        }
        throw new InternalServerErrorException();
      }
    }
    throw new InternalServerErrorException('Could not allocate a user id');
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
        (candidate) => candidate.length >= USERNAME_MIN_LENGTH,
      ) ?? 'user';

    for (let attempt = 0; attempt < USERNAME_MAX_ATTEMPTS; attempt++) {
      const username = attempt === 0 ? base : `${base}_${randomBytes(3).toString('hex')}`;
      const taken = await this.prisma.users.findUnique({ where: { username }, select: { id: true } });
      if (!taken) return username;
    }
    throw new InternalServerErrorException('Could not allocate a username');
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
    throw new InternalServerErrorException('Could not generate a verification token');
  }

  private async sendVerificationEmail(
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

    const baseUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const htmlContent = this.emailService.compileTemplate('mailVerification.hbs', {
      username: user.username,
      verificationLink: `${baseUrl}/verify-email?token=${token}`,
    });

    const sent = await this.emailQueue.enqueue({
      to: newEmail ?? user.email,
      content: htmlContent,
      subject: newEmail ? 'Confirmation de votre nouvelle adresse email' : 'Vérification de votre email',
    });

    if (!sent) {
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'envoi de l'email de vérification.",
      );
    }
  }

  private signAccessToken(user: { id: string; username: string; role: users_role }) {
    return this.jwt.sign({ sub: user.id, username: user.username, role: user.role });
  }

  /** Access token (JWT, 15 min) + a new refresh session for this device */
  private async issueTokens(user: { id: string; username: string; role: users_role }) {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: await this.sessions.create(user.id),
    };
  }
}
