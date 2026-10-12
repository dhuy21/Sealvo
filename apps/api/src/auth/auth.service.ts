import { randomBytes } from 'crypto';
import {
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
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const userId = await this.generateUniqueId();

    try {
      const user = await this.prisma.users.create({
        data: {
          id: userId,
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          ava: dto.avatar ?? 1,
        },
      });

      return { id: user.id, username: user.username, email: user.email };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Username or email is already taken');
      }
      throw new InternalServerErrorException();
    }
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
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

  private async generateUniqueId(): Promise<string> {
    let id: string;
    let exists: boolean;

    do {
      id = randomBytes(4).toString('hex').substring(0, 7);
      const user = await this.prisma.users.findUnique({ where: { id } });
      exists = !!user;
    } while (exists);

    return id;
  }
}
