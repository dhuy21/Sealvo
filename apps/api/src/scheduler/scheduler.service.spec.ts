import { SchedulerService, type ScheduledTask } from './scheduler.service.js';
import type { RedisService } from '../redis/redis.service.js';
import type { SchedulerConfig } from '../config/scheduler.config.js';

const HOUR = 3_600_000;
const task: ScheduledTask = {
  name: 'reminder',
  cron: '0 6 * * *',
  endpoint: '/api/reminder',
  maxGapMs: 7 * HOUR,
  description: 'test',
};

describe('SchedulerService', () => {
  let client: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let fetchMock: ReturnType<typeof vi.fn>;
  let service: SchedulerService;

  beforeEach(() => {
    client = { get: vi.fn(), set: vi.fn() };
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);
    const redis = { isReady: () => true, getClient: () => client } as unknown as RedisService;
    service = new SchedulerService(
      { apiUrl: 'http://api', cronSecret: 's3cret' } as SchedulerConfig,
      redis,
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('catches up a task whose last run is older than its max gap, then records the run', async () => {
    client.get.mockResolvedValue(String(Date.now() - 8 * HOUR));

    await service.catchUp([task]);

    expect(client.get).toHaveBeenCalledWith('scheduler:reminder:last_run');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/api/reminder',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Cron-Secret': 's3cret' }),
      }),
    );
    expect(client.set).toHaveBeenCalledWith('scheduler:reminder:last_run', expect.any(String));
  });

  it('skips a recent run and a task that never ran', async () => {
    client.get.mockResolvedValueOnce(String(Date.now() - HOUR)).mockResolvedValueOnce(null);

    await service.catchUp([task, task]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not record a run the API rejected', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal',
      json: () => Promise.resolve({}),
    });

    await service.trigger(task);

    expect(client.set).not.toHaveBeenCalled();
  });
});
