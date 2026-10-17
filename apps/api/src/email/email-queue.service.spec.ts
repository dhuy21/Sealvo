import { EmailQueueService } from './email-queue.service.js';

describe('EmailQueueService publishing', () => {
  const payload = { to: 'a@test.com', content: '<p>hi</p>', subject: 'S' };
  let rabbitmq: { publish: any; onChannelReady: any };
  let emailService: { sendEmail: any };
  let service: EmailQueueService;

  beforeEach(() => {
    rabbitmq = { publish: vi.fn(), onChannelReady: vi.fn() };
    emailService = { sendEmail: vi.fn().mockResolvedValue(true) };
    service = new EmailQueueService(rabbitmq as any, {} as any, emailService as any);
  });

  it('asserts its topology on every channel the RabbitMQ service opens', async () => {
    const channel = { assertExchange: vi.fn(), assertQueue: vi.fn(), bindQueue: vi.fn() };
    service.onModuleInit();

    await rabbitmq.onChannelReady.mock.calls[0][0](channel);

    expect(channel.assertExchange).toHaveBeenCalledWith('email.direct', 'direct', {
      durable: true,
    });
    expect(channel.bindQueue).toHaveBeenCalledWith('email.send', 'email.direct', 'email');
  });

  it('does not send directly once the broker confirmed the message', async () => {
    rabbitmq.publish.mockResolvedValue(true);

    await expect(service.enqueue(payload)).resolves.toBe(true);

    expect(rabbitmq.publish).toHaveBeenCalledWith(
      'email.direct',
      'email',
      Buffer.from(JSON.stringify(payload)),
      expect.objectContaining({ persistent: true, messageId: expect.any(String) }),
    );
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('falls back to a direct send when the publish is not confirmed', async () => {
    rabbitmq.publish.mockResolvedValue(false);

    await expect(service.enqueue(payload)).resolves.toBe(true);

    expect(emailService.sendEmail).toHaveBeenCalledWith('a@test.com', '<p>hi</p>', 'S', {
      retries: 2,
    });
  });
});

describe('EmailQueueService consumer dedup', () => {
  let handler: (msg: unknown, ch: unknown) => Promise<void>;
  let channel: { ack: any; nack: any; sendToQueue: any };
  let cache: { get: any; set: any };
  let emailService: { sendEmail: any };

  const message = {
    content: Buffer.from(JSON.stringify({ to: 'a@test.com', content: '<p>hi</p>', subject: 'S' })),
    properties: { messageId: 'msg-1', headers: {} },
    fields: { redelivered: false },
  };

  beforeEach(async () => {
    channel = {
      ack: vi.fn(),
      nack: vi.fn(),
      // Broker confirm
      sendToQueue: vi.fn((_q, _c, _o, cb: (err: null) => void) => cb(null)),
    };
    cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    emailService = { sendEmail: vi.fn().mockResolvedValue(true) };

    const rabbitmq = {
      consume: vi.fn((_queue: string, cb: typeof handler) => {
        handler = cb;
      }),
    };
    const service = new EmailQueueService(rabbitmq as any, cache as any, emailService as any);
    await service.startConsumer();
  });

  it('skips a message already sent', async () => {
    cache.get.mockResolvedValue(1);

    await handler(message, channel);

    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('marks the message as sent only after SES accepted it', async () => {
    await handler(message, channel);

    expect(emailService.sendEmail).toHaveBeenCalledWith('a@test.com', '<p>hi</p>', 'S');
    expect(cache.set).toHaveBeenCalledWith('email:dedup:msg-1', 1, expect.any(Number));
    expect(cache.set.mock.invocationCallOrder[0]).toBeGreaterThan(
      emailService.sendEmail.mock.invocationCallOrder[0],
    );
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('does not mark a failed send, so its retry is sent', async () => {
    emailService.sendEmail.mockResolvedValue(false);

    await handler(message, channel);

    expect(cache.set).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });
});
