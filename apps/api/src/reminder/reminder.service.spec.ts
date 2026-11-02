import { Test } from '@nestjs/testing';
import { appConfig } from '../config/app.config.js';
import { testAppConfig } from '../config/testing.js';
import { InternalServerErrorException } from '@nestjs/common';
import { ReminderService } from './reminder.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { CacheService } from '../redis/cache.service.js';

describe('ReminderService', () => {
  let service: ReminderService;
  let prisma: {
    learning: { findMany: any };
    users: { findUniqueOrThrow: any };
    word_details: { findMany: any };
  };
  let emailService: { compileTemplate: any };
  let emailQueue: { enqueue: any };
  let cache: { setNX: any };

  const dueRow = (detailId: number) => ({
    detail_id: detailId,
    level: 'level_0',
    packages: { user_id: 'u1' },
  });

  beforeEach(async () => {
    prisma = {
      learning: { findMany: vi.fn().mockResolvedValue([]) },
      users: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ id: 'u1', email: 'me@b.c', username: 'me', streak: 4 }),
      },
      word_details: {
        findMany: vi.fn().mockResolvedValue([
          {
            detail_id: 1,
            type: 'n',
            meaning: 'chat',
            pronunciation: null,
            example: null,
            words: { word: 'cat' },
          },
        ]),
      },
    };
    emailService = { compileTemplate: vi.fn().mockReturnValue('<p>reminder</p>') };
    emailQueue = { enqueue: vi.fn().mockResolvedValue(true) };
    cache = { setNX: vi.fn().mockResolvedValue(true) };

    const module = await Test.createTestingModule({
      providers: [
        ReminderService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: EmailQueueService, useValue: emailQueue },
        { provide: CacheService, useValue: cache },
        { provide: appConfig.KEY, useValue: testAppConfig() },
      ],
    }).compile();

    service = module.get(ReminderService);
  });

  it('should not send anything when no word is due today', async () => {
    await expect(service.sendTestReminder('u1')).resolves.toEqual({
      message: "Aucun mot à réviser aujourd'hui",
    });
    expect(prisma.learning.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ packages: { is_active: true, user_id: 'u1' } }),
      }),
    );
    expect(emailQueue.enqueue).not.toHaveBeenCalled();
  });

  it('should email the reminder to the current user', async () => {
    prisma.learning.findMany.mockResolvedValue([1, 2, 3, 4, 5, 6].map(dueRow));

    await expect(service.sendTestReminder('u1')).resolves.toEqual({
      message: "L'email a été envoyé pour tester",
    });
    expect(prisma.word_details.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { detail_id: { in: [1, 2, 3, 4, 5] } } }),
    );
    expect(emailService.compileTemplate).toHaveBeenCalledWith(
      'mail.hbs',
      expect.objectContaining({
        wordCount: 6,
        wordsShown: 1,
        hasMoreWords: true,
        baseUrl: 'http://localhost:3000',
      }),
    );
    expect(emailQueue.enqueue).toHaveBeenCalledWith({
      to: 'me@b.c',
      content: '<p>reminder</p>',
      subject: 'Révision quotidienne - SealVo',
    });
  });

  it('should throw a 500 when the email cannot be enqueued', async () => {
    prisma.learning.findMany.mockResolvedValue([dueRow(1)]);
    emailQueue.enqueue.mockResolvedValue(false);

    const error = await service.sendTestReminder('u1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect((error as InternalServerErrorException).message).toBe("Échec de l'envoi de l'email");
  });

  it('sends the reminders of an hour only once (scheduled run and catch-up)', async () => {
    cache.setNX.mockResolvedValue(false);

    await expect(service.sendReminders()).resolves.toEqual({ sent: 0, failed: 0, skipped: true });
    expect(cache.setNX).toHaveBeenCalledWith(
      expect.stringMatching(/^reminder:run:\d{4}-\d{2}-\d{2}T\d{2}$/),
      1,
      7200,
    );
    expect(prisma.learning.findMany).not.toHaveBeenCalled();
  });

  it('still sends when Redis cannot tell (fail open)', async () => {
    cache.setNX.mockResolvedValue(null);

    await expect(service.sendReminders()).resolves.toEqual({ sent: 0, failed: 0 });
    expect(prisma.learning.findMany).toHaveBeenCalled();
  });
});
