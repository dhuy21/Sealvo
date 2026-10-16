import { createHash } from 'crypto';
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

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    users: { findFirst: any; findUnique: any; create: any; update: any };
    email_verification: { findFirst: any; create: any; update: any; updateMany: any };
    $transaction: any;
  };
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
      email_verification: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
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

    it('should store a hashed verification token, revoke older ones and email the raw token', async () => {
      prisma.users.findFirst.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'new', email: 'new@b.c' });
      prisma.email_verification.findFirst.mockResolvedValue(null);
      emailService.compileTemplate.mockReturnValue('<html />');
      emailQueue.enqueue.mockResolvedValue(true);

      await service.register({ username: 'new', email: 'new@b.c', password: '123456' });

      const { verificationLink } = emailService.compileTemplate.mock.calls[0][1];
      const token = new URL(verificationLink).searchParams.get('token')!;
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(prisma.email_verification.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'abc1234' },
        data: { status: 'revoked' },
      });
      expect(prisma.email_verification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ user_id: 'abc1234', token_hash: sha256(token) }),
      });
      expect(emailQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'new@b.c', content: '<html />' }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should mark the token as used and verify the user', async () => {
      prisma.email_verification.findFirst.mockResolvedValue({ id: 'v1', user_id: 'abc1234' });

      const result = await service.verifyEmail('raw-token');

      expect(result.message).toBe('Votre email a été vérifié avec succès');
      expect(prisma.email_verification.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { status: 'used', used_at: expect.any(Date) },
      });
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'abc1234' },
        data: { is_verified: true },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject unknown, expired or already used tokens', async () => {
      prisma.email_verification.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('raw-token')).rejects.toThrow(BadRequestException);
      expect(prisma.email_verification.findFirst).toHaveBeenCalledWith({
        where: {
          token_hash: sha256('raw-token'),
          status: 'pending',
          used_at: null,
          expires_at: { gt: expect.any(Date) },
        },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('googleLogin', () => {
    const mockGoogle = (profile: object) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'google-token' })))
          .mockResolvedValueOnce(new Response(JSON.stringify(profile))),
      );
    };

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should create a verified user with a hashed random password on first login', async () => {
      mockGoogle({ email: 'new@gmail.com', name: 'New User', verified_email: true });
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'New User', role: 'User' });

      const result = await service.googleLogin('code');

      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          email: 'new@gmail.com',
          username: 'New User',
          password: expect.stringMatching(/^\$2[aby]\$12\$/),
          is_verified: true,
        },
      });
      expect(result).toHaveProperty('refreshToken');
    });

    it('should log in an existing user without creating one', async () => {
      mockGoogle({ email: 'old@gmail.com', name: 'Old User', verified_email: true });
      prisma.users.findUnique.mockResolvedValue({ id: 'old1234', username: 'old', role: 'User' });

      const result = await service.googleLogin('code');

      expect(prisma.users.create).not.toHaveBeenCalled();
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'old1234' },
        data: { last_login: expect.any(Date) },
      });
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject a Google account whose email is not verified', async () => {
      mockGoogle({ email: 'old@gmail.com', name: 'Old User', verified_email: false });

      await expect(service.googleLogin('code')).rejects.toThrow(UnauthorizedException);
      expect(prisma.users.findUnique).not.toHaveBeenCalled();
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
