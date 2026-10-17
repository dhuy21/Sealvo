import { EventEmitter } from 'events';
import { NotFoundException } from '@nestjs/common';
import { JobController } from './job.controller.js';
import type { Job, JobTrackerService } from './job-tracker.service.js';

const job = (status: Job['status']) => ({ id: 'job-1', status }) as Job;

class FakeResponse extends EventEmitter {
  destroyed = false;
  setHeader = vi.fn();
  flushHeaders = vi.fn();
  write = vi.fn();
  end = vi.fn(() => {
    this.emit('close');
  });
  frames = () =>
    this.write.mock.calls.map((args: unknown[]) => JSON.parse(String(args[0]).slice(6)));
}

describe('JobController stream', () => {
  let tracker: { getOwned: any; get: any; subscribe: any };
  let unsubscribe: any;
  let onUpdate: (job: Job) => void;
  let res: FakeResponse;
  let controller: JobController;

  const stream = () => controller.streamJob('job-1', 'u1', res as any);

  beforeEach(() => {
    unsubscribe = vi.fn().mockResolvedValue(undefined);
    tracker = {
      getOwned: vi.fn().mockResolvedValue(job('processing')),
      get: vi.fn().mockResolvedValue(job('processing')),
      subscribe: vi.fn(async (_id: string, cb: (job: Job) => void) => {
        onUpdate = cb;
        return unsubscribe;
      }),
    };
    res = new FakeResponse();
    controller = new JobController(tracker as unknown as JobTrackerService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects before opening the stream when the job is not the user’s', async () => {
    tracker.getOwned.mockRejectedValue(new NotFoundException('Job not found.'));

    await expect(stream()).rejects.toThrow(NotFoundException);
    expect(res.flushHeaders).not.toHaveBeenCalled();
  });

  it('sends the state of an already finished job and ends', async () => {
    tracker.getOwned.mockResolvedValue(job('completed'));

    await stream();

    expect(res.frames()).toEqual([job('completed')]);
    expect(res.end).toHaveBeenCalled();
    expect(tracker.subscribe).not.toHaveBeenCalled();
  });

  it('streams updates and unsubscribes once the job finishes', async () => {
    await stream();

    onUpdate(job('processing'));
    onUpdate(job('failed'));

    expect(res.frames()).toEqual([job('processing'), job('processing'), job('failed')]);
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when the client leaves while the subscription is being set up', async () => {
    tracker.subscribe.mockImplementation(async () => {
      res.emit('close');
      return unsubscribe;
    });

    await stream();

    expect(unsubscribe).toHaveBeenCalled();
    expect(tracker.get).not.toHaveBeenCalled();
  });

  it('unsubscribes when the client disconnects', async () => {
    await stream();

    res.emit('close');

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('tells the client when real-time updates are unavailable', async () => {
    tracker.subscribe.mockResolvedValue(null);

    await stream();

    expect(res.frames()[1]).toMatchObject({ status: 'stream_unavailable' });
    expect(res.end).toHaveBeenCalled();
  });

  it('catches a job that finished while subscribing', async () => {
    tracker.get.mockResolvedValue(job('completed'));

    await stream();

    expect(res.frames()).toEqual([job('processing'), job('completed')]);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not subscribe when the client left while the job was being read', async () => {
    res.destroyed = true;

    await stream();

    expect(tracker.subscribe).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  it('refuses an 11th open stream of the same user, and accepts one again after a stream ends', async () => {
    const responses = Array.from({ length: 10 }, () => new FakeResponse());
    for (const r of responses) await controller.streamJob('job-1', 'u1', r as any);

    await expect(stream()).rejects.toMatchObject({ status: 429 });
    await expect(
      controller.streamJob('job-1', 'u2', new FakeResponse() as any),
    ).resolves.toBeUndefined();

    responses[0].emit('close');
    await expect(stream()).resolves.toBeUndefined();
  });

  it('ends the stream once the job TTL has elapsed', async () => {
    vi.useFakeTimers();
    await stream();

    vi.advanceTimersByTime(3600 * 1000 - 1);
    expect(res.end).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(res.end).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
