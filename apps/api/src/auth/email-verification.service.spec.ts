import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { EmailVerificationService } from './email-verification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let prisma: {
    users: { findUnique: any; update: any };
    email_verification: { findFirst: any; create: any; update: any; updateMany: any };
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
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    emailQueue = { enqueue: vi.fn() };
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: vi.fn() } },
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

  describe('requestEmailChange', () => {
    let user: { id: string; username: string; email: string; password: string };

    beforeEach(async () => {
      user = {
        id: 'abc1234',
        username: 'ann',
        email: 'old@b.c',
        password: await bcrypt.hash('secret', 4),
      };
      prisma.users.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
        Promise.resolve(where.id === user.id ? user : null),
      );
      prisma.email_verification.findFirst.mockResolvedValue(null);
      emailService.compileTemplate.mockReturnValue('<html />');
      emailQueue.enqueue.mockResolvedValue(true);
    });

    it('should require the current password', async () => {
      await expect(service.requestEmailChange('abc1234', 'new@b.c', undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.email_verification.create).not.toHaveBeenCalled();
    });

    it('should reject a wrong current password', async () => {
      await expect(service.requestEmailChange('abc1234', 'new@b.c', 'wrong')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.email_verification.create).not.toHaveBeenCalled();
    });

    it('should reject an email already used by another account', async () => {
      prisma.users.findUnique.mockImplementation(({ where }: { where: { id?: string } }) =>
        Promise.resolve(where.id === user.id ? user : { id: 'other12' }),
      );
      await expect(service.requestEmailChange('abc1234', 'taken@b.c', 'secret')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should store a token with new_email and mail the new address without changing the email', async () => {
      await service.requestEmailChange('abc1234', 'new@b.c', 'secret');

      const { verificationLink } = emailService.compileTemplate.mock.calls[0][1];
      const token = new URL(verificationLink).searchParams.get('token')!;
      expect(prisma.email_verification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'abc1234',
          token_hash: sha256(token),
          new_email: 'new@b.c',
        }),
      });
      expect(emailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@b.c' }));
      expect(prisma.users.update).not.toHaveBeenCalled();
    });
  });
});
