import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    $transaction: any;
  };
  let emailQueue: { enqueue: any };
  let emailService: { compileTemplate: any };

  beforeEach(async () => {
    prisma = {
      users: { findUnique: vi.fn(), update: vi.fn() },
      password_reset_tokens: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
      refresh_sessions: { deleteMany: vi.fn() },
      $transaction: vi.fn(),
    };

    emailQueue = { enqueue: vi.fn() };
    emailService = { compileTemplate: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: vi.fn() } },
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
});
