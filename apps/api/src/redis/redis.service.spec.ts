import { EventEmitter } from 'events';
import { RedisService } from './redis.service.js';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('redis', () => ({ createClient }));

class FakeClient extends EventEmitter {
  connect = vi.fn(() => new Promise<void>(() => {}));
  destroy = vi.fn();
  disconnect = vi.fn().mockResolvedValue(undefined);
  quit = vi.fn().mockResolvedValue(undefined);
  ping = vi.fn().mockResolvedValue('PONG');
  duplicate = vi.fn(() => this.subscriber);
  subscriber!: FakeClient;
}

describe('RedisService', () => {
  let client: FakeClient;
  let service: RedisService;

  beforeEach(() => {
    client = new FakeClient();
    client.subscriber = new FakeClient();
    createClient.mockReset().mockReturnValue(client);
    service = new RedisService({ url: 'redis://test' });
  });

  it('never stops reconnecting and caps the delay', () => {
    void service.connect();
    const { reconnectStrategy } = createClient.mock.calls[0][0].socket;

    expect(reconnectStrategy(1)).toBe(500);
    expect(reconnectStrategy(31)).toBe(10_000);
    expect(reconnectStrategy(10_000)).toBe(10_000);
  });

  it('lets the boot go on after a first failed attempt, then becomes ready in the background', async () => {
    const init = service.onModuleInit();
    client.emit('error', new Error('ECONNREFUSED'));
    await init;

    expect(service.isReady()).toBe(false);
    expect(service.getClient()).toBe(client);

    client.emit('ready');
    expect(service.isReady()).toBe(true);
  });

  it('is ready at the end of boot when Redis answers', async () => {
    const init = service.onModuleInit();
    client.emit('ready');
    await init;

    expect(service.isReady()).toBe(true);
  });

  describe('createSubscriber', () => {
    beforeEach(async () => {
      const init = service.connect();
      client.emit('ready');
      await init;
    });

    it('returns the connected duplicate', async () => {
      const pending = service.createSubscriber();
      client.subscriber.emit('ready');

      await expect(pending).resolves.toBe(client.subscriber);
    });

    it('returns null and closes the duplicate when it cannot connect', async () => {
      const pending = service.createSubscriber();
      client.subscriber.emit('error', new Error('ECONNREFUSED'));

      await expect(pending).resolves.toBeNull();
      expect(client.subscriber.destroy).toHaveBeenCalled();
    });

    it('returns null without connecting while Redis is down', async () => {
      client.emit('error', new Error('ECONNRESET'));

      await expect(service.createSubscriber()).resolves.toBeNull();
      expect(client.duplicate).not.toHaveBeenCalled();
    });
  });

  describe('watchdog (stalled connection)', () => {
    let next: FakeClient;

    beforeEach(async () => {
      vi.useFakeTimers();
      next = new FakeClient();
      createClient.mockReturnValueOnce(client).mockReturnValueOnce(next);
      const init = service.connect();
      client.emit('ready');
      await init;
    });

    afterEach(async () => {
      await service.disconnect();
      vi.useRealTimers();
    });

    it('marks Redis down and replaces the client when PING gets no reply', async () => {
      client.ping = vi.fn(() => new Promise(() => {}));

      await vi.advanceTimersByTimeAsync(3_000 + 1_000);

      expect(service.isReady()).toBe(false);
      expect(client.destroy).toHaveBeenCalled();
      expect(service.getClient()).toBe(next);
      // The replaced client's events no longer change the state
      client.emit('end');
      expect(service.getClient()).toBe(next);
      next.emit('ready');
      expect(service.isReady()).toBe(true);
    });

    it('keeps the client while PING answers', async () => {
      client.ping = vi.fn().mockResolvedValue('PONG');

      await vi.advanceTimersByTimeAsync(10_000);

      expect(service.isReady()).toBe(true);
      expect(client.destroy).not.toHaveBeenCalled();
      expect(createClient).toHaveBeenCalledTimes(1);
    });
  });
});
