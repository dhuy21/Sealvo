const redis = require('../../app/core/redis');

jest.mock('../../app/core/redis');

const mockClient = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(3500),
  publish: jest.fn().mockResolvedValue(1),
  sAdd: jest.fn().mockResolvedValue(1),
  sRem: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn().mockResolvedValue(1),
};

beforeEach(() => {
  jest.clearAllMocks();
  redis.isReady.mockReturnValue(true);
  redis.getClient.mockReturnValue(mockClient);
});

const jobTracker = require('../../app/core/jobTracker');

describe('jobTracker (unit)', () => {
  describe('create', () => {
    it('creates a job in Redis with correct structure and TTL', async () => {
      const job = await jobTracker.create('import', { userId: 42, packageId: 7 });

      expect(job).not.toBeNull();
      expect(job.id).toBeDefined();
      expect(job.type).toBe('import');
      expect(job.status).toBe('pending');
      expect(job.progress).toBeNull();
      expect(job.result).toBeNull();
      expect(job.error).toBeNull();
      expect(job.meta).toEqual({ userId: 42, packageId: 7 });
      expect(job.createdAt).toBeDefined();

      expect(mockClient.set).toHaveBeenCalledWith(`job:${job.id}`, expect.any(String), {
        EX: 3600,
      });
    });

    it('adds job to user-jobs set when meta.userId is provided', async () => {
      const job = await jobTracker.create('import', { userId: 42 });
      expect(mockClient.sAdd).toHaveBeenCalledWith('user-jobs:42', job.id);
      expect(mockClient.expire).toHaveBeenCalledWith('user-jobs:42', 3600);
    });

    it('skips user-jobs set when meta.userId is absent', async () => {
      await jobTracker.create('addWords', {});
      expect(mockClient.sAdd).not.toHaveBeenCalled();
    });

    it('publishes creation event via Pub/Sub', async () => {
      const job = await jobTracker.create('addWords', {});
      expect(mockClient.publish).toHaveBeenCalledWith(`job-events:${job.id}`, expect.any(String));
    });

    it('returns null when Redis is not ready', async () => {
      redis.isReady.mockReturnValue(false);
      const job = await jobTracker.create('import', {});
      expect(job).toBeNull();
      expect(mockClient.set).not.toHaveBeenCalled();
    });

    it('returns null when Redis throws', async () => {
      mockClient.set.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const job = await jobTracker.create('import', {});
      expect(job).toBeNull();
    });
  });

  describe('get', () => {
    it('returns parsed job data from Redis', async () => {
      const stored = { id: 'abc', type: 'import', status: 'processing' };
      mockClient.get.mockResolvedValue(JSON.stringify(stored));

      const result = await jobTracker.get('abc');
      expect(result).toEqual(stored);
      expect(mockClient.get).toHaveBeenCalledWith('job:abc');
    });

    it('returns null when job does not exist', async () => {
      mockClient.get.mockResolvedValue(null);
      const result = await jobTracker.get('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when Redis is not ready', async () => {
      redis.isReady.mockReturnValue(false);
      expect(await jobTracker.get('abc')).toBeNull();
    });

    it('returns null on Redis error', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('timeout'));
      expect(await jobTracker.get('abc')).toBeNull();
    });
  });

  describe('update', () => {
    const existing = { id: 'abc', type: 'import', status: 'pending', updatedAt: 1000 };

    beforeEach(() => {
      mockClient.get.mockResolvedValue(JSON.stringify(existing));
    });

    it('merges fields and saves back to Redis preserving TTL', async () => {
      const result = await jobTracker.update('abc', {
        status: 'processing',
        progress: { current: 0, total: 10 },
      });

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith('job:abc', expect.any(String), { EX: 3500 });

      const saved = JSON.parse(mockClient.set.mock.calls[0][1]);
      expect(saved.status).toBe('processing');
      expect(saved.progress).toEqual({ current: 0, total: 10 });
      expect(saved.type).toBe('import');
      expect(saved.updatedAt).toBeGreaterThan(1000);
    });

    it('publishes update event via Pub/Sub (fire-and-forget)', async () => {
      await jobTracker.update('abc', { status: 'completed' });
      expect(mockClient.publish).toHaveBeenCalledWith('job-events:abc', expect.any(String));
    });

    it('returns false when job does not exist in Redis', async () => {
      mockClient.get.mockResolvedValue(null);
      expect(await jobTracker.update('gone', { status: 'failed' })).toBe(false);
    });

    it('returns false when Redis is not ready', async () => {
      redis.isReady.mockReturnValue(false);
      expect(await jobTracker.update('abc', {})).toBe(false);
    });

    it('uses DEFAULT_TTL when existing TTL is expired', async () => {
      mockClient.ttl.mockResolvedValue(-1);
      await jobTracker.update('abc', { status: 'completed' });
      expect(mockClient.set).toHaveBeenCalledWith('job:abc', expect.any(String), { EX: 3600 });
    });
  });

  describe('remove', () => {
    it('deletes job key and removes from user-jobs set', async () => {
      const stored = { id: 'abc', meta: { userId: 42 } };
      mockClient.get.mockResolvedValue(JSON.stringify(stored));
      expect(await jobTracker.remove('abc')).toBe(true);
      expect(mockClient.sRem).toHaveBeenCalledWith('user-jobs:42', 'abc');
      expect(mockClient.del).toHaveBeenCalledWith('job:abc');
    });

    it('deletes job key without sRem when no userId', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ id: 'abc', meta: {} }));
      expect(await jobTracker.remove('abc')).toBe(true);
      expect(mockClient.sRem).not.toHaveBeenCalled();
      expect(mockClient.del).toHaveBeenCalledWith('job:abc');
    });

    it('deletes even when job key is already gone from Redis', async () => {
      mockClient.get.mockResolvedValue(null);
      expect(await jobTracker.remove('abc')).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('job:abc');
    });

    it('returns false when Redis is not ready', async () => {
      redis.isReady.mockReturnValue(false);
      expect(await jobTracker.remove('abc')).toBe(false);
    });

    it('returns false on Redis error', async () => {
      mockClient.del.mockRejectedValueOnce(new Error('ERR'));
      expect(await jobTracker.remove('abc')).toBe(false);
    });
  });

  describe('getActiveByUser', () => {
    it('returns active (non-completed/failed) jobs for a user', async () => {
      mockClient.sMembers.mockResolvedValue(['j1', 'j2', 'j3']);
      mockClient.get
        .mockResolvedValueOnce(JSON.stringify({ id: 'j1', status: 'processing' }))
        .mockResolvedValueOnce(JSON.stringify({ id: 'j2', status: 'completed' }))
        .mockResolvedValueOnce(JSON.stringify({ id: 'j3', status: 'pending' }));

      const jobs = await jobTracker.getActiveByUser(99);
      expect(jobs).toHaveLength(2);
      expect(jobs[0].id).toBe('j1');
      expect(jobs[1].id).toBe('j3');
      expect(mockClient.sRem).toHaveBeenCalledWith('user-jobs:99', 'j2');
    });

    it('cleans up expired jobs (null from Redis)', async () => {
      mockClient.sMembers.mockResolvedValue(['expired1']);
      mockClient.get.mockResolvedValue(null);

      const jobs = await jobTracker.getActiveByUser(99);
      expect(jobs).toHaveLength(0);
      expect(mockClient.sRem).toHaveBeenCalledWith('user-jobs:99', 'expired1');
    });

    it('returns empty array when user has no jobs', async () => {
      mockClient.sMembers.mockResolvedValue([]);
      expect(await jobTracker.getActiveByUser(99)).toEqual([]);
    });

    it('returns empty array when Redis is not ready', async () => {
      redis.isReady.mockReturnValue(false);
      expect(await jobTracker.getActiveByUser(99)).toEqual([]);
    });

    it('returns empty array when userId is falsy', async () => {
      expect(await jobTracker.getActiveByUser(null)).toEqual([]);
      expect(await jobTracker.getActiveByUser(undefined)).toEqual([]);
    });

    it('returns empty array on Redis error', async () => {
      mockClient.sMembers.mockRejectedValueOnce(new Error('ERR'));
      expect(await jobTracker.getActiveByUser(99)).toEqual([]);
    });
  });

  describe('CHANNEL_PREFIX', () => {
    it('exports the correct prefix for Pub/Sub channels', () => {
      expect(jobTracker.CHANNEL_PREFIX).toBe('job-events:');
    });
  });
});
