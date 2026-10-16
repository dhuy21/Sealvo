import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, type users_role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const RESET_TOKEN_PREFIX = 'reset:';
const RESET_EMAIL_PREFIX = 'reset:email:';
const RESET_TOKEN_TTL = 3600; // 1 hour
const USER_ID_MAX_ATTEMPTS = 5;
const VERIFICATION_TOKEN_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours, stated in mailVerification.hbs
const VERIFICATION_TOKEN_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
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

    await this.prisma.$transaction([
      this.prisma.email_verification.update({
        where: { id: verification.id },
        data: { status: 'used', used_at: new Date() },
      }),
      this.prisma.users.update({
        where: { id: verification.user_id },
        data: { is_verified: true },
      }),
    ]);

    return { message: 'Votre email a été vérifié avec succès' };
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

    return this.generateTokens(user.id, user.username, user.role);
  }

  async refreshTokens(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.username, user.role);
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
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException("Cet email n'existe pas");
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const client = this.redis.getClient();
    if (!client) {
      throw new InternalServerErrorException('Service temporarily unavailable');
    }

    // Delete any previous token for this email
    const oldHash = await client.get(RESET_EMAIL_PREFIX + email);
    if (oldHash) await client.del(RESET_TOKEN_PREFIX + oldHash);

    await client.set(RESET_TOKEN_PREFIX + tokenHash, JSON.stringify({ email }), { EX: RESET_TOKEN_TTL });
    await client.set(RESET_EMAIL_PREFIX + email, tokenHash, { EX: RESET_TOKEN_TTL });

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
      throw new InternalServerErrorException('Une erreur est survenue. Veuillez réessayer plus tard.');
    }

    return { message: 'Un email a été envoyé pour réinitialiser votre mot de passe' };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const client = this.redis.getClient();
    if (!client) {
      throw new InternalServerErrorException('Service temporarily unavailable');
    }

    const raw = await client.get(RESET_TOKEN_PREFIX + tokenHash);
    if (!raw) {
      throw new BadRequestException(
        "Le jeton de réinitialisation du mot de passe n'est pas valide ou a expiré",
      );
    }

    const { email } = JSON.parse(raw) as { email: string };
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.users.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Clean up tokens
    await client.del([RESET_TOKEN_PREFIX + tokenHash, RESET_EMAIL_PREFIX + email]);

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

    const user =
      (await this.prisma.users.findUnique({ where: { email: profile.email } })) ??
      (await this.createUser({
        email: profile.email,
        username: profile.name,
        password: await bcrypt.hash(randomBytes(16).toString('hex'), 12),
        is_verified: true,
      }));

    await this.prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    return this.generateTokens(user.id, user.username, user.role);
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

  private async sendVerificationEmail(user: { id: string; username: string; email: string }) {
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
        },
      }),
    ]);

    const baseUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const htmlContent = this.emailService.compileTemplate('mailVerification.hbs', {
      username: user.username,
      verificationLink: `${baseUrl}/verify-email?token=${token}`,
    });

    const sent = await this.emailQueue.enqueue({
      to: user.email,
      content: htmlContent,
      subject: 'Vérification de votre email',
    });

    if (!sent) {
      throw new InternalServerErrorException(
        "Une erreur est survenue lors de l'envoi de l'email de vérification.",
      );
    }
  }

  private generateTokens(userId: string, username: string, role: users_role) {
    const payload = { sub: userId, username, role };

    const accessToken = this.jwt.sign(payload);

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d' as const,
    });

    return { accessToken, refreshToken };
  }
}
