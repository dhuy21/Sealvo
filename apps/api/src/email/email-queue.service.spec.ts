import { EmailQueueService } from './email-queue.service.js';

describe('EmailQueueService consumer dedup', () => {
  let handler: (msg: unknown) => Promise<void>;
  let channel: { consume: any; ack: any; nack: any; sendToQueue: any };
  let cache: { setNX: any; del: any };
  let emailService: { sendEmail: any };

  const message = {
    content: Buffer.from(JSON.stringify({ to: 'a@test.com', content: '<p>hi</p>', subject: 'S' })),
    properties: { messageId: 'msg-1', headers: {} },
  };

  beforeEach(async () => {
    channel = {
      consume: vi.fn((_queue, cb) => {
        handler = cb;
      }),
      ack: vi.fn(),
      nack: vi.fn(),
      sendToQueue: vi.fn(),
    };
    cache = { setNX: vi.fn(), del: vi.fn() };
    emailService = { sendEmail: vi.fn().mockResolvedValue(true) };

    const service = new EmailQueueService(
      { createChannel: vi.fn().mockResolvedValue(channel) } as any,
      cache as any,
      { isReady: () => true } as any,
      emailService as any,
    );
    await service.startConsumer();
  });

  it('skips a message already seen', async () => {
    cache.setNX.mockResolvedValue(false);

    await handler(message);

    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('sends the email when the dedup check errors', async () => {
    cache.setNX.mockResolvedValue(null);

    await handler(message);

    expect(emailService.sendEmail).toHaveBeenCalledWith('a@test.com', '<p>hi</p>', 'S');
    expect(channel.ack).toHaveBeenCalledWith(message);
  });
});
