import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { EmailQueueService } from '../email/email-queue.service.js';
import { EmailService } from '../email/email.service.js';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let emailQueue: { enqueue: any };

  beforeEach(async () => {
    emailQueue = { enqueue: vi.fn() };
    const config = { getOrThrow: vi.fn().mockReturnValue('admin@test.com'), get: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: ConfigService, useValue: config },
        { provide: EmailQueueService, useValue: emailQueue },
        // Real EmailService so the feedback.hbs template and its escaping are exercised
        { provide: EmailService, useFactory: () => new EmailService(config as any) },
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
    const { content } = emailQueue.enqueue.mock.calls[0][0];
    expect(content).toContain('<p>Contenu: Great app</p>');
    expect(content).toContain('<p>Email: Non fourni</p>');
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

describe('CreateFeedbackDto', () => {
  const base = { type: 'bug', subject: 'S', content: 'C' };

  it('treats a blank email as absent', async () => {
    const dto = plainToInstance(CreateFeedbackDto, { ...base, email: '' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBeUndefined();
  });

  it('still rejects an invalid email', async () => {
    const dto = plainToInstance(CreateFeedbackDto, { ...base, email: 'nope' });

    expect(await validate(dto)).toHaveLength(1);
  });
});
