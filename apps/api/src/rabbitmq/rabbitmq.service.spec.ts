import { EventEmitter } from 'events';
import { RabbitmqService } from './rabbitmq.service.js';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('amqplib', () => ({ default: { connect } }));

class FakeChannel extends EventEmitter {
  prefetch = vi.fn().mockResolvedValue(undefined);
  close = vi.fn(async () => {
    this.emit('close');
  });
  publish = vi.fn();
}

class FakeConnection extends EventEmitter {
  channel = new FakeChannel();
  createConfirmChannel = vi.fn(async () => this.channel);
  close = vi.fn(async () => {
    this.emit('close');
  });
}

describe('RabbitmqService', () => {
  let service: RabbitmqService;
  let connections: FakeConnection[];

  const latest = () => connections[connections.length - 1];

  beforeEach(() => {
    vi.useFakeTimers();
    connections = [];
    connect.mockReset().mockImplementation(async () => {
      const conn = new FakeConnection();
      connections.push(conn);
      return conn;
    });
    service = new RabbitmqService({ url: 'amqp://test' });
  });

  afterEach(async () => {
    await service.disconnect();
    vi.useRealTimers();
  });

  it('runs the channel ready handlers before the channel is used', async () => {
    const handler = vi.fn(async () => {
      expect(service.isReady()).toBe(false);
    });
    service.onChannelReady(handler);

    await service.onApplicationBootstrap();

    expect(handler).toHaveBeenCalledWith(latest().channel);
    expect(service.isReady()).toBe(true);
  });

  it('reconnects and re-runs the handlers after an unexpected channel close', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    service.onChannelReady(handler);
    await service.connect();
    const first = latest();

    first.channel.emit('close');

    expect(service.isReady()).toBe(false);
    expect(first.close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(connections).toHaveLength(2);
    expect(handler).toHaveBeenLastCalledWith(latest().channel);
    expect(service.isReady()).toBe(true);
  });

  it('does not reconnect when the channel closes during shutdown', async () => {
    await service.connect();

    await service.disconnect();
    await vi.advanceTimersByTimeAsync(5000);

    expect(connections).toHaveLength(1);
  });

  it('closes the connection and retries when a handler fails', async () => {
    service.onChannelReady(vi.fn().mockRejectedValueOnce(new Error('PRECONDITION_FAILED')));

    await service.connect();

    expect(service.isReady()).toBe(false);
    expect(latest().close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(service.isReady()).toBe(true);
  });

  describe('publish', () => {
    const send = () => service.publish('ex', 'key', Buffer.from('{}'), { persistent: true });

    it('is false without a channel', async () => {
      await expect(send()).resolves.toBe(false);
    });

    it('resolves true once the broker acks', async () => {
      await service.connect();
      latest().channel.publish.mockImplementation((_e, _k, _c, _o, cb) => cb(null));

      await expect(send()).resolves.toBe(true);
    });

    it('is false when the broker nacks or the channel closes before confirming', async () => {
      await service.connect();
      latest().channel.publish.mockImplementation((_e, _k, _c, _o, cb) =>
        cb(new Error('message nacked')),
      );

      await expect(send()).resolves.toBe(false);
    });

    it('is false when publishing throws', async () => {
      await service.connect();
      latest().channel.publish.mockImplementation(() => {
        throw new Error('Channel closed');
      });

      await expect(send()).resolves.toBe(false);
    });

    it('is false when a blocked broker never confirms', async () => {
      await service.connect();
      vi.useFakeTimers();
      latest().channel.publish.mockImplementation(() => true);

      const pending = send();
      await vi.advanceTimersByTimeAsync(5_000);

      await expect(pending).resolves.toBe(false);
      vi.useRealTimers();
    });
  });
});

describe('RabbitmqService consumers', () => {
  class ConsumerChannel extends EventEmitter {
    prefetch = vi.fn().mockResolvedValue(undefined);
    nack = vi.fn();
    cancel = vi.fn().mockResolvedValue(undefined);
    close = vi.fn(async () => {
      this.emit('close');
    });
    deliver: (msg: unknown) => void = () => {};
    consume = vi.fn(async (_queue: string, cb: (msg: unknown) => void) => {
      this.deliver = cb;
      return { consumerTag: 'tag-1' };
    });
  }

  let service: RabbitmqService;
  let consumerChannel: ConsumerChannel;

  beforeEach(async () => {
    consumerChannel = new ConsumerChannel();
    connect.mockReset().mockImplementation(async () => {
      const conn = new FakeConnection();
      conn.createConfirmChannel
        .mockResolvedValueOnce(conn.channel as never)
        .mockResolvedValue(consumerChannel as never);
      return conn;
    });
    service = new RabbitmqService({ url: 'amqp://test' });
    await service.connect();
  });

  afterEach(() => service.disconnect());

  it('reports the consumer as lost when its channel closes unexpectedly', async () => {
    const lost = vi.fn();
    service.onConnectionLost(lost);
    await service.consume('q', vi.fn());

    consumerChannel.emit('close');

    expect(lost).toHaveBeenCalled();
  });

  it('dead-letters the message of a handler that throws', async () => {
    await service.consume('q', vi.fn().mockRejectedValue(new Error('boom')));
    const msg = { content: Buffer.from('{}') };

    consumerChannel.deliver(msg);
    await vi.waitFor(() => expect(consumerChannel.nack).toHaveBeenCalledWith(msg, false, false));
  });

  it('on shutdown stops new deliveries and waits for the message in progress', async () => {
    let finish!: () => void;
    const handler = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await service.consume('q', handler);
    consumerChannel.deliver({ content: Buffer.from('{}') });

    let stopped = false;
    const stopping = service.stopConsumers().then(() => (stopped = true));
    await Promise.resolve();

    expect(consumerChannel.cancel).toHaveBeenCalledWith('tag-1');
    expect(stopped).toBe(false);
    finish();
    await stopping;
    expect(stopped).toBe(true);
  });
});
