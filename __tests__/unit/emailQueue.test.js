const rabbitmq = require('../../app/core/rabbitmq');
const MailersendService = require('../../app/services/mailersend');

jest.mock('../../app/core/rabbitmq');
jest.mock('../../app/services/mailersend');

const emailQueue = require('../../app/queues/emailQueue');

const mockChannel = {
  assertExchange: jest.fn(),
  assertQueue: jest.fn(),
  bindQueue: jest.fn(),
  publish: jest.fn(),
  sendToQueue: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  rabbitmq.getChannel.mockReturnValue(mockChannel);
  rabbitmq.isReady.mockReturnValue(true);
});

describe('emailQueue (unit)', () => {
  describe('setupTopology', () => {
    it('declares exchanges, queues and bindings', async () => {
      await emailQueue.setupTopology();

      expect(mockChannel.assertExchange).toHaveBeenCalledWith('email.direct', 'direct', {
        durable: true,
      });
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('email.retry.direct', 'direct', {
        durable: true,
      });

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-dead-letter-exchange': 'email.retry.direct',
          }),
        })
      );

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'email.retry',
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-message-ttl': 10_000,
            'x-dead-letter-exchange': 'email.direct',
          }),
        })
      );

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('email.failed', { durable: true });

      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(2);
    });

    it('throws when channel is not available', async () => {
      rabbitmq.getChannel.mockReturnValue(null);
      await expect(emailQueue.setupTopology()).rejects.toThrow('Channel not available');
    });
  });

  describe('publish', () => {
    it('publishes JSON payload to the exchange', () => {
      const payload = { to: 'a@b.c', content: '<p>hi</p>', subject: 'Test' };
      const result = emailQueue.publish(payload);

      expect(result).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'email.direct',
        'email',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, contentType: 'application/json' })
      );

      const sentBuffer = mockChannel.publish.mock.calls[0][2];
      expect(JSON.parse(sentBuffer.toString())).toEqual(payload);
    });

    it('returns false when channel is null', () => {
      rabbitmq.getChannel.mockReturnValue(null);
      expect(emailQueue.publish({ to: 'x' })).toBe(false);
    });
  });

  describe('enqueue', () => {
    it('publishes to queue when RabbitMQ is available', async () => {
      const payload = { to: 'a@b.c', content: 'hi', subject: 'Sub' };
      const result = await emailQueue.enqueue(payload);
      expect(result).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalled();
      expect(MailersendService.sendEmail).not.toHaveBeenCalled();
    });

    it('falls back to sync send when RabbitMQ is unavailable', async () => {
      rabbitmq.getChannel.mockReturnValue(null);
      MailersendService.sendEmail.mockResolvedValue({ messageId: '123' });

      const payload = { to: 'a@b.c', content: '<p>hi</p>', subject: 'Test' };
      const result = await emailQueue.enqueue(payload);

      expect(result).toEqual({ messageId: '123' });
      expect(MailersendService.sendEmail).toHaveBeenCalledWith('a@b.c', '<p>hi</p>', 'Test');
    });

    it('returns false when fallback also fails', async () => {
      rabbitmq.getChannel.mockReturnValue(null);
      MailersendService.sendEmail.mockResolvedValue(false);

      const result = await emailQueue.enqueue({ to: 'a@b.c', content: 'c', subject: 's' });
      expect(result).toBe(false);
    });
  });

  describe('startConsumer', () => {
    it('registers a consumer on email.send queue', async () => {
      await emailQueue.startConsumer();
      expect(mockChannel.consume).toHaveBeenCalledWith('email.send', expect.any(Function));
    });

    it('acks the message after successful send', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        const msg = {
          content: Buffer.from(JSON.stringify({ to: 'a@b.c', content: 'hi', subject: 'Sub' })),
          properties: { headers: {} },
        };
        MailersendService.sendEmail.mockResolvedValue({ messageId: '1' });
        await handler(msg);
      });

      await emailQueue.startConsumer();
      expect(MailersendService.sendEmail).toHaveBeenCalledWith('a@b.c', 'hi', 'Sub');
      expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('nacks on first failure (triggers DLX retry)', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        const msg = {
          content: Buffer.from(JSON.stringify({ to: 'a@b.c', content: 'hi', subject: 'Sub' })),
          properties: { headers: {} },
        };
        MailersendService.sendEmail.mockRejectedValue(new Error('SES timeout'));
        await handler(msg);
      });

      await emailQueue.startConsumer();
      expect(mockChannel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('moves to failed queue after MAX_RETRIES', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        const msg = {
          content: Buffer.from(JSON.stringify({ to: 'a@b.c', content: 'hi', subject: 'Sub' })),
          properties: {
            headers: {
              'x-death': [{ queue: 'email.send', count: 2, reason: 'rejected' }],
            },
          },
        };
        MailersendService.sendEmail.mockRejectedValue(new Error('SES error'));
        await handler(msg);
      });

      await emailQueue.startConsumer();
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'email.failed',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true })
      );
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('discards message with invalid JSON', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        const msg = {
          content: Buffer.from('not json'),
          properties: { headers: {} },
        };
        await handler(msg);
      });

      await emailQueue.startConsumer();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(MailersendService.sendEmail).not.toHaveBeenCalled();
    });

    it('ignores null messages (consumer cancelled)', async () => {
      mockChannel.consume.mockImplementation(async (_queue, handler) => {
        await handler(null);
      });

      await emailQueue.startConsumer();
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });
  });
});
