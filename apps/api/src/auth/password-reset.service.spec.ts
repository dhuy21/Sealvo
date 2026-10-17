import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { appConfig } from '../config/app.config.js';
import { testAppConfig } from '../config/testing.js';
import { PasswordResetService } from './password-reset.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prisma: {
    users: { findUnique: any; update: any };
    password_reset_tokens: { findFirst: any; create: any; deleteMany: any };
    refresh_sessions: { deleteMany: any };
    email_verification: { updateMany: any };
    $transaction: any;
  };
  let emailQueue: { enqueue: any };
  let emailService: { compileTemplate: any };

  beforeEach(async () => {
    prisma = {
      users: { findUnique: vi.fn(), update: vi.fn() },
      password_reset_tokens: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
      refresh_sessions: { deleteMany: vi.fn() },
      email_verification: { updateMany: vi.fn() },
      $transaction: vi.fn((arg: unknown) => (typeof arg === 'function' ? arg(prisma) : arg)),
    };

    emailQueue = { enqueue: vi.fn() };
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: prisma },
        { provide: appConfig.KEY, useValue: testAppConfig() },
        { provide: EmailQueueService, useValue: emailQueue },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(PasswordResetService);
  });

  describe('forgotPassword', () => {
    it('should return the same generic message for an unknown email without sending anything', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      const unknown = await service.forgotPassword('no@exist.com');

      prisma.users.findUnique.mockResolvedValue({ id: 'u1', username: 'ann', email: 'a@b.c' });
      emailQueue.enqueue.mockResolvedValue(true);
      const known = await service.forgotPassword('a@b.c');

      expect(unknown).toEqual(known);
      expect(emailQueue.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('forgotPassword (DB tokens, #103)', () => {
    it('should replace previous tokens with a hashed one and email the raw token', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: 'u1', username: 'ann', email: 'a@b.c' });
      emailQueue.enqueue.mockResolvedValue(true);

      await service.forgotPassword('a@b.c');

      expect(prisma.password_reset_tokens.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'u1' },
      });
      const { token_hash } = prisma.password_reset_tokens.create.mock.calls[0][0].data;
      const { resetPasswordLink, expiresIn } = emailService.compileTemplate.mock.calls[0][1];
      expect(token_hash).toBe(sha256(resetPasswordLink.split('token=')[1]));
      expect(expiresIn).toBe('1 heure');
    });
  });

  describe('resetPassword', () => {
    it('should throw on invalid or expired token', async () => {
      prisma.password_reset_tokens.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('badtoken', 'newpass123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update the password and revoke reset tokens, every session and pending email changes', async () => {
      prisma.password_reset_tokens.findFirst.mockResolvedValue({ user_id: 'u1' });
      prisma.password_reset_tokens.deleteMany.mockResolvedValue({ count: 1 });

      await service.resetPassword('raw', 'newpass123');

      expect(prisma.password_reset_tokens.findFirst.mock.calls[0][0].where.token_hash).toBe(
        sha256('raw'),
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.password_reset_tokens.deleteMany).toHaveBeenCalledWith({
        where: { token_hash: sha256('raw') },
      });
      expect(prisma.password_reset_tokens.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'u1' },
      });
      expect(prisma.users.update.mock.calls[0][0].where).toEqual({ id: 'u1' });
      expect(prisma.refresh_sessions.deleteMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
      expect(prisma.email_verification.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'u1', status: 'pending' },
        data: { status: 'revoked' },
      });
    });

    it('should reject a token another request consumed first, without changing the password', async () => {
      prisma.password_reset_tokens.findFirst.mockResolvedValue({ user_id: 'u1' });
      prisma.password_reset_tokens.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.resetPassword('raw', 'newpass123')).rejects.toThrow(BadRequestException);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });
  });
});
