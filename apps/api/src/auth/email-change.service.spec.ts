import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { appConfig } from '../config/app.config.js';
import { testAppConfig, testEmailQueue } from '../config/testing.js';
import { EmailChangeService } from './email-change.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('EmailChangeService', () => {
  let service: EmailChangeService;
  let prisma: {
    users: { findUnique: any; update: any };
    email_verification: { findFirst: any; create: any; updateMany: any; count: any };
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
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    };
    emailQueue = testEmailQueue();
    emailService = { compileTemplate: vi.fn() };

    // Real EmailVerificationService: the token and the email it sends are part of the change
    const module = await Test.createTestingModule({
      providers: [
        EmailChangeService,
        EmailVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: appConfig.KEY, useValue: testAppConfig() },
        { provide: EmailQueueService, useValue: emailQueue },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(EmailChangeService);
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

    it('should refuse a 4th email change within an hour, whatever the IP', async () => {
      prisma.email_verification.count.mockResolvedValue(3);

      await expect(
        service.requestEmailChange('abc1234', 'new@b.c', 'secret'),
      ).rejects.toMatchObject({
        status: 429,
        message: "Trop de demandes de changement d'email. Réessayez dans 1 heure.",
      });
      expect(prisma.email_verification.count.mock.calls[0][0].where).toMatchObject({
        user_id: 'abc1234',
        new_email: { not: null },
      });
      expect(emailQueue.enqueue).not.toHaveBeenCalled();
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
