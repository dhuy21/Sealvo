import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import { SessionService } from './session.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    users: { findFirst: any; findUnique: any; create: any; update: any };
    email_verification: { findFirst: any; create: any; update: any; updateMany: any };
    password_reset_tokens: { findFirst: any; create: any; deleteMany: any };
    refresh_sessions: { deleteMany: any };
    $transaction: any;
  };
  let sessions: { create: any; rotate: any; revoke: any };
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
      password_reset_tokens: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
      refresh_sessions: { deleteMany: vi.fn() },
      $transaction: vi.fn(),
    };

    sessions = { create: vi.fn().mockResolvedValue('session.token'), rotate: vi.fn(), revoke: vi.fn() };
    emailQueue = { enqueue: vi.fn() };
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: vi.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { getOrThrow: vi.fn().mockReturnValue('secret'), get: vi.fn() } },
        { provide: SessionService, useValue: sessions },
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
      expect(result).toEqual({ accessToken: 'token', refreshToken: 'session.token' });
      expect(sessions.create).toHaveBeenCalledWith('1');
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

  describe('forgotPassword (DB tokens, #103)', () => {
    it('should replace previous tokens with a hashed one and email the raw token', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 'u1', username: 'ann', email: 'a@b.c' });
      emailQueue.enqueue.mockResolvedValue(true);

      await service.forgotPassword('a@b.c');

      expect(prisma.password_reset_tokens.deleteMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
      const { token_hash } = prisma.password_reset_tokens.create.mock.calls[0][0].data;
      const { resetPasswordLink } = emailService.compileTemplate.mock.calls[0][1];
      expect(token_hash).toBe(sha256(resetPasswordLink.split('token=')[1]));
    });
  });

  describe('resetPassword', () => {
    it('should throw on invalid or expired token', async () => {
      prisma.password_reset_tokens.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('badtoken', 'newpass123'))
        .rejects.toThrow(BadRequestException);
    });

    it('should update the password and revoke reset tokens and every session', async () => {
      prisma.password_reset_tokens.findFirst.mockResolvedValue({ user_id: 'u1' });

      await service.resetPassword('raw', 'newpass123');

      expect(prisma.password_reset_tokens.findFirst.mock.calls[0][0].where.token_hash).toBe(sha256('raw'));
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.password_reset_tokens.deleteMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
      expect(prisma.refresh_sessions.deleteMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
    });
  });

  describe('refreshTokens', () => {
    it('should reject a session that cannot be rotated', async () => {
      sessions.rotate.mockResolvedValue(null);
      await expect(service.refreshTokens('sid.secret')).rejects.toThrow(UnauthorizedException);
    });

    it('should return a new access token and the rotated refresh token', async () => {
      sessions.rotate.mockResolvedValue({ userId: '1', token: 'sid.new' });
      prisma.users.findUnique.mockResolvedValue({ id: '1', username: 'user', role: 'User' });

      await expect(service.refreshTokens('sid.old')).resolves.toEqual({
        accessToken: 'token',
        refreshToken: 'sid.new',
      });
    });
  });
});
