import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { appConfig } from '../config/app.config.js';
import { testAppConfig, testEmailQueue } from '../config/testing.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let prisma: {
    users: { findUnique: any; update: any };
    email_verification: { findFirst: any; create: any; updateMany: any };
    $transaction: any;
  };
  let emailQueue: { enqueue: any };
  let emailService: { compileTemplate: any };

  beforeEach(async () => {
    prisma = {
      users: { findUnique: vi.fn(), update: vi.fn() },
      email_verification: {
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    prisma.email_verification.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as unknown[]),
    );

    emailQueue = testEmailQueue();
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: appConfig.KEY, useValue: testAppConfig() },
        { provide: EmailQueueService, useValue: emailQueue },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(EmailVerificationService);
  });

  describe('verifyEmail', () => {
    it('should mark the token as used and verify the user', async () => {
      prisma.email_verification.findFirst.mockResolvedValue({ id: 'v1', user_id: 'abc1234' });

      const result = await service.verifyEmail('raw-token');

      expect(result.message).toBe('Votre email a été vérifié avec succès');
      expect(prisma.email_verification.updateMany).toHaveBeenCalledWith({
        where: { id: 'v1', status: 'pending', used_at: null },
        data: { status: 'used', used_at: expect.any(Date) },
      });
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'abc1234' },
        data: { is_verified: true },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should switch the user email for an email-change token', async () => {
      prisma.email_verification.findFirst.mockResolvedValue({
        id: 'v1',
        user_id: 'abc1234',
        new_email: 'new@b.c',
      });
      prisma.users.findUnique.mockResolvedValue(null);

      const result = await service.verifyEmail('raw-token');

      expect(result.message).toBe('Votre nouvelle adresse email a été confirmée avec succès');
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 'abc1234' },
        data: { is_verified: true, email: 'new@b.c' },
      });
    });

    it('should reject an email-change token whose address was taken meanwhile', async () => {
      prisma.email_verification.findFirst.mockResolvedValue({
        id: 'v1',
        user_id: 'abc1234',
        new_email: 'new@b.c',
      });
      prisma.users.findUnique.mockResolvedValue({ id: 'other12' });

      await expect(service.verifyEmail('raw-token')).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should verify only once when the same link is opened twice at the same time', async () => {
      prisma.email_verification.findFirst.mockResolvedValue({ id: 'v1', user_id: 'abc1234' });
      prisma.email_verification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.verifyEmail('raw-token')).rejects.toThrow(BadRequestException);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('should answer 409 when another account takes the address during the transaction', async () => {
      prisma.email_verification.findFirst.mockResolvedValue({
        id: 'v1',
        user_id: 'abc1234',
        new_email: 'new@b.c',
      });
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '5',
        }),
      );

      await expect(service.verifyEmail('raw-token')).rejects.toThrow(ConflictException);
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

  describe('resendVerification', () => {
    const GENERIC = {
      message: 'Si un compte non vérifié correspond, un nouvel email de vérification a été envoyé.',
    };
    const user = { id: 'abc1234', username: 'ann', email: 'ann@b.c', is_verified: false };

    beforeEach(() => {
      prisma.email_verification.findFirst.mockResolvedValue(null);
      emailService.compileTemplate.mockReturnValue('<html />');
      emailQueue.enqueue.mockResolvedValue(true);
    });

    it('should revoke previous tokens and mail a new one to an unverified account', async () => {
      prisma.users.findUnique.mockResolvedValue(user);

      await expect(service.resendVerification('ann')).resolves.toEqual(GENERIC);

      expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { username: 'ann' } });
      expect(prisma.email_verification.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'abc1234' },
        data: { status: 'revoked' },
      });
      expect(prisma.email_verification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ user_id: 'abc1234', new_email: undefined }),
      });
      expect(emailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'ann@b.c' }));
    });

    it.each([
      ['an unknown username', null],
      ['a verified account', { ...user, is_verified: true }],
    ])('should send nothing for %s', async (_case, found) => {
      prisma.users.findUnique.mockResolvedValue(found);

      await expect(service.resendVerification('ann')).resolves.toEqual(GENERIC);

      expect(prisma.email_verification.create).not.toHaveBeenCalled();
      expect(emailQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should keep the generic answer when the email cannot be queued', async () => {
      prisma.users.findUnique.mockResolvedValue(user);
      emailQueue.enqueue.mockResolvedValue(false);

      await expect(service.resendVerification('ann')).resolves.toEqual(GENERIC);
    });
  });
});
