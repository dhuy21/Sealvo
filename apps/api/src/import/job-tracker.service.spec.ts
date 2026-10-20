import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobTrackerService, isFinished, type Job } from './job-tracker.service.js';

const job = (fields: Partial<Job> = {}) =>
  ({ id: 'job-1', status: 'processing', meta: { userId: 'u1' }, ...fields }) as Job;

describe('isFinished', () => {
  it('is true only for completed and failed jobs', () => {
    expect(isFinished('completed')).toBe(true);
    expect(isFinished('failed')).toBe(true);
    expect(isFinished('processing')).toBe(false);
    expect(isFinished('retrying')).toBe(false);
  });
});

describe('JobTrackerService', () => {
  let client: { get: any };
  let subscriber: { subscribe: any; unsubscribe: any; quit: any; destroy: any; isOpen: boolean };
  let redis: { isReady: any; getClient: any; createSubscriber: any };
  let service: JobTrackerService;

  beforeEach(() => {
    client = { get: vi.fn().mockResolvedValue(JSON.stringify(job())) };
    subscriber = {
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      isOpen: true,
    };
    redis = {
      isReady: () => true,
      getClient: () => client,
      createSubscriber: vi.fn().mockResolvedValue(subscriber),
    };
    service = new JobTrackerService(redis as any);
  });

  describe('getOwned', () => {
    it("returns the user's job", async () => {
      await expect(service.getOwned('job-1', 'u1')).resolves.toEqual(job());
    });

    it('is a 404 when the job does not exist', async () => {
      client.get.mockResolvedValue(null);

      await expect(service.getOwned('job-1', 'u1')).rejects.toThrow(
        new NotFoundException('Job not found.'),
      );
    });

    it("is a 403 for someone else's job", async () => {
      await expect(service.getOwned('job-1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('subscribe', () => {
    it('forwards parsed updates until unsubscribed', async () => {
      const onUpdate = vi.fn();
      const unsubscribe = await service.subscribe('job-1', onUpdate);
      const [channel, listener] = subscriber.subscribe.mock.calls[0];

      listener(JSON.stringify(job({ status: 'completed' })));
      listener('not json');
      await unsubscribe!();
      listener(JSON.stringify(job()));

      expect(channel).toBe('job-events:job-1');
      expect(onUpdate.mock.calls).toEqual([[job({ status: 'completed' })]]);
      expect(subscriber.unsubscribe).toHaveBeenCalledWith('job-events:job-1', listener);
      expect(subscriber.quit).not.toHaveBeenCalled();
    });

    it('shares one Redis connection between every stream', async () => {
      await service.subscribe('job-1', vi.fn());
      await service.subscribe('job-2', vi.fn());
      await service.subscribe('job-1', vi.fn());

      expect(redis.createSubscriber).toHaveBeenCalledTimes(1);
      expect(subscriber.subscribe).toHaveBeenCalledTimes(3);
    });

    it('closes the shared connection on shutdown', async () => {
      await service.subscribe('job-1', vi.fn());
      await service.onModuleDestroy();

      expect(subscriber.quit).toHaveBeenCalled();
    });

    it('is null when Redis Pub/Sub is unavailable, and tries again on the next stream', async () => {
      redis.createSubscriber.mockResolvedValueOnce(null);

      await expect(service.subscribe('job-1', vi.fn())).resolves.toBeNull();
      await expect(service.subscribe('job-1', vi.fn())).resolves.not.toBeNull();
      expect(redis.createSubscriber).toHaveBeenCalledTimes(2);
    });

    it('is null when subscribing fails, without closing the connection other streams use', async () => {
      subscriber.subscribe.mockRejectedValue(new Error('timeout'));

      await expect(service.subscribe('job-1', vi.fn())).resolves.toBeNull();
      expect(subscriber.destroy).not.toHaveBeenCalled();
    });
  });
});
