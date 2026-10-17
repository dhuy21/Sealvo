import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RetryQueue } from './retry-queue.js';

const queue = new RetryQueue({ name: 'job', queue: 'job.process', retryTtl: 5000, maxRetries: 2 });

const message = (deaths?: Record<string, unknown>[]) =>
  ({
    content: Buffer.from('{}'),
    properties: { headers: deaths ? { 'x-death': deaths } : {} },
  }) as unknown as ConsumeMessage;

describe('RetryQueue', () => {
  it('asserts the work, retry and failed queues, wired through dead-letter exchanges', async () => {
    const ch = { assertExchange: vi.fn(), assertQueue: vi.fn(), bindQueue: vi.fn() };
    await queue.assertTopology(ch as unknown as Channel);

    expect(ch.assertQueue).toHaveBeenCalledWith('job.process', {
      durable: true,
      arguments: { 'x-dead-letter-exchange': 'job.retry.direct' },
    });
    expect(ch.assertQueue).toHaveBeenCalledWith('job.retry', {
      durable: true,
      arguments: { 'x-message-ttl': 5000, 'x-dead-letter-exchange': 'job.direct' },
    });
    expect(ch.assertQueue).toHaveBeenCalledWith('job.failed', { durable: true });
    expect(ch.bindQueue).toHaveBeenCalledWith('job.process', 'job.direct', 'job');
    expect(ch.bindQueue).toHaveBeenCalledWith('job.retry', 'job.retry.direct', 'job');
  });

  it('counts only the rejections from its work queue', () => {
    expect(queue.retryCount(message())).toBe(0);
    expect(
      queue.retryCount(
        message([
          { queue: 'job.retry', reason: 'expired', count: 5 },
          { queue: 'job.process', reason: 'rejected', count: 1 },
        ]),
      ),
    ).toBe(1);
  });

  it('retries until maxRetries, then parks the message in the failed queue', () => {
    const ch = { ack: vi.fn(), nack: vi.fn(), sendToQueue: vi.fn() };
    const retried = message([{ queue: 'job.process', reason: 'rejected', count: 1 }]);
    queue.reject(retried, ch as unknown as ConfirmChannel);
    expect(ch.nack).toHaveBeenCalledWith(retried, false, false);
    expect(ch.sendToQueue).not.toHaveBeenCalled();

    const exhausted = message([{ queue: 'job.process', reason: 'rejected', count: 2 }]);
    queue.reject(exhausted, ch as unknown as ConfirmChannel);
    expect(ch.sendToQueue).toHaveBeenCalledWith('job.failed', exhausted.content, {
      persistent: true,
    });
    expect(ch.ack).toHaveBeenCalledWith(exhausted);
  });
});
