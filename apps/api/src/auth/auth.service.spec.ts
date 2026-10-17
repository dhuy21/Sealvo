import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { appConfig } from '../config/app.config.js';
import { testAppConfig, testEmailQueue } from '../config/testing.js';
import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';
import { SessionService } from './session.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    users: { findUnique: any; create: any; update: any };
    email_verification: { findFirst: any; create: any; updateMany: any };
    $transaction: any;
  };
  let sessions: { create: any; rotate: any; revoke: any };
  let emailQueue: { enqueue: any };
  let emailService: { compileTemplate: any };

  beforeEach(async () => {
    prisma = {
      users: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      email_verification: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn(),
    };

    sessions = {
      create: vi.fn().mockResolvedValue('session.token'),
      rotate: vi.fn(),
      revoke: vi.fn(),
    };
    emailQueue = testEmailQueue();
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        EmailVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: vi.fn().mockReturnValue('token') } },
        { provide: SessionService, useValue: sessions },
        { provide: EmailQueueService, useValue: emailQueue },
        { provide: EmailService, useValue: emailService },
        { provide: appConfig.KEY, useValue: testAppConfig() },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('should throw on invalid username', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      const login = service.login({ username: 'bad', password: '123' });
      await expect(login).rejects.toThrow(UnauthorizedException);
      await expect(login).rejects.toThrow("Nom d'utilisateur ou mot de passe incorrect");
    });

    it('should throw on wrong password', async () => {
      const hashed = await bcrypt.hash('correct', 12);
      prisma.users.findUnique.mockResolvedValue({ id: '1', password: hashed, is_verified: true });
      const login = service.login({ username: 'user', password: 'wrong' });
      await expect(login).rejects.toThrow(UnauthorizedException);
      await expect(login).rejects.toThrow("Nom d'utilisateur ou mot de passe incorrect");
    });

    it('should throw on unverified account, with the code the web reacts to', async () => {
      const hashed = await bcrypt.hash('pass', 12);
      prisma.users.findUnique.mockResolvedValue({ id: '1', password: hashed, is_verified: false });
      const error: unknown = await service
        .login({ username: 'user', password: 'pass' })
        .catch((e) => e);
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        statusCode: 401,
        message: "Votre compte n'est pas vérifié",
        code: 'ACCOUNT_UNVERIFIED',
      });
    });

    it('should return tokens on valid login without touching last_login', async () => {
      const hashed = await bcrypt.hash('pass', 12);
      prisma.users.findUnique.mockResolvedValue({
        id: '1',
        username: 'user',
        password: hashed,
        is_verified: true,
        role: 'user',
      });

      const result = await service.login({ username: 'user', password: 'pass' });
      expect(result).toEqual({ accessToken: 'token', refreshToken: 'session.token' });
      expect(sessions.create).toHaveBeenCalledWith('1');
      expect(prisma.users.update).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should record last_login and revoke the device session', async () => {
      await service.logout('1', 'sid.secret');

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { last_login: expect.any(Date) },
      });
      expect(sessions.revoke).toHaveBeenCalledWith('1', 'sid.secret');
    });

    it('should still revoke the session when last_login cannot be updated', async () => {
      prisma.users.update.mockRejectedValue(new Error('db down'));

      await service.logout('1', 'sid.secret');

      expect(sessions.revoke).toHaveBeenCalledWith('1', 'sid.secret');
    });
  });

  describe('register', () => {
    const takenBy = (field: 'username' | 'email') =>
      prisma.users.findUnique.mockImplementation(({ where }: { where: object }) =>
        Promise.resolve(field in where ? { id: 'other12' } : null),
      );

    it('should throw on duplicate username, whatever its case', async () => {
      // The database collation matches 'john' with an existing 'John'
      takenBy('username');
      const register = service.register({ username: 'john', email: 'a@b.c', password: '123456' });
      await expect(register).rejects.toThrow(ConflictException);
      await expect(register).rejects.toThrow("Ce nom d'utilisateur est déjà utilisé");
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { username: 'john' },
        select: { id: true },
      });
    });

    describe('with the email of an existing account', () => {
      const owner = { id: 'own1234', username: 'owner', email: 'a@b.c' };
      const success = {
        success: true,
        message: 'Un email de vérification a été envoyé à votre adresse email',
      };
      const ownerExists = (is_verified: boolean) =>
        prisma.users.findUnique.mockImplementation(({ where }: { where: object }) =>
          Promise.resolve('email' in where ? { ...owner, is_verified } : null),
        );

      beforeEach(() => {
        emailService.compileTemplate.mockReturnValue('<html />');
        emailQueue.enqueue.mockResolvedValue(true);
      });

      it('answers like a new registration and tells a verified owner, with login links', async () => {
        ownerExists(true);

        await expect(
          service.register({ username: 'new', email: 'a@b.c', password: '123456' }),
        ).resolves.toEqual(success);

        expect(prisma.users.create).not.toHaveBeenCalled();
        expect(emailService.compileTemplate).toHaveBeenCalledWith('mailAccountExists.hbs', {
          username: 'owner',
          loginLink: 'http://localhost:3000/login',
          forgotPasswordLink: 'http://localhost:3000/forgot-password',
        });
        expect(emailQueue.enqueue).toHaveBeenCalledWith(
          expect.objectContaining({ to: 'a@b.c', content: '<html />' }),
        );
      });

      it('never sends a verification link for an unverified account someone else registered', async () => {
        ownerExists(false);

        await expect(
          service.register({ username: 'new', email: 'a@b.c', password: '123456' }),
        ).resolves.toEqual(success);

        expect(prisma.users.create).not.toHaveBeenCalled();
        expect(emailService.compileTemplate.mock.calls[0][0]).toBe('mailAccountExists.hbs');
        expect(prisma.email_verification.create).not.toHaveBeenCalled();
      });

      it('fails like a new registration when the email cannot be queued', async () => {
        ownerExists(true);
        emailQueue.enqueue.mockResolvedValue(false);

        await expect(
          service.register({ username: 'new', email: 'a@b.c', password: '123456' }),
        ).rejects.toThrow("Une erreur est survenue lors de l'envoi de l'email de vérification.");
      });
    });

    it('should store a hashed verification token, revoke older ones and email the raw token', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'new', email: 'new@b.c' });
      prisma.email_verification.findFirst.mockResolvedValue(null);
      emailService.compileTemplate.mockReturnValue('<html />');
      emailQueue.enqueue.mockResolvedValue(true);

      await expect(
        service.register({ username: 'new', email: 'new@b.c', password: '123456' }),
      ).resolves.toEqual({
        success: true,
        message: 'Un email de vérification a été envoyé à votre adresse email',
      });

      const { verificationLink, expiresIn } = emailService.compileTemplate.mock.calls[0][1];
      expect(expiresIn).toBe('3 heures');
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

    it('should keep the account and report the error when the verification email cannot be queued', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({ id: 'abc1234', username: 'new', email: 'new@b.c' });
      prisma.email_verification.findFirst.mockResolvedValue(null);
      emailQueue.enqueue.mockResolvedValue(false);

      await expect(
        service.register({ username: 'new', email: 'new@b.c', password: '123456' }),
      ).rejects.toThrow(InternalServerErrorException);
      expect(prisma.users.create).toHaveBeenCalledTimes(1);
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
