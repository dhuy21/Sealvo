import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { EmailQueueService } from '../email/email-queue.service.js';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let emailQueue: { enqueue: any };

  beforeEach(async () => {
    emailQueue = { enqueue: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: ConfigService, useValue: { getOrThrow: vi.fn().mockReturnValue('admin@test.com') } },
        { provide: EmailQueueService, useValue: emailQueue },
      ],
    }).compile();

    service = module.get(FeedbackService);
  });

  it('should send feedback successfully', async () => {
    emailQueue.enqueue.mockResolvedValue(true);

    const result = await service.sendFeedback({
      type: 'suggestion',
      subject: 'Test',
      content: 'Great app',
    });

    expect(result.message).toContain('Merci');
    expect(emailQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@test.com', subject: 'Nouveau feedback pour votre site' }),
    );
  });

  it('should throw when email fails', async () => {
    emailQueue.enqueue.mockResolvedValue(false);

    await expect(
      service.sendFeedback({ type: 'bug', subject: 'Error', content: 'Broken' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('should escape HTML in content', async () => {
    emailQueue.enqueue.mockResolvedValue(true);

    await service.sendFeedback({
      type: 'bug',
      subject: '<script>alert("xss")</script>',
      content: 'Test',
    });

    const call = emailQueue.enqueue.mock.calls[0][0];
    expect(call.content).not.toContain('<script>');
    expect(call.content).toContain('&lt;script&gt;');
  });
});
