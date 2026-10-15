import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { users: { findFirst: any; findUnique: any; create: any; update: any } };
  let redis: { getClient: any };
  let emailQueue: { enqueue: any };
  let emailService: { compileTemplate: any };

  beforeEach(async () => {
    prisma = {
      users: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    redis = { getClient: vi.fn() };
    emailQueue = { enqueue: vi.fn() };
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: vi.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { getOrThrow: vi.fn().mockReturnValue('secret'), get: vi.fn() } },
        { provide: RedisService, useValue: redis },
        { provide: EmailQueueService, useValue: emailQueue },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('should throw on invalid username', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.login({ username: 'bad', password: '123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      const hashed = await bcrypt.hash('correct', 12);
      prisma.users.findUnique.mockResolvedValue({ id: '1', password: hashed, is_verified: true });
      await expect(service.login({ username: 'user', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw on unverified account', async () => {
      const hashed = await bcrypt.hash('pass', 12);
      prisma.users.findUnique.mockResolvedValue({ id: '1', password: hashed, is_verified: false });
      await expect(service.login({ username: 'user', password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid login', async () => {
      const hashed = await bcrypt.hash('pass', 12);
      prisma.users.findUnique.mockResolvedValue({
        id: '1', username: 'user', password: hashed, is_verified: true, role: 'user',
      });
      prisma.users.update.mockResolvedValue({});

      const result = await service.login({ username: 'user', password: 'pass' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('register', () => {
    it('should throw on duplicate username', async () => {
      prisma.users.findFirst.mockResolvedValue({ username: 'taken' });
      await expect(service.register({ username: 'taken', email: 'a@b.c', password: '123456' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('forgotPassword', () => {
    it('should throw on unknown email', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.forgotPassword('no@exist.com'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should throw on invalid token', async () => {
      const mockClient = { get: vi.fn().mockResolvedValue(null) };
      redis.getClient.mockReturnValue(mockClient);

      await expect(service.resetPassword('badtoken', 'newpass123'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
